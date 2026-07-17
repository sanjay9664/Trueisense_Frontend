import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { Thermometer, Droplets, Activity, Wind, Leaf, Sparkles } from 'lucide-react';
import { io } from 'socket.io-client';
import PdfButton from '../../components/PdfButton';
import './VRVOverview.css';

const metricsConfig = {
  TEMP: { label: 'Temperature', shortLabel: 'Temp', unit: 'Deg.C', color: '#fbbf24', icon: Thermometer, min: 0, max: 50 },
  HUMIDITY: { label: 'Humidity', shortLabel: 'Humidity', unit: '%', color: '#38bdf8', icon: Droplets, min: 0, max: 100 },
  CO2: { label: 'CO2', shortLabel: 'CO2', unit: 'PPM', color: '#ec4899', icon: Wind, min: 300, max: 2000 },
  TVOC: { label: 'TVOC', shortLabel: 'TVOC', unit: 'PPM', color: '#a855f7', icon: Activity, min: 0, max: 500 },
  AQI: { label: 'AQI', shortLabel: 'AQI', unit: 'IV', color: '#10b981', icon: Leaf, min: 0, max: 200 }
};

const Gauge = ({ value, min, max, unit, color, isMapped = true }) => {
  const radius = 65;
  const cx = 100;
  const cy = 90;
  const circumference = Math.PI * radius;
  const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const offset = circumference - (percent * circumference);
  
  // -90deg is far left, +90deg is far right
  const rotation = -90 + (percent * 180);

  return (
    <div className="d-flex flex-column align-items-center justify-content-center w-100" style={{ height: '135px', marginTop: '-5px' }}>
      <svg viewBox="0 -10 200 170" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Background Arc */}
        <path
          className="scada-gauge-bg-arc"
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Value Arc (Colored) */}
        {isMapped && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#glow)"
          />
        )}
        
        {/* Central Pivot Needle */}
        {isMapped ? (
          <g 
            transform={`rotate(${rotation}, ${cx}, ${cy})`}
          >
            {/* Needle pointer */}
            <polygon className="scada-gauge-needle" points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - radius - 2}`} fill="#ffffff" filter="url(#shadow)" />
            {/* Inner circle pivot */}
            <circle className="scada-gauge-needle" cx={cx} cy={cy} r="6" fill="#ffffff" filter="url(#shadow)" />
            <circle cx={cx} cy={cy} r="2" fill={color} />
          </g>
        ) : (
          <circle cx={cx} cy={cy} r="6" fill="rgba(255,255,255,0.15)" className="scada-gauge-needle-unmapped" />
        )}
        
        {/* Min / Max Text Labels */}
        <text className="scada-gauge-label" x={cx - radius - 15} y={cy + 5} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" alignmentBaseline="middle">{min}</text>
        <text className="scada-gauge-label" x={cx + radius + 15} y={cy + 5} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="start" alignmentBaseline="middle">{max}</text>

        {/* Big Value Text (Positioned safely below the needle pivot) */}
        <text className={`scada-gauge-value ${isMapped ? '' : 'unmapped'}`} x={cx} y={cy + 38} fill={isMapped ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.3)"} fontSize="42" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {isMapped ? (Number.isInteger(value) ? value : value.toFixed(2)) : '—'}
        </text>
        <text x={cx} y={cy + 58} fill={color} fontSize="16" fontWeight="bold" textAnchor="middle" letterSpacing="2">
          {unit}
        </text>
      </svg>
    </div>
  );
};

let globalCachedZones = null;
try {
  const saved = localStorage.getItem('scada_vrv_zones');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      globalCachedZones = parsed;
    }
  }
} catch (e) {}

// Fallback dynamic construction from templates on startup/hard refresh
if (!Array.isArray(globalCachedZones) || globalCachedZones.length === 0) {
  try {
    const savedTemplates = localStorage.getItem('scada_templates');
    if (savedTemplates) {
      const data = JSON.parse(savedTemplates);
      if (Array.isArray(data)) {
        const normalized = data.map(t => {
          if (t.mapping && !t.settings) {
            return {
              id: t.id,
              name: t.name,
              category: t.mapping.category || t.category || 'Water Management',
              module: t.mapping.module || t.module || 'AG Tank',
              mapping: t.mapping
            };
          }
          const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
          const defValues = hasDef ? t.defaultValues : null;
          const mappingSource = defValues || (t.settings && t.settings[0]?.meta) || {};
          return {
            id: t.id,
            name: t.name,
            category: (defValues && defValues.category) || t.category || 'Water Management',
            module: (defValues && defValues.module) || (t.settings && t.settings[0]?.eventKey) || 'AG Tank',
            mapping: mappingSource
          };
        });
        const vrv = normalized.filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity');
        globalCachedZones = vrv
          .map((t, index) => ({
            id: index + 1,
            name: t?.mapping?.vrvConfig?.vrvZone || t?.name || `Zone ${index + 1}`,
            TEMP: 0,
            HUMIDITY: 0,
            CO2: 0,
            TVOC: 0,
            AQI: 0,
            highs: {},
            lows: {},
            status: 'Optimal',
            mapping: t?.mapping || null,
            lastSeen: {}
          }))
          .filter(z => z.mapping?.vrvConfig?.device);
      }
    }
  } catch (e) {}
}

if (!Array.isArray(globalCachedZones)) {
  globalCachedZones = [];
}

let globalCachedSelectedUnit = localStorage.getItem('scada_vrv_selected_unit') || 'Common';

const getLatestLastSeen = (lastSeenObj) => {
  if (!lastSeenObj || typeof lastSeenObj !== 'object') return null;
  const timestamps = Object.values(lastSeenObj).filter(Number.isFinite);
  if (timestamps.length === 0) return null;
  return Math.max(...timestamps);
};

const formatLastUpdated = (timestamp) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${day}/${month} ${hours}:${minutes}:${seconds}`;
};

const getNormalizedTemplates = (data) => {
  if (!Array.isArray(data)) return [];
  return data.map(t => {
    if (t.mapping && !t.settings) {
      return {
        id: t.id,
        name: t.name,
        category: t.mapping.category || t.category || 'Water Management',
        module: t.mapping.module || t.module || 'AG Tank',
        mapping: t.mapping,
        template_name: t.name
      };
    }
    const hasDef = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
    const defValues = hasDef ? t.defaultValues : null;
    const mappingSource = defValues || (t.settings && t.settings[0]?.meta) || {};
    return {
      id: t.id,
      name: t.name,
      category: (defValues && defValues.category) || t.category || 'Water Management',
      module: (defValues && defValues.module) || (t.settings && t.settings[0]?.eventKey) || 'AG Tank',
      mapping: mappingSource,
      template_name: t.name
    };
  });
};

const EnvDashboard = () => {
  const [selectedUnit, setSelectedUnit] = useState(globalCachedSelectedUnit);
  const [savedZones, setSavedZones] = useState(globalCachedZones || []);
  const [isFetching, setIsFetching] = useState(!globalCachedZones || globalCachedZones.length === 0);


  React.useEffect(() => {
    if (savedZones.length > 0) {
      globalCachedZones = savedZones;
      localStorage.setItem('scada_vrv_zones', JSON.stringify(savedZones));
    }
  }, [savedZones]);

  React.useEffect(() => {
    if (selectedUnit) {
      globalCachedSelectedUnit = selectedUnit;
      localStorage.setItem('scada_vrv_selected_unit', selectedUnit);
    }
  }, [selectedUnit]);

  React.useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('VRV WebSocket Connected - Listening for Telemetry');
    });

    let currentTemplates = [];

    // Fetch telemetry stats immediately on mount in parallel
    const statsPromise = fetch(`${backendUrl}/api/templates/stats`)
      .then(res => res.ok ? res.json() : [])
      .catch(() => []);

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;
      
      setSavedZones(prev => {
        let updated = false;
        const next = prev.map(zone => {
          if (!zone.mapping || !zone.mapping.vrvConfig) return zone;
          
          let newZone = { ...zone };
          if (!newZone.lastSeen) newZone.lastSeen = {};
          if (!newZone.highs) newZone.highs = {};
          if (!newZone.lows) newZone.lows = {};
          const config = zone.mapping.vrvConfig;

          // Helper to extract value and timestamp from stats
          const getValueAndTimestamp = (configField) => {
            if (!configField || !configField.includes('::')) return { val: null, ts: null };
            const [moduleId, fieldId] = configField.split('::');
            const stat = stats.find(s => String(s.moduleId) === String(moduleId) || String(s.meta?.module_id) === String(moduleId));
            if (stat && stat.meta) {
              const val = stat.meta[fieldId] !== undefined ? parseFloat(stat.meta[fieldId]) : null;
              let ts = Date.now();
              if (stat.meta?.created_at_timestamp) {
                const raw = stat.meta.created_at_timestamp;
                ts = isNaN(Number(raw)) ? new Date(raw).getTime() : (Number(raw) > 1e12 ? Number(raw) : Number(raw) * 1000);
              }
              return { val, ts };
            }
            return { val: null, ts: null };
          };

          const updateHighLow = (key, val) => {
            if (val === null || val === undefined || isNaN(val)) return;

            if (newZone.highs === zone.highs) newZone.highs = { ...zone.highs };
            if (newZone.lows === zone.lows) newZone.lows = { ...zone.lows };

            if (newZone.highs[key] === undefined) {
              newZone.highs[key] = val;
              updated = true;
            } else if (val > newZone.highs[key]) {
              newZone.highs[key] = val;
              updated = true;
            }

            if (newZone.lows[key] === undefined) {
              newZone.lows[key] = val;
              updated = true;
            } else if (val < newZone.lows[key]) {
              newZone.lows[key] = val;
              updated = true;
            }
          };

          const tempInfo = getValueAndTimestamp(config.temperature);
          if (tempInfo.val !== null) {
            if (newZone.TEMP !== tempInfo.val) { newZone.TEMP = tempInfo.val; updated = true; }
            if (tempInfo.ts !== null && newZone.lastSeen.TEMP !== tempInfo.ts) { newZone.lastSeen.TEMP = tempInfo.ts; updated = true; }
            updateHighLow('TEMP', tempInfo.val);
          }

          const humInfo = getValueAndTimestamp(config.humidity);
          if (humInfo.val !== null) {
            if (newZone.HUMIDITY !== humInfo.val) { newZone.HUMIDITY = humInfo.val; updated = true; }
            if (humInfo.ts !== null && newZone.lastSeen.HUMIDITY !== humInfo.ts) { newZone.lastSeen.HUMIDITY = humInfo.ts; updated = true; }
            updateHighLow('HUMIDITY', humInfo.val);
          }

          const co2Info = getValueAndTimestamp(config.co2);
          if (co2Info.val !== null) {
            if (newZone.CO2 !== co2Info.val) { newZone.CO2 = co2Info.val; updated = true; }
            if (co2Info.ts !== null && newZone.lastSeen.CO2 !== co2Info.ts) { newZone.lastSeen.CO2 = co2Info.ts; updated = true; }
            updateHighLow('CO2', co2Info.val);
          }

          const tvocInfo = getValueAndTimestamp(config.tvoc);
          if (tvocInfo.val !== null) {
            if (newZone.TVOC !== tvocInfo.val) { newZone.TVOC = tvocInfo.val; updated = true; }
            if (tvocInfo.ts !== null && newZone.lastSeen.TVOC !== tvocInfo.ts) { newZone.lastSeen.TVOC = tvocInfo.ts; updated = true; }
            updateHighLow('TVOC', tvocInfo.val);
          }

          const aqiInfo = getValueAndTimestamp(config.aqi);
          if (aqiInfo.val !== null) {
            if (newZone.AQI !== aqiInfo.val) { newZone.AQI = aqiInfo.val; updated = true; }
            if (aqiInfo.ts !== null && newZone.lastSeen.AQI !== aqiInfo.ts) { newZone.lastSeen.AQI = aqiInfo.ts; updated = true; }
            updateHighLow('AQI', aqiInfo.val);
          }

          return newZone;
        });

        return updated ? next : prev;
      });
    };

    socket.on('telemetry_update', processTelemetry);

    const fetchTemplatesAndStats = async () => {
      try {
        let templatesData = [];
        const saved = localStorage.getItem('scada_templates');
        if (saved) {
          try {
            templatesData = JSON.parse(saved);
          } catch (e) {}
        }
        
        // Fallback to fetch if cache is empty
        if (!templatesData || templatesData.length === 0) {
          const userData = JSON.parse(localStorage.getItem('userData') || '{}');
          const tenantId = userData?.tenantId;
          const url = tenantId ? `/api/templates?tenantId=${tenantId}` : '/api/templates';
          const response = await fetch(`${backendUrl}${url}`);
          if (response.ok) {
            templatesData = await response.json();
          }
        }

        const mappedData = getNormalizedTemplates(templatesData);
        const vrvTemplates = mappedData.filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity');
        currentTemplates = vrvTemplates;
        
        setSavedZones(prev => {
          const nextZones = vrvTemplates
            .map((t, index) => {
              const existing = prev.find(p => p.name === (t?.mapping?.vrvConfig?.vrvZone || t?.name));
              return {
                id: index + 1,
                name: t?.mapping?.vrvConfig?.vrvZone || t?.template_name || `Zone ${index + 1}`,
                TEMP: existing?.TEMP ?? 0,
                HUMIDITY: existing?.HUMIDITY ?? 0,
                CO2: existing?.CO2 ?? 0,
                TVOC: existing?.TVOC ?? 0,
                AQI: existing?.AQI ?? 0,
                highs: existing?.highs || {},
                lows: existing?.lows || {},
                status: existing?.status ?? 'Optimal',
                mapping: t?.mapping || null,
                lastSeen: existing?.lastSeen || {}
              };
            })
            .filter(z => z.mapping?.vrvConfig?.device);

          if (nextZones.length > 0 && (selectedUnit === 'Common' || !nextZones.some(z => z.name === selectedUnit))) {
            setSelectedUnit(nextZones[0].name);
          }
          localStorage.setItem('scada_vrv_zones', JSON.stringify(nextZones));
          return nextZones;
        });
        
        setIsFetching(false);
        
        const stats = await statsPromise;
        if (stats && stats.length > 0) {
          processTelemetry(stats);
        }
      } catch (error) {
        console.error('Error fetching VRV templates:', error);
        setIsFetching(false);
      }
    };
    
    fetchTemplatesAndStats();
    
    const pollInterval = setInterval(async () => {
      if (currentTemplates.length === 0) return;
      const modulesToPoll = new Set();
      currentTemplates.forEach(t => {
        if (t.mapping?.vrvConfig) {
          Object.values(t.mapping.vrvConfig).forEach(val => {
            if (typeof val === 'string' && val.includes('::')) {
              modulesToPoll.add(val.split('::')[0]);
            }
          });
        }
      });
      const pollList = Array.from(modulesToPoll);
      const url = pollList.length > 0 ? `${backendUrl}/api/templates/stats?modules=${pollList.join(',')}` : `${backendUrl}/api/templates/stats`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const stats = await res.json();
          processTelemetry(stats);
        }
      } catch (e) {}
    }, 2000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, []);

  const activeZones = savedZones;
  const unitData = activeZones.find(u => u.name === selectedUnit) || activeZones[0] || null;



  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
  };

  return (
    <div className="fade-in p-3 VRV-full-panel h-100 d-flex flex-column" style={{ background: '#0f172a' }}>
      {/* Header */}
      <div className="page-header d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <div>
            <h2 className="mb-1 text-white d-flex align-items-center fw-bold">
              <Sparkles className="me-2 text-warning" size={28} /> Environmental Analytics
            </h2>
            <p className="text-secondary fs-7 mb-0">High-precision zone telemetry and historical tracking</p>
          </div>


          {/* Last Telemetry Updated Time */}
          {(() => {
            const latestTs = unitData ? getLatestLastSeen(unitData.lastSeen) : null;
            if (latestTs) {
              return (
                <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-4 border border-success border-opacity-25" style={{ background: 'rgba(16, 185, 129, 0.08)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)' }}>
                  <div className="d-flex flex-column text-start">
                    <span className="text-success uppercase tracking-widest fw-bold" style={{ fontSize: '0.62rem' }}>LAST UPDATED </span>
                    <span className="text-success fw-bold font-monospace fs-5" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>
                      {formatLastUpdated(latestTs)}
                    </span>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
        {savedZones.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <select
              className="bg-dark text-white border-info border-opacity-25 rounded-pill px-3 py-2 fs-13"
              style={{ width: '220px', maxWidth: '100%', cursor: 'pointer', background: 'rgba(15,23,42,0.85)', outline: 'none' }}
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              {savedZones.map(zone => (
                <option key={zone.id} value={zone.name}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Removed old blocking isLoading screen entirely as requested */}
      <Row className="g-4 flex-grow-1">
          {/* Zone Sidebar */}
          <Col xl={3} lg={4} xs={12}>
            <Card className="scada-card border-0 h-100 shadow-lg" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px' }}>
              <Card.Header className="bg-transparent border-bottom border-secondary border-opacity-25 p-4">
                <h6 className="text-white fw-bold m-0 text-uppercase fs-8 text-secondary tracking-wide">Select Zone</h6>
              </Card.Header>
              <Card.Body className="p-2 overflow-auto scada-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                <div className="p-1">
                  {activeZones.length === 0 ? (
                    <div className="p-3 text-center text-secondary fs-13">No zones mapped.</div>
                  ) : (
                    activeZones.map((zone) => {
                      const isSelected = selectedUnit === zone.name;
                      return (
                        <div 
                          key={zone.id} 
                          className="p-3 mb-2 rounded-4 d-flex justify-content-between align-items-center"
                          style={{ 
                            cursor: 'pointer',
                            background: isSelected ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0) 100%)' : 'transparent',
                            borderLeft: isSelected ? '4px solid #38bdf8' : '4px solid transparent',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => setSelectedUnit(zone.name)}
                        >
                          <div>
                            <span className={`fw-bold d-block fs-6 ${isSelected ? 'text-white' : 'text-secondary'}`}>{zone.name}</span>
                            <span className="text-muted fs-8">Zone {zone.id}</span>
                          </div>
                          <div className="text-end d-flex flex-column align-items-end">
                            <span className={`font-monospace fw-bold fs-5 ${isSelected ? 'text-info' : 'text-white'} d-flex align-items-center`}>
                              {zone.TEMP.toFixed(1)}<span style={{fontSize:'0.6em', marginLeft:'2px'}}>°C</span>
                            </span>
                            <span className={`font-monospace fw-bold fs-6 ${isSelected ? 'text-primary' : 'text-secondary'} d-flex align-items-center`} style={{marginTop: '-4px'}}>
                              {zone.HUMIDITY.toFixed(1)}<span style={{fontSize:'0.6em', marginLeft:'2px'}}>%</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Dashboard Grid */}
          <Col xl={9} lg={8} xs={12} className="overflow-auto scada-scrollbar vrv-dashboard-grid" style={{ maxHeight: 'calc(100vh - 120px)', paddingBottom: '20px' }}>
            {isFetching && !unitData ? (
              // Silent Skeleton Loader instead of error message
              <div className="pe-2 placeholder-glow">
                <div className="d-flex justify-content-between align-items-center mb-3">
                   <div className="placeholder rounded" style={{ width: '200px', height: '30px', background: 'rgba(255,255,255,0.05)' }}></div>
                   <div className="placeholder rounded-pill" style={{ width: '120px', height: '35px', background: 'rgba(255,255,255,0.05)' }}></div>
                </div>
                <Row className="g-4">
                  {[1, 2, 3, 4].map(i => (
                    <Col xl={6} lg={6} md={12} key={i}>
                      <Card className="border-0 h-100" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)', minHeight: '220px' }}>
                         <Card.Body className="d-flex flex-column justify-content-center align-items-center">
                            <div className="placeholder rounded-circle mb-3" style={{ width: '100px', height: '100px', background: 'rgba(255,255,255,0.03)' }}></div>
                         </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            ) : !unitData ? (
              <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark bg-opacity-20 rounded-4 border border-white border-opacity-5 p-5" style={{ minHeight: '600px' }}>
                <div className="p-4 rounded-circle bg-dark bg-opacity-40 border border-secondary border-opacity-25 mb-4 shadow-sm">
                  <Activity size={48} className="text-secondary opacity-50" />
                </div>
                <h4 className="text-white fw-bold mb-2 tracking-wide text-uppercase">No Configurations Found</h4>
                <p className="text-secondary mb-0 text-center" style={{ maxWidth: '400px' }}>
                  Map an AQI Sensor target device in the settings configuration module to start receiving live environment telemetry.
                </p>
              </div>
            ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3 px-2">
                <div className="d-flex flex-column">
                  <h5 className="text-white fw-bold text-uppercase fs-5 m-0 d-flex align-items-center">
                    <Activity className="me-2 text-primary" size={24}/> 
                    {selectedUnit} Diagnostics
                  </h5>
                </div>
                <Badge bg="dark" className="text-white fw-bold px-4 py-2 rounded-pill border border-secondary border-opacity-25 shadow-sm" style={{ letterSpacing: '1px' }}>
                  STATUS: <span className={unitData.status === 'Optimal' ? 'text-success' : 'text-warning'}>{unitData.status.toUpperCase()}</span>
                </Badge>
              </div>

              <div className="pe-2">
                <Row className="g-4">
                  {Object.entries(metricsConfig).map(([key, config]) => {
                    const IconComponent = config.icon;
                    const value = unitData[key];
                    const percent = Math.max(0, Math.min(100, ((value - config.min) / (config.max - config.min)) * 100));
                    const percentStr = percent.toFixed(0);
                    const isOptimal = value >= config.min + (config.max - config.min) * 0.15 && value <= config.max - (config.max - config.min) * 0.15;
                    const statusColor = isOptimal ? '#10b981' : '#f59e0b';
                    const statusText = isOptimal ? 'OPTIMAL' : 'ATTENTION';
                    
                    const metricToConfigField = {
                      TEMP: 'temperature',
                      HUMIDITY: 'humidity',
                      CO2: 'co2',
                      TVOC: 'tvoc',
                      AQI: 'aqi'
                    };
                    const configField = unitData?.mapping?.vrvConfig?.[metricToConfigField[key]];
                    const isFieldMapped = configField && typeof configField === 'string' && configField.includes('::');

                    return (
                      <Col xl={4} lg={6} md={12} xs={12} key={key}>
                        <Card 
                          className="scada-card border-0 h-100 position-relative overflow-hidden" 
                          style={{ 
                            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.7)',
                            minHeight: '100px',
                            opacity: isFieldMapped ? 1 : 0.35,
                            filter: isFieldMapped ? 'none' : 'grayscale(1) brightness(0.65)',
                            pointerEvents: isFieldMapped ? 'auto' : 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {/* Subtle background glow based on metric color */}
                          {isFieldMapped && (
                            <div className="position-absolute" style={{ top: '-50px', right: '-50px', width: '160px', height: '160px', background: config.color, filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }}></div>
                          )}
                          
                          <Card.Body className="p-2 d-flex flex-column justify-content-between">
                            {/* Card Header */}
                            <div className="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-10 pb-1 mb-1">
                              <h6 className="text-white fw-bold text-uppercase fs-7 m-0 d-flex align-items-center" style={{ letterSpacing: '1px' }}>
                                <div className="p-2 rounded-circle me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ background: `rgba(${hexToRgb(config.color)}, 0.15)`, border: `1px solid rgba(${hexToRgb(config.color)}, 0.3)` }}>
                                  <IconComponent size={20} style={{ color: config.color }} /> 
                                </div>
                                {config.label}
                              </h6>
                              <div className="d-flex align-items-center">
                                {isFieldMapped ? (
                                  (() => {
                                    const ts = unitData?.lastSeen?.[key];
                                    const isLive = ts && (Date.now() - ts < 180000);
                                    if (isLive) {
                                      return (
                                        <span className="badge bg-success bg-opacity-10 border border-success border-opacity-25 text-success px-2 py-1 rounded d-flex align-items-center gap-1.5 fs-11 fw-bold uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>
                                          <span className="rounded-circle pulse-dot-green"></span> online
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span className="badge bg-danger bg-opacity-10 border border-danger border-opacity-25 text-danger px-2 py-1 rounded d-flex align-items-center gap-1.5 fs-11 fw-bold uppercase tracking-wider" style={{ letterSpacing: '0.5px' }}>
                                          <span className="rounded-circle pulse-dot-red"></span> offline
                                        </span>
                                      );
                                    }
                                  })()
                                ) : (
                                  <span className="text-muted fs-9 fw-bold uppercase tracking-widest">UNMAPPED</span>
                                )}
                              </div>
                            </div>

                            <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-0" style={{ transform: 'scale(0.95)', transformOrigin: 'top center', marginBottom: '-10px' }}>
                              <Gauge 
                                value={value} 
                                min={config.min} 
                                max={config.max} 
                                unit={config.unit} 
                                color={config.color}
                                isMapped={isFieldMapped}
                              />
                            </div>

                            {/* Informative Footer */}
                            <div className="mt-0 pt-1 border-top border-secondary border-opacity-10 w-100">
                              <Row className="text-center g-0">
                                <Col xs={4}>
                                  <div className="text-secondary opacity-50 fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '0.55rem' }}>24H HIGH</div>
                                  <div className="text-white opacity-75 fs-6 fw-bold font-monospace">
                                    {(unitData.highs?.[key] ?? (value > 0 ? value : config.max * 0.8)).toFixed(1)}
                                  </div>
                                </Col>
                                <Col xs={4} className="border-start border-end border-secondary border-opacity-10 d-flex flex-column justify-content-center align-items-center">
                                  <div className="text-secondary opacity-50 fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '0.6rem' }}>STATUS</div>
                                  <div className="d-flex align-items-center gap-1">
                                    <div className="rounded-circle" style={{ width: '6px', height: '6px', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}></div>
                                    <span className="fw-black" style={{ fontSize: '0.7rem', color: statusColor, letterSpacing: '0.5px' }}>{statusText}</span>
                                  </div>
                                </Col>
                                <Col xs={4}>
                                  <div className="text-secondary opacity-50 fw-bold text-uppercase tracking-widest mb-1" style={{ fontSize: '0.6rem' }}>24H LOW</div>
                                  <div className="text-white opacity-75 fs-6 fw-bold font-monospace">
                                    {(unitData.lows?.[key] ?? (value > 0 ? value : config.min)).toFixed(1)}
                                  </div>
                                </Col>
                              </Row>
                              
                              {/* Animated Live Trend Line */}
                              <div className="mt-1 pt-0 border-top border-secondary border-opacity-10 position-relative rounded-bottom-4" style={{ height: '28px', width: '100%', overflow: 'hidden' }}>
                                {(() => {
                                  const ts = unitData?.lastSeen?.[key];
                                  const isLive = ts && (Date.now() - ts < 60000);
                                  return (
                                    <>
                                      <div className="position-absolute top-0 start-0 w-100 d-flex justify-content-between px-2" style={{ zIndex: 2, marginTop: '1px' }}>
                                        <span className="text-secondary opacity-50 fw-bold" style={{ fontSize: '0.45rem', letterSpacing: '1px' }}>LIVE TELEMETRY TREND</span>
                                        {isFieldMapped && isLive ? (
                                          <div className="d-flex align-items-center gap-1">
                                            <div className="spinner-grow spinner-grow-sm" style={{ width: '4px', height: '4px', background: config.color }}></div>
                                            <span className="fw-bold" style={{ fontSize: '0.45rem', color: config.color, letterSpacing: '1px' }}>RECORDING</span>
                                          </div>
                                        ) : (
                                          <span className="text-secondary opacity-25 fw-bold" style={{ fontSize: '0.45rem', letterSpacing: '1px' }}>OFFLINE</span>
                                        )}
                                      </div>
                                      {isFieldMapped && isLive ? (
                                        <svg width="100%" height="100%" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                                          <defs>
                                            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor={config.color} stopOpacity="0.4" />
                                              <stop offset="100%" stopColor={config.color} stopOpacity="0" />
                                            </linearGradient>
                                          </defs>
                                          
                                          {/* Grid Lines */}
                                          <line x1="0" y1="15" x2="200" y2="15" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2 2" />
                                          <line x1="0" y1="25" x2="200" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2 2" />
                                          
                                          <g>
                                            <animateTransform attributeName="transform" type="translate" from="0,0" to="-200,0" dur="3s" repeatCount="indefinite" />
                                            <path 
                                              d="M 0 20 C 10 15, 20 10, 30 20 C 40 30, 50 30, 60 20 C 70 10, 80 5, 100 15 C 120 25, 130 30, 140 20 C 150 10, 160 10, 170 20 C 180 30, 190 25, 200 20 C 210 15, 220 10, 230 20 C 240 30, 250 30, 260 20 C 270 10, 280 5, 300 15 C 320 25, 330 30, 340 20 C 350 10, 360 10, 370 20 C 380 30, 390 25, 400 20 L 400 40 L 0 40 Z" 
                                              fill={`url(#grad-${key})`} 
                                            />
                                            <path 
                                              d="M 0 20 C 10 15, 20 10, 30 20 C 40 30, 50 30, 60 20 C 70 10, 80 5, 100 15 C 120 25, 130 30, 140 20 C 150 10, 160 10, 170 20 C 180 30, 190 25, 200 20 C 210 15, 220 10, 230 20 C 240 30, 250 30, 260 20 C 270 10, 280 5, 300 15 C 320 25, 330 30, 340 20 C 350 10, 360 10, 370 20 C 380 30, 390 25, 400 20" 
                                              fill="none" 
                                              stroke={config.color} 
                                              strokeWidth="1.5" 
                                              strokeOpacity="0.9"
                                            />
                                          </g>
                                        </svg>
                                      ) : (
                                        <div className="position-absolute bottom-0 start-0 w-100 border-top border-secondary border-opacity-10" style={{ height: '2px', background: 'rgba(255,255,255,0.02)' }} />
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </>
          )}
        </Col>
      </Row>
      <style dangerouslySetInnerHTML={{
        __html: `
        .pulse-dot-red {
          width: 6px;
          height: 6px;
          background-color: #ef4444;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 6px #ef4444;
          animation: pulse-dot 1.5s infinite;
        }
        .pulse-dot-green {
          width: 6px;
          height: 6px;
          background-color: #22c55e;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 6px #22c55e;
          animation: pulse-dot 1.5s infinite;
        }
        @keyframes pulse-dot {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
        `
      }} />
    </div>
  );
};

export default EnvDashboard;
