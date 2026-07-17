import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { io } from 'socket.io-client';

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 992);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsImpersonating(!!localStorage.getItem('impersonator_backup_role'));
  }, []);

  const handleExitVerification = () => {
    const backupUser = localStorage.getItem('impersonator_backup_user');
    const backupRole = localStorage.getItem('impersonator_backup_role');
    const cacheGlobalConfig = localStorage.getItem('cache_global_config');

    if (backupUser && backupRole) {
      localStorage.setItem('userData', backupUser);
      localStorage.setItem('userRole', backupRole);
      
      localStorage.removeItem('impersonator_backup_user');
      localStorage.removeItem('impersonator_backup_role');

      // Restore global modules config if available
      if (cacheGlobalConfig) {
        try {
          const globalConfig = JSON.parse(cacheGlobalConfig);
          const sidebarModules = {
            "Dashboard": globalConfig.showDashboard,
            "Water Management": globalConfig.showWaterManagement,
            "Motors": globalConfig.showMotors,
            "DG Monitoring": globalConfig.showDGSet,
            "Setting Templates": globalConfig.showSettingTemplates,
            "Alarm System": globalConfig.showAlarms,
            "LT Panel": globalConfig.showLTPanel,
            "Transformer": globalConfig.showTransformers,
            "Fire": globalConfig.showFirePumps,
            "Ticketing": globalConfig.showTicketing,
            "Maintenance": globalConfig.showMaintenance,
            "Service History": globalConfig.showServiceHistory,
            "Daily DPR": globalConfig.showDailyDPR,
            "Energy Metering": globalConfig.showEnergyMetering,
          };
          localStorage.setItem('scada_modules_config', JSON.stringify(sidebarModules));
          localStorage.setItem('scada_submodules_config', JSON.stringify(globalConfig.submoduleVisibility || {}));
        } catch(e) {}
      }

      window.location.href = '/super-admin';
    }
  };  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const fetchTemplates = async () => {
      try {
        const userDataStr = localStorage.getItem('userData') || '{}';
        const userData = JSON.parse(userDataStr);
        
        // Auto-migrate organizationId to tenantId if missing
        if (userData.organizationId && !userData.tenantId) {
          userData.tenantId = userData.organizationId;
          localStorage.setItem('userData', JSON.stringify(userData));
        }

        const url = '/api/templates';

        const response = await fetch(`${backendUrl}${url}`);
        if (response.ok) {
          const rawData = await response.json();
          
          const myOrgId = userData?.organizationId;
          const userRole = localStorage.getItem('userRole') || 'USER';
          const roleName = (userData.roleName || userRole || '').toLowerCase();
          const isSuperAdmin = userRole === 'SUPER_ADMIN' || roleName.includes('super');

          let data = rawData;
          if (!isSuperAdmin && myOrgId) {
            data = rawData.filter(t => {
              if (t.tenantId && Number(t.tenantId) === Number(myOrgId)) {
                return true;
              }
              if (!t.tenantId && Number(myOrgId) === 12) {
                return true;
              }
              return false;
            });
          }

          // Map backend data to frontend format to match what templates page saves
          const mappedData = data.map(t => ({
            id: t.id,
            name: t.name,
            category: t.category || 'Water Management',
            module: t.settings[0]?.eventKey || 'AG Tank',
            mapping: (t.defaultValues || t.settings[0]?.meta || {}),
            timestamp: new Date(t.createdAt).toLocaleString(),
            tenantId: t.tenantId
          }));
          
          // Cleanup corrupted mappings like Templates.jsx does
          const cleanCorruptedMapping = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
            const cleaned = {};
            Object.keys(obj).forEach(key => {
              let newKey = key;
              if (key.includes('Water Level') && key !== 'agLevelConfig' && key !== 'ugTankLevelConfig' && key !== 'Water Level' && key !== 'agLevel' && key !== 'waterLevel') {
                newKey = key.replace('Water Level', '').trim();
              }
              let value = obj[key];
              if (value && typeof value === 'object' && !Array.isArray(value)) value = cleanCorruptedMapping(value);
              cleaned[newKey] = value;
            });
            return cleaned;
          };

          const finalData = mappedData.map(t => ({
            ...t,
            mapping: cleanCorruptedMapping(t.mapping)
          }));

          localStorage.setItem('scada_templates', JSON.stringify(finalData));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (error) {
        console.error('Error syncing templates on load:', error);
      }
    };

    fetchTemplates();

    // Set up WebSocket listener to fetch updated templates instantly without reload
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('templates_updated', (payload) => {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const tenantId = userData?.tenantId || userData?.organizationId;

      // If the payload matches current tenantId or is global, sync templates
      if (!payload || payload.tenantId === undefined || Number(payload.tenantId) === Number(tenantId)) {
        console.log('[MainLayout] Templates updated via WebSocket. Fetching fresh settings...');
        fetchTemplates();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Set up periodic real-time sync of logged-in user permissions
  useEffect(() => {
    const syncUserPermissions = async () => {
      try {
        const token = localStorage.getItem('sochiot_token');
        if (!token) return;
        const loggedInUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const userEmail = loggedInUser.email;
        if (!userEmail) return;

        // Skip polling if impersonating to avoid overwriting active preview config
        const isImpersonating = !!localStorage.getItem('impersonator_backup_role');
        if (isImpersonating) return;

        // Step 1: For SUPER_ADMIN, fetch the global config and sync it directly
        if (loggedInUser.role === 'SUPER_ADMIN') {
          try {
            const configRes = await fetch('/api/super-admin/config');
            if (configRes.ok) {
              const configData = await configRes.json();
              if (configData && !configData.error) {
                const configRaw = configData.config || configData.data || (configData.features ? configData.features : configData);
                
                const globalModuleKeys = {
                  showDashboard: "Dashboard",
                  showWaterManagement: "Water Management",
                  showMotors: "Motors",
                  showDGSet: "DG Set",
                  showSettingTemplates: "Setting Templates",
                  showAlarms: "Alarm System",
                  showLTPanel: "LT Panel",
                  showTransformers: "Transformer",
                  showFirePumps: "Fire",
                  showTicketing: "Ticketing",
                  showMaintenance: "Maintenance",
                  showServiceHistory: "Service History",
                  showDailyDPR: "Daily DPR",
                  showEnergyMetering: "Energy Metering",
                  showVRV: "VRV",
                  showAQISensor: "AQI Sensor",
                  showHVAC: "HVAC",
                  showAC: "AC"
                };

                const sidebarModules = {};
                Object.entries(globalModuleKeys).forEach(([key, label]) => {
                  sidebarModules[label] = configRaw[key] ?? true;
                });
                
                const savedModulesStr = localStorage.getItem('scada_modules_config');
                const savedSubsStr = localStorage.getItem('scada_submodules_config');
                const currentSubs = configRaw.submoduleVisibility || {};
                
                const modulesChanged = JSON.stringify(sidebarModules) !== savedModulesStr;
                const subsChanged = JSON.stringify(currentSubs) !== savedSubsStr;
                
                if (modulesChanged || subsChanged) {
                  localStorage.setItem('scada_modules_config', JSON.stringify(sidebarModules));
                  localStorage.setItem('scada_submodules_config', JSON.stringify(currentSubs));
                  localStorage.setItem('cache_global_config', JSON.stringify(configRaw));
                  
                  window.dispatchEvent(new Event('storage-update'));
                  window.dispatchEvent(new Event('storage'));
                }
              }
            }
          } catch (err) {
            console.warn('[MainLayout Sync] Global config fetch failed:', err);
          }
          return;
        }

        let matchedUser = null;

        // Step 2: Try /users/me first
        try {
          const meRes = await fetch(`${import.meta.env.VITE_BACKEND_BMS_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (meRes.ok) {
            const meJson = await meRes.json();
            const meData = meJson.data || meJson || {};
            if (meData && meData.featurePermissions && Object.keys(meData.featurePermissions).length > 0) {
              matchedUser = meData;
            }
          }
        } catch (err) {
          console.warn('[MainLayout Sync] /users/me failed:', err);
        }

        // Step 3: Try search fallback
        if (!matchedUser) {
          try {
            const searchParam = `?search=${encodeURIComponent(userEmail)}&pageSize=5`;
            const searchRes = await fetch(`${import.meta.env.VITE_BACKEND_BMS_URL}/users${searchParam}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (searchRes.ok) {
              const listJson = await searchRes.json();
              const usersList = Array.isArray(listJson)
                ? listJson
                : (Array.isArray(listJson.data)
                    ? listJson.data
                    : (Array.isArray(listJson.data?.list)
                        ? listJson.data.list
                        : []));
              const myId = String(loggedInUser.id);
              const myEmail = (userEmail || '').toLowerCase();
              matchedUser = usersList.find(u => 
                String(u.sochiotUserId) === myId || 
                String(u.id) === myId || 
                (u.email || '').toLowerCase() === myEmail
              );
            }
          } catch (err) {
            console.warn('[MainLayout Sync] /users?search failed:', err);
          }
        }

        // Step 4: Try complete list fallback
        if (!matchedUser) {
          try {
            const listRes = await fetch(`${import.meta.env.VITE_BACKEND_BMS_URL}/users?pageSize=1000`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (listRes.ok) {
              const listJson = await listRes.json();
              const usersList = Array.isArray(listJson)
                ? listJson
                : (Array.isArray(listJson.data)
                    ? listJson.data
                    : (Array.isArray(listJson.data?.list)
                        ? listJson.data.list
                        : []));
              const myId = String(loggedInUser.id);
              const myEmail = (userEmail || '').toLowerCase();
              matchedUser = usersList.find(u => 
                String(u.sochiotUserId) === myId || 
                String(u.id) === myId || 
                (u.email || '').toLowerCase() === myEmail
              );
            }
          } catch (err) {
            console.warn('[MainLayout Sync] /users list fallback failed:', err);
          }
        }

        if (matchedUser && matchedUser.featurePermissions) {
          const newFp = matchedUser.featurePermissions;
          
          // Reconstruct submoduleVisibility from flat keys
          const submoduleVisibility = {};
          Object.entries(newFp).forEach(([key, val]) => {
            if (key.startsWith('submodule_')) {
              const parts = key.split('_');
              if (parts.length >= 3) {
                const moduleKey = parts[1];
                const subName = parts.slice(2).join('_');
                if (!submoduleVisibility[moduleKey]) submoduleVisibility[moduleKey] = {};
                submoduleVisibility[moduleKey][subName] = !!val;
              }
            }
          });
          const finalSubs = Object.keys(submoduleVisibility).length > 0 
            ? submoduleVisibility 
            : (newFp.submoduleVisibility || {});
          newFp.submoduleVisibility = finalSubs;

          // Resolve new role dynamically
          let roleUpdated = false;
          let newRoleName = loggedInUser.roleName;
          let newRole = loggedInUser.role;

          if (matchedUser.role?.name || matchedUser.roleName) {
            const matchedRoleName = matchedUser.roleName || matchedUser.role?.name;
            if (matchedRoleName !== loggedInUser.roleName) {
              newRoleName = matchedRoleName;
              roleUpdated = true;
              
              // Determine standard userRole
              const rNameLower = matchedRoleName.toLowerCase();
              if (matchedUser.isRootUser === true || rNameLower.includes('super')) {
                newRole = 'SUPER_ADMIN';
              } else if (rNameLower.includes('admin') || matchedUser.role?.roleType === 'SYSTEM_ADMIN' || matchedUser.userType === 'SYSTEM_ADMIN') {
                newRole = 'ADMIN';
              } else {
                newRole = matchedRoleName;
              }
            }
          }

          // Check if anything has changed before updating local storage to avoid infinite loops
          const savedFpStr = localStorage.getItem('scada_feature_permissions');
          const savedSubConfigStr = localStorage.getItem('scada_submodules_config');
          const savedUserRole = localStorage.getItem('userRole');
          
          const fpChanged = JSON.stringify(newFp) !== savedFpStr;
          const subConfigChanged = JSON.stringify(finalSubs) !== savedSubConfigStr;
          const roleChanged = newRole !== savedUserRole || roleUpdated;

          if (fpChanged || subConfigChanged || roleChanged) {
            if (fpChanged) {
              localStorage.setItem('scada_feature_permissions', JSON.stringify(newFp));
            }
            if (subConfigChanged) {
              localStorage.setItem('scada_submodules_config', JSON.stringify(finalSubs));
            }
            if (roleChanged) {
              localStorage.setItem('userRole', newRole);
              const updatedUserObj = {
                ...loggedInUser,
                role: newRole,
                roleName: newRoleName
              };
              localStorage.setItem('userData', JSON.stringify(updatedUserObj));
            }

            const userRole = newRole;
            const rName = (newRoleName || userRole || '').toLowerCase();
            const isRestricted = rName.includes('zone') || rName.includes('area') || rName.includes('location') || rName.includes('unit') || rName.includes('operator') || rName.includes('org') || rName.includes('organisation') || rName.includes('organization');
            const isPowerUser = (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && !isRestricted;
            const isFpEmpty = Object.keys(newFp).length === 0;
            const defaultVal = (isPowerUser || isFpEmpty) ? true : false;

            const sidebarMapping = {
              "Dashboard": newFp.showDashboard_read ?? newFp.showDashboard ?? defaultVal,
              "Water Management": newFp.showWaterManagement_read ?? newFp.showWaterManagement ?? defaultVal,
              "Motors": newFp.showMotors_read ?? newFp.showMotors ?? defaultVal,
              "DG Set": newFp.showDGSet_read ?? newFp.showDGSet ?? defaultVal,
              "Setting Templates": newFp.showSettingTemplates_read ?? newFp.showSettingTemplates ?? defaultVal,
              "Alarm System": newFp.showAlarms_read ?? newFp.showAlarms ?? defaultVal,
              "LT Panel": newFp.showLTPanel_read ?? newFp.showLTPanel ?? defaultVal,
              "Transformer": newFp.showTransformers_read ?? newFp.showTransformers ?? defaultVal,
              "Fire": newFp.showFirePumps_read ?? newFp.showFirePumps ?? defaultVal,
              "Ticketing": newFp.showTicketing_read ?? newFp.showTicketing ?? defaultVal,
              "Maintenance": newFp.showMaintenance_read ?? newFp.showMaintenance ?? defaultVal,
              "Service History": newFp.showServiceHistory_read ?? newFp.showServiceHistory ?? defaultVal,
              "Daily DPR": newFp.showDailyDPR_read ?? newFp.showDailyDPR ?? defaultVal,
              "Energy Metering": newFp.showEnergyMetering_read ?? newFp.showEnergyMetering ?? defaultVal,
              "VRV": newFp.showVRV_read ?? newFp.showVRV ?? defaultVal,
              "AQI Sensor": newFp.showAQISensor_read ?? newFp.showAQISensor ?? defaultVal,
              "HVAC": newFp.showHVAC_read ?? newFp.showHVAC ?? defaultVal,
              "AC": newFp.showAC_read ?? newFp.showAC ?? defaultVal
            };
            localStorage.setItem('scada_modules_config', JSON.stringify(sidebarMapping));

            window.dispatchEvent(new Event('storage-update'));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (err) {
        console.warn('Failed to sync user permissions:', err);
      }
    };

    // Initial sync on mount
    syncUserPermissions();

    // Poll every 5 minutes for live database updates
    const interval = setInterval(syncUserPermissions, 300000);
    return () => clearInterval(interval);
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="scada-container">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      {!collapsed && (
        <div 
          className="sidebar-backdrop d-lg-none"
          onClick={() => setCollapsed(true)}
        />
      )}
      <div 
        className={`scada-main-content ${collapsed ? 'sidebar-collapsed' : ''}`}
      >
        {isImpersonating && (
          <div className="bg-warning text-dark px-4 py-2 d-flex justify-content-between align-items-center position-sticky top-0 z-3 shadow-sm border-bottom border-warning">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span className="fw-bold tracking-widest uppercase fs-7">
                Verification Mode Active
              </span>
              <span className="ms-2 opacity-75 fs-7">
                Previewing as: {JSON.parse(localStorage.getItem('userData') || '{}')?.name}
              </span>
            </div>
            <button 
              className="btn btn-sm btn-dark fw-bold uppercase tracking-wider fs-8 px-3"
              onClick={handleExitVerification}
            >
              Exit Verification
            </button>
          </div>
        )}
        <Header collapsed={collapsed} toggleSidebar={toggleSidebar} />
        <main className="px-3 px-md-4 pb-5">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
