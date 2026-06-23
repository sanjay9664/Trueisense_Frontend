import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Badge } from 'react-bootstrap';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';

const createDefaultModules = () => ({
  Dashboard: true,
  'Water Management': true,
  Motors: true,
  'DG Set': true,
  'Setting Templates': true,
  'Alarm System': true,
  'LT Panel': true,
  Transformer: true,
  'Fire': true,
  Ticketing: true,
  Maintenance: true,
  'Service History': true,
  'Daily DPR': true,
  'Energy Metering': true,
  'VRV': true,
  'AQI Sensor': true,
  'HVAC': true,
  'AC': true
});

const defaultSubmoduleVisibility = {
  showWaterManagement: { Overview: true, 'AG TANK': true, 'UG TANK': true },
  showMotors: { Overview: true, 'Pump Room 1': true, 'Pump Room 2': true, 'VFD / DOL Status': true, 'PDF Report': true },
  showDGSet: { Overview: true, 'DG Set-1': true, 'DG Set-2': true, 'DG Set-3': true },
  showAlarms: { Overview: true, 'Active Alarms': true, 'Inactive Alarms': true, 'ACK (Acknowledge)': true, 'Alarm History': true, 'PDF Report': true },
  showLTPanel: { Overview: true, 'LT Room-1': true, 'LT Room-2': true, 'LT Room-3': true, 'Incoming / Outgoing': true, 'Breaker Status': true, 'PDF Report': true },
  showTransformers: { Overview: true, 'Transformer-1': true, 'Transformer-2': true, 'Load / Temp': true, 'PDF Report': true },
  showFirePumps: { Overview: true, 'Pump Status': true, 'Header Pressure': true, 'Jockey / Main': true, 'PDF Report': true },
  showMaintenance: { Scheduled: true, 'Pending Tasks': true, 'PDF Report': true },
  showServiceHistory: { 'Equipment-wise': true, 'Service Records': true, 'PDF Report': true },
  showDailyDPR: { 'Data Aggregation': true, 'Daily Logs': true, 'PDF Report': true },
  showEnergyMetering: { Overview: true, 'Main Meter': true, 'Sub Meters': true, 'Graphs': true, 'PDF Report': true },
  showVRV: { Overview: true, 'Control Panel': true, 'Schedule': true, 'Human Sensor': true },
  showAQISensor: { Overview: true, 'Temp & Humidity': true },
  showHVAC: { 'Chiller': true, 'AHU': true, 'Cooling Tower': true, 'PDF Report': true },
  showAC: { 'Overview': true, 'PDF Report': true }
};

const moduleToSubmoduleKey = {
  'Water Management': 'showWaterManagement',
  'Motors': 'showMotors',
  'DG Set': 'showDGSet',
  'Alarm System': 'showAlarms',
  'LT Panel': 'showLTPanel',
  'Transformer': 'showTransformers',
  'Fire': 'showFirePumps',
  'Maintenance': 'showMaintenance',
  'Service History': 'showServiceHistory',
  'Daily DPR': 'showDailyDPR',
  'Energy Metering': 'showEnergyMetering',
  'VRV': 'showVRV',
  'AQI Sensor': 'showAQISensor',
  'HVAC': 'showHVAC',
  'AC': 'showAC'
};

const Settings = () => {
  const userRole = localStorage.getItem('userRole') || 'USER';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const defaultModules = useMemo(() => createDefaultModules(), []);
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState(defaultModules);
  const [submodules, setSubmodules] = useState(defaultSubmoduleVisibility);
  const [saveStatus, setSaveStatus] = useState(null);

  const fetchGlobalConfig = async () => {
    try {
      const configEndpoint = isSuperAdmin ? '/api/super-admin/config' : '/api/super-admin/admin-config';
      const response = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}${configEndpoint}`);
      if (response.ok) {
        const data = await response.json();
        const moduleMap = {
          showDashboard: 'Dashboard',
          showWaterManagement: 'Water Management',
          showMotors: 'Motors',
          showDGSet: 'DG Set',
          showSettingTemplates: 'Setting Templates',
          showAlarms: 'Alarm System',
          showLTPanel: 'LT Panel',
          showTransformers: 'Transformer',
          showFirePumps: 'Fire',
          showTicketing: 'Ticketing',
          showMaintenance: 'Maintenance',
          showServiceHistory: 'Service History',
          showDailyDPR: 'Daily DPR',
          showEnergyMetering: 'Energy Metering',
          showVRV: 'VRV',
          showAQISensor: 'AQI Sensor',
          showHVAC: 'HVAC',
          showAC: 'AC'
        };

        const sidebarModules = {};
        Object.entries(moduleMap).forEach(([key, label]) => {
          sidebarModules[label] = data[key] ?? true;
        });
        setModules(sidebarModules);

        if (data.submoduleVisibility) {
          const mergedSubmodules = {};
          Object.entries(defaultSubmoduleVisibility).forEach(([key, subs]) => {
            mergedSubmodules[key] = {
              ...subs,
              ...(data.submoduleVisibility[key] || {})
            };
          });
          setSubmodules(mergedSubmodules);
        }
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  useEffect(() => {
    fetchGlobalConfig();
  }, []);

  const toggleModule = (name) => {
    setModules(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleSubmodule = (subKey, subName) => {
    setSubmodules(prev => ({
      ...prev,
      [subKey]: {
        ...prev[subKey],
        [subName]: !(prev[subKey]?.[subName] ?? true)
      }
    }));
  };

  const toggleAll = (enabled) => {
    const nextModules = {};
    Object.keys(modules).forEach(key => {
      nextModules[key] = enabled;
    });
    setModules(nextModules);

    if (enabled) {
      setSubmodules(defaultSubmoduleVisibility);
    } else {
      const nextSubmodules = {};
      Object.keys(defaultSubmoduleVisibility).forEach(subKey => {
        nextSubmodules[subKey] = {};
        Object.keys(defaultSubmoduleVisibility[subKey]).forEach(subName => {
          nextSubmodules[subKey][subName] = false;
        });
      });
      setSubmodules(nextSubmodules);
    }
  };

  const handleSaveToBackend = async () => {
    setSaving(true);
    try {
      const reverseMap = {
        Dashboard: 'showDashboard',
        'Water Management': 'showWaterManagement',
        Motors: 'showMotors',
        'DG Set': 'showDGSet',
        'Setting Templates': 'showSettingTemplates',
        'Alarm System': 'showAlarms',
        'LT Panel': 'showLTPanel',
        Transformer: 'showTransformers',
        'Fire': 'showFirePumps',
        Ticketing: 'showTicketing',
        Maintenance: 'showMaintenance',
        'Service History': 'showServiceHistory',
        'Daily DPR': 'showDailyDPR',
        'Energy Metering': 'showEnergyMetering',
        'VRV': 'showVRV',
        'AQI Sensor': 'showAQISensor',
        'HVAC': 'showHVAC',
        'AC': 'showAC'
      };

      const backendConfig = {};
      Object.entries(reverseMap).forEach(([label, key]) => {
        backendConfig[key] = modules[label];
      });
      backendConfig.submoduleVisibility = submodules;

      const configEndpoint = isSuperAdmin ? '/api/super-admin/config' : '/api/super-admin/admin-config';
      const response = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}${configEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: backendConfig })
      });

      if (response.ok) {
        localStorage.setItem('scada_modules_config', JSON.stringify(modules));
        localStorage.setItem('scada_submodules_config', JSON.stringify(submodules));

        const savedFp = localStorage.getItem('scada_feature_permissions');
        if (savedFp) {
          const localFp = JSON.parse(savedFp);
          localFp.submoduleVisibility = submodules;
          localStorage.setItem('scada_feature_permissions', JSON.stringify(localFp));
        }

        window.dispatchEvent(new Event('storage-update'));
        setSaveStatus('System Updated Successfully');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('Error saving to system');
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = () => {
    setModules(defaultModules);
    setSubmodules(defaultSubmoduleVisibility);
    setSaveStatus('Values Reset (Click Save to Persist)');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <div className="fade-in p-2">
      <div className="page-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h2 className="mb-1 text-white fw-bold">System Configuration</h2>
          <p className="text-secondary fs-7 mb-0">
            Global application module control panel. Enable or disable system modules.
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {saveStatus && <Badge bg="success" className="d-flex align-items-center px-3 py-2 fade-in">{saveStatus}</Badge>}
          <button onClick={() => toggleAll(true)} className="btn-scada-outline text-success border-success border-opacity-25">ENABLE ALL</button>
          <button onClick={() => toggleAll(false)} className="btn-scada-outline text-danger border-danger border-opacity-25">DISABLE ALL</button>
          <button onClick={resetConfig} className="btn-scada-outline d-flex align-items-center gap-2">
            <RotateCcw size={16} /> RESET
          </button>
          <button
            onClick={handleSaveToBackend}
            disabled={saving}
            className="btn btn-info rounded-pill px-4 fw-bold fs-11 shadow-lg d-flex align-items-center gap-2"
          >
            {saving ? <div className="spinner-border spinner-border-sm" /> : <Save size={16} />}
            SAVE & SYNC SYSTEM
          </button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={12}>
          <Card className="scada-card border-0 shadow-lg h-100" style={{ background: '#0f172a' }}>
            <Card.Body className="p-4">
              <h6 className="mb-4 d-flex align-items-center text-info fw-black uppercase tracking-widest fs-12">
                <Shield size={18} className="me-2" /> Application Module Control
              </h6>

              <div className="module-list-container pe-2">
                <Row className="g-3">
                  {Object.keys(modules).map((name) => {
                    const subKey = moduleToSubmoduleKey[name];
                    const hasSubs = subKey && defaultSubmoduleVisibility[subKey];
                    return (
                      <Col key={name} md={6} lg={4} xl={3}>
                        <div
                          className={`d-flex flex-column justify-content-between h-100 p-3 rounded-4 border transition-all ${modules[name]
                              ? 'border-info border-opacity-10 bg-black bg-opacity-40'
                              : 'border-secondary border-opacity-5 bg-dark bg-opacity-10 opacity-40'
                            }`}
                        >
                          <div className="d-flex justify-content-between align-items-center w-100">
                            <div className="d-flex align-items-center gap-3">
                              <div className={`p-2 rounded-circle ${modules[name] ? 'bg-info text-dark' : 'bg-secondary text-white opacity-10'}`}>
                                <SettingsIcon size={14} />
                              </div>
                              <span className={`fw-bold fs-11 ${modules[name] ? 'text-white' : 'text-muted'}`}>{name}</span>
                            </div>
                            <Form.Check
                              type="switch"
                              id={`switch-${name}`}
                              checked={modules[name]}
                              onChange={() => toggleModule(name)}
                              className="scada-switch custom-switch-large"
                            />
                          </div>

                          {/* Render submodules if module is enabled and has submodules */}
                          {modules[name] && hasSubs && (
                            <div className="mt-3 pt-3 border-top border-secondary border-opacity-25 w-100">
                              <div className="d-flex flex-wrap gap-2">
                                {Object.keys(defaultSubmoduleVisibility[subKey]).map((subName) => {
                                  const isVisible = submodules[subKey]?.[subName] ?? true;
                                  return (
                                    <button
                                      key={subName}
                                      onClick={() => toggleSubmodule(subKey, subName)}
                                      className={`btn-sub-pill ${isVisible ? 'active' : 'inactive'}`}
                                      style={{
                                        background: isVisible ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                        border: isVisible ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '0.68rem',
                                        color: isVisible ? '#38bdf8' : '#64748b',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                                      {subName}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .scada-card { transition: all 0.3s; }
        .scada-switch .form-check-input { width: 45px; height: 22px; cursor: pointer; }
        .scada-switch .form-check-input:checked { background-color: #0ea5e9; border-color: #0ea5e9; box-shadow: 0 0 10px rgba(14, 165, 233, 0.5); }
        .btn-scada-outline {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s;
        }
        .btn-scada-outline:hover { color: white; border-color: rgba(255, 255, 255, 0.3); background: rgba(255,255,255,0.05); }
        .glass-panel {
          background: linear-gradient(180deg, rgba(15,23,42,0.78), rgba(15,23,42,0.62));
          border: 1px solid rgba(148,163,184,0.12);
          border-radius: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 30px rgba(2,6,23,0.22);
        }
        .fw-black { font-weight: 900 !important; }
        .fs-12 { font-size: 0.65rem !important; }
        .fs-11 { font-size: 0.75rem !important; }
        .fs-7 { font-size: 1.1rem !important; }
        .tracking-widest { letter-spacing: 2px !important; }
      `
        }}
      />
    </div>
  );
};

export default Settings;
