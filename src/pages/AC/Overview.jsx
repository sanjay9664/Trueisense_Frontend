import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Badge, Form, Button, Modal } from 'react-bootstrap';
import { Wind, Thermometer, Droplets, Zap, Power, Settings, Fan, MapPin, Clock, Info, Activity, Edit2, Eye, EyeOff, Trash2, Play, Square, CheckCircle, Cpu, Gauge } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useDeviceStatus } from '../../services/DeviceStatusContext';
import io from 'socket.io-client';

// --- MOCK DATA ---
const INITIAL_ACS = [
  { id: 1, name: 'Master AC', type: '1.5 Ton Inverter Split AC', room: 'Master Bedroom', status: 'ON', mode: '--', setTemp: '--', roomTemp: 23.5, fanSpeed: '--', powerUsage: 1.2, scheduleStart: '', scheduleEnd: '', operationMode: 'Auto', activeAutoOptions: [] },
  { id: 2, name: 'Lobby AC', type: '2.0 Ton Cassette AC', room: 'Lobby', status: 'ON', mode: '--', setTemp: '--', roomTemp: 25.0, fanSpeed: '--', powerUsage: 2.1, scheduleStart: '', scheduleEnd: '', operationMode: 'Auto', activeAutoOptions: [] },
  { id: 3, name: 'Main Hall AC', type: '2.0 Ton Split AC', room: 'Hall', status: 'OFF', mode: '--', setTemp: '--', roomTemp: 26.5, fanSpeed: '--', powerUsage: 0.0, scheduleStart: '', scheduleEnd: '', operationMode: 'Manual', activeAutoOptions: [] },
  { id: 4, name: 'Server Room AC', type: '2.0 Ton Cassette AC', room: 'Server Room', status: 'ON', mode: '--', setTemp: '--', roomTemp: 18.5, fanSpeed: '--', powerUsage: 2.5, scheduleStart: '', scheduleEnd: '', operationMode: 'Auto', activeAutoOptions: [] },
];

const RealisticAC = ({ unit, telemetry, mapping }) => {
  const hasTelemetry = mapping && mapping.enabled;
  const tiles = [];
  
  if (hasTelemetry) {
    tiles.push({
      label: mapping.currentL1 ? 'Current L1' : (mapping.avgCurrent ? 'Avg Current' : 'Ampere'),
      shortLabel: mapping.currentL1 ? 'L1' : (mapping.avgCurrent ? 'Avg.C' : 'Amp'),
      key: mapping.currentL1 ? 'currentL1' : (mapping.avgCurrent ? 'avgCurrent' : 'ampere'),
      unit: 'A'
    });
    tiles.push({
      label: mapping.kwR ? 'kW-R' : 'kW',
      shortLabel: mapping.kwR ? 'kW-R' : 'kW',
      key: mapping.kwR ? 'kwR' : 'kw',
      unit: 'kW'
    });
    tiles.push({
      label: mapping.voltageBR ? 'Voltage B-R' : 'Avg Voltage L-L',
      shortLabel: mapping.voltageBR ? 'V.BR' : 'V.LL',
      key: mapping.voltageBR ? 'voltageBR' : 'avgVoltageLL',
      unit: 'V'
    });
    tiles.push({
      label: 'Voltage R-N',
      shortLabel: 'V.RN',
      key: 'voltageRN',
      unit: 'V'
    });
    if (mapping.kwhR) {
      tiles.push({
        label: 'KWH-R',
        shortLabel: 'kwhR',
        key: 'kwhR',
        unit: 'kWH'
      });
    }
    if (mapping.kwhY) {
      tiles.push({
        label: 'KWH-Y',
        shortLabel: 'kwhY',
        key: 'kwhY',
        unit: 'kWH'
      });
    }
    if (mapping.kwhB) {
      tiles.push({
        label: 'KWH-B',
        shortLabel: 'kwhB',
        key: 'kwhB',
        unit: 'kWH'
      });
    }
    if (mapping.pfR) {
      tiles.push({
        label: 'PF-R',
        shortLabel: 'pf.R',
        key: 'pfR',
        unit: 'PF'
      });
    }
    if (mapping.pfY) {
      tiles.push({
        label: 'PF-Y',
        shortLabel: 'pf.Y',
        key: 'pfY',
        unit: 'PF'
      });
    }
    if (mapping.pfB) {
      tiles.push({
        label: 'PF-B',
        shortLabel: 'pf.B',
        key: 'pfB',
        unit: 'PF'
      });
    }
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (tiles.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tiles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tiles.length]);

  const activeTile = tiles[currentIndex];

  const getTileValue = (tile) => {
    if (!tile || !telemetry) return '--';
    const registerVal = mapping[tile.key];
    const value = registerVal ? telemetry[tile.key] : null;
    return value !== null && value !== undefined ? `${value}` : '--';
  };

  return (
    <div style={{
      width: '100%',
      height: '85px',
      background: 'linear-gradient(to bottom, #cbd5e1 0%, #94a3b8 100%)',
      borderRadius: '12px',
      position: 'relative',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.6)',
      border: '1px solid rgba(255,255,255,0.3)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '8px 0',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Brand Line */}
      <div className="d-flex justify-content-center">
        <div style={{ width: '40px', height: '2px', background: '#475569', borderRadius: '4px', opacity: 0.4 }}></div>
      </div>
      
      {/* Sensor (IR/Temp Receiver) */}
      <div style={{
        position: 'absolute',
        left: '25px',
        top: '25px',
        width: '12px',
        height: '6px',
        borderRadius: '3px',
        background: '#020617',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 1px rgba(255,255,255,0.1)',
        border: '1px solid rgba(0,0,0,0.5)'
      }}></div>

      {/* Digital Display (Power & Temp) */}
      <div style={{
        position: 'absolute',
        right: '15px',
        top: '20px',
        background: '#090d16',
        padding: '4px 10px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Courier New', monospace",
        fontWeight: 'bold',
        fontSize: '12px',
        boxShadow: unit.status === 'ON' ? '0 0 10px rgba(249, 115, 22, 0.5)' : 'inset 0 0 4px rgba(0,0,0,0.8)',
        transition: 'all 0.3s ease',
        border: '1px solid rgba(249, 115, 22, 0.2)'
      }}>
        {/* Power Display / Live Telemetry */}
        {hasTelemetry ? (
          <span style={{ 
            color: '#f97316', 
            borderRight: '1px solid rgba(249, 115, 22, 0.2)', 
            paddingRight: '8px',
            textShadow: '0 0 6px rgba(249, 115, 22, 0.6)',
            display: 'inline-flex',
            alignItems: 'center',
            fontSize: '12px'
          }}>
            <span style={{ 
              color: '#ffedd5', 
              fontSize: '10px', 
              marginRight: '5px', 
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '800'
            }}>
              {activeTile?.shortLabel}:
            </span>
            <span>
              {getTileValue(activeTile)} {activeTile?.unit}
            </span>
          </span>
        ) : (
          <span style={{ 
            color: unit.status === 'ON' ? '#f97316' : '#475569', 
            borderRight: '1px solid rgba(249, 115, 22, 0.2)', 
            paddingRight: '8px',
            textShadow: unit.status === 'ON' ? '0 0 5px #f97316' : 'none'
          }}>
            {unit.status === 'ON' ? `${unit.powerUsage}kW` : '--'}
          </span>
        )}
        {/* Temp Display */}
        <span style={{ 
          color: unit.status === 'ON' ? '#f59e0b' : '#475569',
          textShadow: unit.status === 'ON' ? '0 0 5px #f59e0b' : 'none'
        }}>
          {unit.status === 'ON' ? (
            (() => {
              const displayTemp = (telemetry && telemetry.temperature !== null) 
                ? telemetry.temperature 
                : (unit.roomTemp !== undefined && unit.roomTemp !== '--' ? unit.roomTemp : '--');
              return displayTemp === '--' ? '--' : `${displayTemp}°`;
            })()
          ) : '--'}
        </span>
      </div>
      
      {/* Status LED */}
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '25px',
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: unit.status === 'ON' ? '#10b981' : '#ef4444',
        boxShadow: unit.status === 'ON' ? '0 0 8px #10b981' : '0 0 5px rgba(239, 68, 68, 0.5)',
        transition: 'all 0.3s ease'
      }}></div>

      {/* Flap Area (Vent) */}
      <div style={{
        width: '88%',
        margin: '0 auto',
        height: '14px',
        background: '#0f172a', // Deep dark vent
        borderRadius: '4px',
        marginTop: 'auto',
        marginBottom: '4px',
        boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.8)',
        position: 'relative',
        perspective: '400px'
      }}>
        <div style={{
           position: 'absolute',
           top: 0, left: 0, right: 0, bottom: 0,
           background: 'linear-gradient(to bottom, #94a3b8, #64748b)',
           transformOrigin: 'top',
           transform: unit.status === 'ON' ? 'rotateX(75deg)' : 'rotateX(0deg)',
           transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
           borderRadius: '3px',
           boxShadow: unit.status === 'ON' ? '0 8px 10px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)',
           borderBottom: '1px solid rgba(255,255,255,0.4)'
        }}></div>
      </div>
      
      {/* Airflow Animation (Only visible when ON) */}
      {unit.status === 'ON' && (
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '0',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          opacity: 0.6,
          zIndex: 0
        }}>
          <div className="airflow-line" style={{ width: '2px', height: '15px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.2s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '20px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.4s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.1s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '15px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.3s' }}></div>
        </div>
      )}
    </div>
  );
};

const ACOverview = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { getOverallStatus } = useDeviceStatus();
  const getMappedTelemetry = (unitName) => {
    try {
      // Find template for AC Overview matching this unit
      const match = templates.find(t => 
        t.category === 'AC' && 
        t.module === 'Overview' && 
        t.mapping?.acConfig?.acUnit === unitName
      );
      if (match && match.mapping?.acConfig) {
        return match.mapping.acConfig;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const getMappedRules = (unitName) => {
    try {
      const match = templates.find(t => 
        t.category === 'AC' && 
        t.module === 'Overview' && 
        t.mapping?.acConfig?.acUnit === unitName
      );
      if (match && match.mapping?.rules) {
        return match.mapping.rules;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const sendRulesToEngineForAC = async (unitName, action) => {
    try {
      const match = templates.find(t => 
        t.category === 'AC' && 
        t.module === 'Overview' && 
        t.mapping?.acConfig?.acUnit === unitName
      );
      if (match) {
        const rules = match.mapping?.rules || [];
        const deviceId = match.mapping?.acConfig?.device;
        if (!deviceId || rules.length === 0) return;
        
        const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
        const token = localStorage.getItem('sochiot_token');
        
        for (const rule of rules) {
          const payload = {
            moduleId: rule.moduleId || deviceId,
            settingFields: [
              { fieldName: "condition_date_time", currentValue: rule.condition?.timeDate || "" },
              { fieldName: "condition_date_time_repeat_days", currentValue: (rule.condition?.repeatDays || []).join(',') },
              { fieldName: "consequence_value", currentValue: action === 'START' ? "1" : (action === 'STOP' ? "0" : (rule.consequence?.value || "")) },
              { fieldName: "condition_type", currentValue: rule.condition?.type || "NA" },
              { fieldName: "condition_modbus", currentValue: rule.condition?.modbus || "" },
              { fieldName: "comparison_type", currentValue: rule.condition?.comparisonType || "" },
              { fieldName: "comparison_value", currentValue: rule.condition?.comparisonValue || "" },
              { fieldName: "consequence_type", currentValue: rule.consequence?.type || "" },
              { fieldName: "consequence_modbus", currentValue: rule.consequence?.modbus || "" }
            ]
          };
          
          await fetch(`${backendUrl}/api/rule-engine/apply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });
        }
      }
    } catch (e) {
      console.error('Error sending rules to rule engine:', e);
    }
  };

  const getACOnlineStatus = (unitName) => {
    try {
      const match = templates.find(t => 
        t.category === 'AC' && 
        t.module === 'Overview' && 
        t.mapping?.acConfig?.acUnit === unitName
      );
      if (match && match.mapping?.acConfig) {
        const deviceId = match.mapping.acConfig.device;
        const gatewayUuid = match.mapping.gatewayUuid;
        let isOnline = getOverallStatus(deviceId, gatewayUuid);
        return isOnline || !!deviceId;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const applyTempRangeRules = async (startVal, endVal, unitName) => {
    try {
      const matchIndex = templates.findIndex(t => 
        t.category === 'AC' && 
        t.module === 'Overview' && 
        t.mapping?.acConfig?.acUnit === unitName
      );
      if (matchIndex === -1) return;
      
      const updatedTemplates = [...templates];
      const match = updatedTemplates[matchIndex];
      const rules = match.mapping?.rules || [];
      const deviceId = match.mapping?.acConfig?.device;
      if (!deviceId || rules.length === 0) return;
      
      const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
      const token = localStorage.getItem('sochiot_token');
      
      // Update Rule 1 (Start) comparison value
      if (rules[0]) {
        rules[0].condition.comparisonValue = String(startVal);
        const payload1 = {
          moduleId: rules[0].moduleId || deviceId,
          settingFields: [
            { fieldName: "condition_date_time", currentValue: rules[0].condition?.timeDate || "" },
            { fieldName: "condition_date_time_repeat_days", currentValue: (rules[0].condition?.repeatDays || []).join(',') },
            { fieldName: "consequence_value", currentValue: rules[0].consequence?.value || "" },
            { fieldName: "condition_type", currentValue: rules[0].condition?.type || "MODBUS" },
            { fieldName: "condition_modbus", currentValue: rules[0].condition?.modbus || "" },
            { fieldName: "comparison_type", currentValue: rules[0].condition?.comparisonType || "" },
            { fieldName: "comparison_value", currentValue: String(startVal) },
            { fieldName: "consequence_type", currentValue: rules[0].consequence?.type || "" },
            { fieldName: "consequence_modbus", currentValue: rules[0].consequence?.modbus || "" }
          ]
        };
        await fetch(`${backendUrl}/api/rule-engine/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload1)
        });
      }
      
      // Update Rule 2 (Stop) comparison value
      if (rules[1]) {
        rules[1].condition.comparisonValue = String(endVal);
        const payload2 = {
          moduleId: rules[1].moduleId || deviceId,
          settingFields: [
            { fieldName: "condition_date_time", currentValue: rules[1].condition?.timeDate || "" },
            { fieldName: "condition_date_time_repeat_days", currentValue: (rules[1].condition?.repeatDays || []).join(',') },
            { fieldName: "consequence_value", currentValue: rules[1].consequence?.value || "" },
            { fieldName: "condition_type", currentValue: rules[1].condition?.type || "MODBUS" },
            { fieldName: "condition_modbus", currentValue: rules[1].condition?.modbus || "" },
            { fieldName: "comparison_type", currentValue: rules[1].condition?.comparisonType || "" },
            { fieldName: "comparison_value", currentValue: String(endVal) },
            { fieldName: "consequence_type", currentValue: rules[1].consequence?.type || "" },
            { fieldName: "consequence_modbus", currentValue: rules[1].consequence?.modbus || "" }
          ]
        };
        await fetch(`${backendUrl}/api/rule-engine/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload2)
        });
      }
      
      match.mapping.rules = rules;
      updatedTemplates[matchIndex] = match;
      setTemplates(updatedTemplates);
      localStorage.setItem('scada_templates', JSON.stringify(updatedTemplates));
      window.dispatchEvent(new Event('storage'));
      
    } catch (e) {
      console.error('Error applying temperature range rules:', e);
    }
  };
  const [units, setUnits] = useState(() => {
    const saved = localStorage.getItem('bms_ac_units');
    return saved ? JSON.parse(saved) : INITIAL_ACS;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [formData, setFormData] = useState({});
  const [showTempRangeModal, setShowTempRangeModal] = useState(false);
  const [tempRangeData, setTempRangeData] = useState({ startTemp: '28', endTemp: '24' });

  // Live Telemetry for template mapped registers
  const [liveTelemetry, setLiveTelemetry] = useState({});

  const getUnitTelemetry = (unitName) => {
    return liveTelemetry[unitName] || {
      temperature: null,
      humidity: null,
      ampere: null,
      kw: null,
      avgVoltageLL: null,
      avgCurrent: null,
      avgPowerKva: null,
      voltageRN: null,
      voltageYN: null,
      voltageBR: null,
      currentL1: null,
      currentL2: null,
      currentL3: null,
      kwR: null,
      kwY: null,
      kwB: null,
      kwhR: null,
      kwhY: null,
      kwhB: null,
      pfR: null,
      pfY: null,
      pfB: null
    };
  };

  // Group & Schedule State
  const [acGroups, setAcGroups] = useState(() => {
    const saved = localStorage.getItem('bms_ac_groups');
    return saved ? JSON.parse(saved) : [{ id: 'g1', name: 'Master Control', acIds: [1, 2] }];
  });
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [templates, setTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem('scada_templates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const templatesRef = useRef(templates);
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  // Load templates on mount & API fetch sync
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const tenantId = userData?.tenantId;
        const url = tenantId 
          ? `${backendUrl}/api/templates?tenantId=${tenantId}` 
          : `${backendUrl}/api/templates`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
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
        }
      } catch (error) {
        console.error('Error fetching templates in AC Overview:', error);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    const fetchLiveTelemetry = async () => {
      try {
        const currentTemplates = templatesRef.current;
        if (!currentTemplates || currentTemplates.length === 0) return;
        
        const acTemplates = currentTemplates.filter(t => 
          t.category === 'AC' && 
          t.module === 'Overview' && 
          t.mapping?.acConfig?.acUnit
        );
        if (acTemplates.length === 0) return;
        
        // Collect all modules to poll across all AC units
        const modulesToPoll = new Set();
        acTemplates.forEach(match => {
          const acConfig = match.mapping.acConfig;
          const registers = [
            acConfig.temperature, acConfig.humidity, acConfig.ampere, acConfig.kw,
            acConfig.avgVoltageLL, acConfig.avgCurrent, acConfig.avgPowerKva,
            acConfig.voltageRN, acConfig.voltageYN, acConfig.voltageBR,
            acConfig.currentL1, acConfig.currentL2, acConfig.currentL3,
            acConfig.kwR, acConfig.kwY, acConfig.kwB,
            acConfig.kwhR, acConfig.kwhY, acConfig.kwhB,
            acConfig.pfR, acConfig.pfY, acConfig.pfB
          ];
          registers.forEach(reg => {
            if (reg && typeof reg === 'string') {
              if (reg.includes('::')) {
                const parts = reg.split('::');
                if (parts[0]) modulesToPoll.add(String(parts[0]));
              } else if (reg.includes(',')) {
                const parts = reg.split(',');
                if (parts[0]) modulesToPoll.add(String(parts[0]));
              }
            }
          });
          if (acConfig.device) {
            modulesToPoll.add(String(acConfig.device));
          }
        });
        
        const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
        const pollList = Array.from(modulesToPoll);
        const url = pollList.length > 0 
          ? `${backendUrl}/api/templates/stats?modules=${pollList.join(',')}` 
          : `${backendUrl}/api/templates/stats`;

        const res = await fetch(url);
        if (res.ok) {
          const stats = await res.json();
          
          const getRegisterValue = (registerStr) => {
            if (!registerStr) return null;
            if (registerStr.includes('::')) {
              const [modId, fieldId] = registerStr.split('::');
              const stat = stats.find(s => String(s.moduleId) === String(modId) || String(s.meta?.module_id) === String(modId));
              if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
                return stat.meta[fieldId];
              }
            } else if (registerStr.includes(',')) {
              const [modId, fieldId] = registerStr.split(',');
              const stat = stats.find(s => String(s.moduleId) === String(modId) || String(s.meta?.module_id) === String(modId));
              if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
                return stat.meta[fieldId];
              }
            } else {
              for (const stat of stats) {
                if (stat.meta && stat.meta[registerStr] !== undefined) {
                  return stat.meta[registerStr];
                }
              }
            }
            return null;
          };

          setLiveTelemetry(prev => {
            const nextTelemetry = { ...prev };
            acTemplates.forEach(match => {
              const acUnit = match.mapping.acConfig.acUnit;
              const acConfig = match.mapping.acConfig;
              const prevUnit = prev[acUnit] || {};
              
              const nextTemp = getRegisterValue(acConfig.temperature);
              const nextHum = getRegisterValue(acConfig.humidity);
              const nextAmp = getRegisterValue(acConfig.ampere);
              const nextKw = getRegisterValue(acConfig.kw);
              const nextAvgVol = getRegisterValue(acConfig.avgVoltageLL);
              const nextAvgCur = getRegisterValue(acConfig.avgCurrent);
              const nextAvgKva = getRegisterValue(acConfig.avgPowerKva);
              const nextVRN = getRegisterValue(acConfig.voltageRN);
              const nextVYN = getRegisterValue(acConfig.voltageYN);
              const nextVBR = getRegisterValue(acConfig.voltageBR);
              const nextIL1 = getRegisterValue(acConfig.currentL1);
              const nextIL2 = getRegisterValue(acConfig.currentL2);
              const nextIL3 = getRegisterValue(acConfig.currentL3);
              const nextKwr = getRegisterValue(acConfig.kwR);
              const nextKwy = getRegisterValue(acConfig.kwY);
              const nextKwb = getRegisterValue(acConfig.kwB);
              const nextKwhr = getRegisterValue(acConfig.kwhR);
              const nextKwhy = getRegisterValue(acConfig.kwhY);
              const nextKwhb = getRegisterValue(acConfig.kwhB);
              const nextPfr = getRegisterValue(acConfig.pfR);
              const nextPfy = getRegisterValue(acConfig.pfY);
              const nextPfb = getRegisterValue(acConfig.pfB);
              
              nextTelemetry[acUnit] = {
                temperature: nextTemp !== null ? nextTemp : (prevUnit.temperature !== undefined ? prevUnit.temperature : null),
                humidity: nextHum !== null ? nextHum : (prevUnit.humidity !== undefined ? prevUnit.humidity : null),
                ampere: nextAmp !== null ? nextAmp : (prevUnit.ampere !== undefined ? prevUnit.ampere : null),
                kw: nextKw !== null ? nextKw : (prevUnit.kw !== undefined ? prevUnit.kw : null),
                avgVoltageLL: nextAvgVol !== null ? nextAvgVol : (prevUnit.avgVoltageLL !== undefined ? prevUnit.avgVoltageLL : null),
                avgCurrent: nextAvgCur !== null ? nextAvgCur : (prevUnit.avgCurrent !== undefined ? prevUnit.avgCurrent : null),
                avgPowerKva: nextAvgKva !== null ? nextAvgKva : (prevUnit.avgPowerKva !== undefined ? prevUnit.avgPowerKva : null),
                voltageRN: nextVRN !== null ? nextVRN : (prevUnit.voltageRN !== undefined ? prevUnit.voltageRN : null),
                voltageYN: nextVYN !== null ? nextVYN : (prevUnit.voltageYN !== undefined ? prevUnit.voltageYN : null),
                voltageBR: nextVBR !== null ? nextVBR : (prevUnit.voltageBR !== undefined ? prevUnit.voltageBR : null),
                currentL1: nextIL1 !== null ? nextIL1 : (prevUnit.currentL1 !== undefined ? prevUnit.currentL1 : null),
                currentL2: nextIL2 !== null ? nextIL2 : (prevUnit.currentL2 !== undefined ? prevUnit.currentL2 : null),
                currentL3: nextIL3 !== null ? nextIL3 : (prevUnit.currentL3 !== undefined ? prevUnit.currentL3 : null),
                kwR: nextKwr !== null ? nextKwr : (prevUnit.kwR !== undefined ? prevUnit.kwR : null),
                kwY: nextKwy !== null ? nextKwy : (prevUnit.kwY !== undefined ? prevUnit.kwY : null),
                kwB: nextKwb !== null ? nextKwb : (prevUnit.kwB !== undefined ? prevUnit.kwB : null),
                kwhR: nextKwhr !== null ? nextKwhr : (prevUnit.kwhR !== undefined ? prevUnit.kwhR : null),
                kwhY: nextKwhy !== null ? nextKwhy : (prevUnit.kwhY !== undefined ? prevUnit.kwhY : null),
                kwhB: nextKwhb !== null ? nextKwhb : (prevUnit.kwhB !== undefined ? prevUnit.kwhB : null),
                pfR: nextPfr !== null ? nextPfr : (prevUnit.pfR !== undefined ? prevUnit.pfR : null),
                pfY: nextPfy !== null ? nextPfy : (prevUnit.pfY !== undefined ? prevUnit.pfY : null),
                pfB: nextPfb !== null ? nextPfb : (prevUnit.pfB !== undefined ? prevUnit.pfB : null)
              };
            });
            return nextTelemetry;
          });
        }
      } catch (err) {
        console.error('Error fetching live telemetry:', err);
      }
    };

    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    const handleTelemetry = (stats) => {
      try {
        const currentTemplates = templatesRef.current;
        if (!currentTemplates || currentTemplates.length === 0) return;
        const acTemplates = currentTemplates.filter(t => 
          t.category === 'AC' && 
          t.module === 'Overview' && 
          t.mapping?.acConfig?.acUnit
        );
        if (acTemplates.length === 0) return;

        const getRegisterValue = (registerStr) => {
          if (!registerStr) return null;
          if (registerStr.includes('::')) {
            const [modId, fieldId] = registerStr.split('::');
            const stat = stats.find(s => String(s.moduleId) === String(modId) || String(s.meta?.module_id) === String(modId));
            if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
              return stat.meta[fieldId];
            }
          } else if (registerStr.includes(',')) {
            const [modId, fieldId] = registerStr.split(',');
            const stat = stats.find(s => String(s.moduleId) === String(modId) || String(s.meta?.module_id) === String(modId));
            if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
              return stat.meta[fieldId];
            }
          } else {
            for (const stat of stats) {
              if (stat.meta && stat.meta[registerStr] !== undefined) {
                return stat.meta[registerStr];
              }
            }
          }
          return null;
        };

        setLiveTelemetry(prev => {
          const nextTelemetry = { ...prev };
          acTemplates.forEach(match => {
            const acUnit = match.mapping.acConfig.acUnit;
            const acConfig = match.mapping.acConfig;
            const prevUnit = prev[acUnit] || {};

            const nextTemp = getRegisterValue(acConfig.temperature);
            const nextHum = getRegisterValue(acConfig.humidity);
            const nextAmp = getRegisterValue(acConfig.ampere);
            const nextKw = getRegisterValue(acConfig.kw);
            const nextAvgVol = getRegisterValue(acConfig.avgVoltageLL);
            const nextAvgCur = getRegisterValue(acConfig.avgCurrent);
            const nextAvgKva = getRegisterValue(acConfig.avgPowerKva);
            const nextVRN = getRegisterValue(acConfig.voltageRN);
            const nextVYN = getRegisterValue(acConfig.voltageYN);
            const nextVBR = getRegisterValue(acConfig.voltageBR);
            const nextIL1 = getRegisterValue(acConfig.currentL1);
            const nextIL2 = getRegisterValue(acConfig.currentL2);
            const nextIL3 = getRegisterValue(acConfig.currentL3);
            const nextKwr = getRegisterValue(acConfig.kwR);
            const nextKwy = getRegisterValue(acConfig.kwY);
            const nextKwb = getRegisterValue(acConfig.kwB);
            const nextKwhr = getRegisterValue(acConfig.kwhR);
            const nextKwhy = getRegisterValue(acConfig.kwhY);
            const nextKwhb = getRegisterValue(acConfig.kwhB);
            const nextPfr = getRegisterValue(acConfig.pfR);
            const nextPfy = getRegisterValue(acConfig.pfY);
            const nextPfb = getRegisterValue(acConfig.pfB);

            nextTelemetry[acUnit] = {
              temperature: nextTemp !== null ? nextTemp : (prevUnit.temperature !== undefined ? prevUnit.temperature : null),
              humidity: nextHum !== null ? nextHum : (prevUnit.humidity !== undefined ? prevUnit.humidity : null),
              ampere: nextAmp !== null ? nextAmp : (prevUnit.ampere !== undefined ? prevUnit.ampere : null),
              kw: nextKw !== null ? nextKw : (prevUnit.kw !== undefined ? prevUnit.kw : null),
              avgVoltageLL: nextAvgVol !== null ? nextAvgVol : (prevUnit.avgVoltageLL !== undefined ? prevUnit.avgVoltageLL : null),
              avgCurrent: nextAvgCur !== null ? nextAvgCur : (prevUnit.avgCurrent !== undefined ? prevUnit.avgCurrent : null),
              avgPowerKva: nextAvgKva !== null ? nextAvgKva : (prevUnit.avgPowerKva !== undefined ? prevUnit.avgPowerKva : null),
              voltageRN: nextVRN !== null ? nextVRN : (prevUnit.voltageRN !== undefined ? prevUnit.voltageRN : null),
              voltageYN: nextVYN !== null ? nextVYN : (prevUnit.voltageYN !== undefined ? prevUnit.voltageYN : null),
              voltageBR: nextVBR !== null ? nextVBR : (prevUnit.voltageBR !== undefined ? prevUnit.voltageBR : null),
              currentL1: nextIL1 !== null ? nextIL1 : (prevUnit.currentL1 !== undefined ? prevUnit.currentL1 : null),
              currentL2: nextIL2 !== null ? nextIL2 : (prevUnit.currentL2 !== undefined ? prevUnit.currentL2 : null),
              currentL3: nextIL3 !== null ? nextIL3 : (prevUnit.currentL3 !== undefined ? prevUnit.currentL3 : null),
              kwR: nextKwr !== null ? nextKwr : (prevUnit.kwR !== undefined ? prevUnit.kwR : null),
              kwY: nextKwy !== null ? nextKwy : (prevUnit.kwY !== undefined ? prevUnit.kwY : null),
              kwB: nextKwb !== null ? nextKwb : (prevUnit.kwB !== undefined ? prevUnit.kwB : null),
              kwhR: nextKwhr !== null ? nextKwhr : (prevUnit.kwhR !== undefined ? prevUnit.kwhR : null),
              kwhY: nextKwhy !== null ? nextKwhy : (prevUnit.kwhY !== undefined ? prevUnit.kwhY : null),
              kwhB: nextKwhb !== null ? nextKwhb : (prevUnit.kwhB !== undefined ? prevUnit.kwhB : null),
              pfR: nextPfr !== null ? nextPfr : (prevUnit.pfR !== undefined ? prevUnit.pfR : null),
              pfY: nextPfy !== null ? nextPfy : (prevUnit.pfY !== undefined ? prevUnit.pfY : null),
              pfB: nextPfb !== null ? nextPfb : (prevUnit.pfB !== undefined ? prevUnit.pfB : null)
            };
          });

          // Unify the units state update based on the newly calculated telemetry
          setUnits(prevUnits => {
            let changed = false;
            const nextUnits = prevUnits.map(unit => {
              const match = acTemplates.find(t => t.mapping.acConfig.acUnit === unit.name);
              if (match) {
                const acConfig = match.mapping.acConfig;
                const unitTelemetry = nextTelemetry[unit.name];
                if (unitTelemetry) {
                  const liveKw = unitTelemetry.kw !== null ? Number(unitTelemetry.kw) : 0;
                  const liveAmp = unitTelemetry.ampere !== null ? Number(unitTelemetry.ampere) : 0;
                  const liveL1 = unitTelemetry.currentL1 !== null ? Number(unitTelemetry.currentL1) : 0;
                  const liveAvgC = unitTelemetry.avgCurrent !== null ? Number(unitTelemetry.avgCurrent) : 0;
                  const liveKwr = unitTelemetry.kwR !== null ? Number(unitTelemetry.kwR) : 0;
                  const liveKwy = unitTelemetry.kwY !== null ? Number(unitTelemetry.kwY) : 0;
                  const liveKwb = unitTelemetry.kwB !== null ? Number(unitTelemetry.kwB) : 0;
                  
                  const totalActivePower = liveKw || liveKwr || liveKwy || liveKwb;
                  const totalActiveCurrent = liveAmp || liveL1 || liveAvgC;

                  const isPowerMapped = acConfig.kw || acConfig.kwR || acConfig.kwY || acConfig.kwB;
                  const isCurrentMapped = acConfig.ampere || acConfig.currentL1 || acConfig.avgCurrent;

                  let expectedStatus = unit.status;
                  if (isPowerMapped || isCurrentMapped) {
                    const hasPower = (isPowerMapped && totalActivePower > 0.05) || (isCurrentMapped && totalActiveCurrent > 0.2);
                    expectedStatus = hasPower ? 'ON' : 'OFF';
                  }

                  const expectedRoomTemp = unitTelemetry.temperature !== null ? unitTelemetry.temperature : unit.roomTemp;
                  const expectedHumidity = unitTelemetry.humidity !== null ? unitTelemetry.humidity : unit.humidity;

                  if (unit.status !== expectedStatus || unit.roomTemp !== expectedRoomTemp || unit.humidity !== expectedHumidity) {
                    changed = true;
                    return {
                      ...unit,
                      status: expectedStatus,
                      roomTemp: expectedRoomTemp,
                      humidity: expectedHumidity,
                      powerUsage: expectedStatus === 'ON' ? (totalActivePower || 1.5) : 0
                    };
                  }
                }
              }
              return unit;
            });
            return changed ? nextUnits : prevUnits;
          });

          return nextTelemetry;
        });
      } catch (err) {
        console.error('Error handling WebSocket telemetry update:', err);
      }
    };

    socket.on('telemetry_update', handleTelemetry);
    return () => socket.disconnect();
  }, []);
  
  useEffect(() => {
    localStorage.setItem('bms_ac_units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('bms_ac_groups', JSON.stringify(acGroups));
  }, [acGroups]);

  // Sync AC state, temperature and status based on saved templates
  useEffect(() => {
    const handleSync = () => {
      try {
        setUnits(prevUnits => {
          let changed = false;
          const nextUnits = prevUnits.map(unit => {
            // Find if there is a matching template mapping for this unit
            const match = templates.find(t => 
              t.category === 'AC' && 
              t.module === 'Overview' && 
              t.mapping?.acConfig?.acUnit === unit.name
            );
            
            if (match && match.mapping?.acConfig) {
              const acConfig = match.mapping.acConfig;
              
              // 1. Set ON/OFF status based on live telemetry readings if mapped
              let expectedStatus = unit.status;
              const telemetry = liveTelemetry[unit.name];
              if (telemetry) {
                const liveKw = telemetry.kw !== null ? Number(telemetry.kw) : 0;
                const liveAmp = telemetry.ampere !== null ? Number(telemetry.ampere) : 0;
                const liveL1 = telemetry.currentL1 !== null ? Number(telemetry.currentL1) : 0;
                const liveAvgC = telemetry.avgCurrent !== null ? Number(telemetry.avgCurrent) : 0;
                const liveKwr = telemetry.kwR !== null ? Number(telemetry.kwR) : 0;
                const liveKwy = telemetry.kwY !== null ? Number(telemetry.kwY) : 0;
                const liveKwb = telemetry.kwB !== null ? Number(telemetry.kwB) : 0;
                
                const totalActivePower = liveKw || liveKwr || liveKwy || liveKwb;
                const totalActiveCurrent = liveAmp || liveL1 || liveAvgC;

                const isPowerMapped = acConfig.kw || acConfig.kwR || acConfig.kwY || acConfig.kwB;
                const isCurrentMapped = acConfig.ampere || acConfig.currentL1 || acConfig.avgCurrent;

                if (isPowerMapped || isCurrentMapped) {
                  const hasPower = (isPowerMapped && totalActivePower > 0.05) || (isCurrentMapped && totalActiveCurrent > 0.2);
                  expectedStatus = hasPower ? 'ON' : 'OFF';
                }
              } else {
                expectedStatus = acConfig.enabled ? 'ON' : 'OFF';
              }
              
              // 2. Keep dynamic state values updated by telemetry instead of forcing defaults
              const expectedTemp = unit.setTemp;
              
              // 3. Keep dynamic state values updated by telemetry instead of forcing defaults
              const expectedRoomTemp = unit.roomTemp;
              
              // 4. Set Active Auto Mode options based on template autoMode
              const expectedAutoOptions = acConfig.autoMode ? [acConfig.autoMode] : [];
              const expectedOpMode = acConfig.autoMode ? 'Auto' : 'Manual';
              
              if (
                unit.status !== expectedStatus || 
                unit.setTemp !== expectedTemp || 
                unit.roomTemp !== expectedRoomTemp ||
                JSON.stringify(unit.activeAutoOptions) !== JSON.stringify(expectedAutoOptions) ||
                unit.operationMode !== expectedOpMode
              ) {
                changed = true;
                return {
                  ...unit,
                  status: expectedStatus,
                  setTemp: expectedTemp === '--' ? 24 : expectedTemp, // display temperature
                  roomTemp: expectedRoomTemp,
                  activeAutoOptions: expectedAutoOptions,
                  operationMode: expectedOpMode,
                  powerUsage: expectedStatus === 'ON' ? (unit.powerUsage || 1.5) : 0
                };
              }
            }
            return unit;
          });
          
          return changed ? nextUnits : prevUnits;
        });
      } catch (e) {
        console.error('Error syncing AC template settings:', e);
      }
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, [templates]);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedACsForGroup, setSelectedACsForGroup] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [scheduleTargetId, setScheduleTargetId] = useState('');
  const [scheduleData, setScheduleData] = useState({ scheduleStart: '', scheduleEnd: '', mode: 'Cool', setTemp: 24 });

  // Control Action Modal State
  const [showControlModal, setShowControlModal] = useState(false);
  const [controlTargetId, setControlTargetId] = useState(null);
  const [controlMode, setControlMode] = useState('Manual');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [autoOptions, setAutoOptions] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Realtime Schedule Runner
  useEffect(() => {
    const now = currentTime;
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (!savedSchedulesStr) return;
    
    try {
      const savedSchedules = JSON.parse(savedSchedulesStr);
      
      setUnits(prevUnits => {
        let hasChanges = false;
        const newUnits = prevUnits.map(unit => {
          if (!unit.activeAutoOptions?.includes('SCHEDULE')) return unit;
          
          const acIdStr = unit.id.toString();
          
          const specialSchedules = savedSchedules.special || {};
          let activeSpecialDate = null;
          if (specialSchedules[acIdStr] && specialSchedules[acIdStr].length > 0) {
            activeSpecialDate = specialSchedules[acIdStr].find(d => d.date === dateStr);
          }
          if (!activeSpecialDate && specialSchedules['ALL']) {
            activeSpecialDate = specialSchedules['ALL'].find(d => d.date === dateStr);
          }
          
          const dailySchedules = savedSchedules.daily || {};
          let todaySlots = [];
          if (dailySchedules[acIdStr] && dailySchedules[acIdStr][currentDay] && dailySchedules[acIdStr][currentDay].length > 0) {
            todaySlots = dailySchedules[acIdStr][currentDay];
          } else if (dailySchedules['ALL'] && dailySchedules['ALL'][currentDay]) {
            todaySlots = dailySchedules['ALL'][currentDay];
          }
          
          const activeSlot = todaySlots.find(slot => {
             return currentTimeStr >= slot.start && currentTimeStr < slot.end;
          });

          let expectedPower = unit.status;
          let expectedTemp = unit.setTemp;
          
          if (activeSpecialDate) {
            if (activeSpecialDate.action === 'System OFF') {
              expectedPower = 'OFF';
            } else if (activeSpecialDate.action === 'Custom Temp') {
              expectedTemp = Number(activeSpecialDate.temp);
              expectedPower = 'ON';
            }
          } else if (activeSlot) {
            expectedPower = activeSlot.power;
            if (activeSlot.temp) expectedTemp = Number(activeSlot.temp);
          } else {
             // Turn OFF if out of schedule
             expectedPower = 'OFF';
          }
          
          if (unit.status !== expectedPower || unit.setTemp !== expectedTemp) {
            hasChanges = true;
            return {
              ...unit,
              status: expectedPower,
              setTemp: expectedTemp,
              powerUsage: expectedPower === 'ON' ? 1.5 : 0
            };
          }
          
          return unit;
        });
        
        return hasChanges ? newUnits : prevUnits;
      });
      
    } catch (e) {
      // ignore
    }
  }, [currentTime]);

  const togglePower = (id) => {
    setUnits(units.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'ON' ? 'OFF' : 'ON', powerUsage: u.status === 'ON' ? 0 : 1.5 };
      }
      return u;
    }));
  };

  const openControlModal = (id) => {
    const unit = units.find(u => u.id === id);
    setControlTargetId(id);
    setControlMode(unit?.operationMode || 'Manual');
    setAutoOptions(unit?.activeAutoOptions || []);
    setControlSuccessMessage('');
    setShowControlModal(true);
  };

  const handleAutoToggle = (option) => {
    setAutoOptions(prev => {
      const newOptions = prev.includes(option) ? [] : [option];
      setUnits(units.map(u => u.id === controlTargetId ? { ...u, activeAutoOptions: newOptions } : u));
      
      if (option === 'TEMP') {
        const unit = units.find(u => u.id === controlTargetId);
        const rules = getMappedRules(unit?.name);
        const startT = rules?.[0]?.condition?.comparisonValue || '28';
        const endT = rules?.[1]?.condition?.comparisonValue || '24';
        setTempRangeData({ startTemp: startT, endTemp: endT });
        setShowTempRangeModal(true);
      }
      
      return newOptions;
    });
  };

  const handleControlAction = (action) => {
    if (action === 'SCHEDULE') {
      setShowControlModal(false);
      setScheduleTargetId(controlTargetId.toString());
      setShowScheduleModal(true);
      return;
    }

    setControlSuccessMessage(`SUCCESSFULL ${action}`);
    
    if (action === 'START') {
      setUnits(units.map(u => u.id === controlTargetId ? { ...u, status: 'ON', powerUsage: 1.5 } : u));
    } else if (action === 'STOP') {
      setUnits(units.map(u => u.id === controlTargetId ? { ...u, status: 'OFF', powerUsage: 0 } : u));
    }

    // Call rule engine for manual start/stop action
    const targetUnit = units.find(u => u.id === controlTargetId);
    if (targetUnit) {
      sendRulesToEngineForAC(targetUnit.name, action);
    }

    setTimeout(() => {
      setControlSuccessMessage('');
      setShowControlModal(false);
    }, 2000);
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'Cool': return <Thermometer size={14} className="text-info" />;
      case 'Dry': return <Droplets size={14} className="text-warning" />;
      case 'Fan': return <Fan size={14} className="text-secondary" />;
      case 'Heat': return <Thermometer size={14} className="text-danger" />;
      default: return <Wind size={14} />;
    }
  };

  const handleViewDetails = (unit) => {
    navigate(`/ac/${unit.id}`);
  };

  const getActiveScheduleForUnit = (unit) => {
    if (!unit.activeAutoOptions?.includes('SCHEDULE')) return null;
    
    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (!savedSchedulesStr) return null;
    
    try {
      const savedSchedules = JSON.parse(savedSchedulesStr);
      const acIdStr = unit.id.toString();
      
      const dailySchedules = savedSchedules.daily || {};
      const targetDaily = dailySchedules[acIdStr] || dailySchedules['ALL'] || {};
      
      const specialSchedules = savedSchedules.special || {};
      const targetSpecial = specialSchedules[acIdStr] || specialSchedules['ALL'] || [];
      
      const hasDailySlots = Object.values(targetDaily).some(daySlots => daySlots && daySlots.length > 0);
      const hasSpecialDates = targetSpecial.length > 0;
      
      return (hasDailySlots || hasSpecialDates) ? true : null;
    } catch (e) {
      return null;
    }
  };

  const getScheduleStats = (unit) => {
    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (!savedSchedulesStr) return { done: 0, upcoming: 0, total: 0 };
    try {
      const savedSchedules = JSON.parse(savedSchedulesStr);
      const acIdStr = unit.id.toString();
      const dailySchedules = savedSchedules.daily || {};
      
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      
      let todaySlots = [];
      if (dailySchedules[acIdStr] && dailySchedules[acIdStr][currentDay] && dailySchedules[acIdStr][currentDay].length > 0) {
        todaySlots = dailySchedules[acIdStr][currentDay];
      } else if (dailySchedules['ALL'] && dailySchedules['ALL'][currentDay]) {
        todaySlots = dailySchedules['ALL'][currentDay];
      }
      
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      let done = 0;
      let upcoming = 0;
      todaySlots.forEach(slot => {
        if (slot.end <= currentTimeStr) done++;
        else if (slot.start > currentTimeStr) upcoming++;
      });
      
      return { done, upcoming, total: todaySlots.length };
    } catch (e) {
      return { done: 0, upcoming: 0, total: 0 };
    }
  };

  const openSettings = (unit) => {
    setSelectedUnit(unit);
    setFormData({ ...unit });
    setShowSettings(true);
  };

  const saveSettings = () => {
    setUnits(units.map(u => u.id === formData.id ? { ...u, ...formData } : u));
    setShowSettings(false);
  };

  const handleACGroupSelection = (id) => {
    if (selectedACsForGroup.includes(id)) {
      setSelectedACsForGroup(selectedACsForGroup.filter(acId => acId !== id));
    } else {
      setSelectedACsForGroup([...selectedACsForGroup, id]);
    }
  };

  const createOrUpdateGroup = () => {
    if (!newGroupName || selectedACsForGroup.length === 0) return;
    if (editingGroupId) {
       setAcGroups(acGroups.map(g => g.id === editingGroupId ? { ...g, name: newGroupName, acIds: selectedACsForGroup } : g));
       setEditingGroupId(null);
    } else {
       setAcGroups([...acGroups, { id: 'g' + Date.now(), name: newGroupName, acIds: selectedACsForGroup }]);
    }
    setNewGroupName('');
    setSelectedACsForGroup([]);
  };

  const startEditGroup = (group) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    setSelectedACsForGroup(group.acIds);
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setNewGroupName('');
    setSelectedACsForGroup([]);
  };

  const deleteGroup = (id) => {
    setAcGroups(acGroups.filter(g => g.id !== id));
  };

  const controlGroup = (groupId, action, value) => {
    const group = acGroups.find(g => g.id === groupId);
    if (!group) return;

    setUnits(units.map(u => {
      if (group.acIds.includes(u.id)) {
        if (action === 'POWER') return { ...u, status: value, powerUsage: value === 'ON' ? 2.0 : 0 };
        if (action === 'MODE') return { ...u, mode: value };
        if (action === 'TEMP') return { ...u, setTemp: value };
      }
      return u;
    }));
  };

  const applySchedule = () => {
    if (!scheduleTargetId) return;

    let targetACIds = [];
    if (scheduleTargetId === 'ALL') {
      targetACIds = units.map(u => u.id);
    } else if (scheduleTargetId.toString().startsWith('g')) {
      const group = acGroups.find(g => g.id === scheduleTargetId);
      if (group) targetACIds = group.acIds;
    } else {
      targetACIds = [Number(scheduleTargetId)];
    }

    setUnits(units.map(u => {
      if (targetACIds.includes(u.id)) {
        return {
          ...u,
          scheduleStart: scheduleData.scheduleStart || u.scheduleStart,
          scheduleEnd: scheduleData.scheduleEnd || u.scheduleEnd,
          mode: scheduleData.mode || u.mode,
          setTemp: scheduleData.setTemp || u.setTemp
        };
      }
      return u;
    }));
    setShowScheduleModal(false);
    setScheduleData({ scheduleStart: '', scheduleEnd: '', mode: 'Cool', setTemp: 24 });
  };

  return (
    <div className="ac-dashboard-wrapper fade-in p-4" style={{ 
      minHeight: '100vh', 
      background: 'transparent',
      fontFamily: "'Inter', sans-serif" 
    }}>
      
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-5 pb-4 position-relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h3 className="text-white fw-bold mb-2 d-flex align-items-center" style={{ letterSpacing: '0.5px' }}>
            <Wind className="me-3 text-info" size={28} />
            AC Control Center
          </h3>
          <div className="d-flex align-items-center gap-4">
            <span className="text-secondary fw-bold" style={{ fontSize: '12px', letterSpacing: '1px' }}>{currentTime.toLocaleTimeString()}</span>
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
               <div className="pulse-dot"></div>
               <span className="text-success fw-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>SYSTEM ACTIVE</span>
            </div>
          </div>
        </div>
        
        {/* SUMMARY WIDGET */}
        <div className="d-flex align-items-center gap-3">
          <Button 
            disabled
            className="rounded-pill fw-bold d-flex align-items-center border-0 shadow-none text-white" 
            style={{ background: '#0ea5e9', padding: '10px 24px', letterSpacing: '0.3px', transition: 'all 0.3s ease', opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }} 
          >
            <Settings size={18} className="me-2"/> Manage Groups
          </Button>
          <Button 
            disabled
            variant="outline-secondary" 
            className="rounded-pill fw-bold d-flex align-items-center bg-transparent" 
            style={{ padding: '10px 24px', borderColor: isDark ? '#334155' : '#cbd5e1', color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.3px', transition: 'all 0.3s ease', opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }} 
          >
            <Clock size={18} className="me-2"/> Global Schedule
          </Button>
        </div>
      </div>

      <Row className="g-4 mb-5">
        {/* AC UNIT CARDS */}
        {units.map((unit) => (
          <Col xl={3} lg={4} md={6} sm={12} xs={12} key={unit.id}>
            <Card className="border-0 h-100 overflow-hidden premium-card" style={{ 
              background: 'linear-gradient(135deg, rgba(16, 16, 24, 0.75) 0%, rgba(8, 8, 12, 0.9) 100%)', 
              borderRadius: '24px', 
              border: unit.status === 'ON' ? '1px solid rgba(249, 115, 22, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: unit.status === 'ON' 
                ? '0 15px 45px rgba(249, 115, 22, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)' 
                : '0 15px 45px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.02)',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              opacity: unit.status === 'ON' ? 1 : 0.8
            }}>
              
              {/* Elegant Top Border Indicator */}
              <div style={{ height: '4px', background: unit.status === 'ON' ? 'linear-gradient(90deg, #f97316, #f59e0b)' : '#334155', transition: 'all 0.3s ease' }}></div>

              <Card.Body className="p-4 d-flex flex-column position-relative">
                {/* Settings Button - Disabled / Hidden for now */}
                <button 
                  onClick={() => openSettings(unit)}
                  className="position-absolute btn p-2 rounded-circle hover-glow" 
                  style={{ top: '16px', right: '16px', zIndex: 10, background: 'rgba(255,255,255,0.03)', border: 'none', color: '#64748b', display: 'none' }}
                >
                  <Settings size={18} />
                </button>                 {/* ROOM INFO */}
                 <div className="mb-4 pe-4">
                   <div className="d-flex align-items-center justify-content-between">
                     <div className="d-flex align-items-center gap-2 mb-2">
                       <MapPin size={12} style={{ color: unit.status === 'ON' ? '#f97316' : '#64748b', transition: 'all 0.3s ease' }} />
                       <span className="fw-bold text-uppercase" style={{ fontSize: '10px', letterSpacing: '1.5px', color: unit.status === 'ON' ? '#f97316' : '#64748b', transition: 'all 0.3s ease' }}>{unit.room}</span>
                     </div>
                   </div>
                   <h4 className="text-white fw-bold mb-1">{unit.name}</h4>
                   <div className="text-secondary fw-medium mb-3" style={{ fontSize: '12px' }}>{unit.type}</div>
                   
                   {/* Detailed Status Row */}
                   <div className="d-flex align-items-center gap-2 flex-wrap">
                     {/* Online/Offline Status */}
                     <span style={{ 
                       fontSize: '9px', 
                       fontWeight: 'bold', 
                       letterSpacing: '0.5px',
                       padding: '2px 8px',
                       borderRadius: '4px',
                       background: getACOnlineStatus(unit.name) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                       border: `1px solid ${getACOnlineStatus(unit.name) ? '#10b981' : '#ef4444'}`,
                       color: getACOnlineStatus(unit.name) ? '#34d399' : '#f87171',
                       textShadow: getACOnlineStatus(unit.name) ? '0 0 5px rgba(52, 211, 153, 0.4)' : 'none'
                     }}>
                       {getACOnlineStatus(unit.name) ? 'ONLINE' : 'OFFLINE'}
                     </span>

                     {/* Power Status */}
                     <span style={{ 
                       fontSize: '9px', 
                       fontWeight: 'bold', 
                       letterSpacing: '0.5px',
                       padding: '2px 8px',
                       borderRadius: '4px',
                       background: unit.status === 'ON' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                       border: `1px solid ${unit.status === 'ON' ? '#f97316' : 'rgba(255,255,255,0.08)'}`,
                       color: unit.status === 'ON' ? '#fdba74' : '#64748b',
                       textShadow: unit.status === 'ON' ? '0 0 5px rgba(249, 115, 22, 0.4)' : 'none'
                     }}>
                       POWER: {unit.status}
                     </span>

                     {/* Control Mode (Auto/Manual) */}
                     {getACOnlineStatus(unit.name) && (
                       <span style={{ 
                         fontSize: '9px', 
                         fontWeight: 'bold', 
                         letterSpacing: '0.5px',
                         padding: '2px 8px',
                         borderRadius: '4px',
                         background: unit.operationMode === 'Auto' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                         border: `1px solid ${unit.operationMode === 'Auto' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                         color: unit.operationMode === 'Auto' ? '#fde047' : '#64748b',
                         textShadow: unit.operationMode === 'Auto' ? '0 0 5px rgba(245, 158, 11, 0.4)' : 'none'
                       }}>
                         {unit.operationMode === 'Auto' 
                           ? (unit.activeAutoOptions && unit.activeAutoOptions.length > 0 
                               ? `AUTO: ${unit.activeAutoOptions[0]}` 
                               : 'AUTO') 
                           : 'MANUAL'}
                       </span>
                     )}

                     {/* Running Mode (COOL/DRY/FAN etc. if ON) */}
                     {getACOnlineStatus(unit.name) && unit.status === 'ON' && unit.mode && unit.mode !== '--' && (
                       <span style={{ 
                         fontSize: '9px', 
                         fontWeight: 'bold', 
                         letterSpacing: '0.5px',
                         padding: '2px 8px',
                         borderRadius: '4px',
                         background: 'rgba(14, 165, 233, 0.15)',
                         border: '1px solid #0ea5e9',
                         color: '#38bdf8',
                         textShadow: '0 0 5px rgba(14, 165, 233, 0.4)'
                       }}>
                         MODE: {unit.mode.toUpperCase()}
                       </span>
                     )}
                   </div>
                 </div> 

                {/* REALISTIC AC GRAPHIC */}
                <div className="mb-4 px-2">
                  <RealisticAC 
                    unit={unit} 
                    telemetry={getUnitTelemetry(unit.name)}
                    mapping={getMappedTelemetry(unit.name)}
                  />
                </div>

                {/* CONTROLS AREA */}
                <div className="mt-auto">
                                    {/* Room Temp & Humidity Grid */}
                  <Row className="g-3 mb-3">
                    <Col xs={6}>
                      <div className="p-3 rounded-4 text-center h-100" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="text-secondary fw-bold mb-1 text-uppercase text-nowrap" style={{ fontSize: '10px', letterSpacing: '0.5px', opacity: 0.8 }}>Room Temp</div>
                        <div className="d-flex align-items-baseline justify-content-center text-nowrap mt-1">
                          <span className="text-white fw-black lh-1" style={{ fontSize: '2rem', letterSpacing: '-1px', textShadow: '0 0 10px rgba(249, 115, 22, 0.4)' }}>
                            {getMappedTelemetry(unit.name) && getUnitTelemetry(unit.name).temperature !== null ? getUnitTelemetry(unit.name).temperature : unit.roomTemp}
                          </span>
                          <span className="fw-bold ms-1" style={{ fontSize: '1.1rem', color: '#f97316' }}>
                            {((getMappedTelemetry(unit.name) && getUnitTelemetry(unit.name).temperature !== null) || unit.roomTemp !== '--') ? '°C' : ''}
                          </span>
                        </div>
                      </div>
                    </Col>

                    <Col xs={6}>
                      <div className="p-3 rounded-4 text-center h-100" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="text-secondary fw-bold mb-1 text-uppercase text-nowrap" style={{ fontSize: '10px', letterSpacing: '0.5px', opacity: 0.8 }}>Humidity</div>
                        <div className="d-flex align-items-baseline justify-content-center text-nowrap mt-1">
                          <span className="text-white fw-black lh-1" style={{ fontSize: '2rem', letterSpacing: '-1px', textShadow: '0 0 10px rgba(245, 158, 11, 0.4)' }}>
                            {(() => {
                              const ut = getUnitTelemetry(unit.name);
                              return ut.humidity !== null ? ut.humidity : (unit.humidity !== undefined ? unit.humidity : '--');
                            })()}
                          </span>
                          <span className="text-warning fw-bold ms-1" style={{ fontSize: '1.1rem' }}>%</span>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {/* Sleek Control Button */}
                  <button 
                    onClick={() => openControlModal(unit.id)}
                    className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2 fw-bold tracking-wider text-uppercase"
                    style={{
                      background: unit.status === 'ON' 
                        ? 'linear-gradient(135deg, #ff7a00 0%, #ff5100 100%)' 
                        : 'rgba(255, 255, 255, 0.04)',
                      color: unit.status === 'ON' ? '#ffffff' : '#94a3b8',
                      border: unit.status === 'ON' ? '1px solid rgba(255, 122, 0, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '16px',
                      padding: '12px 24px',
                      boxShadow: unit.status === 'ON' 
                        ? '0 6px 20px rgba(255, 122, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
                        : 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      letterSpacing: '1px',
                      textShadow: unit.status === 'ON' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      if (unit.status === 'ON') {
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 122, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                      } else {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 122, 0, 0.25)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      if (unit.status === 'ON') {
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 122, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                      } else {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                  >
                    <Power size={14} strokeWidth={unit.status === 'ON' ? 3 : 2} style={{ color: unit.status === 'ON' ? '#ffffff' : '#f97316' }} />
                    <span style={{ color: unit.status === 'ON' ? '#ffffff' : '#e2e8f0' }}>AC {unit.status}</span>
                  </button>

                  {/* PREMIUM ENERGY TELEMETRY DETAILS PANEL */}
                  {(() => {
                    const mapping = getMappedTelemetry(unit.name);
                    const telemetry = getUnitTelemetry(unit.name);
                    
                    const mappedItems = [
                      { key: 'kwhR', label: 'Total Energy Consumed', unit: 'kWh', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', icon: <Zap size={13} style={{ color: '#f97316' }} /> },
                      { key: 'kwhY', label: 'KWH-Y (Phase Energy)', unit: 'kWh', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', icon: <Zap size={13} style={{ color: '#f97316' }} /> },
                      { key: 'kwhB', label: 'KWH-B (Phase Energy)', unit: 'kWh', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', icon: <Zap size={13} style={{ color: '#f97316' }} /> },
                      { key: 'pfR', label: 'PF-R (Power Factor)', unit: 'PF', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', icon: <Activity size={13} style={{ color: '#f97316' }} /> },
                      { key: 'pfY', label: 'PF-Y (Power Factor)', unit: 'PF', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', icon: <Activity size={13} style={{ color: '#f97316' }} /> },
                      { key: 'pfB', label: 'PF-B (Power Factor)', unit: 'PF', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', icon: <Activity size={13} style={{ color: '#f97316' }} /> }
                    ].filter(item => mapping && mapping[item.key]);

                    if (mappedItems.length === 0) return null;

                    const isSingle = mappedItems.length === 1;

                    return (
                      <div 
                        className="p-3 rounded-4 mb-4 border" 
                        style={{ 
                          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.02) 0%, rgba(8, 10, 15, 0.65) 100%)', 
                          borderColor: 'rgba(249, 115, 22, 0.15)',
                          backdropFilter: 'blur(10px)',
                          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div className="row g-3">
                          {mappedItems.map((item) => {
                            const value = telemetry[item.key];
                            return (
                              <div key={item.key} className={isSingle ? "col-12" : "col-6"}>
                                <div className="d-flex flex-column">
                                  <span className="text-secondary fw-bold mb-2 text-uppercase d-flex align-items-center gap-2 text-wrap" style={{ fontSize: isSingle ? '11px' : '9px', letterSpacing: '0.5px', opacity: 0.85, lineHeight: 1.2 }}>
                                    {item.icon}
                                    {item.label}
                                  </span>
                                  <div className="d-flex align-items-baseline text-nowrap">
                                    <span className="text-white fw-black font-monospace lh-1" style={{ fontSize: isSingle ? '2.2rem' : '1.5rem', letterSpacing: '-1px', textShadow: `0 0 10px ${item.glow}` }}>
                                      {value !== null && value !== undefined ? value : '--'}
                                    </span>
                                    <span className="fw-bold ms-1.5 font-monospace" style={{ fontSize: isSingle ? '12px' : '10px', color: item.color }}>{item.unit}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Status Badges */}
                  <div className="d-flex gap-2 mb-4">
                    <Badge bg="transparent" className="flex-grow-1 py-2 px-0 text-light fw-normal d-flex justify-content-center align-items-center border border-secondary border-opacity-25 rounded-pill" style={{ background: 'rgba(255,255,255,0.02) !important' }}>
                      {getModeIcon(unit.mode)} <span className="ms-2 fs-12">{unit.status === 'ON' ? unit.mode : '--'}</span>
                    </Badge>
                    <Badge bg="transparent" className="flex-grow-1 py-2 px-0 text-light fw-normal d-flex justify-content-center align-items-center border border-secondary border-opacity-25 rounded-pill" style={{ background: 'rgba(255,255,255,0.02) !important' }}>
                      <Fan size={14} className="text-secondary me-2" /> <span className="fs-12">{unit.status === 'ON' ? unit.fanSpeed : '--'}</span>
                    </Badge>
                    <Badge bg="transparent" className="flex-grow-1 py-2 px-0 text-light fw-normal d-flex justify-content-center align-items-center border border-secondary border-opacity-25 rounded-pill" style={{ background: 'rgba(255,255,255,0.02) !important' }}>
                      <Zap size={14} className={unit.powerUsage > 0 ? "text-warning me-2" : "text-secondary me-2"} /> <span className="fs-12">{unit.status === 'ON' ? `${unit.powerUsage}kW` : '--'}</span>
                    </Badge>
                  </div>

                  {/* Schedule Indicator */}
                  {getActiveScheduleForUnit(unit) ? (
                    <div className="d-flex flex-column gap-2 mt-2">
                      <div className="d-flex align-items-center justify-content-between px-3 py-2 rounded-pill" style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                        <div className="d-flex align-items-center gap-2">
                          <Clock size={12} className="text-info" />
                          <span className="text-info fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                            {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="bg-info rounded-circle" style={{ width: '6px', height: '6px', boxShadow: '0 0 8px #0ea5e9' }}></div>
                      </div>
                      
                      {(() => {
                        const stats = getScheduleStats(unit);
                        return (
                          <div className="d-flex justify-content-between px-2 text-secondary fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                            <span>Done: <span className={isDark ? 'text-white' : 'text-dark'}>{stats.done}</span></span>
                            <span>Upcoming: <span className={isDark ? 'text-white' : 'text-dark'}>{stats.upcoming}</span></span>
                            <span>Total: <span className={isDark ? 'text-white' : 'text-dark'}>{stats.total}</span></span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center px-3 py-2 rounded-pill mt-2" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                      <span className="text-secondary fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>No Active Schedule</span>
                    </div>
                  )}

                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* AC INDIVIDUAL SETTINGS MODAL */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered className="premium-modal">
        {selectedUnit && (
          <>
            <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
              <Modal.Title className="text-white fs-5 fw-bold d-flex align-items-center gap-3">
                <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '36px', height: '36px' }}>
                  <Settings size={20} color="white" />
                </div>
                Configure Unit
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 py-4" style={{ background: '#0f172a', color: '#fff' }}>
              
              <div className="mb-4">
                <h6 className="text-info fw-bold mb-3 fs-12 tracking-widest text-uppercase">Identification</h6>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Room / Location</Form.Label>
                      <Form.Control type="text" value={formData.room || ''} onChange={e => setFormData({...formData, room: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">AC Type</Form.Label>
                      <Form.Control type="text" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h6 className="text-info fw-bold mb-3 fs-12 tracking-widest text-uppercase">Automation Schedule</h6>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12 d-flex align-items-center gap-1"><Clock size={12}/> Auto ON Time</Form.Label>
                      <Form.Control type="time" value={formData.scheduleStart || ''} onChange={e => setFormData({...formData, scheduleStart: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12 d-flex align-items-center gap-1"><Clock size={12}/> Auto OFF Time</Form.Label>
                      <Form.Control type="time" value={formData.scheduleEnd || ''} onChange={e => setFormData({...formData, scheduleEnd: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <div>
                <h6 className="text-info fw-bold mb-3 fs-12 tracking-widest text-uppercase">Operation Default</h6>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Mode</Form.Label>
                      <Form.Select value={formData.mode || '--'} onChange={e => setFormData({...formData, mode: e.target.value})} className="premium-input">
                        <option value="--" disabled>-- Select --</option>
                        <option value="Cool">Cool</option>
                        <option value="Fan">Fan</option>
                        <option value="Dry">Dry</option>
                        <option value="Heat">Heat</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Fan Speed</Form.Label>
                      <Form.Select value={formData.fanSpeed || '--'} onChange={e => setFormData({...formData, fanSpeed: e.target.value})} className="premium-input">
                        <option value="--" disabled>-- Select --</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Auto">Auto</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Room Temp</Form.Label>
                      <Form.Control type="number" min="16" max="30" value={formData.setTemp === '--' ? '' : formData.setTemp} onChange={e => setFormData({...formData, setTemp: e.target.value ? Number(e.target.value) : '--'})} className="premium-input" placeholder="--" />

                    </Form.Group>
                  </Col>
                </Row>
              </div>

            </Modal.Body>
            <Modal.Footer className="border-top-0 pt-0 px-4 pb-4" style={{ background: '#0f172a' }}>
              <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button variant="info" className="rounded-pill px-5 fw-bold shadow" onClick={saveSettings}>Apply Changes</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* MANAGE GROUPS MODAL */}
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} centered size="xl" className="premium-modal">
        <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
          <Modal.Title className="text-white fs-4 fw-bold d-flex align-items-center gap-3">
            <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '42px', height: '42px' }}>
              <Wind size={24} color="white" />
            </div>
            AC Group Management
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ background: '#0f172a', color: '#fff' }}>
          <Row className="g-5">
            <Col lg={5}>
              <div className="bg-slate-800 p-4 rounded-4" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 41, 59, 0.3)' }}>
                <h5 className="text-white fw-bold mb-4">{editingGroupId ? 'Update Existing Group' : 'Create New Group'}</h5>
                <Form.Group className="mb-4">
                  <Form.Label className="text-secondary fs-12 fw-bold tracking-widest text-uppercase">Group Name</Form.Label>
                  <Form.Control type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Server Rooms" className="premium-input py-3" />
                </Form.Group>
                
                <Form.Label className="text-secondary fs-12 fw-bold tracking-widest text-uppercase mb-3">Assign Units to Group</Form.Label>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="mb-4 pe-2">
                  {units.map(u => {
                    const isManual = u.operationMode === 'Manual';
                    const isSelected = selectedACsForGroup.includes(u.id);
                    return (
                      <div 
                        key={u.id} 
                        className="d-flex align-items-center justify-content-between p-3 mb-2 rounded-3 position-relative" 
                        style={{ 
                          background: isSelected ? 'rgba(14, 165, 233, 0.1)' : 'rgba(0,0,0,0.2)', 
                          border: `1px solid ${isSelected ? 'rgba(14, 165, 233, 0.3)' : 'transparent'}`, 
                          cursor: isManual ? 'not-allowed' : 'pointer',
                          opacity: isManual ? 0.5 : 1
                        }} 
                        onClick={() => !isManual && handleACGroupSelection(u.id)}
                      >
                        <div className="d-flex align-items-center">
                          <Form.Check 
                            type="checkbox" 
                            id={`group-ac-${u.id}`} 
                            checked={isSelected} 
                            disabled={isManual}
                            onChange={() => {}} 
                            className="me-3" 
                          />
                          <div>
                            <div className="text-white fw-bold fs-12">{u.name}</div>
                            <div className="text-secondary fs-11"><MapPin size={10} className="me-1"/>{u.room}</div>
                          </div>
                        </div>
                        {isManual && (
                          <Badge bg="dark" className="text-secondary border border-secondary border-opacity-25 px-2 py-1" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>MANUAL</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="d-flex gap-3">
                  {editingGroupId && <Button variant="outline-secondary" className="w-50 rounded-pill fw-bold py-2" onClick={cancelEdit}>CANCEL</Button>}
                  <Button variant="info" onClick={createOrUpdateGroup} disabled={!newGroupName || selectedACsForGroup.length === 0} className={`${editingGroupId ? 'w-50' : 'w-100'} rounded-pill fw-bold py-2 shadow`}>
                    {editingGroupId ? 'UPDATE GROUP' : 'CREATE GROUP'}
                  </Button>
                </div>
              </div>
            </Col>
            
            <Col lg={7}>
              <h5 className="text-white fw-bold mb-4">Active Groups & Control</h5>
              {acGroups.length === 0 ? (
                <div className="text-center p-5 border border-dashed rounded-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Wind size={48} className="text-secondary mb-3 opacity-50" />
                  <h6 className="text-secondary">No groups configured yet.</h6>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                  {acGroups.map(group => (
                    <Card key={group.id} className="border-0 shadow-sm" style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="text-white fw-bold mb-1">{group.name}</h5>
                            <Badge bg="transparent" className="px-2 py-1 rounded-pill fw-bold" style={{ background: 'rgba(14, 165, 233, 0.2) !important', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.3)' }}>{group.acIds.length} Linked Units</Badge>
                          </div>
                          <div className="d-flex gap-2">
                            <Button variant="link" className="text-info p-2" onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}>
                              {expandedGroupId === group.id ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </Button>
                            <Button variant="link" className="text-warning p-2" onClick={() => startEditGroup(group)}>
                              <Edit2 size={16}/>
                            </Button>
                            <Button variant="link" className="text-danger p-2" onClick={() => deleteGroup(group.id)}>
                              <Trash2 size={16}/>
                            </Button>
                          </div>
                        </div>

                        {expandedGroupId === group.id && (
                          <div className="bg-black bg-opacity-30 p-3 rounded-3 mb-3 border border-secondary border-opacity-25 mt-3">
                            <div className="d-flex flex-wrap gap-2">
                              {group.acIds.map(id => {
                                const ac = units.find(u => u.id === id);
                                return ac ? <Badge bg="dark" className="border border-secondary border-opacity-50 px-3 py-2 text-light fw-normal" key={id}>{ac.name}</Badge> : null;
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-black bg-opacity-20 rounded-3 p-3 mt-3 border border-secondary border-opacity-10">
                           <Row className="g-2">
                             <Col xs={6} md={3}>
                               <Button variant="outline-success" className="w-100 fw-bold rounded-pill" onClick={() => controlGroup(group.id, 'POWER', 'ON')}><Power size={14} className="me-1"/> ON</Button>
                             </Col>
                             <Col xs={6} md={3}>
                               <Button variant="outline-danger" className="w-100 fw-bold rounded-pill" onClick={() => controlGroup(group.id, 'POWER', 'OFF')}><Power size={14} className="me-1"/> OFF</Button>
                             </Col>
                             <Col xs={6} md={3}>
                               <Form.Select className="premium-select rounded-pill" onChange={(e) => controlGroup(group.id, 'MODE', e.target.value)}>
                                 <option value="">Set Mode</option>
                                 <option value="Cool">Cool</option>
                                 <option value="Fan">Fan</option>
                                 <option value="Dry">Dry</option>
                                 <option value="Heat">Heat</option>
                               </Form.Select>
                             </Col>
                             <Col xs={6} md={3}>
                               <Form.Select className="premium-select rounded-pill" onChange={(e) => controlGroup(group.id, 'TEMP', Number(e.target.value))}>
                                 <option value="">Set Temp</option>
                                 {[16,18,20,22,24,26,28,30].map(t => <option key={t} value={t}>{t}°C</option>)}
                               </Form.Select>
                             </Col>
                           </Row>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* SCHEDULE SETTINGS MODAL */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} centered size="md" className="premium-modal">
        <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
          <Modal.Title className="text-white fs-5 fw-bold d-flex align-items-center gap-3">
            <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '36px', height: '36px' }}>
              <Clock size={20} color="white" />
            </div>
            Global Scheduler
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4" style={{ background: '#0f172a', color: '#fff' }}>
          
          <div className="bg-slate-800 p-4 rounded-4 mb-4" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 41, 59, 0.3)' }}>
            <Form.Group>
              <Form.Label className="text-info fw-bold fs-12 tracking-widest text-uppercase">1. Select Target Application</Form.Label>
              <Form.Select value={scheduleTargetId} onChange={(e) => setScheduleTargetId(e.target.value)} className="premium-input py-3">
                <option value="">-- Choose Target --</option>
                <option value="ALL" className="fw-bold text-info">★ ALL AC UNITS IN FACILITY</option>
                {acGroups.length > 0 && <optgroup label="Custom Groups">
                  {acGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.acIds.length} Units)</option>)}
                </optgroup>}
                <optgroup label="Individual Units">
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} - {u.room}</option>)}
                </optgroup>
              </Form.Select>
            </Form.Group>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-4" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 41, 59, 0.3)' }}>
            <h6 className="text-info fw-bold mb-4 fs-12 tracking-widest text-uppercase">2. Execution Parameters</h6>
            
            <Row className="mb-4 g-4">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold d-flex align-items-center gap-2"><div className="w-2 h-2 rounded-circle bg-success" style={{width:'8px',height:'8px'}}></div> Power ON Time</Form.Label>
                  <Form.Control type="time" value={scheduleData.scheduleStart || ''} onChange={e => setScheduleData({...scheduleData, scheduleStart: e.target.value})} className="premium-input py-2" />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold d-flex align-items-center gap-2"><div className="w-2 h-2 rounded-circle bg-danger" style={{width:'8px',height:'8px'}}></div> Power OFF Time</Form.Label>
                  <Form.Control type="time" value={scheduleData.scheduleEnd || ''} onChange={e => setScheduleData({...scheduleData, scheduleEnd: e.target.value})} className="premium-input py-2" />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold">Target Mode</Form.Label>
                  <Form.Select value={scheduleData.mode || 'Cool'} onChange={e => setScheduleData({...scheduleData, mode: e.target.value})} className="premium-input py-2">
                    <option value="Cool">Cool</option>
                    <option value="Fan">Fan</option>
                    <option value="Dry">Dry</option>
                    <option value="Heat">Heat</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold">Room Temp (°C)</Form.Label>
                  <Form.Control type="number" min="16" max="30" value={scheduleData.setTemp || 24} onChange={e => setScheduleData({...scheduleData, setTemp: Number(e.target.value)})} className="premium-input py-2" />
                </Form.Group>
              </Col>
            </Row>
          </div>

        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-0 px-4 pb-4" style={{ background: '#0f172a' }}>
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
          <Button variant="info" className="rounded-pill px-5 fw-bold shadow" onClick={applySchedule} disabled={!scheduleTargetId}>
            Dispatch Schedule
          </Button>
        </Modal.Footer>
      </Modal>

      {/* POWER CONTROL MODAL */}
      <Modal show={showControlModal} onHide={() => setShowControlModal(false)} centered size="sm" className={`premium-modal ${isDark ? '' : 'light-mode-modal'}`}>
        <Modal.Header closeButton closeVariant={isDark ? "white" : "black"} className="border-bottom-0 pb-0" style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
          <Modal.Title className={`fs-5 fw-bold d-flex align-items-center gap-3 ${isDark ? 'text-white' : 'text-dark'}`}>
            <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '36px', height: '36px' }}>
              <Power size={18} color="white" />
            </div>
            Operation Mode
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4 text-center position-relative" style={{ background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#fff' : '#0f172a' }}>
          
          {/* Segmented Control for Auto/Manual */}
          <div className="d-flex align-items-center justify-content-between p-1 rounded-pill mb-4 mx-auto" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', width: '220px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`, boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            <div 
              onClick={() => {
                setControlMode('Manual'); 
                setControlSuccessMessage('');
                setUnits(units.map(u => u.id === controlTargetId ? { ...u, operationMode: 'Manual' } : u));
              }}
              className={`w-50 text-center py-2 rounded-pill fw-bold transition-all ${controlMode === 'Manual' ? 'bg-info text-white shadow' : (isDark ? 'text-secondary' : 'text-dark')}`}
              style={{ fontSize: '12px', letterSpacing: '1px', cursor: 'pointer' }}
            >
              MANUAL
            </div>
            <div 
              onClick={() => {
                setControlMode('Auto'); 
                setControlSuccessMessage('');
                setUnits(units.map(u => u.id === controlTargetId ? { ...u, operationMode: 'Auto' } : u));
              }}
              className={`w-50 text-center py-2 rounded-pill fw-bold transition-all ${controlMode === 'Auto' ? 'bg-info text-white shadow' : (isDark ? 'text-secondary' : 'text-dark')}`}
              style={{ fontSize: '12px', letterSpacing: '1px', cursor: 'pointer' }}
            >
              AUTO
            </div>
          </div>

          {/* Floating Success Message Overlay */}
          <div 
            className="alert py-2 border-0 fw-bold shadow-lg d-flex align-items-center justify-content-center m-0" 
            style={{ 
              position: 'absolute', 
              top: '65%', 
              left: '50%', 
              transform: controlSuccessMessage ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)', 
              width: '85%', 
              zIndex: 100,
              background: 'rgba(16, 185, 129, 0.95)', 
              color: '#fff', 
              borderRadius: '12px', 
              border: '1px solid rgba(16, 185, 129, 1)',
              opacity: controlSuccessMessage ? 1 : 0,
              visibility: controlSuccessMessage ? 'visible' : 'hidden',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              backdropFilter: 'blur(4px)'
            }}>
            {controlSuccessMessage || 'SUCCESS'}
          </div>

          {/* Premium Action Buttons */}
          <div className="d-flex justify-content-center align-items-center gap-2 w-100" style={{ minHeight: '110px', transition: 'all 0.3s ease' }}>
            {controlMode === 'Manual' ? (
              <>
                <button 
                  onClick={() => handleControlAction('START')} 
                  className={`action-btn-premium start-btn ${units.find(u => u.id === controlTargetId)?.status === 'ON' ? 'active' : ''}`} 
                  style={{ width: '100px', height: '85px' }}
                >
                  <Play size={24} className="mb-2" />
                  <span>START</span>
                </button>
                <button 
                  onClick={() => handleControlAction('STOP')} 
                  className={`action-btn-premium stop-btn ${units.find(u => u.id === controlTargetId)?.status === 'OFF' ? 'active' : ''}`} 
                  style={{ width: '100px', height: '85px' }}
                >
                  <Square size={22} className="mb-2" fill="currentColor" />
                  <span>STOP</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleAutoToggle('SCHEDULE')} className={`action-btn-premium schedule-btn ${autoOptions.includes('SCHEDULE') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} style={{ width: '70px', height: '105px', position: 'relative' }}>
                  {autoOptions.includes('SCHEDULE') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Clock size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SCHEDULE</span>
                </button>
                <button onClick={() => handleAutoToggle('SENSOR')} className={`action-btn-premium sensor-btn ${autoOptions.includes('SENSOR') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} style={{ width: '70px', height: '105px', position: 'relative' }}>
                  {autoOptions.includes('SENSOR') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Activity size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SENSOR</span>
                </button>
                <button onClick={() => handleAutoToggle('TEMP')} className={`action-btn-premium temp-btn ${autoOptions.includes('TEMP') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} style={{ width: '70px', height: '105px', position: 'relative' }}>
                  {autoOptions.includes('TEMP') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Thermometer size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TEMP</span>
                </button>
                <button 
                  className={`action-btn-premium local-btn ${autoOptions.includes('LOCAL') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} 
                  style={{ width: '70px', height: '105px', position: 'relative', cursor: 'not-allowed', opacity: 0.8 }}
                  title="This is selected automatically when the AC is operated from a physical switch."
                >
                  {autoOptions.includes('LOCAL') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Settings size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>LOCAL</span>
                </button>
              </>
            )}
          </div>

        </Modal.Body>
      </Modal>

      {/* TEMPERATURE RANGE DISPLAY MODAL */}
      <Modal show={showTempRangeModal} onHide={() => setShowTempRangeModal(false)} centered size="md" className="premium-modal">
        <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
          <Modal.Title className="text-white fs-5 fw-bold d-flex align-items-center gap-2">
            <Thermometer size={20} className="text-info" />
            Configure Temperature Range
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4" style={{ background: '#0f172a', color: '#fff' }}>
          <div className="d-flex flex-column gap-3">
            <div className="p-3 rounded bg-black bg-opacity-30 border border-white border-opacity-5">
              <Form.Group>
                <Form.Label className="text-info fw-bold uppercase tracking-widest fs-11 d-block mb-2">Starting Temperature (°C)</Form.Label>
                <div className="d-flex align-items-center gap-2">
                  <Form.Control
                    type="number"
                    min="16"
                    max="35"
                    value={tempRangeData.startTemp}
                    onChange={(e) => setTempRangeData({ ...tempRangeData, startTemp: e.target.value })}
                    className="premium-input py-2 text-center text-white fw-bold fs-5 font-monospace"
                    style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <span className="text-secondary fw-bold fs-5">°C</span>
                </div>
                <small className="text-secondary mt-1 d-block" style={{ fontSize: '10px' }}>AC will automatically START when the room temperature reaches this limit.</small>
              </Form.Group>
            </div>
            <div className="p-3 rounded bg-black bg-opacity-30 border border-white border-opacity-5">
              <Form.Group>
                <Form.Label className="text-success fw-bold uppercase tracking-widest fs-11 d-block mb-2">Ending Temperature (°C)</Form.Label>
                <div className="d-flex align-items-center gap-2">
                  <Form.Control
                    type="number"
                    min="16"
                    max="35"
                    value={tempRangeData.endTemp}
                    onChange={(e) => setTempRangeData({ ...tempRangeData, endTemp: e.target.value })}
                    className="premium-input py-2 text-center text-white fw-bold fs-5 font-monospace"
                    style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <span className="text-secondary fw-bold fs-5">°C</span>
                </div>
                <small className="text-secondary mt-1 d-block" style={{ fontSize: '10px' }}>AC will automatically STOP when the room temperature drops below this limit.</small>
              </Form.Group>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-0 px-4 pb-4 justify-content-end" style={{ background: '#0f172a' }}>
          <Button variant="outline-secondary" className="rounded-pill px-4 me-2" onClick={() => setShowTempRangeModal(false)}>Cancel</Button>
          <Button 
            variant="info" 
            className="rounded-pill px-4 fw-bold shadow" 
            onClick={async () => {
              const unit = units.find(u => u.id === controlTargetId);
              await applyTempRangeRules(tempRangeData.startTemp, tempRangeData.endTemp, unit?.name);
              setShowTempRangeModal(false);
            }}
          >
            Save & Apply Rules
          </Button>
        </Modal.Footer>
      </Modal>

      {/* STYLE SHEET */}
      <style dangerouslySetInnerHTML={{__html: `
        
        .premium-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }

        .hover-glow:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }

        .sleek-power.on:hover {
          box-shadow: 0 12px 25px rgba(14, 165, 233, 0.5) !important;
          transform: scale(1.05);
        }
        .sleek-power.off:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }

        .hover-white:hover {
          color: #fff !important;
          background: rgba(255,255,255,0.05);
        }

        .premium-input {
          background: rgba(15, 23, 42, 0.8) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
          border-radius: 12px;
          transition: all 0.3s;
        }
        .premium-input:focus {
          border-color: #0ea5e9 !important;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2) !important;
        }

        .premium-select {
          background-color: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          font-size: 11px;
          font-weight: bold;
        }

        .action-btn-premium {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.5px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          cursor: pointer;
        }

        .action-btn-premium.light-btn:not(.active-opt) {
          background: #ffffff;
          border-color: rgba(0,0,0,0.1);
          color: #475569;
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }
        
        .action-btn-premium.light-btn:not(.active-opt):hover {
          background: #f8fafc;
          border-color: rgba(0,0,0,0.15);
        }

        .action-btn-premium:hover {
          transform: translateY(-5px);
        }

        .start-btn { color: #10b981; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
        .stop-btn { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); }
        .start-btn.active { background: linear-gradient(135deg, #10b981, #059669) !important; border-color: #10b981 !important; color: #ffffff !important; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.45) !important; }
        .stop-btn.active { background: linear-gradient(135deg, #ef4444, #dc2626) !important; border-color: #ef4444 !important; color: #ffffff !important; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.45) !important; }
        .schedule-btn { color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.02); }
        .sensor-btn { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.02); }
        .temp-btn { color: #ec4899; border-color: rgba(236, 72, 153, 0.3); background: rgba(236, 72, 153, 0.02); }
        .local-btn { color: #a855f7; border-color: rgba(168, 85, 247, 0.3); background: rgba(168, 85, 247, 0.02); }

        .start-btn:hover { background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3)); border-color: rgba(16, 185, 129, 0.5); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
        .stop-btn:hover { background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3)); border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2); }
        .schedule-btn:hover { background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(2, 132, 199, 0.2)); border-color: rgba(14, 165, 233, 0.5); box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2); }
        .sensor-btn:hover { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.2)); border-color: rgba(245, 158, 11, 0.5); box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2); }
        .temp-btn:hover { background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.2)); border-color: rgba(236, 72, 153, 0.5); box-shadow: 0 10px 20px rgba(236, 72, 153, 0.2); }
        .local-btn:hover { background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.2)); border-color: rgba(168, 85, 247, 0.5); box-shadow: 0 10px 20px rgba(168, 85, 247, 0.2); }

        .schedule-btn.active-opt { background: linear-gradient(135deg, rgba(14, 165, 233, 0.4), rgba(2, 132, 199, 0.6)); border-color: rgba(14, 165, 233, 0.8); box-shadow: 0 10px 20px rgba(14, 165, 233, 0.4); color: #fff; }
        .sensor-btn.active-opt { background: linear-gradient(135deg, rgba(245, 158, 11, 0.4), rgba(217, 119, 6, 0.6)); border-color: rgba(245, 158, 11, 0.8); box-shadow: 0 10px 20px rgba(245, 158, 11, 0.4); color: #fff; }
        .temp-btn.active-opt { background: linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(219, 39, 119, 0.6)); border-color: rgba(236, 72, 153, 0.8); box-shadow: 0 10px 20px rgba(236, 72, 153, 0.4); color: #fff; }
        .local-btn.active-opt { background: linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(147, 51, 234, 0.6)); border-color: rgba(168, 85, 247, 0.8); box-shadow: 0 10px 20px rgba(168, 85, 247, 0.4); color: #fff; }

        
        .fs-12 { font-size: 0.75rem !important; }
        .fs-11 { font-size: 0.7rem !important; }
        .tracking-widest { letter-spacing: 1.5px !important; }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background-color: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2s infinite;
        }
        .pulse-badge {
          animation: pulse 2s infinite;
        }
        
        @keyframes airflow {
          0% { transform: translateY(-5px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(15px); opacity: 0; }
        }
        .airflow-line {
          animation: airflow 1.5s infinite linear;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />
    </div>
  );
};

export default ACOverview;
