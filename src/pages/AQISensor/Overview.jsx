import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Leaf, Wind, Thermometer, Droplets, MapPin, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { io } from 'socket.io-client';
import PdfButton from '../../components/PdfButton';

const formatLastUpdated = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
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

// --- HELPER FOR HISTORY DATA ---
const createHistoryData = (baseTemp, baseHum, baseAqi, baseCo2, baseTvoc) => {
  return Array.from({ length: 24 }).map((_, j) => {
    const time = new Date();
    time.setHours(time.getHours() - (23 - j));
    return {
      time: `${time.getHours().toString().padStart(2, '0')}:00`,
      temp: (baseTemp + (Math.random() * 4 - 2)).toFixed(2),
      hum: (baseHum + (Math.random() * 10 - 5)).toFixed(1),
      aqi: Math.max(0, baseAqi + (Math.random() * 10 - 5)).toFixed(2),
      co2: Math.round(baseCo2 + (Math.random() * 50 - 25)),
      tvoc: Math.round(baseTvoc + (Math.random() * 20 - 10))
    };
  });
};

// --- CUSTOM ARC GAUGE COMPONENT ---
const CustomArcGauge = ({ value, max, label, color, format = (v) => v, isMapped = true }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius; 
  const arcLength = circumference * 0.75; // 270 degrees arc
  const strokeDashoffset = arcLength * (1 - Math.min(value / max, 1));

  return (
    <div className="d-flex flex-column align-items-center position-relative">
      <div className="text-secondary fw-bold mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>{label}</div>
      <svg width="120" height="110" viewBox="0 0 100 100">
        {/* Background Arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform="rotate(135 50 50)"
        />
        {/* Value Arc */}
        {isMapped && (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(135 50 50)"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        )}
      </svg>
      <div className="position-absolute d-flex flex-column align-items-center" style={{ top: '55px' }}>
        <div className="fw-black text-white" style={{ fontSize: '20px', lineHeight: '1', textShadow: isMapped ? `0 0 10px ${color}60` : 'none', opacity: isMapped ? 1 : 0.3 }}>
          {isMapped ? format(value) : '—'}
        </div>
      </div>
    </div>
  );
};

const AQIOverview = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [selectedChId, setSelectedChId] = useState(null);
  const selectedCh = channels.find(ch => ch.id === selectedChId) || channels[0] || null;


  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('AQI Sensor WebSocket Connected - Listening for Telemetry');
    });

    let currentTemplates = [];

    const processTelemetry = (stats) => {
      if (!Array.isArray(stats)) return;
      
      setChannels(prev => {
        let updated = false;
        const next = prev.map(zone => {
          if (!zone.mapping || !zone.mapping.vrvConfig) return zone;
          
          let newZone = { ...zone };
          const config = zone.mapping.vrvConfig;

          const getValue = (configField) => {
            if (!configField || !configField.includes('::')) return null;
            const [moduleId, fieldId] = configField.split('::');
            const stat = stats.find(s => String(s.moduleId) === String(moduleId) || String(s.meta?.module_id) === String(moduleId));
            if (stat && stat.meta && stat.meta[fieldId] !== undefined) {
              if (stat.meta.created_at_timestamp) {
                const tsRaw = stat.meta.created_at_timestamp;
                newZone.lastUpdated = tsRaw > 1e12 ? tsRaw : tsRaw * 1000;
              } else if (!newZone.lastUpdated) {
                newZone.lastUpdated = Date.now();
              }
              return parseFloat(stat.meta[fieldId]);
            }
            return null;
          };

          const temp = getValue(config.temperature);
          if (temp !== null && newZone.temp !== temp.toFixed(2)) { newZone.temp = temp.toFixed(2); updated = true; }

          const hum = getValue(config.humidity);
          if (hum !== null && newZone.hum !== hum.toFixed(1)) { newZone.hum = hum.toFixed(1); updated = true; }

          const co2 = getValue(config.co2);
          if (co2 !== null && newZone.co2 !== Math.round(co2)) { newZone.co2 = Math.round(co2); updated = true; }

          const tvoc = getValue(config.tvoc);
          if (tvoc !== null && newZone.tvoc !== Math.round(tvoc)) { newZone.tvoc = Math.round(tvoc); updated = true; }

          const aqi = getValue(config.aqi);
          if (aqi !== null && newZone.aqi !== aqi.toFixed(2)) { newZone.aqi = aqi.toFixed(2); updated = true; }

          if (updated) {
            const lastVal = newZone.history[newZone.history.length - 1];
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (lastVal && lastVal.time === timeStr) {
              newZone.history[newZone.history.length - 1] = {
                time: timeStr,
                temp: newZone.temp,
                hum: newZone.hum,
                aqi: newZone.aqi,
                co2: newZone.co2,
                tvoc: newZone.tvoc
              };
            } else {
              newZone.history = [...newZone.history.slice(1), {
                time: timeStr,
                temp: newZone.temp,
                hum: newZone.hum,
                aqi: newZone.aqi,
                co2: newZone.co2,
                tvoc: newZone.tvoc
              }];
            }
          }

          return newZone;
        });

        return updated ? next : prev;
      });
    };

    socket.on('telemetry_update', processTelemetry);

    const fetchTemplatesAndStats = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const tenantId = userData?.tenantId;
        const url = tenantId ? `/api/templates?tenantId=${tenantId}` : '/api/templates';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const mappedData = data.map(t => {
            const hasDefaultValues = t.defaultValues && typeof t.defaultValues === 'object' && Object.keys(t.defaultValues).length > 0;
            const defValues = hasDefaultValues ? t.defaultValues : null;
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
          const aqiTemplates = mappedData.filter(t => (t.category === 'VRV' || t.category === 'AQI Sensor') && t.module === 'Temp & Humidity');
          currentTemplates = aqiTemplates;
          
          setChannels(prev => {
            const nextChannels = aqiTemplates
              .map((t, index) => {
                const baseTemp = 20 + Math.random() * 5;
                const baseHum = 40 + Math.random() * 20;
                const baseAqi = 15 + Math.random() * 15;
                const baseCo2 = 400 + Math.random() * 200;
                const baseTvoc = 50 + Math.random() * 50;

                const name = t.mapping?.vrvConfig?.vrvZone || t.template_name || `TEMP & HUMIDITY (#${index + 1})`;
                const existing = prev.find(p => p.name === name);

                return {
                  id: index + 1,
                  name: name,
                  location: t.mapping?.vrvConfig?.building || t.mapping?.vrvConfig?.subZone || 'Facility Zone',
                  temp: existing?.temp ?? baseTemp.toFixed(2),
                  hum: existing?.hum ?? baseHum.toFixed(1),
                  aqi: existing?.aqi ?? baseAqi.toFixed(2),
                  co2: existing?.co2 ?? Math.round(baseCo2),
                  tvoc: existing?.tvoc ?? Math.round(baseTvoc),
                  history: existing?.history ?? createHistoryData(baseTemp, baseHum, baseAqi, baseCo2, baseTvoc),
                  mapping: t.mapping || null,
                  lastUpdated: existing?.lastUpdated || null
                };
              })
              .filter(ch => ch.mapping?.vrvConfig?.device);

            if (nextChannels.length > 0) {
              setSelectedChId(prevId => {
                if (nextChannels.some(ch => ch.id === prevId)) return prevId;
                return nextChannels[0].id;
              });
            }
            return nextChannels;
          });

          if (aqiTemplates.length > 0) {
            const modulesToPoll = new Set();
            aqiTemplates.forEach(t => {
              if (t.mapping?.vrvConfig) {
                Object.values(t.mapping.vrvConfig).forEach(val => {
                  if (typeof val === 'string' && val.includes('::')) {
                    modulesToPoll.add(val.split('::')[0]);
                  }
                });
              }
            });
            
            const pollList = Array.from(modulesToPoll);
            const apiBase = backendUrl;
            const statsUrl = pollList.length > 0 ? `${apiBase}/api/templates/stats?modules=${pollList.join(',')}` : `${apiBase}/api/templates/stats`;
            
            const statsRes = await fetch(statsUrl);
            if (statsRes.ok) {
              const stats = await statsRes.json();
              processTelemetry(stats);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching AQI templates:', error);
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
      const statsUrl = pollList.length > 0 ? `${backendUrl}/api/templates/stats?modules=${pollList.join(',')}` : `${backendUrl}/api/templates/stats`;
      try {
        const res = await fetch(statsUrl);
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

  const parameters = [
    { label: 'Temperature', key: 'temp', max: 50, color: '#38bdf8', unit: '°C' },
    { label: 'Humidity', key: 'hum', max: 100, color: '#10b981', unit: '%' },
    { label: 'CO2', key: 'co2', max: 2000, color: '#ec4899', unit: 'PPM' },
    { label: 'TVOC', key: 'tvoc', max: 500, color: '#a855f7', unit: 'PPM' },
    { label: 'AQI', key: 'aqi', max: 200, color: '#ef4444', unit: 'Index' }
  ];

  return (
    <div className="fade-in p-3 h-100 d-flex flex-column" style={{ background: '#0b1121', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom flex-wrap gap-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <div>
            <h4 className="text-white fw-black mb-1 d-flex align-items-center" style={{ letterSpacing: '1px' }}>
              <Leaf className="me-2 text-success" size={24} />
              ENVIRONMENTAL SENSOR DASHBOARD
            </h4>
            <div className="d-flex align-items-center gap-2">
              <span className="text-secondary fw-bold" style={{ fontSize: '11px' }}>
                System Active
              </span>
            </div>
          </div>


          {/* Last Telemetry Updated Time */}
          {selectedCh?.lastUpdated && (
            <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-4 border border-success border-opacity-25" style={{ background: 'rgba(16, 185, 129, 0.08)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)' }}>
              <div className="d-flex flex-column text-start">
                <span className="text-success uppercase tracking-widest fw-bold" style={{ fontSize: '0.62rem' }}>LAST  UPDATED</span>
                <span className="text-success fw-bold font-monospace fs-5" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>
                  {formatLastUpdated(selectedCh.lastUpdated)}
                </span>
              </div>
            </div>
          )}
        </div>

        {channels.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <PdfButton />
            <select
              className="bg-dark text-white border-info border-opacity-25 rounded-pill px-3 py-2 fs-13"
              style={{ width: '220px', cursor: 'pointer', background: 'rgba(15,23,42,0.85)', outline: 'none' }}
              value={selectedChId || ''}
              onChange={(e) => setSelectedChId(Number(e.target.value))}
            >
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {channels.length === 0 ? (
        <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 bg-dark bg-opacity-20 rounded-4 border border-white border-opacity-5 p-5 mt-3" style={{ minHeight: '500px' }}>
          <div className="p-4 rounded-circle bg-dark bg-opacity-40 border border-secondary border-opacity-25 mb-4 shadow-sm">
            <Activity size={48} className="text-secondary opacity-50" />
          </div>
          <h4 className="text-white fw-bold mb-2 tracking-wide text-uppercase">No Mapped AQI Sensors Found</h4>
          <p className="text-secondary mb-0 text-center" style={{ maxWidth: '450px' }}>
            Map an AQI Sensor / Temp & Humidity device in the settings configuration templates module to view live environment telemetry.
          </p>
        </div>
      ) : (
        <Row className="g-3 flex-grow-1">
          {/* LEFT PANEL: CHANNEL LIST */}
          <Col xl={3} lg={4} className="d-flex flex-column gap-2">
            <div className="px-2 mb-1">
               <span className="text-secondary fw-bold" style={{ fontSize: '12px', letterSpacing: '1px' }}>AVAILABLE CHANNELS</span>
            </div>
            
            <div className="d-flex flex-column gap-2">
              {channels.map(ch => {
                const isSelected = selectedCh && selectedCh.id === ch.id;
                
                return (
                  <div 
                    key={ch.id} 
                    onClick={() => setSelectedChId(ch.id)}
                    onDoubleClick={() => navigate('/aqi-sensor/temp-humidity')}
                    className="p-3 rounded position-relative overflow-hidden"
                    style={{ 
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 41, 59, 0.4)',
                      border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.03)'}`,
                      transition: 'all 0.3s ease'
                    }}
                    title="Single click to view analytics, Double click for detailed diagnostics"
                  >
                    {isSelected && <div className="position-absolute h-100" style={{ left: 0, top: 0, width: '4px', background: '#38bdf8', boxShadow: '0 0 10px #38bdf8' }}></div>}
                    
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                         <div className="rounded p-1 d-flex align-items-center justify-content-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <MapPin size={14} className={isSelected ? 'text-info' : 'text-secondary'} />
                         </div>
                         <span className={`fw-bold ${isSelected ? 'text-white' : 'text-light'}`} style={{ fontSize: '15px' }}>{ch.name}</span>
                      </div>
                      <span className="fw-bold font-monospace" style={{ color: '#facc15', fontSize: '15px' }}>{ch.temp} <span style={{fontSize: '10px'}} className="text-secondary">°C</span></span>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                      <span className="text-secondary" style={{ fontSize: '11px' }}>{ch.location}</span>
                      <span className="text-white font-monospace fw-bold" style={{ fontSize: '12px' }}>Humidity: {ch.hum}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Col>

          {/* RIGHT PANEL: 6 PARAMETER GRID */}
          <Col xl={9} lg={8} className="d-flex flex-column">
            {/* Header Info for Selected Channel */}
            <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded" style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div>
                  <Badge bg="transparent" className="border px-2 py-1 rounded-pill shadow-sm mb-1 text-info border-info">
                    Type of Sensor: Environmental
                  </Badge>
                  <h4 className="text-white fw-black m-0">{selectedCh?.name} Analytics</h4>
               </div>
               <div className="text-end">
                  <div className="text-secondary fw-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>LOCATION</div>
                  <div className="text-info fw-bold">{selectedCh?.location?.toUpperCase()}</div>
               </div>
            </div>

            {/* Grid of 6 Parameters */}
            <Row className="g-3">
              {parameters.map((param, idx) => {
                const paramToConfigField = {
                  temp: 'temperature',
                  hum: 'humidity',
                  co2: 'co2',
                  tvoc: 'tvoc',
                  aqi: 'aqi'
                };
                const configField = selectedCh?.mapping?.vrvConfig?.[paramToConfigField[param.key]];
                const isFieldMapped = configField && typeof configField === 'string' && configField.includes('::');

                return (
                  <Col md={6} key={idx}>
                    <Card 
                      className="border-0 shadow-sm h-100" 
                      style={{ 
                        background: 'rgba(30, 41, 59, 0.4)', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        cursor: isFieldMapped ? 'pointer' : 'default', 
                        transition: 'all 0.2s ease',
                        opacity: isFieldMapped ? 1 : 0.35,
                        filter: isFieldMapped ? 'none' : 'grayscale(1) brightness(0.65)',
                        pointerEvents: isFieldMapped ? 'auto' : 'none'
                      }}
                      onClick={() => { if (isFieldMapped) navigate('/aqi-sensor/temp-humidity'); }}
                      onMouseEnter={(e) => { if (isFieldMapped) e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)'; }}
                      onMouseLeave={(e) => { if (isFieldMapped) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                    >
                      <Card.Body className="p-3 d-flex gap-2 align-items-center">
                        
                        {/* Gauge Area */}
                        <div style={{ width: '130px', flexShrink: 0 }} className="d-flex justify-content-center">
                           <CustomArcGauge 
                             value={selectedCh ? Number(selectedCh[param.key]) : 0} 
                             max={param.max} 
                             label={param.label} 
                             color={param.color} 
                             isMapped={isFieldMapped}
                           />
                        </div>

                        {/* Chart Area */}
                        <div className="flex-grow-1 d-flex flex-column w-100">
                           <div className="text-center text-secondary mb-2 fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                             HISTORY ({param.unit})
                           </div>
                           <div style={{ height: '110px', width: '100%' }}>
                             <ResponsiveContainer width="100%" height="100%">
                               <LineChart data={selectedCh?.history || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                 <XAxis dataKey="time" hide />
                                 <YAxis 
                                    hide 
                                    domain={['dataMin', 'dataMax']} 
                                    padding={{ top: 10, bottom: 10 }}
                                 />
                                 <Tooltip 
                                   contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }} 
                                   itemStyle={{ color: '#fff' }}
                                 />
                                 <Line 
                                   type="linear" 
                                   dataKey={param.key} 
                                   name={param.label}
                                   stroke="#475569" 
                                   strokeWidth={1} 
                                   dot={{ r: 3, fill: '#fff', stroke: param.color, strokeWidth: 2 }} 
                                   activeDot={{ r: 5, fill: param.color }}
                                 />
                               </LineChart>
                             </ResponsiveContainer>
                           </div>
                        </div>

                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

          </Col>
        </Row>
      )}
    </div>
  );
};

export default AQIOverview;
