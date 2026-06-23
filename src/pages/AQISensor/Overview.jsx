import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Leaf, Wind, Thermometer, Droplets, MapPin, Activity } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { io } from 'socket.io-client';

// --- MOCK DATA ---
const CHANNELS = Array.from({ length: 6 }).map((_, i) => {
  const baseTemp = 20 + Math.random() * 5;
  const baseHum = 40 + Math.random() * 20;
  const baseAqi = 15 + Math.random() * 15; // IAQ
  const baseCo2 = 400 + Math.random() * 200;
  const baseTvoc = 50 + Math.random() * 50;
  
  return {
    id: i + 1,
    name: `Channel ${i + 1}`,
    location: ['Server Room', 'HVAC Plant', 'Main Office', 'Lobby', 'Basement', 'Warehouse'][i],
    temp: baseTemp.toFixed(2),
    hum: baseHum.toFixed(1),
    aqi: baseAqi.toFixed(2),
    co2: Math.round(baseCo2),
    tvoc: Math.round(baseTvoc),
    history: Array.from({ length: 24 }).map((_, j) => {
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
    })
  };
});

// --- CUSTOM ARC GAUGE COMPONENT ---
const CustomArcGauge = ({ value, max, label, color, format = (v) => v }) => {
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
      </svg>
      <div className="position-absolute d-flex flex-column align-items-center" style={{ top: '55px' }}>
        <div className="fw-black text-white" style={{ fontSize: '20px', lineHeight: '1', textShadow: `0 0 10px ${color}60` }}>{format(value)}</div>
      </div>
    </div>
  );
};

const AQIOverview = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState(CHANNELS);
  const [selectedChId, setSelectedChId] = useState(CHANNELS[0].id);
  const selectedCh = channels.find(ch => ch.id === selectedChId) || channels[0];
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
            const next = [...prev];
            for (let i = 0; i < Math.min(next.length, aqiTemplates.length); i++) {
               const t = aqiTemplates[i];
               next[i].name = t.mapping?.vrvConfig?.vrvZone || t.template_name || next[i].name;
               next[i].mapping = t.mapping;
            }
            return next;
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
      <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div>
          <h4 className="text-white fw-black mb-1 d-flex align-items-center" style={{ letterSpacing: '1px' }}>
            <Leaf className="me-2 text-success" size={24} />
            ENVIRONMENTAL SENSOR DASHBOARD
          </h4>
          <div className="d-flex align-items-center gap-3">
            <span className="text-success fw-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>● SYSTEM ONLINE</span>
            <span className="text-secondary fw-bold" style={{ fontSize: '11px' }}>{currentTime.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <Row className="g-3 flex-grow-1">
        {/* LEFT PANEL: CHANNEL LIST */}
        <Col xl={3} lg={4} className="d-flex flex-column gap-2">
          <div className="px-2 mb-1">
             <span className="text-secondary fw-bold" style={{ fontSize: '12px', letterSpacing: '1px' }}>AVAILABLE CHANNELS</span>
          </div>
          
          <div className="d-flex flex-column gap-2">
            {channels.map(ch => {
              const isSelected = selectedCh.id === ch.id;
              
              return (
                <div 
                  key={ch.id} 
                  onClick={() => navigate('/aqi-sensor/temp-humidity')}
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
                <h4 className="text-white fw-black m-0">{selectedCh.name} Analytics</h4>
             </div>
             <div className="text-end">
                <div className="text-secondary fw-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>LOCATION</div>
                <div className="text-info fw-bold">{selectedCh.location.toUpperCase()}</div>
             </div>
          </div>

          {/* Grid of 6 Parameters */}
          <Row className="g-3">
            {parameters.map((param, idx) => (
              <Col md={6} key={idx}>
                <Card 
                  className="border-0 shadow-sm h-100" 
                  style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => navigate('/aqi-sensor/temp-humidity')}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                >
                  <Card.Body className="p-3 d-flex gap-2 align-items-center">
                    
                    {/* Gauge Area */}
                    <div style={{ width: '130px', flexShrink: 0 }} className="d-flex justify-content-center">
                       <CustomArcGauge 
                         value={Number(selectedCh[param.key])} 
                         max={param.max} 
                         label={param.label} 
                         color={param.color} 
                       />
                    </div>

                    {/* Chart Area */}
                    <div className="flex-grow-1 d-flex flex-column w-100">
                       <div className="text-center text-secondary mb-2 fw-bold" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                         HISTORY ({param.unit})
                       </div>
                       <div style={{ height: '110px', width: '100%' }}>
                         <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={selectedCh.history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            ))}
          </Row>

        </Col>
      </Row>
    </div>
  );
};

export default AQIOverview;
