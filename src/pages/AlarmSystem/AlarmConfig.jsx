import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner } from 'react-bootstrap';
import { FiPlus, FiMail, FiBell, FiCheckCircle, FiXCircle, FiInbox, FiEdit2, FiTrash2, FiX, FiChevronRight, FiZap, FiAlertCircle, FiMessageSquare } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import RuleEditModal from './RuleEditModal';
import { 
  loginToSochiot, 
  getSochiotUserMe, 
  getSochiotZoneData, 
  getSochiotLocationData,
  getSochiotRules,
  getSochiotRuleById,
  updateSochiotRule,
  createSochiotRule,
  getSochiotEventFields,
  activateSochiotRule,
  deactivateSochiotRule,
  deleteSochiotRule
} from '../../services/authService';

const deduplicateTemplates = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter(item => {
    const key = `${item.name?.trim()}-${item.content?.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ALARM_TEMPLATES = {
  'Water Management': [
    { name: 'Tank Level Low', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '20', defaultDebounce: 10, icon: '💧' },
    { name: 'Tank Level High', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '95', defaultDebounce: 10, icon: '🌊' },
    { name: 'Pump Overload', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '15', defaultDebounce: 5, icon: '⚡' },
  ],
  'Energy Metering': [
    { name: 'Over Voltage', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '440', defaultDebounce: 10, icon: '🔌' },
    { name: 'Under Voltage', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '380', defaultDebounce: 10, icon: '🔋' },
    { name: 'Over Current', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '100', defaultDebounce: 5, icon: '⚠️' },
    { name: 'Low Power Factor', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '0.8', defaultDebounce: 15, icon: '📉' },
  ],
  'DG Set': [
    { name: 'Engine Overheat', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '95', defaultDebounce: 10, icon: '🌡️' },
    { name: 'Low Oil Pressure', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '25', defaultDebounce: 5, icon: '🛢️' },
    { name: 'Low Fuel Level', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '10', defaultDebounce: 30, icon: '⛽' },
    { name: 'Battery Low', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '11', defaultDebounce: 10, icon: '🔋' },
  ],
  'Fire System': [
    { name: 'Low Header Pressure', defaultCondition: 'IS_LESS_THAN', defaultThreshold: '3', defaultDebounce: 5, icon: '🚒' },
    { name: 'Jockey Pump Failure', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '0', defaultDebounce: 10, icon: '🔧' },
  ],
  'HVAC': [
    { name: 'Chiller Overload', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '90', defaultDebounce: 10, icon: '❄️' },
    { name: 'AHU Fan Failure', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '0', defaultDebounce: 5, icon: '🌀' },
    { name: 'Cooling Tower High Temp', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '40', defaultDebounce: 15, icon: '🌡️' },
  ],
  'Transformer': [
    { name: 'Winding Temp High', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '85', defaultDebounce: 10, icon: '🔥' },
    { name: 'Oil Temp High', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '75', defaultDebounce: 10, icon: '🛢️' },
    { name: 'Overload', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '100', defaultDebounce: 5, icon: '⚡' },
  ],
  'LT Panel': [
    { name: 'Breaker Trip', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '0', defaultDebounce: 5, icon: '🔌' },
    { name: 'Over Current', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '80', defaultDebounce: 10, icon: '⚠️' },
  ],
  'Motors': [
    { name: 'Motor Overload', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '100', defaultDebounce: 5, icon: '⚙️' },
    { name: 'VFD Fault', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '1', defaultDebounce: 5, icon: '🔧' },
  ],
  'VRV': [
    { name: 'Communication Error', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '1', defaultDebounce: 5, icon: '📶' },
    { name: 'Compressor High Temp', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '90', defaultDebounce: 10, icon: '🌡️' },
  ],
  'AQI Sensor': [
    { name: 'PM2.5 High', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '100', defaultDebounce: 30, icon: '🌫️' },
    { name: 'CO2 High', defaultCondition: 'IS_GREATER_THAN', defaultThreshold: '1000', defaultDebounce: 30, icon: '💨' },
  ],
  'AC': [
    { name: 'Filter Blocked', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '1', defaultDebounce: 10, icon: '🌬️' },
    { name: 'Compressor Fault', defaultCondition: 'IS_EQUAL_TO', defaultThreshold: '1', defaultDebounce: 5, icon: '❄️' },
  ]
};

const SUB_CATEGORIES = {
  'Water Management': ['AG Tank', 'UG Tank', 'Domestic / Flushing', 'OHT Level'],
  'Energy Metering': ['Main Meter', 'Sub Meter'],
  'DG Set': ['DG-1', 'DG-2', 'DG-3'],
  'Fire System': ['Main Fire Pump', 'Jockey Pump', 'Diesel Pump'],
  'HVAC': ['Chiller', 'AHU', 'Cooling Tower'],
  'Transformer': ['Transformer-1', 'Transformer-2'],
  'LT Panel': ['LT Room 1', 'LT Room 2', 'LT Room 3'],
  'Motors': ['Pump Room 1', 'Pump Room 2'],
  'VRV': ['ODU-1', 'ODU-2'],
  'AQI Sensor': ['Zone-1', 'Zone-2'],
  'AC': ['AC-1', 'AC-2']
};

const CONDITION_OPTIONS = [
  { value: 'IS_GREATER_THAN', label: 'Is Greater Than' },
  { value: 'IS_LESS_THAN', label: 'Is Less Than' },
  { value: 'IS_EQUAL_TO', label: 'Is Equal To' },
  { value: 'IS_NOT_EQUAL_TO', label: 'Is Not Equal To' },
  { value: 'IS_GREATER_THAN_OR_EQUAL_TO', label: 'Is Greater Than Or Equal To' },
  { value: 'IS_LESS_THAN_OR_EQUAL_TO', label: 'Is Less Than Or Equal To' },
];

const ENERGY_PARAMETERS = [
  { value: 'Current R-Phase', label: 'Current R-Phase (A)', icon: '🔴' },
  { value: 'Current Y-Phase', label: 'Current Y-Phase (A)', icon: '🟡' },
  { value: 'Current B-Phase', label: 'Current B-Phase (A)', icon: '🔵' },
  { value: 'Voltage RN', label: 'Voltage RN (Phase-to-Neutral)', icon: '🔌' },
  { value: 'Voltage YN', label: 'Voltage YN (Phase-to-Neutral)', icon: '🔌' },
  { value: 'Voltage BN', label: 'Voltage BN (Phase-to-Neutral)', icon: '🔌' },
  { value: 'Voltage RY', label: 'Voltage RY (Phase-to-Phase)', icon: '⚡' },
  { value: 'Voltage YB', label: 'Voltage YB (Phase-to-Phase)', icon: '⚡' },
  { value: 'Voltage BR', label: 'Voltage BR (Phase-to-Phase)', icon: '⚡' },
  { value: 'Power kVA', label: 'Power (kVA)', icon: '📈' },
  { value: 'Frequency', label: 'Frequency (Hz)', icon: '〰️' },
  { value: 'Power Factor', label: 'Power Factor (PF)', icon: '📉' }
];

const getParamMeta = (paramName) => {
  switch (paramName) {
    case 'Current R-Phase': return { displayName: 'Current R-Phase', unit: 'A', id: 3271, name: 'Current' };
    case 'Current Y-Phase': return { displayName: 'Current Y-Phase', unit: 'A', id: 3272, name: 'Current' };
    case 'Current B-Phase': return { displayName: 'Current B-Phase', unit: 'A', id: 3273, name: 'Current' };
    case 'Voltage RN': return { displayName: 'Voltage-R', unit: 'V', id: 3266, name: 'Voltage' };
    case 'Voltage YN': return { displayName: 'Voltage-Y', unit: 'V', id: 3267, name: 'Voltage' };
    case 'Voltage BN': return { displayName: 'Voltage-B', unit: 'V', id: 3268, name: 'Voltage' };
    case 'Voltage RY': return { displayName: 'Voltage-RY', unit: 'V', id: 3269, name: 'Voltage' };
    case 'Voltage YB': return { displayName: 'Voltage-YB', unit: 'V', id: 3270, name: 'Voltage' };
    case 'Voltage BR': return { displayName: 'Voltage-BR', unit: 'V', id: 3271, name: 'Voltage' };
    case 'Power kVA': return { displayName: 'Total kVA', unit: 'kVA', id: 3274, name: 'kva' };
    case 'Frequency': return { displayName: 'Frequency', unit: 'Hz', id: 3275, name: 'Frequency' };
    case 'Power Factor': return { displayName: 'Power Factor', unit: '', id: 3276, name: 'Power Factor' };
    default: return { displayName: paramName, unit: '', id: 3200, name: paramName };
  }
};

const getFieldNameFromParam = (paramName, mapping) => {
  if (!mapping) return null;
  const findVal = (key) => {
    const sections = ['emChangeConfig', 'emCurrentConfig', 'emVoltageConfig', 'emSystemConfig', 'emPowerConfig', 'emConsumptionConfig'];
    for (const sec of sections) {
      if (mapping[sec]?.[key]) return mapping[sec][key];
    }
    return null;
  };

  let addressStr = null;
  switch (paramName) {
    case 'Current R-Phase': addressStr = findVal('iR'); break;
    case 'Current Y-Phase': addressStr = findVal('iY'); break;
    case 'Current B-Phase': addressStr = findVal('iB'); break;
    case 'Voltage RN': addressStr = findVal('vR'); break;
    case 'Voltage YN': addressStr = findVal('vY'); break;
    case 'Voltage BN': addressStr = findVal('vB'); break;
    case 'Voltage RY': addressStr = findVal('vRY'); break;
    case 'Voltage YB': addressStr = findVal('vYB'); break;
    case 'Voltage BR': addressStr = findVal('vBR'); break;
    case 'Power kVA': addressStr = findVal('totalKva') || findVal('apparentPower'); break;
    case 'Frequency': addressStr = findVal('freq'); break;
    case 'Power Factor': addressStr = findVal('pf'); break;
    default: break;
  }
  
  if (addressStr && addressStr.includes('::')) {
    return addressStr.split('::')[1];
  }
  return null;
};

const AlarmConfig = () => {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem('userRole') || 'USER';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  
  // Hierarchy Data States
  const [hierarchyData, setHierarchyData] = useState([]);
  const [globalLocation, setGlobalLocation] = useState({
    organization: '', client: '', zone: '', subZone: '', building: '', gateway: ''
  });
  
  const [locationIdMap, setLocationIdMap] = useState({});
  const [zoneIdMap, setZoneIdMap] = useState({});
  const [locationDetails, setLocationDetails] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({
    fields: [], modules: [], devices: [], locations: []
  });

  // Rule Engine States
  const [rules, setRules] = useState([]);
  const [totalRules, setTotalRules] = useState(0);
  const [emailGroups, setEmailGroups] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Rule Detail Panel States
  const [selectedRule, setSelectedRule] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [editName, setEditName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Admin alarm configuration states
  const [modulesConfig, setModulesConfig] = useState(() => JSON.parse(localStorage.getItem('scada_modules_config') || '{}'));

  useEffect(() => {
    const updateConfig = () => {
      const saved = localStorage.getItem('scada_modules_config');
      if (saved) setModulesConfig(JSON.parse(saved));
    };
    window.addEventListener('storage-update', updateConfig);
    return () => window.removeEventListener('storage-update', updateConfig);
  }, []);

  const getVisibleCategories = () => {
    if (Object.keys(modulesConfig).length === 0 || isSuperAdmin) return Object.keys(ALARM_TEMPLATES);
    return Object.keys(ALARM_TEMPLATES).filter(cat => {
      if (cat === 'Fire System') return modulesConfig['Fire'] !== false;
      return modulesConfig[cat] !== false;
    });
  };
  const visibleCategories = getVisibleCategories();

  const [adminSelectedCategory, setAdminSelectedCategory] = useState(visibleCategories.length > 0 ? visibleCategories[0] : Object.keys(ALARM_TEMPLATES)[0]);
  const defaultSub = SUB_CATEGORIES[visibleCategories.length > 0 ? visibleCategories[0] : Object.keys(ALARM_TEMPLATES)[0]];
  const [adminSubCategory, setAdminSubCategory] = useState(defaultSub ? defaultSub[0] : '');
  
  const [adminAlarmValues, setAdminAlarmValues] = useState(() => {
    // Initialize with defaults from templates
    const initial = {};
    Object.entries(ALARM_TEMPLATES).forEach(([cat, alarms]) => {
      const subs = SUB_CATEGORIES[cat] || [cat];
      if (cat === 'Energy Metering') {
        subs.forEach(sub => {
          initial[`${cat} - ${sub}`] = [];
        });
      } else {
        subs.forEach(sub => {
          initial[`${cat} - ${sub}`] = alarms.map(a => ({
            name: a.name,
            condition: a.defaultCondition,
            threshold: a.defaultThreshold,
            debounce: a.defaultDebounce,
            icon: a.icon,
          }));
        });
      }
    });
    return initial;
  });
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSaveMsg, setAdminSaveMsg] = useState(null);

  // States for Energy Metering alarms
  const [selectedEnergyParam, setSelectedEnergyParam] = useState('Current R-Phase');
  const [energyCondition, setEnergyCondition] = useState('IS_GREATER_THAN');
  const [energyThreshold, setEnergyThreshold] = useState('');
  const [energyDebounce, setEnergyDebounce] = useState('10');
  const [energyMessage, setEnergyMessage] = useState('');
  const [editingEnergyAlarm, setEditingEnergyAlarm] = useState(null);

  // States for Message Templates
  const [messageTemplates, setMessageTemplates] = useState(() => {
    const uRole = localStorage.getItem('userRole') || 'USER';
    const sKey = uRole === 'SUPER_ADMIN' ? 'super_admin_alarm_message_templates' : 'admin_alarm_message_templates';
    const saved = localStorage.getItem(sKey);
    const parsed = saved ? JSON.parse(saved) : [
      { id: '1', name: 'Critical Alert', content: 'CRITICAL ALERT: [Parameter] has crossed [Condition] [Threshold] value. Immediate action required!' },
      { id: '2', name: 'Warning Alert', content: 'Warning: [Parameter] is [Condition] [Threshold].' },
      { id: '3', name: 'Status Notification', content: 'Notification: [Parameter] current value is [Value].' }
    ];
    return deduplicateTemplates(parsed);
  });

  // Energy Meter templates and selection states
  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('scada_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [energyActive, setEnergyActive] = useState(true);

  // Fetch templates on mount
  useEffect(() => {
    fetch(`${window.process?.env?.REACT_APP_BACKEND_URL || ''}/api/templates`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
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
        setTemplates(mapped);
        localStorage.setItem('scada_templates', JSON.stringify(mapped));
      })
      .catch(err => console.error('Error fetching templates in AlarmConfig:', err));
  }, []);

  // Filter meters based on current sub category
  const getMetersForSubCategory = () => {
    if (adminSubCategory === 'Main Meter') {
      return templates.filter(t => t.module === 'Main Meter');
    }
    if (adminSubCategory === 'Sub Meter') {
      return templates.filter(t => t.module === 'Sub Meters');
    }
    return [];
  };

  const currentSubCategoryMeters = getMetersForSubCategory();

  // Select first meter of the sub-category when it changes
  useEffect(() => {
    const meters = getMetersForSubCategory();
    if (meters.length > 0) {
      setSelectedMeterId(String(meters[0].id));
    } else {
      setSelectedMeterId('');
    }
  }, [adminSubCategory, templates]);

  // Load saved admin config & message templates on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
    if (Object.keys(saved).length > 0) {
      setAdminAlarmValues(prev => {
        const merged = { ...prev };
        Object.entries(saved).forEach(([catKey, alarms]) => {
          merged[catKey] = alarms;
        });
        return merged;
      });
    }
    const uRole = localStorage.getItem('userRole') || 'USER';
    const sKey = uRole === 'SUPER_ADMIN' ? 'super_admin_alarm_message_templates' : 'admin_alarm_message_templates';
    const savedTemplates = localStorage.getItem(sKey);
    if (savedTemplates) {
      setMessageTemplates(deduplicateTemplates(JSON.parse(savedTemplates)));
    }
  }, []);

  // Auto-sync: fetch Sochiot rules and patch local alarms missing sochiotRuleId
  useEffect(() => {
    if (isSuperAdmin) return; // Only for admin view

    const syncRuleIds = async () => {
      try {
        // Ensure token is valid
        let userData = await getSochiotUserMe();
        if (!userData) {
          await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
        }

        // Fetch rules from Sochiot (LOCATION nodeId=7)
        const rulesData = await getSochiotRules('LOCATION', '7', 1);
        const sochiotRules = rulesData?.list || [];
        if (sochiotRules.length === 0) return;

        console.log('[Sync] Sochiot rules fetched:', sochiotRules.length, sochiotRules.map(r => ({ id: r.id, name: r.name, active: r.active })));

        // Only patch alarms that have NO sochiotRuleId yet — never clear existing valid IDs
        const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
        let changed = false;

        Object.entries(saved).forEach(([catKey, alarms]) => {
          if (!Array.isArray(alarms)) return;
          alarms.forEach((alarm, idx) => {
            if (alarm.sochiotRuleId) return; // already linked — do NOT overwrite

            // Try to match by name abbreviation
            const paramAbbr = alarm.name.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
            const matched = sochiotRules.find(r =>
              r.name && r.name.toUpperCase().includes(paramAbbr)
            );

            if (matched) {
              console.log(`[Sync] Matched alarm "${alarm.name}" → Sochiot rule ID ${matched.id} (${matched.name})`);
              saved[catKey][idx] = { ...alarm, sochiotRuleId: matched.id, active: matched.active };
              changed = true;
            }
          });
        });

        if (changed) {
          localStorage.setItem('admin_alarm_config', JSON.stringify(saved));
          setAdminAlarmValues(prev => {
            const merged = { ...prev };
            Object.entries(saved).forEach(([catKey, alarms]) => {
              merged[catKey] = alarms;
            });
            return merged;
          });
          console.log('[Sync] Local alarms patched with Sochiot rule IDs ✅');
        }
      } catch (err) {
        console.warn('[Sync] Could not sync rule IDs from Sochiot:', err.message);
      }
    };

    syncRuleIds();
  }, [isSuperAdmin]);

  // Update sub category when category changes
  useEffect(() => {
    const subs = SUB_CATEGORIES[adminSelectedCategory];
    if (subs && subs.length > 0) {
      setAdminSubCategory(subs[0]);
    } else {
      setAdminSubCategory(adminSelectedCategory);
    }
  }, [adminSelectedCategory]);

  // Clear editing state on category or sub-category change
  useEffect(() => {
    setEditingEnergyAlarm(null);
    setEnergyThreshold('');
    setEnergyMessage('');
  }, [adminSelectedCategory, adminSubCategory]);

  const handleAdminFieldChange = (catKey, idx, field, value) => {
    setAdminAlarmValues(prev => {
      const copy = { ...prev };
      if (!copy[catKey]) return copy;
      copy[catKey] = [...copy[catKey]];
      copy[catKey][idx] = { ...copy[catKey][idx], [field]: value };
      
      const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
      saved[catKey] = copy[catKey];
      localStorage.setItem('admin_alarm_config', JSON.stringify(saved));
      
      return copy;
    });
  };

  const handleAdminSave = async (catKey) => {
    setAdminSaving(true);
    try {
      const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
      saved[catKey] = adminAlarmValues[catKey];
      localStorage.setItem('admin_alarm_config', JSON.stringify(saved));
      setAdminSaveMsg({ type: 'success', text: `${catKey} alarm settings saved!` });
      setTimeout(() => setAdminSaveMsg(null), 3000);
    } catch (err) {
      setAdminSaveMsg({ type: 'error', text: 'Failed to save: ' + err.message });
      setTimeout(() => setAdminSaveMsg(null), 3000);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleAddEnergyAlarm = async (sochiotRuleId = null) => {
    if (!energyThreshold) {
      alert('Please enter a threshold value');
      return;
    }

    const cleanRuleId = (sochiotRuleId && typeof sochiotRuleId === 'object' && (sochiotRuleId.target || sochiotRuleId.nativeEvent))
      ? null
      : sochiotRuleId;

    const ruleIdToUpdate = cleanRuleId || (editingEnergyAlarm ? editingEnergyAlarm.sochiotRuleId : null);

    if (editingEnergyAlarm && ruleIdToUpdate) {
      setIsCreatingRule(true);
      try {
        let userData = await getSochiotUserMe();
        if (!userData) {
          await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
        }

        const freshRule = await getSochiotRuleById(ruleIdToUpdate);
        if (!freshRule) throw new Error('Could not fetch latest rule data from Sochiot');

        const origConditions = freshRule.conditions || [];
        const origConsequences = freshRule.consequences || [];

        const payload = {
          id: freshRule.id,
          name: freshRule.name,
          active: energyActive,
          version: freshRule.version,
          dateCreated: freshRule.dateCreated,
          lastUpdated: Date.now(),
          zoneNodeType: freshRule.zoneNodeType || "LOCATION",
          nodeId: freshRule.nodeId || 7,
          emailGroupVO: freshRule.emailGroupVO || null,
          conditions: origConditions.map((c, idx) => {
            const ef = c.eventField || {};
            return {
              id: c.id,
              name: c.name,
              locationId: c.locationId || 7,
              deviceId: c.deviceId,
              moduleId: c.moduleId,
              thresholdValue: String(energyThreshold),
              logicalOperatorType: idx === 0 ? 'NONE' : (c.logicalOperatorType || 'AND'),
              debounceTime: Number(energyDebounce) || 0,
              parentId: c.parentId,
              description: c.description || "just test",
              onModuleGroup: c.onModuleGroup || false,
              moduleGroupId: c.moduleGroupId || null,
              deleted: c.deleted || false,
              // ✅ conditionType must be a plain string (Java enum) — NOT an object
              conditionType: (typeof c.conditionType === 'object' && c.conditionType?.name)
                ? c.conditionType.name
                : (energyCondition || c.conditionType || 'IS_GREATER_THAN'),
              eventField: {
                id: ef.id,
                fieldName: ef.fieldName,
                displayName: ef.displayName,
                // ✅ fieldType must be a plain string — NOT an object
                fieldType: (typeof ef.fieldType === 'object' && ef.fieldType) ? ef.fieldType.name : (ef.fieldType || null),
                moduleTypeId: ef.moduleTypeId || 11,
                moduleTypeNumber: ef.moduleTypeNumber || 11,
                moduleTypeName: ef.moduleTypeName || "general_2023-01-11 14:28:03.234",
                // ✅ dataType must be a plain string — NOT an object
                dataType: (typeof ef.dataType === 'object' && ef.dataType?.name)
                  ? ef.dataType.name
                  : (ef.dataType || 'INTEGER'),
                // ✅ supportedValues must be a plain String — NOT an array
                supportedValues: Array.isArray(ef.supportedValues)
                  ? ef.supportedValues.join(',')
                  : (ef.supportedValues || ''),
                dateCreated: ef.dateCreated,
                lastUpdated: ef.lastUpdated,
                deleted: ef.deleted || false
              }
            };
          }),
          consequences: origConsequences.map(c => ({
            id: c.id,
            name: c.name || "Sanjay Gupta",
            parentId: c.parentId || null,
            deviceId: c.deviceId || "3e31418c-75a2-4079-befe-e5e8b0ecb33d",
            moduleId: c.moduleId || 2725,
            locationId: c.locationId || 7,
            moduleName: c.moduleName || null,
            moduleTypeId: c.moduleTypeId || 11,
            moduleTypeNumber: c.moduleTypeNumber || 11,
            moduleTypeName: c.moduleTypeName || "general_2023-01-11 14:28:03.234",
            cmdField: c.cmdField || "6,4516",
            cmdArg: c.cmdArg || "0",
            argValue: c.argValue !== undefined ? c.argValue : 0,
            // ✅ dataType must be a plain string — NOT an object
            dataType: (typeof c.dataType === 'object' && c.dataType?.name)
              ? c.dataType.name
              : (c.dataType || 'INTEGER'),
            // ✅ supportedValues must be a plain String — NOT an array
            supportedValues: Array.isArray(c.supportedValues)
              ? c.supportedValues.join(',')
              : (c.supportedValues || ''),
            dateCreated: c.dateCreated,
            lastUpdated: c.lastUpdated,
            description: c.description || "just text",
            moduleGroupId: c.moduleGroupId || null,
            onModuleGroup: c.onModuleGroup || false
          })),
          notifications: freshRule.notifications || [],
          deleted: freshRule.deleted || false,
          ready: freshRule.ready ?? true
        };

        console.log('Sending Sochiot rule update payload (PUT):', payload);
        await updateSochiotRule(ruleIdToUpdate, payload);
        setAdminSaveMsg({ type: 'success', text: `Rule "${freshRule.name}" successfully updated on Sochiot!` });
        setTimeout(() => setAdminSaveMsg(null), 4000);
      } catch (err) {
        console.error('Failed to update rule on Sochiot:', err);
        alert('Failed to update rule on Sochiot: ' + err.message);
        setIsCreatingRule(false);
        return;
      } finally {
        setIsCreatingRule(false);
      }
    }

    const paramObj = ENERGY_PARAMETERS.find(p => p.value === selectedEnergyParam);
    const newAlarm = {
      name: selectedEnergyParam,
      condition: energyCondition,
      threshold: energyThreshold,
      debounce: parseInt(energyDebounce) || 0,
      icon: paramObj?.icon || '⚠️',
      message: energyMessage,
      sochiotRuleId: ruleIdToUpdate,
      active: energyActive
    };
    
    const catKey = selectedMeterId
      ? `Energy Metering - ${adminSubCategory} - ${selectedMeterId}`
      : `Energy Metering - ${adminSubCategory}`;

    setAdminAlarmValues(prev => {
      const currentList = prev[catKey] || [];
      let filteredList = currentList;
      if (editingEnergyAlarm && editingEnergyAlarm.name !== selectedEnergyParam) {
        filteredList = filteredList.filter(a => a.name !== editingEnergyAlarm.name);
      }
      filteredList = filteredList.filter(a => a.name !== selectedEnergyParam);
      const updatedList = [...filteredList, newAlarm];
      
      const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
      saved[catKey] = updatedList;
      localStorage.setItem('admin_alarm_config', JSON.stringify(saved));
      
      return {
        ...prev,
        [catKey]: updatedList
      };
    });
    
    // Reset inputs & edit state
    setEnergyThreshold('');
    setEnergyMessage('');
    setEditingEnergyAlarm(null);
    setEnergyActive(true);

    if (!editingEnergyAlarm || !ruleIdToUpdate) {
      setAdminSaveMsg({
        type: 'success',
        text: editingEnergyAlarm
          ? `Alarm "${selectedEnergyParam}" successfully updated!`
          : `Alarm "${selectedEnergyParam}" successfully set!`
      });
      setTimeout(() => setAdminSaveMsg(null), 4000);
    }
  };

  const handleDeleteEnergyAlarm = async (paramName) => {
    const catKey = selectedMeterId
      ? `Energy Metering - ${adminSubCategory} - ${selectedMeterId}`
      : `Energy Metering - ${adminSubCategory}`;

    // Find the alarm to check if it has a linked Sochiot rule
    const currentList = adminAlarmValues[catKey] || [];
    const alarmToDelete = currentList.find(a => a.name === paramName);

    // If linked to a Sochiot rule, call DELETE API first
    if (alarmToDelete?.sochiotRuleId) {
      setIsCreatingRule(true);
      try {
        let userData = await getSochiotUserMe();
        if (!userData) {
          await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
        }
        await deleteSochiotRule(alarmToDelete.sochiotRuleId);
        setAdminSaveMsg({ type: 'success', text: `Rule deleted from Sochiot successfully!` });
        setTimeout(() => setAdminSaveMsg(null), 4000);
      } catch (err) {
        console.error('Failed to delete rule on Sochiot:', err);
        // If Sochiot says "not found" (400/404), the rule is already gone on server —
        // still remove it locally so the user is not stuck.
        const isNotFound = err.status === 400 || err.status === 404 || err.message?.toLowerCase().includes('not found');
        if (isNotFound) {
          console.warn('[Delete] Rule not found on Sochiot (already deleted or never synced). Removing locally.');
          setAdminSaveMsg({ type: 'success', text: `Alarm removed locally (rule was not found on Sochiot).` });
        } else {
          // For other errors (network, 500, etc.) — still block and show error
          setAdminSaveMsg({ type: 'error', text: `Failed to delete rule on Sochiot: ${err.message}` });
          setTimeout(() => setAdminSaveMsg(null), 4000);
          setIsCreatingRule(false);
          return; // Stop — don't remove locally if remote delete failed for unknown reason
        }
        setTimeout(() => setAdminSaveMsg(null), 4000);
      }
      setIsCreatingRule(false);
    }

    // Remove from local state + localStorage
    setAdminAlarmValues(prev => {
      const list = prev[catKey] || [];
      const updatedList = list.filter(a => a.name !== paramName);

      const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
      saved[catKey] = updatedList;
      localStorage.setItem('admin_alarm_config', JSON.stringify(saved));

      // If we are currently editing this alarm, clear editing state
      if (editingEnergyAlarm && editingEnergyAlarm.name === paramName) {
        setEditingEnergyAlarm(null);
        setEnergyThreshold('');
        setEnergyMessage('');
      }

      return {
        ...prev,
        [catKey]: updatedList
      };
    });
  };


  const toggleEnergyAlarmActive = async (alarm) => {
    if (isCreatingRule) return;
    const newActive = !(alarm.active ?? true);
    const catKey = selectedMeterId
      ? `Energy Metering - ${adminSubCategory} - ${selectedMeterId}`
      : `Energy Metering - ${adminSubCategory}`;

    console.log('[Toggle] alarm:', alarm.name, '| sochiotRuleId:', alarm.sochiotRuleId, '| newActive:', newActive);

    // Optimistically update local state first
    setAdminAlarmValues(prev => {
      const list = prev[catKey] || [];
      const updated = list.map(a => a.name === alarm.name ? { ...a, active: newActive } : a);
      const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
      saved[catKey] = updated;
      localStorage.setItem('admin_alarm_config', JSON.stringify(saved));
      return { ...prev, [catKey]: updated };
    });

    if (alarm.sochiotRuleId) {
      setIsCreatingRule(true);
      try {
        // Ensure Sochiot token is valid before making the API call
        let userData = await getSochiotUserMe();
        if (!userData) {
          console.log('[Toggle] Token expired, re-logging in to Sochiot...');
          await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
        }

        // Call activate or de-activate endpoint — same as Super Admin toggleRuleActive
        if (newActive) {
          console.log('[Toggle] Calling ACTIVATE for rule', alarm.sochiotRuleId);
          await activateSochiotRule(alarm.sochiotRuleId);
        } else {
          console.log('[Toggle] Calling DE-ACTIVATE for rule', alarm.sochiotRuleId);
          await deactivateSochiotRule(alarm.sochiotRuleId);
        }

        setAdminSaveMsg({
          type: 'success',
          text: `Rule successfully ${newActive ? 'activated' : 'deactivated'} on Sochiot!`
        });
        setTimeout(() => setAdminSaveMsg(null), 4000);
      } catch (err) {
        console.error('[Toggle] Failed:', err);
        // Revert local state on failure
        setAdminAlarmValues(prev => {
          const list = prev[catKey] || [];
          const reverted = list.map(a => a.name === alarm.name ? { ...a, active: !newActive } : a);
          const saved = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
          saved[catKey] = reverted;
          localStorage.setItem('admin_alarm_config', JSON.stringify(saved));
          return { ...prev, [catKey]: reverted };
        });
        setAdminSaveMsg({ type: 'error', text: `Failed to toggle rule: ${err.message}` });
        setTimeout(() => setAdminSaveMsg(null), 4000);
      } finally {
        setIsCreatingRule(false);
      }
    } else {
      // No sochiotRuleId — show clear warning to user
      console.warn('[Toggle] No sochiotRuleId on alarm — cannot call Sochiot API.');
      setAdminSaveMsg({
        type: 'error',
        text: `Cannot toggle: alarm "${alarm.name}" is not linked to any Sochiot rule. Please re-create this alarm.`
      });
      setTimeout(() => setAdminSaveMsg(null), 5000);
      // Revert optimistic local update since we couldn't sync
      setAdminAlarmValues(prev => {
        const list = prev[catKey] || [];
        const reverted = list.map(a => a.name === alarm.name ? { ...a, active: !newActive } : a);
        const savedRev = JSON.parse(localStorage.getItem('admin_alarm_config') || '{}');
        savedRev[catKey] = reverted;
        localStorage.setItem('admin_alarm_config', JSON.stringify(savedRev));
        return { ...prev, [catKey]: reverted };
      });
    }
  };



  const handleEditEnergyAlarm = (alarm) => {
    setEditingEnergyAlarm(alarm);
    setSelectedEnergyParam(alarm.name);
    setEnergyCondition(alarm.condition);
    setEnergyThreshold(alarm.threshold);
    setEnergyDebounce(alarm.debounce.toString());
    setEnergyMessage(alarm.message || '');
    setEnergyActive(alarm.active ?? true);
  };

  const handleCancelEnergyEdit = () => {
    setEditingEnergyAlarm(null);
    setEnergyThreshold('');
    setEnergyMessage('');
    setEnergyActive(true);
  };

  const handleSaveEnergyMetering = async () => {
    setAdminSaving(true);
    try {
      localStorage.setItem('admin_alarm_config', JSON.stringify(adminAlarmValues));
      setAdminSaveMsg({ type: 'success', text: `Energy Metering alarm settings saved!` });
      setTimeout(() => setAdminSaveMsg(null), 3000);
    } catch (err) {
      setAdminSaveMsg({ type: 'error', text: 'Failed to save: ' + err.message });
      setTimeout(() => setAdminSaveMsg(null), 3000);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleCreateSochiotRule = async () => {
    if (!selectedMeterId) {
      alert('Please select a meter first');
      return;
    }
    if (!energyThreshold) {
      alert('Please enter a threshold value');
      return;
    }

    const template = templates.find(t => String(t.id) === String(selectedMeterId));
    if (!template || !template.mapping) {
      alert('Selected meter template or mapping is missing');
      return;
    }

    setIsCreatingRule(true);
    try {
      let userData = await getSochiotUserMe();
      if (!userData) {
        await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
      }

      const mapping = template.mapping;
      const deviceUuid = mapping.deviceId;
      const gatewayId = mapping.gatewayUuid;
      
      let moduleId = 4462;
      if (mapping.emChangeConfig?.module) {
        moduleId = Number(mapping.emChangeConfig.module);
      } else if (mapping.emVoltageConfig?.module) {
        moduleId = Number(mapping.emVoltageConfig.module);
      }

      if (!deviceUuid) {
        throw new Error('Device UUID not found in meter mapping');
      }

      let parentId = "60d81d57-4390-4089-9871-6efe53f61d11";
      try {
        const locationData = await getSochiotLocationData("7");
        const gateways = locationData?.locationVOS?.[0]?.gatewayVOList || [];
        const matchingGateway = gateways.find(g => String(g.id) === String(gatewayId));
        if (matchingGateway?.gatewayUuid) {
          parentId = matchingGateway.gatewayUuid;
        } else if (matchingGateway?.uuid) {
          parentId = matchingGateway.uuid;
        }
      } catch (e) {
        console.warn('Failed to fetch gatewayUuid, using fallback parentId:', e);
      }

      const fieldName = getFieldNameFromParam(selectedEnergyParam, mapping);
      const meta = getParamMeta(selectedEnergyParam);

      let eventFields = [];
      try {
        eventFields = await getSochiotEventFields(moduleId);
      } catch (e) {
        console.warn('Failed to fetch event fields:', e);
      }

      let matchedField = eventFields.find(f => f.fieldName === fieldName);

      const eventFieldPayload = matchedField ? {
        id: matchedField.id,
        fieldName: matchedField.fieldName,
        displayName: matchedField.displayName,
        dataType: (typeof matchedField.dataType === 'object' && matchedField.dataType)
          ? matchedField.dataType.name
          : (matchedField.dataType || 'INTEGER'),
        required: matchedField.required || false,
        supportedValues: Array.isArray(matchedField.supportedValues)
          ? matchedField.supportedValues.join(',')
          : (matchedField.supportedValues || ''),
        lastUpdatedInMillis: matchedField.lastUpdatedInMillis || matchedField.lastUpdated || Date.now(),
        unit: matchedField.unit || meta.unit,
        moduleTemplateId: matchedField.moduleTemplateId || 221,
        multiplier: matchedField.multiplier || 0.1,
        moduleTypeId: matchedField.moduleTypeId || 11,
        moduleTypeNumber: matchedField.moduleTypeNumber || 11,
        moduleTypeName: matchedField.moduleTypeName || "general_2023-01-11 14:28:03.234",
        fieldType: (typeof matchedField.fieldType === 'object' && matchedField.fieldType)
          ? matchedField.fieldType.name
          : (matchedField.fieldType || 'MODULE')
      } : {
        id: meta.id,
        fieldName: fieldName || "3,168",
        displayName: meta.displayName,
        dataType: "INTEGER",
        required: false,
        supportedValues: "",
        lastUpdatedInMillis: Date.now(),
        unit: meta.unit,
        moduleTemplateId: 221,
        multiplier: 0.1,
        moduleTypeId: 11,
        moduleTypeNumber: 11,
        moduleTypeName: "general_2023-01-11 14:28:03.234",
        fieldType: "MODULE"
      };

      const siteStr = (mapping.globalHierarchy?.building || globalLocation.building || 'BMS').substring(0, 3).toUpperCase();
      const deviceStr = (mapping.energyMeteringTarget || template.name || 'DEV').substring(0, 3).toUpperCase();
      const eventStr = meta.name.substring(0, 3).toUpperCase();
      const srNo = Math.floor(100 + Math.random() * 900);
      const ruleName = `${siteStr}${deviceStr}${eventStr}${srNo}`.replace(/[^A-Z0-9]/g, '');

      const payload = {
        name: ruleName,
        active: energyActive,
        conditions: [
          {
            name: meta.name,
            locationId: "7",
            deviceId: deviceUuid,
            moduleId: moduleId,
            thresholdValue: Number(energyThreshold),
            logicalOperatorType: "NONE",
            debounceTime: Number(energyDebounce) || 0,
            parentId: parentId,
            description: "just test",
            onModuleGroup: false,
            moduleGroupId: null,
            conditionType: energyCondition,
            eventField: eventFieldPayload
          }
        ],
        consequences: [
          {
            name: "Sanjay Gupta",
            deviceId: "3e31418c-75a2-4079-befe-e5e8b0ecb33d",
            moduleId: 2725,
            locationId: "7",
            moduleType: {
              id: 11,
              name: "general_2023-01-11 14:28:03.234",
              displayName: "general",
              version: 0,
              moduleTypeNumber: 11,
              lastUpdatedInMillis: 1673447283235,
              description: "All type general",
              inUse: true,
              imported: true
            },
            dataType: "INTEGER",
            cmdField: "6,4516",
            supportedValues: "",
            cmdArg: 0,
            argValue: 0,
            moduleTypeName: "general_2023-01-11 14:28:03.234",
            moduleTypeNumber: 11,
            moduleTypeId: 11,
            rootParentId: null,
            parentId: null,
            description: "just text",
            onModuleGroup: false,
            moduleGroupId: null
          }
        ],
        zoneNodeType: "LOCATION",
        nodeId: 7
      };

      console.log('Sending Sochiot rule creation payload:', payload);
      const result = await createSochiotRule(payload);
      console.log('Rule created on Sochiot successfully (full response):', result);

      // Sochiot API may return the rule directly {id:144,...} OR wrapped {data:{id:144,...}}
      const newRuleId = result?.id
        || result?.data?.id
        || (Array.isArray(result?.data) ? result.data[0]?.id : null)
        || null;

      console.log('[CreateRule] Extracted newRuleId:', newRuleId);

      setAdminSaveMsg({ type: 'success', text: `Rule "${ruleName}" created on Sochiot! (ID: ${newRuleId})` });
      setTimeout(() => setAdminSaveMsg(null), 5000);
      
      // Save alarm locally with the linked sochiotRuleId
      await handleAddEnergyAlarm(newRuleId);
    } catch (err) {
      console.error('Failed to create rule on Sochiot:', err);
      alert('Error creating rule on Sochiot: ' + err.message);
    } finally {
      setIsCreatingRule(false);
    }
  };

  // Initialize Data
  useEffect(() => {
    const initDynamicData = async () => {
      try {
        let userData = await getSochiotUserMe();
        if (!userData) {
          await loginToSochiot("sa@ismartaccess.com", "I0t3ch");
          userData = await getSochiotUserMe();
        }

        if (userData) {
          const companies = [];
          const clients = [];
          const zones = [];
          const locations = [];
          const lMap = {};
          const zMap = {};

          if (userData.userZoneLocationVO?.companyList) {
            const rawData = userData.userZoneLocationVO.companyList;
            const normalize = (list) => {
              return (list || []).map(org => ({
                name: org.name,
                id: org.id,
                clients: (org.consumers || org.customerVOS || org.clients || []).map(client => ({
                  name: client.name,
                  id: client.id,
                  zones: (client.zoneVOS || client.zones || []).map(zone => ({
                    name: zone.name,
                    id: zone.id,
                    subZones: (zone.subZoneVOS || zone.subZoneVos || zone.subZones || []).map(sz => ({
                      name: sz.name,
                      id: sz.id,
                      locations: (sz.locationVOS || sz.locationVos || sz.locations || []).map(loc => ({
                        name: loc.name,
                        id: loc.id,
                        type: loc.locationType
                      }))
                    })),
                    locations: (zone.locationVOS || zone.locationVos || zone.locations || []).map(loc => ({
                      name: loc.name,
                      id: loc.id,
                      type: loc.locationType
                    }))
                  }))
                }))
              }));
            };

            const normalized = normalize(rawData);
            setHierarchyData(normalized);

            normalized.forEach(comp => {
              companies.push(comp.name);
              (comp.clients || []).forEach(client => {
                clients.push(client.name);
                (client.zones || []).forEach(zone => {
                  const traverse = (z) => {
                    zones.push(z.name);
                    zMap[z.name] = z.id;
                    (z.locations || []).forEach(l => {
                      locations.push(l.name);
                      lMap[l.name] = l.id;
                    });
                    (z.subZones || []).forEach(traverse);
                  };
                  traverse(zone);
                });
              });
            });
          }

          setLocationIdMap(lMap);
          setZoneIdMap(zMap);
          setDynamicOptions({
            fields: companies.length > 0 ? [...new Set(companies)] : [],
            modules: clients.length > 0 ? [...new Set(clients)] : [],
            devices: zones.length > 0 ? [...new Set(zones)] : [],
            locations: locations.length > 0 ? [...new Set(locations)] : []
          });
        }
      } catch (error) {
        console.error('Failed to load dynamic Sochiot data:', error);
      }
    };
    initDynamicData();
  }, []);

  const fetchZoneDetails = async (zoneName, zoneId) => {
    if (!zoneId) return;
    try {
      const data = await getSochiotZoneData(zoneId);
      if (data?.locationVOS) {
        setHierarchyData(prev => {
          const next = JSON.parse(JSON.stringify(prev)); 
          next.forEach(org => {
            (org.clients || []).forEach(client => {
              (client.zones || []).forEach(zone => {
                const updateNode = (node) => {
                  if (String(node.id) === String(zoneId) || node.name === zoneName) {
                    node.locations = data.locationVOS.map(loc => ({
                      name: loc.name, id: loc.id, type: loc.locationType
                    }));
                    if (data.locationVOS.length > 0) {
                      setDynamicOptions(prevOpts => ({
                        ...prevOpts,
                        locations: [...new Set([...prevOpts.locations, ...data.locationVOS.map(l => l.name)])]
                      }));
                      data.locationVOS.forEach(l => {
                        setLocationIdMap(prevMap => ({ ...prevMap, [l.name]: l.id }));
                      });
                    }
                  }
                  (node.subZones || []).forEach(updateNode);
                };
                updateNode(zone);
              });
            });
          });
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to fetch zone details:", e);
    }
  };

  const fetchLocationDetails = async (locationName, providedId = null) => {
    if (locationDetails[locationName]) return;
    const locId = providedId || locationIdMap[locationName];
    if (!locId) return;

    try {
      const data = await getSochiotLocationData(locId);
      if (data?.locationVOS?.[0]) {
        const gateways = data.locationVOS[0].gatewayVOList || [];
        const deviceList = [];
        const gatewayList = gateways.map(g => ({ label: g.name, id: g.id, uuid: g.uuid }));
        gateways.forEach(g => {
          if (g.deviceEntityVOS) {
            g.deviceEntityVOS.forEach(d => {
              deviceList.push({ label: `${g.name} / ${d.name}`, id: d.id, uuid: d.uuid, gatewayId: g.id });
            });
          }
        });
        setLocationDetails(prev => ({ ...prev, [locationName]: { deviceList, gatewayList } }));
      }
    } catch (e) {
      console.error("Failed to fetch location details:", e);
    }
  };

  const handleRuleClick = async (ruleId) => {
    setIsDetailOpen(true);
    setIsEditMode(false);
    setSelectedRule(null);
    setIsDetailLoading(true);
    try {
      const data = await getSochiotRuleById(ruleId);
      setSelectedRule(data);
      setEditName(data?.name || '');
    } catch (e) {
      console.error('Failed to fetch rule detail:', e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const fetchRulesForSelection = async (locationState) => {
    let companyId = '';
    let targetNodeType = '';
    let targetNodeId = '';

    if (locationState.organization) {
      const comp = hierarchyData.find(c => c.name === locationState.organization);
      if (comp) {
        companyId = comp.id;
        targetNodeType = 'COMPANY';
        targetNodeId = comp.id;
      }
    }

    if (!companyId) {
      setRules([]); setTotalRules(0); setEmailGroups(0); return;
    }

    if (locationState.client) {
      const comp = hierarchyData.find(c => c.name === locationState.organization);
      const cli = comp?.clients?.find(c => c.name === locationState.client);
      if (cli) { targetNodeType = 'CONSUMER'; targetNodeId = cli.id; }
    }
    if (locationState.zone && zoneIdMap[locationState.zone]) {
      targetNodeType = 'ZONE'; targetNodeId = zoneIdMap[locationState.zone];
    }
    if (locationState.subZone && locationIdMap[locationState.subZone]) {
      targetNodeType = 'LOCATION'; targetNodeId = locationIdMap[locationState.subZone];
    }
    if (locationState.building && locationIdMap[locationState.building]) {
      targetNodeType = 'LOCATION'; targetNodeId = locationIdMap[locationState.building];
    }
    // Gateway removed - rules now show at Location/Building level

    setIsLoading(true);
    let fetchType = '';
    let fetchId = '';
    
    // Call the most specific API for the selected level.
    // Backend will return only rules created for that specific node.
    if (targetNodeType && targetNodeId) {
      fetchType = targetNodeType;
      fetchId = targetNodeId;
    } else if (companyId) {
      fetchType = 'COMPANY';
      fetchId = companyId;
    }

    if (fetchType && fetchId) {
      try {
        const rulesData = await getSochiotRules(fetchType, fetchId, 1);

        if (rulesData && rulesData.list) {
          const fetchedRules = rulesData.list;
          setRules(fetchedRules);
          setTotalRules(fetchedRules.length);
          
          const uniqueEmailGroups = new Set();
          fetchedRules.forEach(r => { if (r.emailGroupVO?.id) uniqueEmailGroups.add(r.emailGroupVO.id); });
          setEmailGroups(uniqueEmailGroups.size);
        } else {
          setRules([]);
          setTotalRules(0);
          setEmailGroups(0);
        }
      } catch (err) {
        console.error("Failed to fetch rules:", err);
        setRules([]);
        setTotalRules(0);
        setEmailGroups(0);
      }
    } else {
      setRules([]);
      setTotalRules(0);
      setEmailGroups(0);
    }
    setIsLoading(false);
  };

  const getHierarchyOptions = () => {
    const { organization, client, zone, subZone } = globalLocation;
    let clients = [], zones = [], subZones = [], buildings = [];

    if (organization) {
      const comp = hierarchyData.find(c => c.name === organization);
      if (comp) clients = comp.clients.map(c => c.name);
    }
    if (organization && client) {
      const comp = hierarchyData.find(c => c.name === organization);
      const cli = comp?.clients.find(c => c.name === client);
      if (cli) zones = cli.zones.map(z => z.name);
    }
    if (organization && client && zone) {
      const comp = hierarchyData.find(c => c.name === organization);
      const cli = comp?.clients.find(c => c.name === client);
      const z = cli?.zones.find(z => z.name === zone);
      if (z) {
        subZones = z.subZones.map(sz => sz.name);
        buildings = z.locations.map(l => l.name);
      }
    }
    if (organization && client && zone && subZone) {
      const comp = hierarchyData.find(c => c.name === organization);
      const cli = comp?.clients.find(c => c.name === client);
      const z = cli?.zones.find(z => z.name === zone);
      const sz = z?.subZones.find(s => s.name === subZone);
      if (sz) buildings = sz.locations.map(l => l.name);
    }
    return { clients, zones, subZones, buildings };
  };

  const hierarchyOptions = getHierarchyOptions();

  const handleLocationChange = async (field, value) => {
    const newLoc = { ...globalLocation, [field]: value };
    if (field === 'organization') {
      newLoc.client = ''; newLoc.zone = ''; newLoc.subZone = ''; newLoc.building = ''; newLoc.gateway = '';
    } else if (field === 'client') {
      newLoc.zone = ''; newLoc.subZone = ''; newLoc.building = ''; newLoc.gateway = '';
    } else if (field === 'zone') {
      newLoc.subZone = ''; newLoc.building = ''; newLoc.gateway = '';
      if (value) fetchZoneDetails(value, zoneIdMap[value]);
    } else if (field === 'subZone') {
      newLoc.building = ''; newLoc.gateway = '';
    } else if (field === 'building') {
      newLoc.gateway = '';
      if (value) fetchLocationDetails(value);
    }
    setGlobalLocation(newLoc);
    fetchRulesForSelection(newLoc);
  };

  const getGatewaysForSelectedBuilding = () => {
    const b = globalLocation.building;
    if (b && locationDetails[b]) return locationDetails[b].gatewayList || [];
    return [];
  };

  // Toggle rule active/inactive via API
  const toggleRuleActive = async (rule, e) => {
    if (e) e.stopPropagation();
    const newActive = !rule.active;
    try {
      if (newActive) {
        await activateSochiotRule(rule.id);
      } else {
        await deactivateSochiotRule(rule.id);
      }
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: newActive } : r));
      if (selectedRule?.id === rule.id) {
        setSelectedRule(prev => ({ ...prev, active: newActive }));
      }
    } catch (error) {
      console.error('Toggle active error:', error);
      alert('Failed to toggle active: ' + error.message);
    }
  };

  // Styles
  const pageBg = isDark ? '#0b1120' : '#f8f9fa';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const subTextColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  // ============================================================
  // ADMIN SIMPLIFIED VIEW
  // ============================================================
  if (!isSuperAdmin) {
    const isEnergyMetering = adminSelectedCategory === 'Energy Metering';
    
    const catKey = isEnergyMetering && selectedMeterId
      ? `Energy Metering - ${adminSubCategory} - ${selectedMeterId}`
      : `${adminSelectedCategory} - ${adminSubCategory}`;
    const currentAlarms = adminAlarmValues[catKey] || [];
    const currentEnergyAlarms = adminAlarmValues[catKey] || [];

    return (
      <Container fluid className="py-4" style={{ backgroundColor: pageBg, minHeight: '100vh', color: textColor }}>
        {/* Header */}
        <div className="mb-4">
          <h2 style={{ fontWeight: '700', margin: 0 }}>Alarm Configuration</h2>
          <small style={{ color: subTextColor }}>Configure alarm thresholds and conditions per system category</small>
        </div>

        {/* Success/Error Message */}
        {adminSaveMsg && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '16px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            background: adminSaveMsg.type === 'success' ? '#065f46' : '#991b1b',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.05)',
            border: `1px solid ${adminSaveMsg.type === 'success' ? '#047857' : '#b91c1c'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxSizing: 'border-box'
          }}>
            {adminSaveMsg.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
            <span>{adminSaveMsg.text}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="mb-4 d-flex gap-2 flex-wrap">
          {visibleCategories.map(cat => (
            <button key={cat} onClick={() => setAdminSelectedCategory(cat)} style={{
              padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '700', transition: 'all 0.2s',
              background: adminSelectedCategory === cat
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : (isDark ? '#1e293b' : '#f1f5f9'),
              color: adminSelectedCategory === cat ? '#fff' : subTextColor,
              boxShadow: adminSelectedCategory === cat ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
            }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Sub-Category Tabs */}
        {(SUB_CATEGORIES[adminSelectedCategory] && SUB_CATEGORIES[adminSelectedCategory].length > 0) && (
          <div className="mb-4 d-flex gap-3 align-items-center">
            <span style={{ fontWeight: '700', fontSize: '14px', color: subTextColor }}>Select Sub-System:</span>
            {SUB_CATEGORIES[adminSelectedCategory].map(type => (
              <button
                key={type}
                onClick={() => setAdminSubCategory(type)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${adminSubCategory === type ? 'transparent' : borderColor}`,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                  background: adminSubCategory === type
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : (isDark ? '#1e293b' : '#f1f5f9'),
                  color: adminSubCategory === type ? '#fff' : subTextColor,
                  boxShadow: adminSubCategory === type ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Meter Selector for Energy Metering */}
        {isEnergyMetering && currentSubCategoryMeters.length > 0 && (
          <div className="mb-4 d-flex gap-3 align-items-center">
            <span style={{ fontWeight: '700', fontSize: '14px', color: subTextColor }}>Select Meter:</span>
            <Form.Select
              size="sm"
              value={selectedMeterId}
              onChange={e => setSelectedMeterId(e.target.value)}
              style={{
                width: '320px',
                background: isDark ? '#1e293b' : '#ffffff',
                color: textColor,
                borderColor: borderColor,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              {currentSubCategoryMeters.map(meter => (
                <option key={meter.id} value={meter.id}>
                  {meter.mapping?.energyMeteringTarget || meter.name}
                </option>
              ))}
            </Form.Select>
          </div>
        )}

        {isEnergyMetering ? (
          <div>

            <Row className="g-4">
              {/* Form Card: Set Alarm */}
              <Col lg={4}>
                <div style={{
                  background: cardBg, borderRadius: '16px', padding: '20px',
                  border: `1px solid ${borderColor}`,
                  boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <h5 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: textColor }}>
                    {editingEnergyAlarm ? 'Edit Alarm Parameter' : 'Configure Alarm Parameter'}
                  </h5>
                  
                  {/* Parameter Dropdown */}
                  <div className="mb-3">
                    <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Select Parameter <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <Form.Select
                      size="sm"
                      value={selectedEnergyParam}
                      onChange={e => setSelectedEnergyParam(e.target.value)}
                      style={{
                        background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                        borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                      }}
                    >
                      {ENERGY_PARAMETERS.map(param => (
                        <option key={param.value} value={param.value}>{param.label}</option>
                      ))}
                    </Form.Select>
                  </div>

                  {/* Condition Dropdown */}
                  <div className="mb-3">
                    <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Condition <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <Form.Select
                      size="sm"
                      value={energyCondition}
                      onChange={e => setEnergyCondition(e.target.value)}
                      style={{
                        background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                        borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                      }}
                    >
                      {CONDITION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Form.Select>
                  </div>

                  {/* Threshold Value */}
                  <div className="mb-3">
                    <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Threshold Value <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <Form.Control
                      size="sm"
                      type="number"
                      placeholder="Enter threshold"
                      value={energyThreshold}
                      onChange={e => setEnergyThreshold(e.target.value)}
                      style={{
                        background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                        borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                      }}
                    />
                  </div>

                  {/* Debounce Time */}
                  <div className="mb-3">
                    <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Debounce Time (seconds)
                    </label>
                    <Form.Control
                      size="sm"
                      type="number"
                      placeholder="10"
                      value={energyDebounce}
                      onChange={e => setEnergyDebounce(e.target.value)}
                      style={{
                        background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                        borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                      }}
                    />
                  </div>

                  {/* Message Template Selection */}
                  <div className="mb-3">
                    <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Message Template
                    </label>
                    <Form.Select
                      size="sm"
                      value=""
                      onChange={e => {
                        const selected = messageTemplates.find(t => t.id === e.target.value);
                        if (selected) {
                          let processed = selected.content
                            .replace(/\[Parameter\]/g, selectedEnergyParam)
                            .replace(/\[Condition\]/g, energyCondition.replace(/_/g, ' '))
                            .replace(/\[Threshold\]/g, energyThreshold);
                          setEnergyMessage(processed);
                        }
                      }}
                      style={{
                        background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                        borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                      }}
                    >
                      <option value="">-- Choose Template --</option>
                      {messageTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </Form.Select>
                  </div>

                  {/* Alarm Alert Message */}
                  <div className="mb-4">
                    <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Alarm Message
                    </label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Enter custom alarm message or select template above"
                      value={energyMessage}
                      onChange={e => setEnergyMessage(e.target.value)}
                      style={{
                        background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                        borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                      }}
                    />
                  </div>

                  <Button
                    onClick={() => handleAddEnergyAlarm()}
                    className="w-100"
                    style={{
                      background: editingEnergyAlarm
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: 'none',
                      padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px'
                    }}
                  >
                    {editingEnergyAlarm ? 'Update Alarm Threshold' : 'Set Alarm Threshold'}
                  </Button>
                  {!editingEnergyAlarm && (
                    <Button
                      onClick={handleCreateSochiotRule}
                      disabled={isCreatingRule}
                      className="w-100 mt-2"
                      style={{
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        border: 'none',
                        padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px'
                      }}
                    >
                      {isCreatingRule ? <Spinner size="sm" className="me-2" /> : null}
                      Create Rule on Sochiot
                    </Button>
                  )}
                  {editingEnergyAlarm && (
                    <Button
                      onClick={handleCancelEnergyEdit}
                      className="w-100 mt-2"
                      variant="outline-secondary"
                      style={{
                        padding: '10px', borderRadius: '10px', fontWeight: '700', fontSize: '13px'
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </Col>

              {/* Active Alarms List */}
              <Col lg={8}>
                <div style={{
                  background: cardBg, borderRadius: '16px', padding: '20px',
                  border: `1px solid ${borderColor}`,
                  boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                  minHeight: '340px'
                }}>
                  <h5 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '16px', color: textColor }}>
                    Configured {adminSubCategory} Alarms ({currentEnergyAlarms.length})
                  </h5>

                  {currentEnergyAlarms.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: '220px' }}>
                      <span style={{ fontSize: '32px' }}>📊</span>
                      <small className="mt-2 fw-semibold">No alarms configured for this meter</small>
                      <small style={{ fontSize: '11px', opacity: 0.7 }}>Configure parameters on the left to set alarms</small>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      <Table hover responsive variant={isDark ? 'dark' : 'light'} style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ fontSize: '11px', textTransform: 'uppercase', color: subTextColor }}>
                            <th>Parameter</th>
                            <th>Condition</th>
                            <th>Threshold</th>
                            <th>Debounce</th>
                            <th>Message</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: '13px' }}>
                          {currentEnergyAlarms.map((alarm) => (
                            <tr key={alarm.name} style={{ verticalAlign: 'middle' }}>
                              <td>
                                <span className="me-2">{alarm.icon}</span>
                                <strong style={{ color: textColor }}>{alarm.name}</strong>
                              </td>
                              <td>
                                <Badge bg="secondary" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                                  {alarm.condition?.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td style={{ fontWeight: '600', color: textColor }}>{alarm.threshold}</td>
                              <td>{alarm.debounce} sec</td>
                              <td style={{ fontSize: '12px', color: subTextColor, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={alarm.message}>
                                {alarm.message || '-'}
                              </td>
                              <td className="text-end d-flex align-items-center justify-content-end gap-2">
                                <Form.Check
                                  type="switch"
                                  id={`toggle-alarm-${alarm.name.replace(/\s+/g, '-')}`}
                                  checked={alarm.active ?? true}
                                  onChange={() => toggleEnergyAlarmActive(alarm)}
                                  style={{ transform: 'scale(1.05)', cursor: 'pointer' }}
                                  disabled={isCreatingRule}
                                />
                                <button
                                  onClick={() => handleEditEnergyAlarm(alarm)}
                                  style={{
                                    border: 'none', background: 'transparent', color: '#3b82f6',
                                    padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s',
                                    marginLeft: '4px'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'}
                                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title="Edit"
                                >
                                  <FiEdit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteEnergyAlarm(alarm.name)}
                                  style={{
                                    border: 'none', background: 'transparent', color: '#ef4444',
                                    padding: '4px 8px', borderRadius: '6px', transition: 'all 0.2s'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title="Delete"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            {/* Save Energy Metering Button */}
            <div className="mt-4 d-flex justify-content-end">
              <Button
                onClick={handleSaveEnergyMetering}
                disabled={adminSaving}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
                  padding: '12px 32px', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.3)', transition: 'all 0.2s'
                }}
              >
                {adminSaving ? <Spinner size="sm" className="me-2" /> : null}
                Save Energy Metering Settings
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {/* Alarm Cards */}
            <Row className="g-3">
              {currentAlarms.map((alarm, idx) => (
                <Col key={alarm.name} md={6} lg={4}>
                  <div style={{
                    background: cardBg, borderRadius: '16px', padding: '20px',
                    border: `1px solid ${borderColor}`,
                    boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}>
                    {/* Alarm Title */}
                    <div className="d-flex align-items-center gap-2 mb-3">
                      <span style={{ fontSize: '24px' }}>{alarm.icon}</span>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: textColor }}>{alarm.name}</div>
                        <div style={{ fontSize: '11px', color: subTextColor }}>{adminSelectedCategory} - {adminSubCategory}</div>
                      </div>
                    </div>

                    {/* Condition Dropdown */}
                    <div className="mb-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                        Condition <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <Form.Select
                        size="sm"
                        value={alarm.condition}
                        onChange={e => handleAdminFieldChange(catKey, idx, 'condition', e.target.value)}
                        style={{
                          background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                          borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                        }}
                      >
                        {CONDITION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Form.Select>
                    </div>

                    {/* Threshold + Debounce Row */}
                    <Row className="g-2">
                      <Col xs={6}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                          Threshold Value <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <Form.Control
                          size="sm"
                          type="number"
                          value={alarm.threshold}
                          onChange={e => handleAdminFieldChange(catKey, idx, 'threshold', e.target.value)}
                          style={{
                            background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                            borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                          }}
                        />
                      </Col>
                      <Col xs={6}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                          Debounce Time
                        </label>
                        <div className="d-flex align-items-center gap-1">
                          <Form.Control
                            size="sm"
                            type="number"
                            value={alarm.debounce}
                            onChange={e => handleAdminFieldChange(catKey, idx, 'debounce', e.target.value)}
                            style={{
                              background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                              borderColor: borderColor, borderRadius: '8px', fontSize: '13px'
                            }}
                          />
                          <span style={{ fontSize: '11px', color: subTextColor, whiteSpace: 'nowrap' }}>sec</span>
                        </div>
                      </Col>
                    </Row>

                    {/* Message Template Select */}
                    <div className="mb-2 mt-3">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                        Message Template
                      </label>
                      <Form.Select
                        size="sm"
                        value=""
                        onChange={e => {
                          const selected = messageTemplates.find(t => t.id === e.target.value);
                          if (selected) {
                            let processed = selected.content
                              .replace(/\[Parameter\]/g, alarm.name)
                              .replace(/\[Condition\]/g, alarm.condition?.replace(/_/g, ' ') || '')
                              .replace(/\[Threshold\]/g, alarm.threshold || '');
                            handleAdminFieldChange(adminSelectedCategory, idx, 'message', processed);
                          }
                        }}
                        style={{
                          background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                          borderColor: borderColor, borderRadius: '8px', fontSize: '12px'
                        }}
                      >
                        <option value="">-- Choose Template --</option>
                        {messageTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </Form.Select>
                    </div>

                    {/* Alarm Message Content */}
                    <div className="mb-2">
                      <label style={{ fontSize: '11px', fontWeight: '700', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                        Alarm Message
                      </label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Alarm alert message content"
                        value={alarm.message || ''}
                        onChange={e => handleAdminFieldChange(catKey, idx, 'message', e.target.value)}
                        style={{
                          background: isDark ? '#0f172a' : '#f8f9fa', color: textColor,
                          borderColor: borderColor, borderRadius: '8px', fontSize: '12px'
                        }}
                      />
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            {/* Save Button */}
            <div className="mt-4 d-flex justify-content-end">
              <Button
                onClick={() => handleAdminSave(catKey)}
                disabled={adminSaving}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none',
                  padding: '12px 32px', borderRadius: '12px', fontWeight: '700', fontSize: '14px',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.3)', transition: 'all 0.2s'
                }}
              >
                {adminSaving ? <Spinner size="sm" className="me-2" /> : null}
                Save {adminSubCategory} Settings
              </Button>
            </div>
          </div>
        )}
      </Container>
    );
  }


  // ============================================================
  // SUPER ADMIN FULL VIEW (unchanged)
  // ============================================================
  return (
    <Container fluid className="py-4" style={{ backgroundColor: pageBg, minHeight: '100vh', color: textColor }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontWeight: '700', margin: 0 }}>Rule Engine</h2>
          <small style={{ color: subTextColor }}>Manage alarms, notifications, and automated actions</small>
        </div>
      </div>

      <div className="mb-4 d-flex gap-2" style={{ overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px' }}>Organization</div>
          <Form.Select value={globalLocation.organization} onChange={(e) => handleLocationChange('organization', e.target.value)} style={{ backgroundColor: isDark ? '#0f172a' : '#fff', color: textColor, borderColor: borderColor, fontSize: '14px', borderRadius: '8px' }}>
            <option value="">Select Company</option>
            {dynamicOptions.fields.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Form.Select>
        </div>
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px' }}>Client (Consumer)</div>
          <Form.Select disabled={!globalLocation.organization} value={globalLocation.client} onChange={(e) => handleLocationChange('client', e.target.value)} style={{ backgroundColor: isDark ? '#0f172a' : '#fff', color: textColor, borderColor: borderColor, fontSize: '14px', borderRadius: '8px' }}>
            <option value="">Select Client</option>
            {hierarchyOptions.clients.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Form.Select>
        </div>
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px' }}>Zone</div>
          <Form.Select disabled={!globalLocation.client} value={globalLocation.zone} onChange={(e) => handleLocationChange('zone', e.target.value)} style={{ backgroundColor: isDark ? '#0f172a' : '#fff', color: textColor, borderColor: borderColor, fontSize: '14px', borderRadius: '8px' }}>
            <option value="">Select Zone</option>
            {hierarchyOptions.zones.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Form.Select>
        </div>
        {hierarchyOptions.subZones.length > 0 && (
          <div style={{ minWidth: '180px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px' }}>Sub Zone</div>
            <Form.Select disabled={!globalLocation.zone} value={globalLocation.subZone} onChange={(e) => handleLocationChange('subZone', e.target.value)} style={{ backgroundColor: isDark ? '#0f172a' : '#fff', color: textColor, borderColor: borderColor, fontSize: '14px', borderRadius: '8px' }}>
              <option value="">Select Sub Zone</option>
              {hierarchyOptions.subZones.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </Form.Select>
          </div>
        )}
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase', marginBottom: '4px' }}>Location / Building</div>
          <Form.Select disabled={!globalLocation.zone} value={globalLocation.building} onChange={(e) => handleLocationChange('building', e.target.value)} style={{ backgroundColor: isDark ? '#0f172a' : '#fff', color: textColor, borderColor: borderColor, fontSize: '14px', borderRadius: '8px' }}>
            <option value="">Select Building</option>
            {hierarchyOptions.buildings.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Form.Select>
        </div>
      </div>

      <Card style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: '12px' }}>
          <Card.Header style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${borderColor}`, padding: '16px 20px' }}>
            <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex gap-4">
              <div className="text-center">
                <div style={{ color: '#6366f1', fontSize: '18px', fontWeight: 'bold' }}>
                  <FiBell className="me-2" />{totalRules}
                </div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: subTextColor, fontWeight: '600' }}>Total Rules</div>
              </div>
              <div className="text-center">
                <div style={{ color: '#10b981', fontSize: '18px', fontWeight: 'bold' }}>
                  <FiMail className="me-2" />{emailGroups}
                </div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: subTextColor, fontWeight: '600' }}>Email Groups</div>
              </div>
            </div>
            <div className="d-flex gap-3">
              <Button variant="outline-primary" className="d-flex align-items-center" style={{ fontWeight: '500', borderRadius: '8px' }}>
                <FiMail className="me-2" /> Create Email Groups
              </Button>
              <Button variant="primary" className="d-flex align-items-center" style={{ fontWeight: '500', borderRadius: '8px', backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}>
                <FiPlus className="me-2" /> Create Rule & Notification
              </Button>
            </div>
          </div>
        </Card.Header>
        
        {!globalLocation.building ? (
          <div className="text-center py-5" style={{ color: subTextColor }}>
            <FiBell size={48} className="mb-3" style={{ opacity: 0.5 }} />
            <h5>Please select a Location / Building to view rules</h5>
            <p>Rules will be displayed once a Location is selected.</p>
          </div>
        ) : (
        <Table responsive hover variant={isDark ? "dark" : "light"} className="mb-0" style={{ backgroundColor: 'transparent' }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: isDark ? '#1e293b' : '#f8f9fa', color: subTextColor, fontSize: '12px', padding: '16px 20px' }}>NAME</th>
              <th className="text-center" style={{ backgroundColor: isDark ? '#1e293b' : '#f8f9fa', color: subTextColor, fontSize: '12px', padding: '16px 20px' }}>CONDITION COUNT</th>
              <th className="text-center" style={{ backgroundColor: isDark ? '#1e293b' : '#f8f9fa', color: subTextColor, fontSize: '12px', padding: '16px 20px' }}>CONSEQUENCE COUNT</th>
              <th className="text-center" style={{ backgroundColor: isDark ? '#1e293b' : '#f8f9fa', color: subTextColor, fontSize: '12px', padding: '16px 20px' }}>ENABLED</th>
              <th style={{ backgroundColor: isDark ? '#1e293b' : '#f8f9fa', color: subTextColor, fontSize: '12px', padding: '16px 20px' }}>LAST UPDATED</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="5" className="text-center py-5">
                  <Spinner animation="border" variant="primary" className="mb-3" />
                  <div style={{ color: subTextColor }}>Loading Rules...</div>
                </td>
              </tr>
            ) : rules.length > 0 ? (
              rules.map((rule) => (
                <tr 
                  key={rule.id} 
                  onClick={() => handleRuleClick(rule.id)}
                  style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', borderColor: borderColor }}>
                    <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {rule.name}
                      <FiChevronRight size={14} style={{ color: subTextColor }} />
                    </div>
                    <div style={{ fontSize: '12px', color: subTextColor }}>ID: {rule.id} | Ver: {rule.version}</div>
                  </td>
                  <td className="text-center" style={{ padding: '16px 20px', verticalAlign: 'middle', borderColor: borderColor }}>
                    <Badge bg="info" text="dark" style={{ padding: '6px 12px', borderRadius: '20px' }}>
                      {rule.conditions?.length || 0}
                    </Badge>
                  </td>
                  <td className="text-center" style={{ padding: '16px 20px', verticalAlign: 'middle', borderColor: borderColor }}>
                    <Badge bg="warning" text="dark" style={{ padding: '6px 12px', borderRadius: '20px' }}>
                      {rule.consequences?.length || 0}
                    </Badge>
                  </td>
                  <td className="text-center" style={{ padding: '16px 20px', verticalAlign: 'middle', borderColor: borderColor }}>
                    <div className="d-flex justify-content-center">
                      <Form.Check 
                        type="switch"
                        id={`rule-switch-${rule.id}`}
                        checked={rule.active}
                        onChange={() => {}}
                        onClick={e => toggleRuleActive(rule, e)}
                        style={{ transform: 'scale(1.2)' }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', color: subTextColor, borderColor: borderColor }}>
                    {new Date(rule.lastUpdated).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-5" style={{ borderColor: borderColor }}>
                  <FiInbox size={48} color={subTextColor} style={{ opacity: 0.5, marginBottom: '16px' }} />
                  <h5 style={{ color: textColor }}>No Data</h5>
                  <p style={{ color: subTextColor }}>
                    {!globalLocation.organization ? 'Please select an organization to view rules.' : 'No rules found for the selected location.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        )}
      </Card>

      {/* Rule Detail Side Panel */}
      {isDetailOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, height: '100vh', width: '520px',
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderLeft: `1px solid ${borderColor}`,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
          zIndex: 1050, overflowY: 'auto',
          display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${borderColor}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: subTextColor, textTransform: 'uppercase', fontWeight: '600' }}>
                {isEditMode ? '✏️ Edit Rule' : '📋 Rule Details'}
              </div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: textColor, marginTop: '4px' }}>
                {isDetailLoading ? 'Loading...' : (selectedRule?.name || 'Rule')}
              </div>
              {selectedRule && (
                <div style={{ fontSize: '12px', color: subTextColor }}>ID: {selectedRule.id} | Ver: {selectedRule.version}</div>
              )}
            </div>
            <button onClick={() => { setIsDetailOpen(false); setIsEditMode(false); }}
              style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', padding: '8px' }}>
              <FiX size={22} />
            </button>
          </div>

          {isDetailLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div style={{ color: subTextColor, marginTop: '12px' }}>Loading rule details...</div>
            </div>
          ) : selectedRule ? (
            <div style={{ padding: '20px 24px', flex: 1 }}>

              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: subTextColor, textTransform: 'uppercase', marginBottom: '6px' }}>Rule Name</div>
                {isEditMode ? (
                  <Form.Control
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ backgroundColor: isDark ? '#0f172a' : '#f8f9fa', color: textColor, borderColor: borderColor, borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ fontSize: '16px', fontWeight: '600', color: textColor }}>{selectedRule.name}</div>
                )}
              </div>

              {/* Status */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  background: selectedRule.active ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                  color: selectedRule.active ? '#10b981' : subTextColor }}>
                  {selectedRule.active ? '● Active' : '○ Inactive'}
                </div>
                <div style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                  {selectedRule.zoneNodeType}
                </div>
              </div>

              {/* Email Group */}
              {selectedRule.emailGroupVO && (
                <div style={{ padding: '12px 16px', borderRadius: '10px', background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)', border: `1px solid rgba(16,185,129,0.2)`, marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                    <FiMail size={12} className="me-1" /> Email Group
                  </div>
                  <div style={{ fontWeight: '600', color: textColor }}>{selectedRule.emailGroupVO.name}</div>
                  <div style={{ fontSize: '12px', color: subTextColor }}>{selectedRule.emailGroupVO.emails?.join(', ')}</div>
                </div>
              )}

              {/* Conditions */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#06b6d4', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiAlertCircle size={15} /> CONDITIONS ({selectedRule.conditions?.length || 0})
                </div>
                {selectedRule.conditions?.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', overflowX: 'auto', paddingBottom: '8px' }}>
                    {selectedRule.conditions.map((c, i) => (
                      <React.Fragment key={c.id}>
                        <div style={{
                          minWidth: '200px', maxWidth: '220px', flex: '0 0 auto',
                          padding: '12px 14px', borderRadius: '10px',
                          background: isDark ? 'rgba(6,182,212,0.06)' : 'rgba(6,182,212,0.04)',
                          border: `1px solid rgba(6,182,212,0.2)`
                        }}>
                          <div style={{ fontWeight: '600', color: textColor, marginBottom: '8px', fontSize: '13px' }}>{i + 1}. {c.name}</div>
                          {[
                            ['Module', c.eventField?.moduleTypeName?.substring(0, 16) || '-', textColor],
                            ['Event Field', c.eventField?.displayName || '-', '#06b6d4'],
                            ['Condition', c.conditionType?.displayName || '-', '#f59e0b'],
                            ['Threshold', c.thresholdValue, textColor],
                            ['Debounce', `${c.debounceTime}s`, textColor],
                            ['Description', c.description || '-', textColor],
                          ].map(([k, v, col]) => (
                            <div key={k} style={{ marginBottom: '4px' }}>
                              <span style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>{k}: </span>
                              <span style={{ fontSize: '12px', color: col, fontWeight: '500' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        {/* AND/OR operator between conditions */}
                        {i < selectedRule.conditions.length - 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', flex: '0 0 auto' }}>
                            <div style={{
                              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '800',
                              background: '#4f46e5', color: '#fff', letterSpacing: '0.5px',
                              boxShadow: '0 2px 8px rgba(79,70,229,0.3)'
                            }}>
                              {selectedRule.conditions[i + 1]?.logicalOperatorType === 'OR' ? 'OR' : 'AND'}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                ) : <div style={{ color: subTextColor, fontSize: '13px' }}>No conditions</div>}
              </div>

              {/* Consequences */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiZap size={15} /> CONSEQUENCES ({selectedRule.consequences?.length || 0})
                </div>
                {selectedRule.consequences?.length > 0 ? selectedRule.consequences.map((c, i) => (
                  <div key={c.id} style={{ padding: '14px', borderRadius: '10px', background: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)', border: `1px solid rgba(245,158,11,0.2)`, marginBottom: '10px' }}>
                    <div style={{ fontWeight: '600', color: textColor, marginBottom: '8px' }}>{i + 1}. {c.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>Command Field</div>
                        <div style={{ fontSize: '13px', color: textColor, fontWeight: '500' }}>{c.cmdField || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>Module</div>
                        <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '500' }}>{c.moduleTypeName || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>Cmd Arg</div>
                        <div style={{ fontSize: '13px', color: textColor }}>{c.cmdArg}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>Arg Value</div>
                        <div style={{ fontSize: '13px', color: textColor, fontWeight: '600' }}>{c.argValue}</div>
                      </div>
                      {c.description && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <div style={{ fontSize: '10px', color: subTextColor, textTransform: 'uppercase' }}>Description</div>
                          <div style={{ fontSize: '13px', color: textColor }}>{c.description}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )) : <div style={{ color: subTextColor, fontSize: '13px' }}>No consequences</div>}
              </div>

              {/* Notifications */}
              {selectedRule.notifications?.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMessageSquare size={15} /> NOTIFICATIONS ({selectedRule.notifications.length})
                  </div>
                  {selectedRule.notifications.map((n, i) => (
                    <div key={n.id} style={{ padding: '12px 14px', borderRadius: '10px', background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', border: `1px solid rgba(139,92,246,0.2)`, marginBottom: '8px' }}>
                      <div style={{ fontWeight: '600', color: textColor }}>{n.text}</div>
                      <div style={{ fontSize: '12px', color: subTextColor, marginTop: '4px' }}>
                        Priority: <span style={{ color: '#8b5cf6' }}>{n.priority}</span> • Icon: {n.icon}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ) : null}

          {/* Footer Actions */}
          {selectedRule && (
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${borderColor}`, display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Button variant="primary" style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5', borderRadius: '8px', fontWeight: '600' }}
                onClick={() => setIsEditModalOpen(true)}>
                <FiEdit2 size={14} className="me-2" />Edit
              </Button>
              <Button variant="outline-danger" style={{ borderRadius: '8px', fontWeight: '600' }}
                onClick={() => alert('Delete rule: ' + selectedRule.id)}>
                <FiTrash2 size={14} className="me-2" />Delete
              </Button>
              <div style={{ marginLeft: 'auto' }}>
                <Form.Check
                  type="switch"
                  id="detail-rule-active"
                  checked={selectedRule.active}
                  onChange={() => toggleRuleActive(selectedRule)}
                  label={<span style={{ fontSize: '13px', fontWeight: '600', color: selectedRule.active ? '#10b981' : '#ef4444' }}>Active</span>}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay */}
      {isDetailOpen && (
        <div onClick={() => { setIsDetailOpen(false); setIsEditMode(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1049 }} />
      )}

      {/* Rule Edit Modal */}
      {isEditModalOpen && selectedRule && (
        <RuleEditModal
          rule={selectedRule}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={async (updated) => {
            try {
              // Fetch latest version from API to prevent optimistic lock errors
              const freshRule = await getSochiotRuleById(updated.id);
              const latestVersion = freshRule?.version || updated.version;

              // Find original condition/consequence data from freshRule to preserve fields
              const origConditions = freshRule?.conditions || selectedRule?.conditions || [];
              const origConsequences = freshRule?.consequences || selectedRule?.consequences || [];
              const origNotifications = freshRule?.notifications || selectedRule?.notifications || [];

              const payload = {
                name: updated.name,
                active: updated.active,
                emailGroupId: updated.emailGroupVO?.id || updated.emailGroupId,
                conditions: updated.conditions?.map((c, idx, arr) => {
                  // Find original condition to get missing fields
                  const orig = origConditions.find(oc => oc.id === c.id) || {};
                  const origEF = orig.eventField || {};
                  const ef = c.eventField || origEF;
                  // First condition must be NONE (no preceding operator), others keep their AND/OR setting
                  const isFirst = idx === 0;

                  // Helper: extract string value, fall back to origEF field
                  const efStr = (field, origField) => {
                    const val = ef[field];
                    if (val === null || val === undefined || val === '') return origEF[origField || field] || null;
                    if (typeof val === 'object' && val?.name) return val.name;
                    return val;
                  };

                  return {
                    name: c.name,
                    locationId: c.locationId,
                    deviceId: c.deviceId,
                    moduleId: c.moduleId,
                    thresholdValue: c.thresholdValue,
                    logicalOperatorType: isFirst ? 'NONE' : (c.logicalOperatorType && c.logicalOperatorType !== 'NONE' ? c.logicalOperatorType : 'AND'),
                    debounceTime: c.debounceTime,
                    parentId: c.parentId,
                    description: c.description,
                    onModuleGroup: c.onModuleGroup || false,
                    moduleGroupId: c.moduleGroupId || null,
                    // ✅ conditionType: always string
                    conditionType: (typeof c.conditionType === 'object' && c.conditionType) ? c.conditionType.name : c.conditionType,
                    eventField: {
                      id: ef.id || origEF.id,
                      // ✅ Required fields — fallback to origEF if ef has null/undefined
                      fieldName:    ef.fieldName    || origEF.fieldName    || '',
                      displayName:  ef.displayName  || origEF.displayName  || '',
                      // ✅ fieldType: string
                      fieldType: efStr('fieldType') || origEF.fieldType || null,
                      moduleTypeId:     ef.moduleTypeId     || origEF.moduleTypeId,
                      moduleTypeNumber: ef.moduleTypeNumber || origEF.moduleTypeNumber,
                      moduleTypeName:   ef.moduleTypeName   || origEF.moduleTypeName,
                      // ✅ dataType: always string (required by Sochiot Java enum)
                      dataType: (() => {
                        const dt = ef.dataType || origEF.dataType;
                        if (!dt) return 'INTEGER';
                        if (typeof dt === 'object' && dt?.name) return dt.name;
                        return dt;
                      })(),
                      // ✅ supportedValues: always string
                      supportedValues: Array.isArray(ef.supportedValues)
                        ? ef.supportedValues.join(',')
                        : (ef.supportedValues ?? (Array.isArray(origEF.supportedValues) ? origEF.supportedValues.join(',') : (origEF.supportedValues ?? ''))),
                      dateCreated: ef.dateCreated || origEF.dateCreated,
                      lastUpdated: ef.lastUpdated || origEF.lastUpdated,
                      deleted: ef.deleted || false
                    }
                  };
                }),
                consequences: updated.consequences?.map(c => {
                  const orig = origConsequences.find(oc => oc.id === c.id) || {};
                  return {
                    name: c.name,
                    deviceId: c.deviceId,
                    moduleId: c.moduleId,
                    locationId: c.locationId,
                    dataType: (typeof c.dataType === 'object' && c.dataType) ? c.dataType.name : (c.dataType || orig.dataType),
                    cmdField: c.cmdField,
                    supportedValues: Array.isArray(c.supportedValues) ? c.supportedValues.join(',') : (c.supportedValues ?? ''),
                    cmdArg: c.cmdArg,
                    argValue: c.argValue,
                    moduleTypeName: c.moduleTypeName || orig.moduleTypeName,
                    moduleTypeNumber: c.moduleTypeNumber || orig.moduleTypeNumber,
                    moduleTypeId: c.moduleTypeId || orig.moduleTypeId,
                    parentId: c.parentId,
                    description: c.description,
                    onModuleGroup: c.onModuleGroup || false,
                    moduleGroupId: c.moduleGroupId || null
                  };
                }),
                notifications: (updated.notifications || origNotifications).map(n => ({
                  id: n.id,
                  text: n.text,
                  alias: n.alias,
                  userIds: n.userIds,
                  created: n.created,
                  type: n.type,
                  icon: n.icon,
                  priority: n.priority
                })),
                version: latestVersion
              };

              await updateSochiotRule(updated.id, payload);
              setSelectedRule(updated);
              setRules(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
              setIsEditModalOpen(false);
            } catch (error) {
              console.error('Failed to update rule', error);
              alert('Failed to update rule: ' + error.message);
            }
          }}
          hierarchyData={hierarchyData}
          isDark={isDark}
        />
      )}
    </Container>
  );
};

export default AlarmConfig;
