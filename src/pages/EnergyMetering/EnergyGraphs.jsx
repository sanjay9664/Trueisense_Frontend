import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Maximize2, X, Zap, Activity, Settings2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useDeviceStatus } from '../../services/DeviceStatusContext';

const API_BASE_URL = import.meta.env.VITE_BACKEND_BMS_URL || 'http://localhost:3002/api/v1';

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

const TIME_FILTERS = [
  { label: 'Live Data', value: 'live' },
  { label: '15 Min', value: '15m' },
  { label: '30 Min', value: '30m' },
  { label: '60 Min', value: '60m' },
  { label: '12 Hours', value: '12h' },
  { label: '24 Hours', value: '24h' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
  { label: 'Yearly', value: 'year' },
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
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '6px', fontWeight: 'bold' }}>
          Time : {label}
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

const ChartRow = ({ title, unit, data, dataKeys, defaultColors, type = 'line', isStacked = false, ranges = null, onUpdateRanges = null, globalInterval }) => {
  const [expanded, setExpanded] = useState(false);
  const [colors, setColors] = useState(defaultColors);
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [tempRanges, setTempRanges] = useState(ranges || []);
  const [timeFilter, setTimeFilter] = useState('live');
  const [localData, setLocalData] = useState([]);

  useEffect(() => {
    setTempRanges(ranges || []);
  }, [ranges]);

  const handleRangeSave = () => {
    if (onUpdateRanges) onUpdateRanges(tempRanges);
    setShowRangeModal(false);
  };

  const dataKeysRef = useRef(dataKeys);
  useEffect(() => {
    dataKeysRef.current = dataKeys;
  }, [dataKeys]);

  useEffect(() => {
    if (timeFilter === 'live') {
      if (localData.length !== 0) {
        setLocalData([]);
      }
      return;
    }
    
    let points = 30;
    let labelFormat = '';
    
    if (timeFilter === '15m') { points = 15; labelFormat = 'minute'; }
    if (timeFilter === '30m') { points = 30; labelFormat = 'minute'; }
    if (timeFilter === '60m') { points = 60; labelFormat = 'minute'; }
    if (timeFilter === '12h') { points = 12; labelFormat = 'hour'; }
    if (timeFilter === '24h') { points = 24; labelFormat = 'hour'; }
    if (timeFilter === 'week') { points = 7; labelFormat = 'day'; }
    if (timeFilter === 'month') { points = 30; labelFormat = 'day'; }
    if (timeFilter === 'year') { points = 12; labelFormat = 'month'; }

    const generated = [];
    let baseVal = {};
    const currentDataKeys = dataKeysRef.current;
    
    currentDataKeys.forEach(k => { 
      baseVal[k.key] = Math.random() * 50 + 200; 
      if(k.key.includes('i')) baseVal[k.key] = 45;
      if(k.key.includes('totalKva')) baseVal[k.key] = 30;
      if(k.key.includes('reactive')) baseVal[k.key] = 10;
      if(k.key.includes('freq')) baseVal[k.key] = 50;
      if(k.key.includes('ebKwh')) baseVal[k.key] = 15000;
      if(k.key.includes('ebKvah')) baseVal[k.key] = 15500;
      if(k.key.includes('dgKwh')) baseVal[k.key] = 500;
    });

    if (data && data.length > 0) {
      const lastPoint = data[data.length - 1];
      currentDataKeys.forEach(k => {
        if (lastPoint[k.key] !== undefined) baseVal[k.key] = lastPoint[k.key];
      });
    }

    const now = new Date();
    for (let i = points; i >= 0; i--) {
       const pointTime = new Date(now);
       if (timeFilter === '15m' || timeFilter === '30m' || timeFilter === '60m') pointTime.setMinutes(now.getMinutes() - i);
       if (timeFilter === '12h' || timeFilter === '24h') pointTime.setHours(now.getHours() - i);
       if (timeFilter === 'week' || timeFilter === 'month') pointTime.setDate(now.getDate() - i);
       if (timeFilter === 'year') pointTime.setMonth(now.getMonth() - i);
       
       let timeStr = '';
       if (labelFormat === 'minute' || labelFormat === 'hour') {
         timeStr = pointTime.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
       } else if (labelFormat === 'day') {
         timeStr = pointTime.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
       } else {
         timeStr = pointTime.toLocaleDateString('en-US', {month: 'short', year: 'numeric'});
       }

       const point = { time: timeStr };
       currentDataKeys.forEach(k => {
         const noise = (Math.random() - 0.5) * (baseVal[k.key] * 0.05);
         let val = baseVal[k.key] + noise;
         if (isStacked || k.key.includes('Kwh') || k.key.includes('Kvah')) val = baseVal[k.key] + Math.random() * 5;
         point[k.key] = +val.toFixed(2);
         baseVal[k.key] = val; 
       });
       generated.push(point);
    }
    setLocalData(generated);
  }, [timeFilter, isStacked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleColorChange = (index, newColor) => {
    const updated = [...colors];
    updated[index] = newColor;
    setColors(updated);
  };

  const chartData = (globalInterval && globalInterval !== 'live')
    ? (data && data.length > 0 ? data : [])
    : (timeFilter === 'live' ? (data && data.length > 0 ? data : []) : localData);

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
          
          <Tooltip content={<CustomTooltip unit={unit} />} cursor={type === 'bar' ? { fill: 'rgba(255,255,255,0.05)' } : { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }} />
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

  return (
    <>
      <Card className="mb-4 border-0 scada-card" style={{ background: 'linear-gradient(145deg, #111827 0%, #0f172a 100%)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <Row className="g-0 align-items-stretch h-100">
          <Col md={3} xl={2} className="p-4 border-end border-secondary border-opacity-25 d-flex flex-column justify-content-center" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div style={{ width: '6px', height: '18px', background: colors[0], borderRadius: '3px' }}></div>
              <h5 className="mb-0 text-white fw-bold fs-6">{title}</h5>
            </div>
            
            <div className="text-secondary fs-7 fw-medium mb-4 d-flex align-items-center gap-1">
              <Activity size={14} className="text-info" /> {unit}
            </div>

            {(!globalInterval || globalInterval === 'live') ? (
              <Form.Group className="mb-4">
                <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{letterSpacing: '0.5px'}}>FILTER RANGE</Form.Label>
                <Form.Select 
                  size="sm" 
                  className="bg-dark text-white border-secondary shadow-none fs-8"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  {TIME_FILTERS.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                </Form.Select>
              </Form.Group>
            ) : (
              <div className="mb-4">
                <div className="text-secondary fs-8 fw-bold mb-1" style={{letterSpacing: '0.5px'}}>INTERVAL</div>
                <span className="badge bg-warning text-dark px-3 py-2 fw-bold rounded-pill uppercase" style={{ letterSpacing: '0.5px' }}>
                  {globalInterval === 'MIN_15' ? '15 Min' : globalInterval === 'DAILY' ? 'Daily' : 'Yearly'}
                </span>
              </div>
            )}

            <div className="mt-auto">
              <div className="fs-8 text-secondary mb-2 uppercase tracking-widest fw-bold">Graph Colors</div>
              <div className="d-flex flex-wrap gap-2 mb-4">
                {dataKeys.map((k, i) => (
                  <div key={k.key} className="d-flex align-items-center gap-1" title={`Change color for ${k.name}`}>
                    <Form.Control
                      type="color"
                      value={colors[i]}
                      onChange={(e) => handleColorChange(i, e.target.value)}
                      className="p-0 border-0 rounded-circle cursor-pointer scada-color-picker"
                      style={{ width: '22px', height: '22px', cursor: 'pointer', background: 'transparent' }}
                    />
                    <span className="text-secondary fs-8">{k.name}</span>
                  </div>
                ))}
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
          
          <Col md={ranges ? 6 : 9} xl={ranges ? 7 : 10} className="p-4">
            {renderChart(280)}
          </Col>

          {ranges && (
            <Col md={3} xl={3} className="border-start border-secondary border-opacity-25 p-3 p-xl-4 d-flex flex-column justify-content-center" style={{ background: 'rgba(15, 23, 42, 0.2)' }}>
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom border-secondary border-opacity-25 pb-2">
                <h6 className="text-white fs-7 mb-0 fw-bold" style={{letterSpacing: '0.5px'}}>RANGE BY DEFAULT</h6>
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

      <Modal show={expanded} onHide={() => setExpanded(false)} size="xl" centered dialogClassName="modal-95w scada-expanded-modal">
        <Modal.Header className="border-secondary border-opacity-25 p-4" style={{ background: '#0b1120' }}>
          <Modal.Title className="text-white w-100 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-4">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '8px', height: '24px', background: colors[0], borderRadius: '4px' }}></div>
                <h4 className="mb-0 fw-bold">{title} <span className="text-secondary ms-2 fs-5 fw-normal">({unit})</span></h4>
              </div>
              <div className="d-flex gap-3 ms-4 border-start border-secondary border-opacity-25 ps-4 flex-wrap align-items-center">
                {(!globalInterval || globalInterval === 'live') ? (
                  <Form.Select 
                    size="sm" 
                    className="bg-dark text-info border-secondary shadow-none fs-7 me-2 fw-bold"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    style={{ width: '130px' }}
                  >
                    {TIME_FILTERS.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                  </Form.Select>
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
        <Modal.Body style={{ background: '#0b1120', minHeight: '600px', padding: '30px' }}>
          {renderChart(600)}
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

      <style dangerouslySetInnerHTML={{
        __html: `
        .modal-95w { max-width: 95% !important; }
        .scada-expanded-modal .modal-content {
          background: #0b1120;
          border: 1px solid rgba(255, 107, 0, 0.2);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .scada-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
        .scada-color-picker::-webkit-color-swatch {
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
        }
        .hover-glow:hover {
          box-shadow: 0 0 15px rgba(255, 107, 0, 0.4);
          background: rgba(255, 107, 0, 0.1);
        }
        @keyframes premiumSlideUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .graph-slide-up {
          opacity: 0;
          animation: premiumSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scada-dropdown-orange {
          background-color: #0f172a !important;
          color: #fff !important;
          border: 1px solid rgba(249, 115, 22, 0.25) !important;
          font-weight: 600;
          border-radius: 8px;
          padding: 8px 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .scada-dropdown-orange:focus, .scada-dropdown-orange:hover {
          border-color: #f97316 !important;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.25) !important;
          background-color: #1e293b !important;
        }
        `
      }} />
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

  const [globalInterval, setGlobalInterval] = useState('live');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

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
          const graphableSettings = result.data.filter(s => s.graphable === true);
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
              mergedData[timeKey] = {
                time: formattedTime,
                windowStart: snap.windowStart,
                windowEnd: snap.windowEnd
              };
            }
            mergedData[timeKey][result.key] = snap.avgValue !== null && snap.avgValue !== undefined ? Number(Number(snap.avgValue).toFixed(2)) : null;
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
  }, [selectedSiteId, selectedDeviceId, selectedSettings, globalInterval, fromDate, toDate]);

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
          
          const newPoint = {
            time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };
          
          liveFields.forEach(f => {
            newPoint[f.fieldKey] = f.numericValue !== null && f.numericValue !== undefined ? Number(Number(f.numericValue).toFixed(2)) : null;
          });

          setHistoryLog(prev => {
            const next = [...prev, newPoint];
            return next.length > 80 ? next.slice(next.length - 80) : next;
          });
        }
        setIsSwitching(false);
      } catch (err) {
        console.error('Error polling live stats:', err);
        setIsSwitching(false);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedSiteId, selectedDeviceId, globalInterval]);

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
              <Col xs={12} md={6} lg={3}>
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

            <Col xs={12} md={6} lg={sites.length > 0 ? 3 : 4}>
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

            <Col xs={12} md={6} lg={sites.length > 0 ? 2 : 3}>
              <Form.Group>
                <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>CHART INTERVAL</Form.Label>
                <Form.Select
                  size="sm"
                  className="scada-dropdown-orange bg-dark text-white shadow-none fs-8"
                  value={globalInterval}
                  onChange={(e) => setGlobalInterval(e.target.value)}
                >
                  <option value="live">Live Data (Real-time)</option>
                  <option value="MIN_15">15 Minutes</option>
                  <option value="DAILY">Daily</option>
                  <option value="YEARLY">Yearly</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {globalInterval !== 'live' && (
              <Col xs={6} md={3} lg={2}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>FROM DATE</Form.Label>
                  <Form.Control
                    type="date"
                    size="sm"
                    className="scada-dropdown-orange bg-dark text-white shadow-none fs-8"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </Form.Group>
              </Col>
            )}

            {globalInterval !== 'live' && (
              <Col xs={6} md={3} lg={2}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-8 fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>TO DATE</Form.Label>
                  <Form.Control
                    type="date"
                    size="sm"
                    className="scada-dropdown-orange bg-dark text-white shadow-none fs-8"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </Form.Group>
              </Col>
            )}

            {settings.length > 0 && (
              <Col xs={12} className="mt-3">
                <div className="p-3 rounded-3" style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div className="text-secondary fs-8 fw-bold mb-2 uppercase tracking-widest" style={{ letterSpacing: '0.5px' }}>SELECT PARAMETERS TO PLOT</div>
                  <div className="d-flex flex-wrap gap-3">
                    {settings.map(setting => {
                      const isChecked = selectedSettings.includes(setting.sochiotFieldName);
                      return (
                        <Form.Check
                          key={setting.sochiotFieldName}
                          type="checkbox"
                          id={`chk-${setting.sochiotFieldName}`}
                          label={`${setting.displayName} ${setting.unit ? `(${setting.unit})` : ''}`}
                          checked={isChecked}
                          onChange={() => {
                            setSelectedSettings(prev =>
                              isChecked
                                ? prev.filter(k => k !== setting.sochiotFieldName)
                                : [...prev, setting.sochiotFieldName]
                            );
                          }}
                          className="text-white fs-8 fw-medium cursor-pointer scada-checkbox"
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </div>
                </div>
              </Col>
            )}
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
            <Activity className="text-warning mb-3 opacity-50" size={48} />
            <h5 className="text-white fw-bold mb-2">No Parameters Selected</h5>
            <p className="text-secondary text-center max-w-md mb-0">Please select at least one telemetry parameter checkbox above to plot the graphs.</p>
          </div>
        ) : !selectedDeviceId ? (
          <div className="d-flex flex-column justify-content-center align-items-center h-100 border border-secondary border-opacity-25 rounded-4 p-5" style={{ minHeight: '400px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <Activity className="text-warning mb-3 opacity-50" size={48} />
            <h5 className="text-white fw-bold mb-2">No Mapped Devices Found</h5>
            <p className="text-secondary text-center max-w-md mb-0">Please verify that you have registered and mapped devices in the template manager.</p>
          </div>
        ) : (
          <Row className="g-4">
            {settings
              .filter(setting => selectedSettings.includes(setting.sochiotFieldName))
              .map((setting, idx) => {
                const chartType = getChartType(setting.displayName);
                const chartColor = getChartColor(idx);
                const ranges = getRangesForSetting(setting);
                
                return (
                  <Col lg={12} key={setting.sochiotFieldName} className="graph-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <ChartRow 
                      title={setting.displayName}
                      unit={setting.unit || ''}
                      data={activeData}
                      globalInterval={globalInterval}
                      dataKeys={[{ key: setting.sochiotFieldName, name: setting.displayName }]}
                      defaultColors={[chartColor]}
                      type={chartType}
                      ranges={ranges}
                    />
                  </Col>
                );
              })}
          </Row>
        )}
      </div>
    </div>
  );
};

export default EnergyGraphs;
