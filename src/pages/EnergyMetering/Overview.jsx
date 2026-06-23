import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Badge, Table, Modal, Form, Button } from 'react-bootstrap';
import {
  Zap,
  Cpu,
  Activity,
  Gauge,
  Layers3,
  FolderTree,
  Network,
  Sparkles,
  Settings2,
  Plus,
  Trash2,
  CheckCircle2,
  Usb,
  Plug,
  Flashlight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import PdfButton from '../../components/PdfButton';
import StatusBadge from '../../components/StatusBadge';
import { useDeviceStatus } from '../../services/DeviceStatusContext';
import SolarDashboard from './SolarDashboard';

const GROUP_EVENT_NAME = 'energy-meter-groups-updated';
const GROUP_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#a78bfa', '#f43f5e'];
const createGroupId = () => `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const formatMetric = (value, digits = 1) => parseNumber(value, 0).toFixed(digits);

const CATEGORY_COLORS = {
  Commercial: '#38bdf8',
  'Data Center': '#fb923c',
  'Water Management': '#22c55e',
  VRV: '#f87171',
  Lighting: '#a78bfa',
  'Sub Meter': '#94a3b8',
  Ungrouped: '#facc15'
};

const getCategoryColor = (category) => {
  if (!category) return '#94a3b8';
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
};

const normalizeOverviewGroups = (groups, subMeterRows) => {
  const validIds = new Set(subMeterRows.map(row => String(row.templateId)));
  const meterLookup = new Map(
    subMeterRows.map(row => [
      String(row.templateId),
      {
        id: String(row.templateId),
        label: row.name,
        type: row.category || 'Sub Meter',
        category: row.category || 'Sub Meter'
      }
    ])
  );
  const globallyAssigned = new Set();
  const usedGroupIds = new Set();
  return (Array.isArray(groups) ? groups : [])
    .map((group, index) => {
      const requestedId = String(group?.id || '').trim();
      const safeId = requestedId && !usedGroupIds.has(requestedId) ? requestedId : createGroupId();
      usedGroupIds.add(safeId);

      const groupMeterIds = Array.from(
        new Set((Array.isArray(group?.meterIds) ? group.meterIds : []).map(id => String(id)))
      )
        .filter(id => validIds.has(id))
        .filter(id => {
          if (globallyAssigned.has(id)) return false;
          globallyAssigned.add(id);
          return true;
        });

      return {
        id: safeId,
        name: String(group?.name || '').trim() || `Group ${index + 1}`,
        color: group?.color || GROUP_COLORS[index % GROUP_COLORS.length],
        meterIds: groupMeterIds,
        meterDetails: groupMeterIds.map(id => meterLookup.get(id)).filter(Boolean)
      };
    })
    .filter(group => group.name);
};

const fetchPersistedGroups = async () => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const tenantId = userData?.tenantId;
  const url = tenantId
    ? `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/energy-meter-groups?tenantId=${tenantId}`
    : `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/energy-meter-groups`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch persisted energy meter groups');
  }
  const data = await response.json();
  return Array.isArray(data?.groups) ? data.groups : [];
};

const resolveSubMeterCategory = (template) => {
  const targetName = String(template?.mapping?.energyMeteringTarget || template?.name || '').toUpperCase();
  const mappedCategory = template?.mapping?.subMeterCategory || template?.category;
  if (mappedCategory) return mappedCategory;
  if (targetName.includes('COMMERCIAL') || targetName.includes('WING') || targetName.includes('OFFICE')) return 'Commercial';
  if (targetName.includes('SERVER') || targetName.includes('UPS') || targetName.includes('DATA CENTER') || targetName.includes('IT')) return 'Data Center';
  if (targetName.includes('WATER') || targetName.includes('PLANT') || targetName.includes('UTILITY') || targetName.includes('MOTOR') || targetName.includes('PUMP')) return 'Water Management';
  if (targetName.includes('VRV') || targetName.includes('CHILLER') || targetName.includes('AC')) return 'VRV';
  if (targetName.includes('LIGHT') || targetName.includes('STREET') || targetName.includes('PARKING')) return 'Lighting';
  return 'Sub Meter';
};

const ParameterCard = ({ label, value, unit, icon, colorClass = "info" }) => (
  <div className={`param-card border-${colorClass}`}>
    <div className="d-flex align-items-center justify-content-between mb-1">
      <span className="param-label">{label}</span>
      <span className={`text-${colorClass}`}>{icon}</span>
    </div>
    <div className="d-flex align-items-baseline gap-1 mt-2">
      <span className="param-value">{value}</span>
      <span className="param-unit">{unit}</span>
    </div>
  </div>
);

const EnergyMeteringOverview = () => {
  const navigate = useNavigate();
  const { getOverallStatus } = useDeviceStatus();

  const [templates, setTemplates] = useState([]);
  const [telemetryStats, setTelemetryStats] = useState([]);
  const [meterGroups, setMeterGroups] = useState([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [groupDrafts, setGroupDrafts] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('Your setting is successfully saved');
  const [groupActionStatus, setGroupActionStatus] = useState(null);
  const [selectedMainMeterId, setSelectedMainMeterId] = useState('');
  const [selectedSubMeterId, setSelectedSubMeterId] = useState('');
  const [showGroups, setShowGroups] = useState(false);

  const refreshTemplates = () => {
    try {
      const raw = localStorage.getItem('scada_templates');
      setTemplates(raw ? JSON.parse(raw) : []);
    } catch (error) {
      console.error('Failed to parse templates:', error);
      setTemplates([]);
    }
  };

  useEffect(() => {
    refreshTemplates();
    let active = true;

    const fetchTemplatesFromBackend = async () => {
      try {
        const res = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates`);
        if (!res.ok) return;
        const data = await res.json();
        const mapped = data.map(t => {
          const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
          const defValues = hasDef ? t.defaultValues : null;
          const mappingSource = defValues || t.settings?.[0]?.meta || {};
          return {
            id: t.id,
            name: t.name,
            category: (defValues && defValues.category) || t.category || 'Water Management',
            module: (defValues && defValues.module) || t.settings?.[0]?.eventKey || 'AG Tank',
            mapping: mappingSource
          };
        });
        if (active) {
          setTemplates(mapped);
          localStorage.setItem('scada_templates', JSON.stringify(mapped));
        }
      } catch (err) {
        console.error('Error fetching templates in Overview:', err);
      }
    };

    fetchTemplatesFromBackend();

    const syncState = async () => {
      refreshTemplates();
      try {
        const groups = await fetchPersistedGroups();
        if (active) setMeterGroups(groups);
      } catch (error) {
        console.error('Failed to fetch backend groups:', error);
        if (active) setMeterGroups([]);
      }
    };

    syncState();
    window.addEventListener('storage', syncState);
    window.addEventListener('storage-update', syncState);
    window.addEventListener(GROUP_EVENT_NAME, syncState);
    return () => {
      active = false;
      window.removeEventListener('storage', syncState);
      window.removeEventListener('storage-update', syncState);
      window.removeEventListener(GROUP_EVENT_NAME, syncState);
    };
  }, []);

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;
      setTelemetryStats(prev => {
        const validPrev = (Array.isArray(prev) ? prev : []).filter(Boolean);
        const map = new Map(validPrev.map(item => [String(item.moduleId || item.meta?.module_id), item]));
        stats.forEach(item => {
          if (item) {
            const id = String(item.moduleId || item.meta?.module_id);
            if (id) map.set(id, item);
          }
        });
        const merged = Array.from(map.values());
        try {
          localStorage.setItem('scada_energy_overview_cache', JSON.stringify(merged));
        } catch (error) {
          console.error('Failed to cache overview telemetry:', error);
        }
        return merged;
      });
    };

    socket.on('telemetry_update', processTelemetry);

    try {
      const cached = localStorage.getItem('scada_energy_overview_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setTelemetryStats(parsed.filter(Boolean));
      }
    } catch (error) {
      console.error('Failed to load cached telemetry:', error);
    }

    const fetchStats = async () => {
      try {
        const modulesToPoll = new Set();
        if (Array.isArray(templates)) {
          templates.forEach(template => {
            if (!template.mapping) return;
            Object.values(template.mapping).forEach(cfg => {
              if (cfg && typeof cfg === 'object' && cfg.module && cfg.module !== 'ALL') {
                modulesToPoll.add(String(cfg.module));
              }
            });
          });
        }

        const pollList = Array.from(modulesToPoll);
        if (!pollList.length) return;

        const url = `${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/stats?modules=${pollList.join(',')}`;
        const res = await fetch(url);
        if (res.ok) {
          processTelemetry(await res.json());
        }
      } catch (error) {
        console.error('Error in overview fetchStats:', error);
      }
    };

    fetchStats();
    const pollingInterval = setInterval(fetchStats, 2500);
    return () => {
      socket.disconnect();
      clearInterval(pollingInterval);
    };
  }, [templates]);

  const PARAMETER_SYNONYMS = {
    ebKwh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
    ebKvah: ['3,152', '3,157', '4,93F', 'EB KVAH', 'EB_KVAH', 'APPARENT ENERGY'],
    totalKw: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
    totalKva: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
    vR: ['3,168', '3,163', 'VOLTAGE R', 'VOLTAGE_R', 'VR', 'V_R', 'UA', 'U1', 'LINE VOLTS (R)', 'VOLTAGE R-PHASE', 'Voltage-R'],
    vY: ['3,169', '3,164', 'VOLTAGE Y', 'VOLTAGE_Y', 'VY', 'V_Y', 'UB', 'U2', 'LINE VOLTS (Y)', 'VOLTAGE Y-PHASE', 'Voltage-Y'],
    vB: ['3,170', '3,165', 'VOLTAGE B', 'VOLTAGE_B', 'VB', 'V_B', 'UC', 'U3', 'LINE VOLTS (B)', 'VOLTAGE B-PHASE', 'Voltage-B'],
    iR: ['3,171', '3,166', 'CURRENT R', 'CURRENT_R', 'IR', 'I_R', 'IA', 'A1', 'LINE AMPS (R)', 'R-CURRENT', 'R-Current'],
    iY: ['3,172', '3,167', 'CURRENT Y', 'CURRENT_Y', 'IY', 'I_Y', 'A2', 'LINE AMPS (Y)', 'Y-CURRENT', 'Y-current', 'Y-Current'],
    iB: ['3,173', '3,168', 'CURRENT B', 'CURRENT_B', 'IB', 'I_B', 'IC', 'A3', 'LINE AMPS (B)', 'B-CURRENT', 'B-current', 'B-Current'],
    pf: ['3,174', 'POWER FACTOR', 'PF', 'SYSTEM PF', 'POWER_FACTOR'],
    activePower: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER', 'Total KW'],
    apparentPower: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER', 'Total KVA'],
    reactivePower: ['3,192', 'REACTIVE POWER', 'REACTIVE_POWER'],
    freq: ['3,153', 'FREQUENCY', 'FREQ', '50HZ', 'F', 'HZ'],
    cumulativekWh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
  };

  const getTelemetryValue = (template, sectionKey, fieldKey) => {
    if (!template?.mapping?.[sectionKey]) return null;
    const config = template.mapping[sectionKey];
    if (config.enabled === false) return null;
    const fieldVal = config[fieldKey];
    if (!fieldVal) return null;

    let targetModuleId = config.module;
    let cleanKey = fieldVal;

    if (typeof fieldVal === 'string' && fieldVal.includes('::')) {
      const parts = fieldVal.split('::');
      targetModuleId = parts[0];
      cleanKey = parts[1];
    } else if (typeof fieldVal === 'string' && fieldVal.includes(':')) {
      const parts = fieldVal.split(':');
      targetModuleId = parts[0];
      cleanKey = parts.pop();
    }

    const stat = telemetryStats.find(
      item => item && (String(item.moduleId) === String(targetModuleId) || String(item.meta?.module_id) === String(targetModuleId))
    );

    if (!stat || !stat.meta) return null;

    if (cleanKey && stat.meta[cleanKey] !== undefined) return stat.meta[cleanKey];
    if (stat.meta[fieldVal] !== undefined) return stat.meta[fieldVal];

    if (cleanKey) {
      const cleanKeyLower = cleanKey.toLowerCase().trim();
      const foundKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === cleanKeyLower);
      if (foundKey && stat.meta[foundKey] !== undefined) return stat.meta[foundKey];
    }

    if (typeof fieldVal === 'string' && fieldVal.includes('] ')) {
      let inner = fieldVal.split('] ')[1];
      if (inner) {
        if (inner.includes(' | ')) {
          const afterPipe = inner.split(' | ')[1];
          if (afterPipe) {
            const actualKey = afterPipe.split(' (')[0].trim();
            if (actualKey && stat.meta[actualKey] !== undefined) return stat.meta[actualKey];
            const foundPipeKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === actualKey.toLowerCase().trim());
            if (foundPipeKey && stat.meta[foundPipeKey] !== undefined) return stat.meta[foundPipeKey];
          }
          const beforePipe = inner.split(' | ')[0].split(' (')[0].trim();
          if (beforePipe && stat.meta[beforePipe] !== undefined) return stat.meta[beforePipe];
          const foundBeforePipeKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === beforePipe.toLowerCase().trim());
          if (foundBeforePipeKey && stat.meta[foundBeforePipeKey] !== undefined) return stat.meta[foundBeforePipeKey];
        } else {
          const innerKey = inner.split(' (')[0].trim();
          if (innerKey && stat.meta[innerKey] !== undefined) return stat.meta[innerKey];
          const foundInnerKey = Object.keys(stat.meta).find(k => k.toLowerCase().trim() === innerKey.toLowerCase().trim());
          if (foundInnerKey && stat.meta[foundInnerKey] !== undefined) return stat.meta[foundInnerKey];
        }
      }
    }

    const synonyms = PARAMETER_SYNONYMS[fieldKey] || [];
    for (const sym of synonyms) {
      if (stat.meta[sym] !== undefined) return stat.meta[sym];
      const matchedKey = Object.keys(stat.meta).find(k =>
        k.toUpperCase() === sym.toUpperCase() ||
        k.toUpperCase().replace(/[^A-Z0-9]/g, '') === sym.toUpperCase().replace(/[^A-Z0-9]/g, '')
      );
      if (matchedKey && stat.meta[matchedKey] !== undefined) return stat.meta[matchedKey];
    }

    return null;
  };

  const isTemplateOnline = (template) => {
    if (!template?.mapping) return false;
    const deviceId = template.mapping?.deviceId || template.mapping?.emChangeConfig?.device;
    const gatewayUuid = template.mapping?.gatewayUuid;
    if (deviceId && getOverallStatus(deviceId, gatewayUuid)) return true;

    const activeModules = new Set();
    ['emChangeConfig', 'emWarningConfig', 'emReadConfig', 'emVoltageConfig', 'emCurrentConfig', 'emPowerConfig', 'emSystemConfig']
      .forEach(key => {
        const cfg = template.mapping?.[key];
        if (cfg?.enabled !== false && cfg?.module) activeModules.add(String(cfg.module));
      });

    const matchingStats = telemetryStats.filter(
      stat => stat && (activeModules.has(String(stat.moduleId)) || activeModules.has(String(stat.meta?.module_id)))
    );

    if (matchingStats.length === 0) return false;

    const TELEMETRY_FRESHNESS_MS = 24 * 60 * 60 * 1000;
    return matchingStats.some(stat => {
      if (stat?.meta?.created_at_timestamp) {
        const raw = stat.meta.created_at_timestamp;
        const tsMs = raw > 1e12 ? raw : raw * 1000;
        return (Math.abs(Date.now() - tsMs) < TELEMETRY_FRESHNESS_MS);
      }
      return false;
    });
  };

  const mainMeterTemplates = useMemo(
    () => Array.isArray(templates) ? templates.filter(template => template.module === 'Main Meter') : [],
    [templates]
  );

  const subMeterTemplates = useMemo(
    () => Array.isArray(templates) ? templates.filter(template => template.module === 'Sub Meters') : [],
    [templates]
  );

  const extractMeterParameters = (template, isMain, index) => {
    const isOnline = isTemplateOnline(template);
    
    // Extracting comprehensive parameters exactly as requested
    const loadKw = getTelemetryValue(template, 'emChangeConfig', 'totalKw') ?? getTelemetryValue(template, 'emPowerConfig', 'activePower');
    const loadKva = getTelemetryValue(template, 'emChangeConfig', 'totalKva') ?? getTelemetryValue(template, 'emPowerConfig', 'apparentPower');
    const reactivePower = getTelemetryValue(template, 'emChangeConfig', 'reactivePower') ?? getTelemetryValue(template, 'emPowerConfig', 'reactivePower');
    const freq = getTelemetryValue(template, 'emChangeConfig', 'freq') ?? getTelemetryValue(template, 'emSystemConfig', 'freq');
    const kwh = getTelemetryValue(template, 'emReadConfig', 'ebKwh') ?? getTelemetryValue(template, 'emChangeConfig', 'ebKwh') ?? getTelemetryValue(template, 'emConsumptionConfig', 'cumulativekWh');
    const kvah = getTelemetryValue(template, 'emReadConfig', 'ebKvah') ?? getTelemetryValue(template, 'emChangeConfig', 'ebKvah');

    const vR = getTelemetryValue(template, 'emChangeConfig', 'vR') ?? getTelemetryValue(template, 'emVoltageConfig', 'vR');
    const vY = getTelemetryValue(template, 'emChangeConfig', 'vY') ?? getTelemetryValue(template, 'emVoltageConfig', 'vY');
    const vB = getTelemetryValue(template, 'emChangeConfig', 'vB') ?? getTelemetryValue(template, 'emVoltageConfig', 'vB');

    const iR = getTelemetryValue(template, 'emChangeConfig', 'iR') ?? getTelemetryValue(template, 'emCurrentConfig', 'iR');
    const iY = getTelemetryValue(template, 'emChangeConfig', 'iY') ?? getTelemetryValue(template, 'emCurrentConfig', 'iY');
    const iB = getTelemetryValue(template, 'emChangeConfig', 'iB') ?? getTelemetryValue(template, 'emCurrentConfig', 'iB');

    const pf = getTelemetryValue(template, 'emChangeConfig', 'pf') ?? getTelemetryValue(template, 'emSystemConfig', 'pf');

    return {
      id: `${isMain ? 'MAIN' : 'SM'}-${template.id || index + 1}`,
      templateId: String(template.id || index + 1),
      name: template.mapping?.energyMeteringTarget || template.name || `${isMain ? 'Main Feed' : 'Sub Meter'} ${index + 1}`,
      category: isMain ? 'Main Feed' : resolveSubMeterCategory(template),
      isMain,
      isOnline,
      status: isOnline ? 'Running' : 'Offline',
      path: isMain ? '/energy-metering/main' : '/energy-metering/sub',
      
      // Core Parameters
      loadKw: isOnline ? parseNumber(loadKw) : 0,
      loadKva: isOnline ? parseNumber(loadKva) : 0,
      reactivePower: isOnline ? parseNumber(reactivePower) : 0,
      freq: isOnline ? parseNumber(freq, 2) : 0,
      kwh: parseNumber(kwh),
      kvah: parseNumber(kvah),
      pf: isOnline ? parseNumber(pf, 2) : 0,

      // Phases
      vR: isOnline ? parseNumber(vR) : 0,
      vY: isOnline ? parseNumber(vY) : 0,
      vB: isOnline ? parseNumber(vB) : 0,
      iR: isOnline ? parseNumber(iR) : 0,
      iY: isOnline ? parseNumber(iY) : 0,
      iB: isOnline ? parseNumber(iB) : 0,
    };
  };

  const meterRows = useMemo(() => {
    const rows = [];
    mainMeterTemplates.forEach((template, index) => {
      rows.push(extractMeterParameters(template, true, index));
    });
    subMeterTemplates.forEach((template, index) => {
      rows.push(extractMeterParameters(template, false, index));
    });
    return rows;
  }, [mainMeterTemplates, subMeterTemplates, telemetryStats, getOverallStatus]);

  const mainMeterRow = useMemo(() => {
    const mainRows = meterRows.filter(row => row.isMain);
    return mainRows.find(row => row.isOnline) || mainRows[0];
  }, [meterRows]);

  const subMeterRows = meterRows.filter(row => !row.isMain);

  const inspectionMainMeter = useMemo(() => {
    if (!selectedMainMeterId) {
      const mainMeters = meterRows.filter(m => m.isMain);
      return mainMeters[0] || meterRows[0] || null;
    }
    return meterRows.find(m => m.id === selectedMainMeterId) || null;
  }, [selectedMainMeterId, meterRows]);

  const inspectionSubMeter = useMemo(() => {
    if (!selectedSubMeterId) {
      const subMeters = meterRows.filter(m => !m.isMain);
      return subMeters[0] || meterRows[1] || meterRows[0] || null;
    }
    return meterRows.find(m => m.id === selectedSubMeterId) || null;
  }, [selectedSubMeterId, meterRows]);

  const groupLookup = useMemo(() => {
    const map = new Map();
    meterGroups.forEach(group => {
      (group.meterIds || []).forEach(id => {
        map.set(String(id), group);
      });
    });
    return map;
  }, [meterGroups]);

  const groupedCollections = useMemo(() => {
    return meterGroups
      .map((group, index) => {
        const meters = subMeterRows.filter(row => groupLookup.get(String(row.templateId))?.id === group.id);
        
        // Aggregate totals for the group
        const totalLoadKw = meters.reduce((sum, row) => sum + row.loadKw, 0);
        const totalLoadKva = meters.reduce((sum, row) => sum + row.loadKva, 0);
        const totalKwh = meters.reduce((sum, row) => sum + row.kwh, 0);
        const totalKvah = meters.reduce((sum, row) => sum + row.kvah, 0);
        
        const onlineCount = meters.filter(row => row.isOnline).length;
        
        return {
          id: group.id || `group-${index}`,
          name: group.name || `Group ${index + 1}`,
          color: group.color || getCategoryColor('Sub Meter'),
          meters,
          totalLoadKw,
          totalLoadKva,
          totalKwh,
          totalKvah,
          onlineCount
        };
      })
      .filter(group => group.meters.length > 0)
      .sort((a, b) => b.totalLoadKw - a.totalLoadKw); // SORT DESCENDING BY LOAD (KW) AS REQUESTED
  }, [meterGroups, subMeterRows, groupLookup]);

  useEffect(() => {
    setGroupDrafts(prev => {
      if (prev.length === 0) {
        return normalizeOverviewGroups(meterGroups, subMeterRows);
      }
      return normalizeOverviewGroups(prev, subMeterRows);
    });
  }, [meterGroups, subMeterRows]);

  const ungroupedMeters = useMemo(
    () => subMeterRows.filter(row => !groupLookup.has(String(row.templateId))),
    [subMeterRows, groupLookup]
  );

  const headlineMetrics = useMemo(() => {
    const mainRows = meterRows.filter(row => row.isMain && row.isOnline);
    const totalLoad = mainRows.length > 0
      ? mainRows.reduce((sum, row) => sum + row.loadKw, 0)
      : subMeterRows.reduce((sum, row) => sum + row.loadKw, 0);
    const onlineMeters = meterRows.filter(row => row.isOnline).length;
    const groupedMeters = groupedCollections.reduce((sum, group) => sum + group.meters.length, 0);
    return {
      totalLoad,
      onlineMeters,
      groupedMeters,
      totalMeters: meterRows.length,
      ungroupedMeters: ungroupedMeters.length,
    };
  }, [subMeterRows, meterRows, groupedCollections, ungroupedMeters]);

  const openGroupManager = () => {
    setGroupDrafts(normalizeOverviewGroups(meterGroups, subMeterRows));
    setShowGroupManager(true);
  };

  const handleEditGroup = (groupId) => {
    const orderedDrafts = [
      ...groupDrafts.filter(group => group.id === groupId),
      ...groupDrafts.filter(group => group.id !== groupId)
    ];
    setGroupDrafts(orderedDrafts.length ? orderedDrafts : normalizeOverviewGroups(meterGroups, subMeterRows));
    setShowGroupManager(true);
  };

  const getDraftAssignedGroupForMeter = (templateId, currentGroupId = null) => {
    const targetId = String(templateId);
    return groupDrafts.find(
      group => group.id !== currentGroupId && group.meterIds.includes(targetId)
    );
  };

  const getDraftMeterOptions = (groupId) =>
    [...subMeterRows].sort((left, right) => {
      const leftKey = String(left.templateId);
      const rightKey = String(right.templateId);
      const currentGroup = groupDrafts.find(group => group.id === groupId);
      const leftChecked = currentGroup?.meterIds.includes(leftKey);
      const rightChecked = currentGroup?.meterIds.includes(rightKey);
      const leftAssignedElsewhere = !!getDraftAssignedGroupForMeter(leftKey, groupId);
      const rightAssignedElsewhere = !!getDraftAssignedGroupForMeter(rightKey, groupId);

      if (leftChecked !== rightChecked) return leftChecked ? -1 : 1;
      if (leftAssignedElsewhere !== rightAssignedElsewhere) return leftAssignedElsewhere ? 1 : -1;
      return String(left.name || '').localeCompare(String(right.name || ''));
    });

  const duplicateDraftGroupNames = useMemo(() => {
    const counts = new Map();
    groupDrafts.forEach(group => {
      const normalizedName = String(group.name || '').trim().toLowerCase();
      if (!normalizedName) return;
      counts.set(normalizedName, (counts.get(normalizedName) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    );
  }, [groupDrafts]);

  const addDraftGroup = () => {
    setGroupDrafts(prev => [
      ...prev,
      {
        id: createGroupId(),
        name: `Group ${prev.length + 1}`,
        color: GROUP_COLORS[prev.length % GROUP_COLORS.length],
        meterIds: []
      }
    ]);
  };

  const removeDraftGroup = (groupId) => {
    setGroupDrafts(prev => prev.filter(group => group.id !== groupId));
  };
  
  const updateDraftGroup = (groupId, field, value) => {
    setGroupDrafts(prev => prev.map(group => (group.id === groupId ? { ...group, [field]: value } : group)));
  };

  const toggleDraftMeter = (groupId, templateId) => {
    const targetId = String(templateId);
    setGroupDrafts(prev => {
      const assignedElsewhere = prev.find(
        group => group.id !== groupId && group.meterIds.includes(targetId)
      );

      if (assignedElsewhere) {
        return prev;
      }

      return prev.map(group => {
        const checked = group.meterIds.includes(targetId);
        if (group.id === groupId) {
          return {
            ...group,
            meterIds: checked
              ? group.meterIds.filter(id => id !== targetId)
              : [...group.meterIds, targetId]
          };
        }
        return group;
      });
    });
  };

  const saveGroupsToBackend = async (groupsToSave) => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const tenantId = userData?.tenantId;
    const normalized = normalizeOverviewGroups(groupsToSave, subMeterRows);
    const response = await fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates/energy-meter-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups: normalized, tenantId })
    });

    if (!response.ok) {
      throw new Error('Failed to save energy meter groups');
    }

    const data = await response.json();
    const saved = normalizeOverviewGroups(data?.groups || normalized, subMeterRows);
    setMeterGroups(saved);
    setGroupDrafts(saved);
    window.dispatchEvent(new Event(GROUP_EVENT_NAME));
    return saved;
  };

  const handleSaveDraftGroups = async () => {
    if (duplicateDraftGroupNames.size > 0) {
      setGroupActionStatus('Use unique group names');
      setSaveSuccessMessage('Group name already exists');
      setSaveSuccess(true);
      setTimeout(() => setGroupActionStatus(null), 3000);
      setTimeout(() => setSaveSuccess(false), 2200);
      return;
    }

    try {
      await saveGroupsToBackend(groupDrafts);
      setGroupActionStatus('Group settings saved');
      setSaveSuccessMessage('Group saved successfully');
      setSaveSuccess(true);
      setShowGroupManager(false);
    } catch (error) {
      console.error('Failed to save groups from overview:', error);
      setGroupActionStatus('Database save failed');
      setSaveSuccessMessage('Could not save group to database');
      setSaveSuccess(true);
    } finally {
      setTimeout(() => setGroupActionStatus(null), 3000);
      setTimeout(() => setSaveSuccess(false), 2200);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const nextGroups = meterGroups.filter(group => group.id !== groupId);

    setMeterGroups(nextGroups);
    setGroupDrafts(nextGroups);

    try {
      await saveGroupsToBackend(nextGroups);
      setGroupActionStatus('Group deleted');
      setSaveSuccessMessage('Group deleted successfully');
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to delete group from overview:', error);
      setGroupActionStatus('Database delete failed');
      setSaveSuccessMessage('Could not delete group from database');
      setSaveSuccess(true);
    } finally {
      setTimeout(() => setGroupActionStatus(null), 3000);
      setTimeout(() => setSaveSuccess(false), 2600);
    }
  };

  const handleRemoveMeterFromGroup = async (groupId, templateId) => {
    const nextGroups = meterGroups.map(group =>
      group.id === groupId
        ? { ...group, meterIds: group.meterIds.filter(id => String(id) !== String(templateId)) }
        : group
    );

    setMeterGroups(nextGroups);
    setGroupDrafts(nextGroups);

    try {
      await saveGroupsToBackend(nextGroups);
      setGroupActionStatus('Meter removed');
      setSaveSuccessMessage('Meter removed from group successfully');
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to remove meter from group:', error);
      setGroupActionStatus('Database update failed');
      setSaveSuccessMessage('Could not update group in database');
      setSaveSuccess(true);
    } finally {
      setTimeout(() => setGroupActionStatus(null), 3000);
      setTimeout(() => setSaveSuccess(false), 2400);
    }
  };

  return (
    <div className="fade-in energy-overview-page p-0 m-0" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      <style>{`
        .scada-main-content { padding: 84px 0 0 0 !important; }
        .scada-main-content > main { padding: 0 !important; }
        /* Fix the header spacer so it doesn't push the dashboard down unnecessarily */
        .scada-main-content > div[style*="height: 60px"] { display: none !important; }
      `}</style>
      <SolarDashboard 
        mainMeters={meterRows.filter(row => row.isMain)} 
        subMeters={subMeterRows} 
      />
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error in Overview:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#0f172a', color: '#f8fafc', fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ color: '#ef4444', fontWeight: 900 }}>Render Error Encountered</h2>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
            <h5 style={{ color: '#fca5a5', fontWeight: 800 }}>Error Message:</h5>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#f8fafc' }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
          {this.state.errorInfo && (
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.1)' }}>
              <h5 style={{ color: '#cbd5e1', fontWeight: 800 }}>Component Stack:</h5>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#94a3b8', fontSize: '0.85rem' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}
          <div>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: '12px 24px', background: '#0284c7', border: 'none', color: '#fff', borderRadius: '999px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(2,132,199,0.4)' }}
            >
              Clear Storage Cache & Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SafeEnergyMeteringOverview = () => (
  <ErrorBoundary>
    <EnergyMeteringOverview />
  </ErrorBoundary>
);

export default SafeEnergyMeteringOverview;
