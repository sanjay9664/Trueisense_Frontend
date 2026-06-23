import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Row, Col, Button, Modal, Form } from 'react-bootstrap';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Maximize2, X, Zap, Activity, Settings2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useDeviceStatus } from '../../services/DeviceStatusContext';

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

const ChartRow = ({ title, unit, data, dataKeys, defaultColors, type = 'line', isStacked = false, ranges = null, onUpdateRanges = null }) => {
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

  const chartData = timeFilter === 'live' ? (data && data.length > 0 ? data : []) : localData;

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
                <Form.Select 
                  size="sm" 
                  className="bg-dark text-info border-secondary shadow-none fs-7 me-2 fw-bold"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  style={{ width: '130px' }}
                >
                  {TIME_FILTERS.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                </Form.Select>
                
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
          border: 1px solid rgba(56, 189, 248, 0.2);
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
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
          background: rgba(56, 189, 248, 0.1);
        }
        @keyframes premiumSlideUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .graph-slide-up {
          opacity: 0;
          animation: premiumSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        `
      }} />
    </>
  );
};

const EnergyGraphs = () => {
  const { getOverallStatus } = useDeviceStatus();

  const [templates, setTemplates] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(() => {
    return localStorage.getItem('selected_main_meter_id') || '';
  });
  const [isSwitching, setIsSwitching] = useState(false);
  const generateEmptyHistory = () => [];
  const [historyLog, setHistoryLog] = useState([]);
  
  const [globalRanges, setGlobalRanges] = useState(() => {
    const saved = localStorage.getItem('scada_custom_ranges');
    if (saved) return JSON.parse(saved);
    return {
      voltage: VOLTAGE_RANGES,
      current: CURRENT_RANGES,
      demand: DEMAND_RANGES,
      frequency: FREQUENCY_RANGES
    };
  });

  const handleUpdateRange = (key, newRanges) => {
    const updated = { ...globalRanges, [key]: newRanges };
    setGlobalRanges(updated);
    localStorage.setItem('scada_custom_ranges', JSON.stringify(updated));
  };
  
  const mainMeterTemplateRef = useRef(null);
  const latestRealDataRef = useRef({}); // Store the real live data so it merges properly

  useEffect(() => {
    const saved = localStorage.getItem('scada_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTemplates(parsed);
        const meters = parsed.filter(t => t.module === 'Main Meter' || t.category === 'Energy Metering');
        if (meters.length > 0) {
          const stored = localStorage.getItem('selected_main_meter_id');
          if (stored && meters.some(m => String(m.id) === String(stored))) {
            setSelectedMeterId(stored);
          } else {
            setSelectedMeterId(meters[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to parse templates from local storage:', e);
      }
    }

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

        const meters = mapped.filter(t => t.module === 'Main Meter' || t.category === 'Energy Metering');
        if (meters.length > 0) {
          const stored = localStorage.getItem('selected_main_meter_id');
          if (stored && meters.some(m => String(m.id) === String(stored))) {
            setSelectedMeterId(stored);
          } else if (!selectedMeterId) {
            setSelectedMeterId(meters[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching templates in EnergyGraphs:', err));
  }, []);

  useEffect(() => {
    if (selectedMeterId) {
      localStorage.setItem('selected_main_meter_id', String(selectedMeterId));
    }
  }, [selectedMeterId]);

  const energyMeters = useMemo(() => {
    return templates.filter(t => t.module === 'Main Meter' || t.category === 'Energy Metering');
  }, [templates]);

  const mainMeterTemplate = useMemo(() => {
    const tpl = selectedMeterId
      ? templates.find(t => String(t.id) === String(selectedMeterId))
      : (energyMeters[0] || null);
    mainMeterTemplateRef.current = tpl;
    return tpl;
  }, [templates, selectedMeterId, energyMeters]);

  useEffect(() => {
    setIsSwitching(true);
    setHistoryLog([]); // Clear old history to prevent ghost lines

    const interval = setInterval(() => {
        setHistoryLog(prev => {
            const real = latestRealDataRef.current;
            if (!real) return prev;
            
            const hasValidData = Object.values(real).some(v => v !== null && v !== undefined && !isNaN(v));
            if (prev.length === 0 && !hasValidData) return prev; // Wait for initial valid data before ticking

            const newPoint = {
              time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              ...real
            };

            const next = [...prev, newPoint];
            return next.length > 80 ? next.slice(next.length - 80) : next;
        });
    }, 5000); 

    return () => clearInterval(interval);
  }, [selectedMeterId]);

  useEffect(() => {
    const backendUrl = window.process?.env?.REACT_APP_BACKEND_URL || '';
    const socket = io(backendUrl, { path: '/socket.io', transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('EnergyGraphs WebSocket Connected - Listening for Telemetry');
    });

    const updateRealData = (stats) => {
      if (!Array.isArray(stats)) return;
      const currentTemplate = mainMeterTemplateRef.current;
      if (!currentTemplate || !currentTemplate.mapping) return;

      const mapping = currentTemplate.mapping;

      const getValueForField = (config, fieldKey) => {
        if (config && config.enabled !== false && config[fieldKey]) {
          const fieldVal = config[fieldKey];
          let cleanKey = fieldVal;
          let targetModuleId = config.module;

          if (typeof fieldVal === 'string' && fieldVal.includes(':')) {
            const parts = fieldVal.split(':');
            targetModuleId = parts[0];
            cleanKey = parts.pop();
          }

          const stat = stats.find(s => String(s.moduleId) === String(targetModuleId) || String(s.meta?.module_id) === String(targetModuleId));
          if (stat && stat.meta) {
            if (stat.meta[cleanKey] !== undefined) return Number(stat.meta[cleanKey]);
            if (stat.meta[fieldVal] !== undefined) return Number(stat.meta[fieldVal]);
            const synonyms = PARAMETER_SYNONYMS[fieldKey] || [];
            for (const sym of synonyms) {
              if (stat.meta[sym] !== undefined) return Number(stat.meta[sym]);
              const matchedKey = Object.keys(stat.meta).find(k =>
                k.toUpperCase() === sym.toUpperCase() ||
                k.toUpperCase().replace(/[^A-Z0-9]/g, '') === sym.toUpperCase().replace(/[^A-Z0-9]/g, '')
              );
              if (matchedKey && stat.meta[matchedKey] !== undefined) return Number(stat.meta[matchedKey]);
            }
          }
        }
        return null;
      };

      let vRN = getValueForField(mapping.emChangeConfig, 'vR') ?? getValueForField(mapping.emVoltageConfig, 'vR');
      let vYN = getValueForField(mapping.emChangeConfig, 'vY') ?? getValueForField(mapping.emVoltageConfig, 'vY');
      let vBN = getValueForField(mapping.emChangeConfig, 'vB') ?? getValueForField(mapping.emVoltageConfig, 'vB');
      let vRY = getValueForField(mapping.emChangeConfig, 'vRY') ?? getValueForField(mapping.emVoltageConfig, 'vRY');
      let vYB = getValueForField(mapping.emChangeConfig, 'vYB') ?? getValueForField(mapping.emVoltageConfig, 'vYB');
      let vBR = getValueForField(mapping.emChangeConfig, 'vBR') ?? getValueForField(mapping.emVoltageConfig, 'vBR');

      if (vRN && !vRY) vRY = +(vRN * 1.732).toFixed(2);
      if (vYN && !vYB) vYB = +(vYN * 1.732).toFixed(2);
      if (vBN && !vBR) vBR = +(vBN * 1.732).toFixed(2);

      // Save to ref so the unified ticking interval picks it up
      latestRealDataRef.current = {
        vRN, vYN, vBN, vRY, vYB, vBR,
        iR: getValueForField(mapping.emChangeConfig, 'iR') ?? getValueForField(mapping.emCurrentConfig, 'iR'),
        iY: getValueForField(mapping.emChangeConfig, 'iY') ?? getValueForField(mapping.emCurrentConfig, 'iY'),
        iB: getValueForField(mapping.emChangeConfig, 'iB') ?? getValueForField(mapping.emCurrentConfig, 'iB'),
        totalKw: getValueForField(mapping.emChangeConfig, 'totalKw') ?? getValueForField(mapping.emPowerConfig, 'activePower'),
        freq: getValueForField(mapping.emChangeConfig, 'freq') ?? getValueForField(mapping.emSystemConfig, 'freq'),
        pf: getValueForField(mapping.emChangeConfig, 'pf') ?? getValueForField(mapping.emSystemConfig, 'pf'),
        ebKwh: getValueForField(mapping.emChangeConfig, 'ebKwh') ?? getValueForField(mapping.emReadConfig, 'ebKwh') ?? getValueForField(mapping.emConsumptionConfig, 'cumulativekWh'),
        dgKwh: getValueForField(mapping.emChangeConfig, 'dgKwh'),
        ebKvah: getValueForField(mapping.emChangeConfig, 'ebKvah') ?? getValueForField(mapping.emReadConfig, 'ebKvah'),
        totalKva: getValueForField(mapping.emChangeConfig, 'totalKva') ?? getValueForField(mapping.emPowerConfig, 'apparentPower'),
        reactivePower: getValueForField(mapping.emChangeConfig, 'reactivePower') ?? getValueForField(mapping.emPowerConfig, 'reactivePower')
      };
      
      // Instantly fill history if it's empty or entirely null so line appears instantly across full width
      setHistoryLog(prev => {
        const hasValidIncomingData = Object.values(latestRealDataRef.current).some(v => v !== null && v !== undefined && !isNaN(v));
        
        if (!hasValidIncomingData) return prev; // Do not fill with nulls! Wait for valid data.

        const hasAnyValidHistoricalData = prev.some(point => 
          Object.keys(point).some(k => k !== 'time' && point[k] !== null && point[k] !== undefined && !isNaN(point[k]))
        );

        if (prev.length === 0 || !hasAnyValidHistoricalData) {
          const instant = [];
          const now = new Date();
          for (let i = 79; i >= 0; i--) {
            instant.push({
              time: new Date(now.getTime() - i * 5000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              ...latestRealDataRef.current
            });
          }
          return instant;
        }
        return prev;
      });
    };

    socket.on('telemetry_update', updateRealData);

    const fetchStats = async () => {
      try {
        const modulesToPoll = new Set();
        const extractModuleId = (config, keys) => {
          if (!config) return null;
          if (config.module && config.module !== 'ALL') return config.module;
          for (const k of keys) {
            if (config[k] && typeof config[k] === 'string' && config[k].includes(':')) {
              const parts = config[k].split(':');
              if (parts[0]) return parts[0];
            }
          }
          return config.module || null;
        };

        if (mainMeterTemplateRef.current?.mapping) {
          const mapping = mainMeterTemplateRef.current.mapping;
          const configFieldsMap = [
            { config: mapping.emVoltageConfig, fields: ['vR', 'vY', 'vB'] },
            { config: mapping.emCurrentConfig, fields: ['iR', 'iY', 'iB'] },
            { config: mapping.emPowerConfig, fields: ['activePower', 'reactivePower', 'apparentPower'] },
            { config: mapping.emSystemConfig, fields: ['pf', 'freq'] },
            { config: mapping.emConsumptionConfig, fields: ['cumulativekWh'] },
            { config: mapping.emChangeConfig, fields: ['ebKvah', 'ebKwh', 'balance', 'totalKw', 'vR', 'vY', 'vB', 'iR', 'iY', 'iB', 'pf', 'totalKva', 'dgKwh', 'reactivePower', 'apparentPower', 'freq'] }
          ];

          configFieldsMap.forEach(({ config, fields }) => {
            if (config && config.enabled !== false) {
              const modId = extractModuleId(config, fields);
              if (modId) modulesToPoll.add(String(modId));
            }
          });
        }

        const pollList = Array.from(modulesToPoll);
        if (pollList.length === 0) {
          setIsSwitching(false);
          return;
        }

        const url = `/api/templates/stats?modules=${pollList.join(',')}`;
        const res = await fetch(url);
        if (res.ok) {
          const stats = await res.json();
          updateRealData(stats);
        }
        setIsSwitching(false);
      } catch (err) {
        console.error('Error fetching main meter stats:', err);
        setIsSwitching(false);
      }
    };

    fetchStats(); // Instantly fetch data on load without waiting 5 seconds
    const pollingInterval = setInterval(fetchStats, 5000);

    return () => {
      socket.disconnect();
      clearInterval(pollingInterval);
    };
  }, [mainMeterTemplate]);

  const checkFields = (configName, fields) => {
    if (!mainMeterTemplateRef.current?.mapping) return false;
    const config = mainMeterTemplateRef.current.mapping[configName];
    if (!config || config.enabled === false) return false;
    return fields.some(field => config[field] && String(config[field]).trim() !== '');
  };

  const chartVisibility = {
    voltage: checkFields('emVoltageConfig', ['vR', 'vY', 'vB', 'vRY', 'vYB', 'vBR', 'vRN', 'vYN', 'vBN']) || checkFields('emChangeConfig', ['vR', 'vY', 'vB', 'vRY', 'vYB', 'vBR']),
    current: checkFields('emCurrentConfig', ['iR', 'iY', 'iB']) || checkFields('emChangeConfig', ['iR', 'iY', 'iB']),
    power: checkFields('emPowerConfig', ['activePower', 'reactivePower', 'apparentPower', 'totalKw', 'totalKva']) || checkFields('emChangeConfig', ['totalKw', 'totalKva', 'reactivePower', 'apparentPower']),
    system: checkFields('emSystemConfig', ['freq', 'pf']) || checkFields('emChangeConfig', ['freq', 'pf']),
    consumption: checkFields('emConsumptionConfig', ['cumulativekWh', 'ebKwh', 'dgKwh']) || checkFields('emReadConfig', ['ebKwh']) || checkFields('emChangeConfig', ['ebKwh', 'dgKwh']),
    apparentConsumption: checkFields('emConsumptionConfig', ['ebKvah']) || checkFields('emReadConfig', ['ebKvah']) || checkFields('emChangeConfig', ['ebKvah'])
  };

  return (
    <div className="fade-in px-2 px-md-4 py-3">
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 p-4 rounded-4" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.7))', border: '1px solid rgba(56, 189, 248, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div>
          <h2 className="mb-1 text-white fw-bold d-flex align-items-center gap-3 flex-wrap">
            <div className="p-2 rounded-3" style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56,189,248,0.3)' }}>
              <Zap className="text-info text-shrink-0" size={28} />
            </div>
            Energy Advanced Analytics
          </h2>
          <p className="text-secondary fs-7 mb-0 mt-2">Continuous live streaming graphs tracking all parameters flawlessly.</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3">
          {energyMeters.length > 0 && (
            <Form.Select
              size="lg"
              className="bg-dark text-white border-secondary shadow-none fw-bold"
              value={selectedMeterId}
              onChange={(e) => setSelectedMeterId(e.target.value)}
              style={{ width: 'auto', minWidth: '250px', fontSize: '0.95rem' }}
            >
              {energyMeters.map(meter => (
                <option key={meter.id} value={meter.id}>
                  {meter.name || meter.mapping?.energyMeteringTarget || 'Unnamed Meter'}
                </option>
              ))}
            </Form.Select>
          )}
        </div>
      </div>

      <div className="energy-graphs-container mb-4" style={{ minHeight: '60vh' }}>
        {isSwitching ? (
          <div className="d-flex flex-column justify-content-center align-items-center h-100" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-info mb-3" role="status" style={{ width: '3rem', height: '3rem', filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.8))' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="text-info fw-black uppercase tracking-widest" style={{ letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>
              Fetching Meter Data...
            </h5>
            <small className="text-secondary opacity-50 uppercase tracking-widest">Please wait a moment</small>
          </div>
        ) : (
          <Row className="g-4">
            {chartVisibility.voltage && (
              <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.1s' }}>
                <ChartRow 
                  title="Supply Voltage" 
                  unit="Volts (V)" 
                  data={historyLog} 
                  dataKeys={[
                    {key: 'vRN', name: 'VR-N'}, 
                    {key: 'vYN', name: 'VY-N'}, 
                    {key: 'vBN', name: 'VB-N'}
                  ]} 
                  defaultColors={['#ef4444', '#facc15', '#3b82f6']} 
                  type="line"
                  ranges={globalRanges.voltage}
                  onUpdateRanges={(r) => handleUpdateRange('voltage', r)}
                />
              </Col>
            )}
            
            {chartVisibility.current && (
              <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.2s' }}>
                <ChartRow 
                  title="Current" 
                  unit="Amperes (A)" 
                  data={historyLog} 
                  dataKeys={[
                    {key: 'iR', name: 'I1'}, 
                    {key: 'iY', name: 'I2'}, 
                    {key: 'iB', name: 'I3'}
                  ]} 
                  defaultColors={['#ef4444', '#facc15', '#3b82f6']} 
                  type="line"
                  ranges={globalRanges.current}
                  onUpdateRanges={(r) => handleUpdateRange('current', r)}
                />
              </Col>
            )}

            {chartVisibility.power && (
              <>
                <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.3s' }}>
                  <ChartRow 
                    title="Apparent Power" 
                    unit="kVA" 
                    data={historyLog} 
                    dataKeys={[{key: 'totalKva', name: 'kVA'}]} 
                    defaultColors={['#0ea5e9']} 
                    type="bar"
                    ranges={globalRanges.demand}
                    onUpdateRanges={(r) => handleUpdateRange('demand', r)}
                  />
                </Col>

                <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.4s' }}>
                  <ChartRow 
                    title="Reactive Power" 
                    unit="kVAR" 
                    data={historyLog} 
                    dataKeys={[{key: 'reactivePower', name: 'kVAR'}]} 
                    defaultColors={['#64748b']} 
                    type="area"
                  />
                </Col>
              </>
            )}

            {chartVisibility.system && (
              <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.5s' }}>
                <ChartRow 
                  title="Frequency" 
                  unit="Hz" 
                  data={historyLog} 
                  dataKeys={[{key: 'freq', name: 'Freq'}]} 
                  defaultColors={['#8b5cf6']} 
                  type="bar"
                  ranges={globalRanges.frequency}
                  onUpdateRanges={(r) => handleUpdateRange('frequency', r)}
                />
              </Col>
            )}

            {chartVisibility.consumption && (
              <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.6s' }}>
                <ChartRow 
                  title="Power Consumption (Active)" 
                  unit="kWH" 
                  data={historyLog} 
                  dataKeys={[
                    {key: 'ebKwh', name: 'EB kWH'}, 
                    {key: 'dgKwh', name: 'DG kWH'}
                  ]} 
                  defaultColors={['#38bdf8', '#f59e0b']} 
                  type="bar"
                  isStacked={true}
                  ranges={globalRanges.demand}
                  onUpdateRanges={(r) => handleUpdateRange('demand', r)}
                />
              </Col>
            )}

            {chartVisibility.apparentConsumption && (
              <Col lg={12} className="graph-slide-up" style={{ animationDelay: '0.7s' }}>
                <ChartRow 
                  title="Power Consumption (Apparent)" 
                  unit="kVAH" 
                  data={historyLog} 
                  dataKeys={[
                    {key: 'ebKvah', name: 'EB kVAH'}
                  ]} 
                  defaultColors={['#10b981']} 
                  type="bar"
                  ranges={globalRanges.demand}
                  onUpdateRanges={(r) => handleUpdateRange('demand', r)}
                />
              </Col>
            )}

          </Row>
        )}
      </div>
    </div>
  );
};

export default EnergyGraphs;
