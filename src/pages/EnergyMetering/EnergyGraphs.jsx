import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Maximize2, X, Zap, Settings2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useDeviceStatus } from '../../services/DeviceStatusContext';

const API_BASE_URL = import.meta.env.VITE_BACKEND_BMS_URL || 'http://localhost:3002/api/v1';

const getLocalDateString = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
};

const VOLTAGE_RANGES = [
  {
    title: 'Single Phase',
    items: [
      { color: '#22c55e', label: 'Normal', value: '220-240 V' },
      { color: '#eab308', label: 'Warning', value: '207-220 V or 240-253 V' },
      { color: '#ef4444', label: 'Alarm', value: '<207 V or >253 V' }
    ]
  },
  {
    title: 'Three Phase',
    items: [
      { color: '#22c55e', label: 'Normal', value: '400-430 V' },
      { color: '#eab308', label: 'Warning', value: '374-400 V or 430-456 V' },
      { color: '#ef4444', label: 'Alarm', value: '<374 V or >456 V' }
    ]
  }
];

const CURRENT_RANGES = [
  {
    title: 'Current (% of In)',
    items: [
      { color: '#22c55e', label: 'Normal (0-80%)', value: 'Safe op' },
      { color: '#eab308', label: 'Warning (80-90%)', value: 'High load' },
      { color: '#f97316', label: 'Critical (90-100%)', value: 'Near limit' },
      { color: '#ef4444', label: 'Over (>100%)', value: 'Trip risk' }
    ]
  }
];

const DEMAND_RANGES = [
  {
    title: 'Demand % of CD',
    items: [
      { color: '#22c55e', label: 'Normal (0-80%)', value: 'Ideal' },
      { color: '#eab308', label: 'Warning (80-90%)', value: 'High' },
      { color: '#f97316', label: 'Critical (90-100%)', value: 'Near limit' },
      { color: '#ef4444', label: 'Excess (>100%)', value: 'Penalty risk' }
    ]
  }
];

const FREQUENCY_RANGES = [
  {
    title: 'Frequency',
    items: [
      { color: '#22c55e', label: '49.5 - 50.5 Hz', value: 'Normal / Ideal' },
      { color: '#eab308', label: '48.5 - 49.5 Hz', value: 'Low (Warn)' },
      { color: '#eab308', label: '50.5 - 51.5 Hz', value: 'High (Warn)' },
      { color: '#f97316', label: '47.5 - 48.5 Hz', value: 'Critical' },
      { color: '#f97316', label: '51.5 - 52.5 Hz', value: 'Critical' },
      { color: '#ef4444', label: '<47.5 or >52.5', value: 'Unacceptable' }
    ]
  }
];



// Synonyms mapping exactly as in MainMeter
const PARAMETER_SYNONYMS = {
  ebKvah: ['3,152', '3,153', 'EB KVAH', 'EB_KVAH', 'EB APPARENT ENERGY', 'EB_KVAH_ENERGY'],
  ebKwh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
  balance: ['3,162', '3,168', 'BALANCE', 'PREPAID BALANCE', 'AMT', 'AMOUNT', 'CREDIT', 'PREPAID_BALANCE'],
  totalKw: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
  totalKva: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
  vR: ['3,168', '3,163', 'VOLTAGE R', 'VOLTAGE_R', 'VR', 'V_R', 'UA', 'U1', 'LINE VOLTS (R)', 'VOLTAGE R-PHASE'],
  vY: ['3,169', '3,164', 'VOLTAGE Y', 'VOLTAGE_Y', 'VY', 'V_Y', 'UB', 'U2', 'LINE VOLTS (Y)', 'VOLTAGE Y-PHASE'],
  vB: ['3,170', '3,165', 'VOLTAGE B', 'VOLTAGE_B', 'VB', 'V_B', 'UC', 'U3', 'LINE VOLTS (B)', 'VOLTAGE B-PHASE'],
  vRY: ['VOLTAGE RY', 'V_RY', 'LINE VOLTS (R-Y)'],
  vYB: ['VOLTAGE YB', 'V_YB', 'LINE VOLTS (Y-B)'],
  vBR: ['VOLTAGE BR', 'V_BR', 'LINE VOLTS (B-R)'],
  iR: ['3,171', '3,166', 'CURRENT R', 'CURRENT_R', 'IR', 'I_R', 'IA', 'A1', 'LINE AMPS (R)', 'R-CURRENT'],
  iY: ['3,172', '3,167', 'CURRENT Y', 'CURRENT_Y', 'IY', 'I_Y', 'A2', 'LINE AMPS (Y)', 'Y-CURRENT'],
  iB: ['3,173', '3,168', 'CURRENT B', 'CURRENT_B', 'IB', 'I_B', 'IC', 'A3', 'LINE AMPS (B)', 'B-CURRENT'],
  pf: ['3,174', 'POWER FACTOR', 'PF', 'SYSTEM PF', 'POWER_FACTOR'],
  dgKwh: ['3,180', '3,181', 'DG KWH', 'DG_KWH', 'DG ACTIVE', 'DG ENERGY', 'GENERATOR ENERGY'],
  activePower: ['3,190', '3,151', 'TOTAL KW', 'TOTAL_KW', 'ACTIVE POWER', 'DEMAND', 'LOAD KW', 'ACTIVE_POWER'],
  reactivePower: ['3,192', 'REACTIVE POWER', 'REACTIVE_POWER'],
  apparentPower: ['3,191', 'TOTAL KVA', 'TOTAL_KVA', 'APPARENT POWER', 'LOAD KVA', 'APPARENT_POWER'],
  cumulativekWh: ['3,151', '3,152', '4,91F', 'EB KWH', 'EB_KWH', 'EB ACTIVE ENERGY', 'CONSUMPTION', 'ACTIVE ENERGY', 'CUMULATIVE KWH', 'CUMULATIVE_KWH'],
  freq: ['3,153', 'FREQUENCY', 'FREQ', '50HZ', 'F', 'HZ']
};

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const displayDate = dataPoint?.fullDate || '';
    const displayTime = dataPoint?.fullTime || dataPoint?.time || label;

    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: '180px'
      }}>
        {displayDate && (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold', marginBottom: '2px' }}>
            Date : {displayDate}
          </div>
        )}
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '6px', fontWeight: 'bold' }}>
          Time : {displayTime}
        </div>
        {payload.map((entry, index) => (
          <div key={index} style={{ color: entry.color, fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span>{entry.name}:</span>
            <span style={{ marginLeft: '20px' }}>{entry.value !== null && entry.value !== undefined ? entry.value : '0'} {unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const isCore7Setting = (setting, categoryContext) => {
  if (categoryContext === 'AQI_SENSOR') {
    return true; // Don't filter out AQI sensor settings since they are already the core set.
  }
  
  const name = String(setting.displayName || setting.sochiotFieldName || '').toLowerCase();
  
  // Exclude Max Demand / Demand limits / Peak
  if (name.includes('max') || name.includes('dmd') || name.includes('demand') || name.includes('limit')) {
    return false;
  }
  
  // Exclude raw power (KW, KVA, KVAR) unless they contain energy keywords (KWH, KVAH, KVARH)
  const rawPowerPatterns = [/\bkw\b/, /\bkva\b/, /\bkvar\b/, /\bactive power\b/, /\breactive power\b/, /\bapparent power\b/];
  const hasRawPower = rawPowerPatterns.some(pat => pat.test(name));
  
  // Check if it is actually energy (KWH, KVAH, KVARH)
  const isEnergy = name.includes('kwh') || name.includes('kvah') || name.includes('kvarh') || name.includes('energy') || name.includes('consumption');
  
  if (hasRawPower && !isEnergy) {
    return false;
  }
  
  // Check if it matches any of our core 7 categories
  const matchesCore = [
    'energy', 'kwh', 'kvarh', 'kvah', 'consumption',
    'voltage', 'volt', 'current', 'amp', 'pf', 'power factor', 'freq', 'frequency', 'hz'
  ].some(keyword => name.includes(keyword));
  
  return matchesCore;
};

const getParameterType = (displayName, fieldName) => {
  const name = String(displayName || fieldName || '').toLowerCase();
  if (name.includes('energy') || name.includes('consumption') || name.includes('kwh') || name.includes('kvah') || name.includes('kvarh')) {
    return 'energy';
  }
  if (name.includes('voltage') || name.includes('volt') || name.startsWith('v') || name.includes('ua') || name.includes('ub') || name.includes('uc')) {
    return 'voltage';
  }
  if (name.includes('current') || name.includes('amp') || name.startsWith('i') || name.includes('ia') || name.includes('ib') || name.includes('ic')) {
    return 'current';
  }
  if (name.includes('pf') || name.includes('power factor')) {
    return 'power-factor';
  }
  if (name.includes('freq') || name.includes('frequency') || name.includes('hz')) {
    return 'frequency';
  }
  if (name.includes('kw') || name.includes('kva') || name.includes('power') || name.includes('demand')) {
    return 'power';
  }
  return 'default';
};

const ChartRow = ({ 
  title, 
  unit, 
  data, 
  dataKeys, 
  defaultColors, 
  type = 'line', 
  isStacked = false, 
  ranges = null, 
  onUpdateRanges = null, 
  globalInterval,
  layoutSize = 'wide',
  parameterType = 'default'
}) => {
  const [expanded, setExpanded] = useState(false);
  const [colors, setColors] = useState(defaultColors);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [tempRanges, setTempRanges] = useState(ranges || []);

  useEffect(() => {
    setTempRanges(ranges || []);
  }, [ranges]);

  const handleRangeSave = () => {
    if (onUpdateRanges) onUpdateRanges(tempRanges);
    setShowRangeModal(false);
  };

  const handleColorChange = (index, newColor) => {
    const updated = [...colors];
    updated[index] = newColor;
    setColors(updated);
  };

  const chartData = data && data.length > 0 ? data : [];

  const stats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { latest: null, min: null, max: null, avg: null };
    }
    const key = dataKeys[0]?.key;
    if (!key) return { latest: null, min: null, max: null, avg: null };

    const values = chartData
      .map(d => d[key])
      .filter(v => v !== null && v !== undefined && !isNaN(v));

    if (values.length === 0) {
      return { latest: null, min: null, max: null, avg: null };
    }

    const latest = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    return {
      latest: Number(latest.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      avg: Number(avg.toFixed(2))
    };
  }, [chartData, dataKeys]);

  const getGlowStyle = () => {
    switch (parameterType) {
      case 'voltage':
        return { color: '#0ea5e9', textShadow: '0 0 12px rgba(14,165,233,0.5)' };
      case 'current':
        return { color: '#a855f7', textShadow: '0 0 12px rgba(168,85,247,0.5)' };
      case 'energy':
      case 'power':
        return { color: '#f97316', textShadow: '0 0 12px rgba(249,115,22,0.5)' };
      case 'power-factor':
        return { color: '#10b981', textShadow: '0 0 12px rgba(16,185,129,0.5)' };
      case 'frequency':
        return { color: '#eab308', textShadow: '0 0 12px rgba(234,179,8,0.5)' };
      default:
        return { color: colors[0] || '#f97316', textShadow: `0 0 12px ${colors[0]}55` };
    }
  };

  const glow = getGlowStyle();

  const renderChart = (height = 260, showLegend = true) => {
    let ChartComponent = LineChart;
    if (type === 'bar') ChartComponent = BarChart;
    if (type === 'area') ChartComponent = AreaChart;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
          {type === 'area' && (
            <defs>
              {dataKeys.map((k, i) => (
                <linearGradient key={k.key} id={`color${k.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[i]} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={colors[i]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
          )}
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={true} horizontal={true} />
          
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={{ stroke: '#475569' }} 
            axisLine={{ stroke: '#475569' }}
            tick={{ fill: '#94a3b8' }} 
            dy={10}
            minTickGap={30}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={{ stroke: '#475569' }} 
            axisLine={{ stroke: '#475569' }}
            tick={{ fill: '#94a3b8' }} 
            dx={-10}
            width={60}
            domain={['auto', 'auto']}
          />
          
          <Tooltip content={<CustomTooltip unit={unit} />} cursor={type === 'bar' ? { fill: 'rgba(255,255,255,0.05)' } : { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }} wrapperStyle={{ pointerEvents: 'none' }} />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} iconType="circle" />}
          
          {dataKeys.map((k, i) => {
            if (type === 'bar') {
              return <Bar key={k.key} dataKey={k.key} name={k.name} stackId={isStacked ? "a" : undefined} fill={colors[i]} radius={isStacked ? [0, 0, 0, 0] : [2, 2, 0, 0]} isAnimationActive={true} animationDuration={1500} />;
            }
            if (type === 'area') {
              return (
                <Area 
                  key={k.key} 
                  type="monotone" 
                  dataKey={k.key} 
                  name={k.name}
                  stroke={colors[i]} 
                  strokeWidth={2.5}
                  fill={`url(#color${k.key})`} 
                  fillOpacity={1} 
                  isAnimationActive={true} 
                  animationDuration={1500}
                  activeDot={{ r: 6, fill: colors[i], stroke: '#fff', strokeWidth: 2 }}
                />
              );
            }
            return (
              <Line 
                key={k.key} 
                type="monotone" 
                dataKey={k.key} 
                name={k.name}
                stroke={colors[i]} 
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={true} 
                animationDuration={1500}
                activeDot={{ r: 6, fill: colors[i], stroke: '#fff', strokeWidth: 2 }}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const renderModals = () => {
    return (
      <>
        <Modal show={expanded} onHide={() => setExpanded(false)} size="xl" centered dialogClassName="modal-95w scada-expanded-modal">
          <Modal.Header className="border-secondary border-opacity-25 p-4" style={{ background: '#0b1120' }}>
            <Modal.Title className="text-white w-100 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-4">
                <div className="d-flex align-items-center gap-2">
                  <div style={{ width: '8px', height: '24px', background: glow.color, borderRadius: '4px', boxShadow: `0 0 10px ${glow.color}` }}></div>
                  <h4 className="mb-0 fw-bold">{title} <span className="text-secondary ms-2 fs-5 fw-normal">({unit})</span></h4>
                </div>
                <div className="d-flex gap-3 ms-4 border-start border-secondary border-opacity-25 ps-4 flex-wrap align-items-center">
                  {(!globalInterval || globalInterval === 'live') ? (
                    <span className="badge bg-success text-dark px-3 py-2 fw-bold rounded-pill uppercase me-3" style={{ letterSpacing: '0.5px' }}>
                      Live Data
                    </span>
                  ) : (
                    <span className="badge bg-warning text-dark px-3 py-2 fw-bold rounded-pill uppercase me-3" style={{ letterSpacing: '0.5px' }}>
                      {globalInterval === 'MIN_15' ? '15 Min' : globalInterval === 'DAILY' ? 'Daily' : 'Yearly'}
                    </span>
                  )}
                  
                  {dataKeys.map((k, i) => (
                    <div key={k.key} className="d-flex align-items-center gap-2">
                      <Form.Control
                        type="color"
                        value={colors[i]}
                        onChange={(e) => handleColorChange(i, e.target.value)}
                        className="p-0 border-0 rounded-circle cursor-pointer scada-color-picker"
                        style={{ width: '26px', height: '26px', cursor: 'pointer', background: 'transparent' }}
                      />
                      <span className="text-secondary fs-7">{k.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="link" className="text-white p-0 opacity-75 hover-opacity-100" onClick={() => setExpanded(false)}>
                <X size={32} />
              </Button>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: '#0b1120', padding: '20px' }} className="p-2 p-md-4">
            <div className="expanded-chart-container">
              {renderChart("100%")}
            </div>
          </Modal.Body>
        </Modal>

        <Modal show={showRangeModal} onHide={() => setShowRangeModal(false)} centered dialogClassName="scada-expanded-modal">
          <Modal.Header className="border-secondary border-opacity-25 p-4" style={{ background: '#0b1120' }}>
            <Modal.Title className="text-white fw-bold d-flex align-items-center gap-2">
              <Settings2 size={24} className="text-info" />
              Edit Ranges: {title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ background: '#0b1120', maxHeight: '60vh', overflowY: 'auto', padding: '30px' }}>
            {tempRanges.map((group, gIdx) => (
              <div key={gIdx} className="mb-4">
                {group.title && <h6 className="text-info mb-3 fw-bold text-uppercase">{group.title}</h6>}
                {group.items.map((item, iIdx) => (
                  <Row key={iIdx} className="mb-3 align-items-center">
                    <Col xs={1} className="text-center">
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color, margin: '0 auto', boxShadow: `0 0 5px ${item.color}` }} />
                    </Col>
                    <Col xs={5}>
                      <Form.Label className="text-secondary fs-8 mb-1">Status</Form.Label>
                      <Form.Control 
                        size="sm"
                        className="bg-dark text-white border-secondary shadow-none" 
                        value={item.label} 
                        onChange={e => {
                          const newR = JSON.parse(JSON.stringify(tempRanges));
                          newR[gIdx].items[iIdx].label = e.target.value;
                          setTempRanges(newR);
                        }}
                      />
                    </Col>
                    <Col xs={6}>
                      <Form.Label className="text-secondary fs-8 mb-1">Value Limit</Form.Label>
                      <Form.Control 
                        size="sm"
                        className="bg-dark text-white border-secondary shadow-none" 
                        value={item.value} 
                        onChange={e => {
                          const newR = JSON.parse(JSON.stringify(tempRanges));
                          newR[gIdx].items[iIdx].value = e.target.value;
                          setTempRanges(newR);
                        }}
                      />
                    </Col>
                  </Row>
                ))}
              </div>
            ))}
          </Modal.Body>
          <Modal.Footer className="border-secondary border-opacity-25 p-3" style={{ background: '#0b1120' }}>
            <Button variant="outline-secondary" size="sm" onClick={() => setShowRangeModal(false)} className="px-4 rounded-pill fw-bold">Cancel</Button>
            <Button variant="info" size="sm" onClick={handleRangeSave} className="px-4 rounded-pill fw-bold text-dark hover-glow">Save Changes</Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  };

  return (
    <>
      {layoutSize === 'wide' ? (
        <Card className="mb-4 border-0 scada-card" style={{ background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <Row className="g-0 align-items-stretch h-100">
            {/* Left Info & KPI Panel */}
            <Col md={4} xl={3} className="p-4 d-flex flex-column scada-card-left-panel" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <div style={{ width: '6px', height: '18px', background: glow.color, borderRadius: '3px', boxShadow: `0 0 8px ${glow.color}` }}></div>
                <h5 className="mb-0 text-white fw-bold fs-6">{title}</h5>
              </div>
              
              <div className="text-secondary fs-7 fw-medium mb-3 d-flex align-items-center gap-1">
                {unit || 'Units'}
              </div>

              {/* Digital KPI Block */}
              <div className="p-3 rounded-3 mb-3 border border-secondary border-opacity-25" style={{ background: 'rgba(9, 9, 11, 0.6)' }}>
                <span className="text-secondary fs-9 fw-bold tracking-widest d-block mb-1">LATEST READOUT</span>
                <div className="d-flex align-items-baseline gap-2">
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'monospace', ...glow }}>
                    {stats.latest !== null ? stats.latest : '---'}
                  </span>
                  <span className="text-secondary fs-7 fw-bold">{unit}</span>
                </div>
              </div>

              {/* Min, Max, Avg Stats Grid */}
              <div className="stats-grid mb-4">
                <Row className="g-2">
                  <Col xs={4}>
                    <div className="p-2 rounded text-center" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="text-secondary fs-9 fw-bold">MIN</div>
                      <div className="text-white fs-8 fw-bold">{stats.min !== null ? stats.min : '---'}</div>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="p-2 rounded text-center" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="text-secondary fs-9 fw-bold">MAX</div>
                      <div className="text-white fs-8 fw-bold">{stats.max !== null ? stats.max : '---'}</div>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="p-2 rounded text-center" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="text-secondary fs-9 fw-bold">AVG</div>
                      <div className="text-white fs-8 fw-bold">{stats.avg !== null ? stats.avg : '---'}</div>
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Footer Panel buttons / colorpicker */}
              <div className="mt-auto">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="fs-8 text-secondary uppercase tracking-widest fw-bold">Color</span>
                  <div className="d-flex align-items-center gap-1">
                    {dataKeys.map((k, i) => (
                      <Form.Control
                        key={k.key}
                        type="color"
                        value={colors[i]}
                        onChange={(e) => handleColorChange(i, e.target.value)}
                        className="p-0 border-0 rounded-circle cursor-pointer scada-color-picker"
                        style={{ width: '22px', height: '22px', cursor: 'pointer', background: 'transparent' }}
                      />
                    ))}
                  </div>
                </div>

                <Button 
                  variant="outline-info" 
                  size="sm" 
                  className="w-100 rounded-pill py-2 fs-8 fw-bold d-flex justify-content-center align-items-center gap-2 hover-glow" 
                  onClick={() => setExpanded(true)}
                >
                  <Maximize2 size={14} /> EXPAND GRAPH
                </Button>
              </div>
            </Col>
            
            {/* Chart Area */}
            <Col md={ranges ? 5 : 8} xl={ranges ? 6 : 9} className="p-4" style={{ minWidth: 0 }}>
              {renderChart(280)}
            </Col>

            {/* Ranges Panel */}
            {ranges && (
              <Col md={3} xl={3} className="p-3 p-xl-4 d-flex flex-column justify-content-center scada-card-right-panel" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom border-secondary border-opacity-25 pb-2">
                  <h6 className="text-white fs-7 mb-0 fw-bold" style={{letterSpacing: '0.5px'}}>RANGE LIMITS</h6>
                  {onUpdateRanges && (
                    <Button variant="link" className="p-0 text-info hover-glow rounded-circle d-flex align-items-center justify-content-center" style={{width: 24, height: 24}} onClick={() => setShowRangeModal(true)} title="Edit Ranges">
                      <Settings2 size={16} />
                    </Button>
                  )}
                </div>
                {ranges.map((group, idx) => (
                  <div key={idx} className="mb-3" style={{ opacity: 0.9 }}>
                    {group.title && <div className="text-info fs-8 fw-bold mb-2 text-uppercase" style={{letterSpacing: '0.5px'}}>{group.title}</div>}
                    {group.items.map((item, i) => (
                      <div key={i} className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, boxShadow: `0 0 5px ${item.color}` }}></div>
                          <span className="text-secondary fs-8 fw-medium">{item.label}</span>
                        </div>
                        <span className="text-white fs-8 fw-bold text-end ms-2">{item.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </Col>
            )}
          </Row>
        </Card>
      ) : (
        <Card className="mb-4 border-0 scada-card" style={{ background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', minHeight: '380px' }}>
          <Card.Body className="p-3 d-flex flex-column justify-content-between">
            <div>
              {/* Header Block */}
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <div style={{ width: '5px', height: '14px', background: glow.color, borderRadius: '2px', boxShadow: `0 0 6px ${glow.color}` }}></div>
                    <h6 className="mb-0 text-white fw-bold fs-7">{title}</h6>
                  </div>
                  <span className="text-secondary fs-9 fw-medium">{unit || 'Units'}</span>
                </div>

                {/* Giant Digital Readout */}
                <div className="text-end">
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', ...glow }}>
                    {stats.latest !== null ? stats.latest : '---'}
                  </span>
                  <span className="text-secondary fs-9 fw-bold ms-1">{unit}</span>
                </div>
              </div>

              {/* Stats Bar & Buttons Row */}
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-2 rounded mb-3" style={{ background: 'rgba(9, 9, 11, 0.4)', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div className="d-flex gap-2">
                  <span className="text-secondary fs-9"><strong className="text-muted">MIN:</strong> <span className="text-white">{stats.min !== null ? stats.min : '---'}</span></span>
                  <span className="text-secondary fs-9"><strong className="text-muted">MAX:</strong> <span className="text-white">{stats.max !== null ? stats.max : '---'}</span></span>
                  <span className="text-secondary fs-9"><strong className="text-muted">AVG:</strong> <span className="text-white">{stats.avg !== null ? stats.avg : '---'}</span></span>
                </div>
                
                <div className="d-flex align-items-center gap-2">
                  {dataKeys.map((k, i) => (
                    <Form.Control
                      key={k.key}
                      type="color"
                      value={colors[i]}
                      onChange={(e) => handleColorChange(i, e.target.value)}
                      className="p-0 border-0 rounded-circle cursor-pointer scada-color-picker"
                      style={{ width: '16px', height: '16px', cursor: 'pointer', background: 'transparent' }}
                    />
                  ))}
                  <Button 
                    variant="link" 
                    className="p-0 text-info hover-glow rounded-circle d-flex align-items-center justify-content-center" 
                    style={{ width: 22, height: 22 }}
                    onClick={() => setExpanded(true)}
                    title="Expand Graph"
                  >
                    <Maximize2 size={12} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Compact Chart */}
            <div style={{ minWidth: 0 }}>
              {renderChart(200, false)}
            </div>

            {/* Compact ranges row if available */}
            {ranges && (
              <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 d-flex flex-wrap gap-2 justify-content-center">
                {ranges[0]?.items?.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color }} />
                    <span className="text-secondary">{item.label}:</span>
                    <span className="text-white fw-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {renderModals()}


    </>
  );
};

const EnergyGraphs = () => {
  const location = useLocation();
  const categoryContext = location.pathname.includes('/aqi-sensor') ? 'AQI_SENSOR' : 'ENERGY_METER';

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [settings, setSettings] = useState([]);
  const [selectedSettings, setSelectedSettings] = useState([]);
  
  const [isSwitching, setIsSwitching] = useState(false);
  const [historyLog, setHistoryLog] = useState([]);
  
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(() => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    return userData?.siteId || localStorage.getItem('selectedSiteId') || '1';
  });

  const [globalInterval, setGlobalInterval] = useState('MIN_15');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  const [toDate, setToDate] = useState(() => {
    return getLocalDateString(new Date());
  });
  
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Filter settings state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [aggregation, setAggregation] = useState('Average'); // 'Average' | 'Minimum' | 'Maximum'
  const [liveWindow, setLiveWindow] = useState('5 minutes'); // '5 minutes' | '15 minutes' | '30 minutes' | '1 hour'
  const [livePill, setLivePill] = useState('Last'); // 'Last' | 'Relative'
  const [historyPill, setHistoryPill] = useState('Range'); // 'Last' | 'Range' | 'Relative'
  const [pollingIntervalMs, setPollingIntervalMs] = useState(5000);

  // Temp states for modal fields
  const [tempTab, setTempTab] = useState('history'); // 'realtime' | 'history'
  const [tempLivePill, setTempLivePill] = useState('Last');
  const [tempHistoryPill, setTempHistoryPill] = useState('Range');
  const [tempLiveWindow, setTempLiveWindow] = useState('5 minutes');
  const [tempAggregation, setTempAggregation] = useState('Average');
  const [tempGroupingInterval, setTempGroupingInterval] = useState('15 Min');
  const [tempFromDate, setTempFromDate] = useState('');
  const [tempToDate, setTempToDate] = useState('');
  const [tempSelectedSettings, setTempSelectedSettings] = useState([]);

  const handleOpenFilter = () => {
    setTempTab(globalInterval === 'live' ? 'realtime' : 'history');
    setTempLivePill(livePill);
    setTempHistoryPill(historyPill);
    setTempLiveWindow(liveWindow);
    setTempAggregation(aggregation);
    setTempSelectedSettings(selectedSettings);
    
    let currentGrouping = '15 Min';
    if (globalInterval === 'DAILY') currentGrouping = 'Daily';
    if (globalInterval === 'YEARLY') currentGrouping = 'Yearly';
    setTempGroupingInterval(currentGrouping);

    setTempFromDate(fromDate);
    setTempToDate(toDate);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setLivePill(tempLivePill);
    setHistoryPill(tempHistoryPill);
    setLiveWindow(tempLiveWindow);
    setAggregation(tempAggregation);
    setSelectedSettings(tempSelectedSettings);
    
    let targetInterval = 'live';
    if (tempTab === 'history') {
      if (tempGroupingInterval === '15 Min') targetInterval = 'MIN_15';
      if (tempGroupingInterval === 'Daily') targetInterval = 'DAILY';
      if (tempGroupingInterval === 'Yearly') targetInterval = 'YEARLY';
    }
    
    setGlobalInterval(targetInterval);

    if (tempTab === 'history') {
      if (tempHistoryPill === 'Range') {
        setFromDate(tempFromDate);
        setToDate(tempToDate);
      } else {
        const d = new Date();
        const todayStr = getLocalDateString(d);
        setToDate(todayStr);

        let days = 7;
        if (tempHistoryPill === 'Last 30 Days') days = 30;
        if (tempHistoryPill === 'Last Year') days = 365;
        
        d.setDate(d.getDate() - days);
        setFromDate(getLocalDateString(d));
      }
    } else {
      let intervalMs = 5000;
      if (tempGroupingInterval === '1 second') intervalMs = 1000;
      if (tempGroupingInterval === '5 seconds') intervalMs = 5000;
      if (tempGroupingInterval === '10 seconds') intervalMs = 10000;
      if (tempGroupingInterval === '30 seconds') intervalMs = 30000;
      if (tempGroupingInterval === '1 minute') intervalMs = 60000;
      setPollingIntervalMs(intervalMs);
    }

    setShowFilterModal(false);
  };

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token') || '';
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/sites/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setSites(json.data || []);
        }
      } catch (err) {
        console.error('Error fetching sites in EnergyGraphs:', err);
      }
    };
    fetchSites();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      setLoadingDevices(true);
      try {
        const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE_URL}/sites/${selectedSiteId}/devices`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch devices');
        }
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const filtered = result.data.filter(
            d => String(d.category).toUpperCase() === categoryContext
          );
          setDevices(filtered);
          if (filtered.length > 0) {
            const cachedId = localStorage.getItem(`selected_device_${categoryContext}`);
            if (cachedId && filtered.some(d => String(d.id) === String(cachedId))) {
              setSelectedDeviceId(String(cachedId));
            } else {
              setSelectedDeviceId(String(filtered[0].id));
            }
          } else {
            setSelectedDeviceId('');
          }
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
      } finally {
        setLoadingDevices(false);
      }
    };
    fetchDevices();
  }, [selectedSiteId, categoryContext]);

  useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem(`selected_device_${categoryContext}`, selectedDeviceId);
    }
  }, [selectedDeviceId, categoryContext]);

  useEffect(() => {
    if (!selectedDeviceId) {
      setSettings([]);
      setSelectedSettings([]);
      return;
    }
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE_URL}/sites/${selectedSiteId}/devices/${selectedDeviceId}/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch device settings');
        }
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const graphableSettings = result.data.filter(s => s.graphable === true && isCore7Setting(s, categoryContext));
          setSettings(graphableSettings);
          setSelectedSettings(graphableSettings.map(s => s.sochiotFieldName));
        } else {
          setSettings([]);
          setSelectedSettings([]);
        }
      } catch (err) {
        console.error('Error fetching device settings:', err);
        setSettings([]);
        setSelectedSettings([]);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, [selectedSiteId, selectedDeviceId]);

  useEffect(() => {
    if (globalInterval === 'live' || !selectedDeviceId || selectedSettings.length === 0) {
      setHistoricalData([]);
      return;
    }

    const loadHistoricalData = async () => {
      setLoadingHistory(true);
      try {
        const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token') || '';
        const headers = { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const promises = selectedSettings.map(async (fieldKey) => {
          const url = `${API_BASE_URL}/sites/${selectedSiteId}/devices/${selectedDeviceId}/telemetry/snapshots?fieldKey=${fieldKey}&interval=${globalInterval}&from=${fromDate}T00:00:00Z&to=${toDate}T23:59:59Z`;
          try {
            const res = await fetch(url, { headers });
            if (!res.ok) return { key: fieldKey, snapshots: [] };
            const json = await res.json();
            return {
              key: fieldKey,
              snapshots: json.data?.snapshots || []
            };
          } catch (e) {
            console.error(`Error fetching snapshots for ${fieldKey}:`, e);
            return { key: fieldKey, snapshots: [] };
          }
        });

        const results = await Promise.all(promises);

        const mergedData = {};
        results.forEach(result => {
          result.snapshots.forEach(snap => {
            const timeKey = snap.windowStart;
            if (!mergedData[timeKey]) {
              const dateObj = new Date(snap.windowStart);
              let formattedTime = '';
              if (globalInterval === 'MIN_15') {
                formattedTime = dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
              } else if (globalInterval === 'DAILY') {
                formattedTime = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              } else {
                formattedTime = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              }
              const fullDateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const fullTimeStr = dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
              mergedData[timeKey] = {
                time: formattedTime,
                fullDate: fullDateStr,
                fullTime: fullTimeStr,
                windowStart: snap.windowStart,
                windowEnd: snap.windowEnd
              };
            }
            let valKey = 'avgValue';
            if (aggregation === 'Min' || aggregation === 'Minimum') valKey = 'minValue';
            else if (aggregation === 'Max' || aggregation === 'Maximum') valKey = 'maxValue';
            else if (aggregation === 'Average') valKey = 'avgValue';
            else if (aggregation === 'Sum') valKey = 'sumValue';
            else if (aggregation === 'Count') valKey = 'countValue';
            else if (aggregation === 'None') valKey = 'avgValue';
            
            let finalValue = snap[valKey];
            if (finalValue === undefined || finalValue === null) {
              finalValue = snap.avgValue ?? snap.minValue ?? snap.maxValue ?? null;
            }
            mergedData[timeKey][result.key] = finalValue !== null && finalValue !== undefined ? Number(Number(finalValue).toFixed(2)) : null;
          });
        });

        const sorted = Object.values(mergedData).sort((a, b) => new Date(a.windowStart) - new Date(b.windowStart));
        setHistoricalData(sorted);
      } catch (err) {
        console.error('Failed to load historical snapshots:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistoricalData();
  }, [selectedSiteId, selectedDeviceId, selectedSettings, globalInterval, fromDate, toDate, aggregation]);

  useEffect(() => {
    if (globalInterval !== 'live' || !selectedDeviceId) {
      setHistoryLog([]);
      return;
    }

    setIsSwitching(true);
    setHistoryLog([]);

    const fetchLiveStats = async () => {
      try {
        const token = localStorage.getItem('sochiot_token') || localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE_URL}/sites/${selectedSiteId}/devices/${selectedDeviceId}/live`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error('Failed to fetch live stats');
        }
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const liveFields = result.data;
          
          const now = new Date();
          const newPoint = {
            time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            fullDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            fullTime: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          
          liveFields.forEach(f => {
            newPoint[f.fieldKey] = f.numericValue !== null && f.numericValue !== undefined ? Number(Number(f.numericValue).toFixed(2)) : null;
          });

          let maxPoints = 60;
          const basePollSecs = pollingIntervalMs / 1000;
          let windowSecs = 300;
          if (liveWindow === '15 minutes') windowSecs = 900;
          if (liveWindow === '30 minutes') windowSecs = 1800;
          if (liveWindow === '1 hour') windowSecs = 3600;
          maxPoints = Math.ceil(windowSecs / basePollSecs);

          setHistoryLog(prev => {
            const next = [...prev, newPoint];
            return next.length > maxPoints ? next.slice(next.length - maxPoints) : next;
          });
        }
        setIsSwitching(false);
      } catch (err) {
        console.error('Error polling live stats:', err);
        setIsSwitching(false);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, pollingIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [selectedSiteId, selectedDeviceId, globalInterval, pollingIntervalMs, liveWindow]);

  const getRangesForSetting = (setting) => {
    const items = [];
    if (setting.criticalHigh !== null && setting.criticalHigh !== undefined) {
      items.push({ color: '#ef4444', label: 'Critical High', value: `>${setting.criticalHigh} ${setting.unit || ''}` });
    }
    if (setting.warningHigh !== null && setting.warningHigh !== undefined) {
      items.push({ color: '#eab308', label: 'Warning High', value: `>${setting.warningHigh} ${setting.unit || ''}` });
    }
    if (setting.warningLow !== null && setting.warningLow !== undefined) {
      items.push({ color: '#eab308', label: 'Warning Low', value: `<${setting.warningLow} ${setting.unit || ''}` });
    }
    if (setting.criticalLow !== null && setting.criticalLow !== undefined) {
      items.push({ color: '#ef4444', label: 'Critical Low', value: `<${setting.criticalLow} ${setting.unit || ''}` });
    }
    
    if (items.length > 0) {
      return [{ title: 'Threshold Limits', items }];
    }
    return null;
  };

  const getChartType = (name) => {
    const n = String(name).toLowerCase();
    if (n.includes('energy') || n.includes('consumption')) return 'bar';
    if (n.includes('pf') || n.includes('frequency') || n.includes('freq') || n.includes('aqi') || n.includes('humidity') || n.includes('co2')) return 'area';
    return 'line';
  };

  const getChartColor = (index) => {
    const palette = ['#e05e00', '#0ea5e9', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6'];
    return palette[index % palette.length];
  };

  const activeData = globalInterval === 'live' ? historyLog : historicalData;

  return (
    <div className="fade-in px-2 px-md-4 py-3">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 p-4 rounded-4" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.7))', border: '1px solid rgba(255, 107, 0, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div>
          <h2 className="mb-1 text-white fw-bold d-flex align-items-center gap-3 flex-wrap">
            <div className="p-2 rounded-3" style={{ background: 'rgba(255, 107, 0, 0.15)', border: '1px solid rgba(255,107,0,0.3)' }}>
              <Zap className="text-warning text-shrink-0" size={28} />
            </div>
            {categoryContext === 'ENERGY_METER' ? 'Energy Advanced Analytics' : 'AQI Environmental Analytics'}
          </h2>
          <p className="text-secondary fs-7 mb-0 mt-2">Continuous telemetry analytics logs tracking all parameters flawlessly.</p>
        </div>
      </div>

      <Card className="mb-4 border-0" style={{ background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)', borderRadius: '16px', border: '1px solid rgba(249, 115, 22, 0.15)', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            {sites.length > 0 && (
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>SITE NAME</Form.Label>
                  <Form.Select
                    size="sm"
                    className="scada-dropdown-orange bg-dark text-white shadow-none fs-8"
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                  >
                    {sites.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}

            <Col xs={12} md={sites.length > 0 ? 4 : 6}>
              <Form.Group>
                <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>
                  {categoryContext === 'ENERGY_METER' ? 'ENERGY METER / DEVICE' : 'AQI SENSOR / NODE'}
                </Form.Label>
                <Form.Select
                  size="sm"
                  className="scada-dropdown-orange bg-dark text-white shadow-none fs-8"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  {devices.length === 0 && (
                    <option value="">No devices configured</option>
                  )}
                  {devices.map(d => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name || d.description || 'Unnamed Device'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col xs={12} md={sites.length > 0 ? 4 : 6} className="d-flex align-items-end">
              <Form.Group className="w-100">
                <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>FILTRATION SETTINGS</Form.Label>
                <Button 
                  onClick={handleOpenFilter}
                  className="filter-toggle-btn w-100"
                  size="sm"
                  style={{ height: '38px', borderRadius: '8px' }}
                >
                  <Settings2 size={16} /> {globalInterval === 'live' ? 'Realtime (Polling)' : `History (${globalInterval === 'MIN_15' ? '15m' : globalInterval === 'DAILY' ? 'Daily' : 'Yearly'})`}
                </Button>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="energy-graphs-container mb-4" style={{ minHeight: '60vh' }}>
        {loadingHistory || isSwitching || loadingDevices || loadingSettings ? (
          <div className="d-flex flex-column justify-content-center align-items-center h-100" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-warning mb-3" role="status" style={{ width: '3rem', height: '3rem', filter: 'drop-shadow(0 0 10px rgba(224, 94, 0, 0.8))' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-warning fw-black uppercase tracking-widest" style={{ letterSpacing: '2px', animation: 'pulse 1.5s infinite', color: 'var(--scada-accent)' }}>
              Fetching Telemetry Snapshots...
            </h5>
            <small className="text-secondary opacity-50 uppercase tracking-widest">Querying database</small>
          </div>
        ) : selectedDeviceId && selectedSettings.length === 0 ? (
          <div className="d-flex flex-column justify-content-center align-items-center h-100 border border-secondary border-opacity-25 rounded-4 p-5" style={{ minHeight: '400px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <Zap className="text-warning mb-3 opacity-50" size={48} />
            <h5 className="text-white fw-bold mb-2">No Parameters Found</h5>
            <p className="text-secondary text-center max-w-md mb-0">No graphable parameters have been mapped for this device.</p>
          </div>
        ) : !selectedDeviceId ? (
          <div className="d-flex flex-column justify-content-center align-items-center h-100 border border-secondary border-opacity-25 rounded-4 p-5" style={{ minHeight: '400px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <Zap className="text-warning mb-3 opacity-50" size={48} />
            <h5 className="text-white fw-bold mb-2">No Mapped Devices Found</h5>
            <p className="text-secondary text-center max-w-md mb-0">Please verify that you have registered and mapped devices in the template manager.</p>
          </div>
        ) : activeData.length === 0 ? (
          <div className="d-flex flex-column justify-content-center align-items-center h-100 border border-secondary border-opacity-25 rounded-4 p-5 text-center" style={{ minHeight: '400px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <Zap className="text-warning mb-3 opacity-50 animate-pulse" size={48} style={{ filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.4))' }} />
            <h5 className="text-white fw-bold mb-2">No Modbus Telemetry Data Found</h5>
            <p className="text-secondary max-w-md mb-0 mx-auto" style={{ maxWidth: '480px' }}>
              We are currently displaying only live/historical Modbus register data. No dummy or simulated values are shown on this dashboard. Please verify device connectivity or adjust your timeframe filtration settings.
            </p>
          </div>
        ) : (
          <Row className="g-4">
            {settings
              .filter(setting => selectedSettings.includes(setting.sochiotFieldName))
              .map((setting, idx) => {
                const chartType = getChartType(setting.displayName);
                const chartColor = getChartColor(idx);
                const ranges = getRangesForSetting(setting);
                const pType = getParameterType(setting.displayName, setting.sochiotFieldName);
                const isCompact = pType === 'voltage' || pType === 'current' || pType === 'power-factor' || pType === 'frequency';
                const layoutSize = isCompact ? 'compact' : 'wide';
                
                return (
                  <Col xs={12} md={isCompact ? 6 : 12} key={setting.sochiotFieldName} className="graph-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <ChartRow 
                      title={setting.displayName}
                      unit={setting.unit || ''}
                      data={activeData}
                      globalInterval={globalInterval}
                      dataKeys={[{ key: setting.sochiotFieldName, name: setting.displayName }]}
                      defaultColors={[chartColor]}
                      type={chartType}
                      ranges={ranges}
                      layoutSize={layoutSize}
                      parameterType={pType}
                    />
                  </Col>
                );
              })}
          </Row>
        )}
      </div>
      {/* Advanced Filter Settings Modal */}
      <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} centered dialogClassName="filter-modal">
        <Modal.Header className="filter-modal-header border-0 px-4 py-3">
          <Modal.Title className="text-white fw-bold d-flex align-items-center justify-content-between w-100">
            <span className="d-flex align-items-center gap-2" style={{ fontSize: '1.2rem' }}>
              <Settings2 size={20} className="text-warning animate-pulse" />
              Advanced Filters
            </span>
            <Button variant="link" className="text-white p-0 opacity-75 hover-opacity-100" onClick={() => setShowFilterModal(false)}>
              <X size={20} />
            </Button>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ background: '#09090b' }}>
          {/* Tab Selector */}
          <div className="filter-tab-container">
            <button 
              type="button" 
              className={`filter-tab-btn ${tempTab === 'realtime' ? 'active' : ''}`}
              onClick={() => {
                setTempTab('realtime');
                setTempAggregation('Average');
                setTempGroupingInterval('5 seconds');
              }}
            >
              Realtime
            </button>
            <button 
              type="button" 
              className={`filter-tab-btn ${tempTab === 'history' ? 'active' : ''}`}
              onClick={() => {
                setTempTab('history');
                setTempAggregation('Average');
                setTempGroupingInterval('15 Min');
              }}
            >
              History
            </button>
          </div>

          {tempTab === 'realtime' ? (
            <div className="fade-in">
              {/* Time window Card */}
              <div className="filter-card-box">
                <div className="filter-card-header">
                  <span className="filter-card-title">Time window</span>
                  <div className="filter-pill-container">
                    <button 
                      type="button" 
                      className={`filter-pill-btn ${tempLivePill === 'Last' ? 'active' : ''}`}
                      onClick={() => setTempLivePill('Last')}
                    >
                      Last
                    </button>
                    <button 
                      type="button" 
                      className={`filter-pill-btn ${tempLivePill === 'Relative' ? 'active' : ''}`}
                      onClick={() => setTempLivePill('Relative')}
                    >
                      Relative
                    </button>
                  </div>
                </div>

                {tempLivePill === 'Last' && (
                  <Form.Select 
                    className="filter-select-custom mt-2"
                    value={tempLiveWindow}
                    onChange={(e) => setTempLiveWindow(e.target.value)}
                  >
                    <option value="5 minutes">5 minutes</option>
                    <option value="15 minutes">15 minutes</option>
                    <option value="30 minutes">30 minutes</option>
                    <option value="1 hour">1 hour</option>
                  </Form.Select>
                )}
                
                {tempLivePill === 'Relative' && (
                  <div className="text-secondary fs-8 italic mt-2">Relative window matches active site timezone offset.</div>
                )}
                
                <div className="text-end mt-2">
                  <span className="text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>UTC+05:30</span>
                </div>
              </div>

              {/* Aggregation & Grouping Row */}
              <Row className="g-2 mb-2">
                <Col xs={6}>
                  <div className="filter-card-box mb-0 h-100">
                    <div className="mb-2">
                      <span className="filter-card-title">Aggregation</span>
                    </div>
                    <Form.Select 
                      className="filter-select-custom"
                      value={tempAggregation}
                      onChange={(e) => setTempAggregation(e.target.value)}
                    >
                      <option value="Min">Min</option>
                      <option value="Max">Max</option>
                      <option value="Average">Average</option>
                      <option value="Sum">Sum</option>
                      <option value="Count">Count</option>
                      <option value="None">None</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="filter-card-box mb-0 h-100">
                    <div className="mb-2">
                      <span className="filter-card-title">Grouping interval</span>
                    </div>
                    <Form.Select 
                      className="filter-select-custom"
                      value={tempGroupingInterval}
                      onChange={(e) => setTempGroupingInterval(e.target.value)}
                    >
                      <option value="1 second">1 second</option>
                      <option value="5 seconds">5 seconds</option>
                      <option value="10 seconds">10 seconds</option>
                      <option value="30 seconds">30 seconds</option>
                      <option value="1 minute">1 minute</option>
                    </Form.Select>
                  </div>
                </Col>
              </Row>
            </div>
          ) : (
            <div className="fade-in">
              {/* Time window Card */}
              <div className="filter-card-box">
                <div className="filter-card-header">
                  <span className="filter-card-title">Time window</span>
                  <div className="filter-pill-container">
                    <button 
                      type="button" 
                      className={`filter-pill-btn ${tempHistoryPill.startsWith('Last') ? 'active' : ''}`}
                      onClick={() => setTempHistoryPill('Last 7 Days')}
                    >
                      Last
                    </button>
                    <button 
                      type="button" 
                      className={`filter-pill-btn ${tempHistoryPill === 'Range' ? 'active' : ''}`}
                      onClick={() => setTempHistoryPill('Range')}
                    >
                      Range
                    </button>
                    <button 
                      type="button" 
                      className={`filter-pill-btn ${tempHistoryPill === 'Relative' ? 'active' : ''}`}
                      onClick={() => setTempHistoryPill('Relative')}
                    >
                      Relative
                    </button>
                  </div>
                </div>

                {tempHistoryPill.startsWith('Last') && (
                  <Form.Select 
                    className="filter-select-custom mt-2"
                    value={tempHistoryPill}
                    onChange={(e) => setTempHistoryPill(e.target.value)}
                  >
                    <option value="Last 7 Days">Last 7 Days</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                    <option value="Last Year">Last Year</option>
                  </Form.Select>
                )}

                {tempHistoryPill === 'Range' && (
                  <Row className="g-2 mt-2">
                    <Col xs={6}>
                      <span className="text-secondary fw-semibold mb-1 d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</span>
                      <Form.Control
                        type="date"
                        className="filter-input-custom"
                        value={tempFromDate}
                        onChange={(e) => setTempFromDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                    </Col>
                    <Col xs={6}>
                      <span className="text-secondary fw-semibold mb-1 d-block" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</span>
                      <Form.Control
                        type="date"
                        className="filter-input-custom"
                        value={tempToDate}
                        onChange={(e) => setTempToDate(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                    </Col>
                  </Row>
                )}

                {tempHistoryPill === 'Relative' && (
                  <div className="text-secondary fs-8 italic mt-2">Relative window matches active site timezone offset.</div>
                )}
                
                <div className="text-end mt-2">
                  <span className="text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>UTC+05:30</span>
                </div>
              </div>

              {/* Aggregation & Grouping Row */}
              <Row className="g-2 mb-2">
                <Col xs={6}>
                  <div className="filter-card-box mb-0 h-100">
                    <div className="mb-2">
                      <span className="filter-card-title">Aggregation</span>
                    </div>
                    <Form.Select 
                      className="filter-select-custom"
                      value={tempAggregation}
                      onChange={(e) => setTempAggregation(e.target.value)}
                    >
                      <option value="Min">Min</option>
                      <option value="Max">Max</option>
                      <option value="Average">Average</option>
                      <option value="Sum">Sum</option>
                      <option value="Count">Count</option>
                      <option value="None">None</option>
                    </Form.Select>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="filter-card-box mb-0 h-100">
                    <div className="mb-2">
                      <span className="filter-card-title">Grouping interval</span>
                    </div>
                    <Form.Select 
                      className="filter-select-custom"
                      value={tempGroupingInterval}
                      onChange={(e) => setTempGroupingInterval(e.target.value)}
                    >
                      <option value="15 Min">15 Minutes</option>
                      <option value="Daily">Daily</option>
                      <option value="Yearly">Yearly</option>
                    </Form.Select>
                  </div>
                </Col>
              </Row>
            </div>
          )}

        </Modal.Body>
        <Modal.Footer className="filter-modal-footer border-0">
          <button 
            type="button" 
            onClick={() => setShowFilterModal(false)} 
            className="btn-cancel-custom"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleApplyFilter} 
            className="btn-update-custom"
          >
            Update
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EnergyGraphs;
