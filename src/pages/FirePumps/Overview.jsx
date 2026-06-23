import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, ButtonGroup, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Droplets, Clock, Activity, FileText, CheckCircle2, AlertOctagon, Settings, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

// --- CUSTOM SVG COMPONENTS ---

const PumpIcon = () => (
  <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
    {/* Motor body (Red) */}
    <rect x="40" y="35" width="45" height="40" rx="4" fill="#ef4444" />
    {/* Motor Cooling Fins */}
    <rect x="48" y="35" width="3" height="40" fill="#dc2626" />
    <rect x="56" y="35" width="3" height="40" fill="#dc2626" />
    <rect x="64" y="35" width="3" height="40" fill="#dc2626" />
    <rect x="72" y="35" width="3" height="40" fill="#dc2626" />
    <rect x="80" y="35" width="3" height="40" fill="#dc2626" />
    
    {/* Motor End cover */}
    <rect x="85" y="40" width="10" height="30" rx="2" fill="#b91c1c" />
    
    {/* Shaft connecting motor and pump */}
    <rect x="30" y="50" width="15" height="10" fill="#4b5563" />
    
    {/* Pump head (Grey/White) */}
    <circle cx="30" cy="55" r="22" fill="#e5e7eb" />
    {/* Pump head inner circle for detail */}
    <circle cx="30" cy="55" r="10" fill="#d1d5db" />
    <circle cx="30" cy="55" r="4" fill="#9ca3af" />
    
    {/* Inlet Flange (Left side) */}
    <rect x="8" y="45" width="5" height="20" fill="#d1d5db" />
    <rect x="3" y="42" width="5" height="26" fill="#9ca3af" />
    
    {/* Outlet Pipe & Flange (Top side) */}
    <rect x="22" y="25" width="16" height="12" fill="#d1d5db" />
    <rect x="18" y="20" width="24" height="5" fill="#9ca3af" />
    
    {/* --- VALVE ASSEMBLY --- */}
    {/* Valve body/housing */}
    <path d="M 22 20 L 38 20 L 36 12 L 24 12 Z" fill="#6b7280" />
    <rect x="20" y="10" width="20" height="4" fill="#4b5563" />
    
    {/* Valve stem */}
    <rect x="28" y="5" width="4" height="5" fill="#d1d5db" />
    
    {/* Valve wheel (Red) */}
    <rect x="14" y="2" width="32" height="5" rx="2.5" fill="#ef4444" />
    {/* Wheel center nut */}
    <circle cx="30" cy="4.5" r="2" fill="#fca5a5" />
    {/* Wheel grips */}
    <rect x="18" y="2" width="2" height="5" fill="#b91c1c" />
    <rect x="40" y="2" width="2" height="5" fill="#b91c1c" />
  </svg>
);

const HydrantIcon = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
    {/* Main body */}
    <path d="M35 30 L65 30 L65 90 L35 90 Z" fill="#ef4444" />
    {/* Top dome */}
    <path d="M30 30 Q50 5 70 30 Z" fill="#dc2626" />
    {/* Top nut */}
    <rect x="45" y="5" width="10" height="8" fill="#b91c1c" />
    {/* Side outlets */}
    <rect x="25" y="45" width="10" height="15" rx="2" fill="#b91c1c" />
    <rect x="65" y="45" width="10" height="15" rx="2" fill="#b91c1c" />
    {/* Base */}
    <rect x="25" y="90" width="50" height="10" fill="#991b1b" />
    {/* Chains/Details */}
    <line x1="30" y1="45" x2="35" y2="40" stroke="#fca5a5" strokeWidth="2" />
    <line x1="70" y1="45" x2="65" y2="40" stroke="#fca5a5" strokeWidth="2" />
  </svg>
);

const SprinklerIcon = () => (
  <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
    {/* Pipe Base */}
    <rect x="45" y="10" width="10" height="20" fill="#9ca3af" />
    {/* Threaded fitting */}
    <rect x="40" y="30" width="20" height="10" fill="#6b7280" />
    {/* Frame arms */}
    <path d="M40 40 Q25 60 45 80" fill="none" stroke="#d1d5db" strokeWidth="4" />
    <path d="M60 40 Q75 60 55 80" fill="none" stroke="#d1d5db" strokeWidth="4" />
    {/* Deflector plate */}
    <path d="M35 80 L65 80 L60 85 L40 85 Z" fill="#9ca3af" />
    {/* Glass bulb (Red for standard temp) */}
    <rect x="48" y="40" width="4" height="38" rx="2" fill="#ef4444" />
    {/* Water spray lines (dashed) */}
    <path d="M30 95 L10 110 M40 95 L30 115 M50 95 L50 120 M60 95 L70 115 M70 95 L90 110" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 4" />
  </svg>
);

const SemiCircleGauge = ({ value, max, color, label, ticks }) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    // Adding a tiny delay on mount makes sure it animates from 0.
    const timer = setTimeout(() => setCurrentValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = 80;
  const cx = 120;
  const cy = 110;
  const circumference = Math.PI * radius;
  const percentage = Math.min(Math.max(currentValue / max, 0), 1);
  const strokeDashoffset = circumference - (percentage * circumference);
  
  // rotation angle for needle (-90 to +90)
  const angle = (percentage * 180) - 90; 

  return (
    <div className="text-center position-relative w-100 d-flex flex-column align-items-center mt-3">
      {/* Increased viewBox and internal coordinates to mathematically prevent any clipping */}
      <svg viewBox="0 0 240 130" className="w-100" style={{ maxWidth: '320px' }}>
        <defs>
          <filter id={`glow-${color.replace('#','')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Segmented Background track */}
        <path 
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="24" 
        />
        
        {/* Value track */}
        <path 
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" 
          stroke={color} 
          strokeWidth="24" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          filter={`url(#glow-${color.replace('#','')})`}
        />
        
        {/* Needle */}
        <g transform={`translate(${cx}, ${cy}) rotate(${angle})`} style={{ transition: 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* Needle shadow */}
          <polygon points="-4,0 4,0 0,-70" fill="rgba(0,0,0,0.3)" transform="translate(3, 3)" />
          {/* Needle body */}
          <polygon points="-4,0 4,0 0,-70" fill="#f8fafc" />
          <circle cx="0" cy="0" r="10" fill="#cbd5e1" />
          <circle cx="0" cy="0" r="4" fill="#0f172a" />
        </g>
        
        {/* Ticks */}
        {ticks.map((tick, i) => {
          const tickAngle = (i / (ticks.length - 1)) * 180 - 180;
          // Place ticks outside the thick stroke
          const textX = cx + 105 * Math.cos(tickAngle * Math.PI / 180);
          const textY = cy + 105 * Math.sin(tickAngle * Math.PI / 180);
          return (
            <text 
              key={tick}
              x={textX}
              y={textY}
              fill="#94a3b8"
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {tick}
            </text>
          )
        })}
      </svg>
      <div className="mt-2">
        <motion.h3 
          className="fw-bold mb-0" 
          style={{ color: color }}
          animate={{ opacity: [0.8, 1, 0.8], scale: [0.98, 1, 0.98] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {value.toFixed(2)} <span className="fs-6 text-muted">kg/cm²</span>
        </motion.h3>
      </div>
    </div>
  )
};

// PumpCard moved OUTSIDE so it doesn't re-mount and blink on every state update
const PumpCard = ({ title, voltage, conn, power, run, index, onClickAction, onDetailClick }) => {
  const isOnline = run === 'Online';
  return (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="h-100">
    <Card 
      className="glass-card h-100 border-0 p-3 pump-card-hover position-relative" 
      onClick={() => onClickAction(index)}
      style={{ cursor: 'pointer', background: isOnline ? 'rgba(15, 23, 42, 0.7)' : 'rgba(15, 23, 42, 0.4)' }}
    >
      {/* Left accent line */}
      <div className="position-absolute top-0 bottom-0 start-0" style={{ width: '4px', background: isOnline ? '#6366f1' : '#4b5563', borderRadius: '4px 0 0 4px', margin: '16px 0' }}></div>
      
      <div className="d-flex justify-content-between align-items-center mb-3 ms-2">
        <h6 className={`fw-bold mb-0 fs-7 ${isOnline ? 'text-white' : 'text-secondary'}`}>{title}</h6>
        <span className={`${isOnline ? 'text-warning' : 'text-secondary'} fw-bold fs-8`}>Voltage: {voltage}</span>
      </div>
      
      <Row className="align-items-center flex-grow-1 ms-1">
        <Col xs={7}>
          <div className="d-flex flex-column gap-2 fs-8 fw-semibold text-muted">
            <div>Connectivity Status: <span className={conn === 'Online' ? 'text-success' : 'text-secondary'}>{conn}</span></div>
            <div>Power Status: <span className={power === 'Online' ? 'text-success' : 'text-secondary'}>{power}</span></div>
            <div>Running Status: <span className={run === 'Online' ? 'text-success' : 'text-secondary'}>{run}</span></div>
          </div>
        </Col>
        <Col xs={5} className="text-end pe-3">
          <div className={isOnline ? 'animate-pulse' : ''} style={{ filter: isOnline ? 'none' : 'grayscale(100%) opacity(0.5)' }}>
             <PumpIcon />
          </div>
        </Col>
      </Row>
      
      <div className="mt-3 pt-3 border-top border-light border-opacity-10 d-flex justify-content-between align-items-center ms-1">
        <Badge 
          bg="transparent" 
          className="border border-secondary border-opacity-50 action-hover d-flex align-items-center gap-2 py-2"
          onClick={(e) => { e.stopPropagation(); onClickAction(index); }}
        >
          <Activity size={14} className={isOnline ? 'text-success' : 'text-secondary'} />
          <span style={{ color: isOnline ? '#818cf8' : '#9ca3af' }}>Start / Stop</span>
        </Badge>
        
        <Badge 
          bg="transparent" 
          className="border border-info border-opacity-50 text-info action-hover d-flex align-items-center gap-2 py-2"
          onClick={(e) => { e.stopPropagation(); onDetailClick(index); }}
        >
          <FileText size={14} />
          <span>View Details</span>
        </Badge>
      </div>
    </Card>
  </motion.div>
  );
};

const generateMockHistory = (baseValue) => {
  const data = [];
  let current = baseValue;
  for(let i=10; i>=0; i--) {
    data.push({
      time: `${i}m ago`,
      value: +(current + (Math.random() - 0.5) * 1.5).toFixed(2)
    });
  }
  return data;
};

const FireOverview = () => {
  const [data, setData] = useState({
    hydrantPressure: 8.58,
    sprinklerPressure: 9.35,
  });

  const [pumps, setPumps] = useState([
    { title: "Sprinkler Jockey Pump", voltage: "242.62 V", conn: "Online", power: "Online", run: "Online" },
    { title: "Hydrant Jockey Pump", voltage: "242.67 V", conn: "Offline", power: "Offline", run: "Offline" },
    { title: "Master Pump 1", voltage: "242.58 V", conn: "Online", power: "Online", run: "Online" },
    { title: "Master Pump 2", voltage: "242.79 V", conn: "Offline", power: "Offline", run: "Offline" },
  ]);

  const [activeTab, setActiveTab] = useState('Today');
  
  // Modal & Alert State
  const [showModal, setShowModal] = useState(false);
  const [selectedPumpIndex, setSelectedPumpIndex] = useState(null);
  const [alert, setAlert] = useState(null);
  
  // Detail Modal State
  const [detailModal, setDetailModal] = useState({ show: false, type: null, currentVal: 0 });
  
  // Pump Details Modal State
  const [pumpDetailModal, setPumpDetailModal] = useState({ show: false, pump: null });

  // Leakage Modal State
  const [leakageModal, setLeakageModal] = useState(false);
  const [leakageFilterDate, setLeakageFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived statuses for gauges
  const isSprinklerOnline = pumps[0].run === 'Online';
  const isHydrantOnline = pumps[1].run === 'Online' || pumps[2].run === 'Online' || pumps[3].run === 'Online';

  // Simulate live data with highly visible fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        // Make the pressure fluctuate by +/- 1.5 to 2 points so the needle vividly moves
        hydrantPressure: +(8.5 + (Math.random() - 0.5) * 3).toFixed(2),
        sprinklerPressure: +(9.3 + (Math.random() - 0.5) * 3.5).toFixed(2)
      }));
    }, 1500); // Faster update rate for dramatic needle movement
    return () => clearInterval(interval);
  }, []);

  const handlePumpClick = (index) => {
    setSelectedPumpIndex(index);
    setShowModal(true);
  };

  const handlePumpDetailClick = (index) => {
    setPumpDetailModal({ show: true, pump: pumps[index] });
  };

  const handleStartStop = (action) => {
    if (selectedPumpIndex !== null) {
      const pumpName = pumps[selectedPumpIndex].title;
      setPumps(prev => {
        const newPumps = [...prev];
        const newStatus = action === 'START' ? 'Online' : 'Offline';
        newPumps[selectedPumpIndex].run = newStatus;
        newPumps[selectedPumpIndex].conn = newStatus;
        newPumps[selectedPumpIndex].power = newStatus;
        return newPumps;
      });
      
      // Show Notification
      setAlert({
        type: action === 'START' ? 'success' : 'danger',
        message: `Successfully ${action === 'START' ? 'started' : 'stopped'} ${pumpName}`
      });
      setTimeout(() => setAlert(null), 3000);
    }
    setShowModal(false);
  };

  return (
    <Container fluid className="py-4 px-lg-4 position-relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 9999,
              background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
              backdropFilter: 'blur(10px)',
              padding: '16px 24px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {alert.type === 'success' ? <CheckCircle2 size={24} /> : <AlertOctagon size={24} />}
            {alert.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass-card border-0 mb-4 py-3 px-4 d-flex flex-row justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center">
            <div style={{ width: '4px', height: '20px', background: '#6366f1', borderRadius: '2px', marginRight: '12px' }}></div>
            <span className="text-white fw-semibold fs-7">
              Last Updated Time : <span className="text-indigo ms-1" style={{ color: '#818cf8' }}>{new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')}</span>
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
             <Badge bg="success" className="bg-opacity-25 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
               <ShieldCheck size={16} /> System Healthy
             </Badge>
             <Badge bg="info" className="bg-opacity-25 text-info border border-info border-opacity-25 px-3 py-2 rounded-pill d-flex align-items-center gap-2">
               <Settings size={16} /> Auto Mode Active
             </Badge>
          </div>
        </Card>
      </motion.div>

      {/* Pumps Row */}
      <Row className="g-3 mb-4">
        {pumps.map((pump, idx) => (
          <Col xl={3} lg={6} md={6} key={idx}>
            <PumpCard 
              {...pump} 
              index={idx} 
              onClickAction={handlePumpClick} 
              onDetailClick={handlePumpDetailClick}
            />
          </Col>
        ))}
      </Row>

      {/* Bottom Section */}
      <Row className="g-4">
        {/* Hydrant Pressure */}
        <Col lg={4}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="h-100">
            <Card className="glass-card border-0 p-4 h-100 d-flex flex-column">
              <div className="d-flex align-items-center mb-4">
                <div style={{ width: '4px', height: '16px', background: '#6366f1', borderRadius: '2px', marginRight: '10px' }}></div>
                <h6 className="fw-bold text-white mb-0 fs-7">Hydrant Pressure</h6>
              </div>
              <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                <SemiCircleGauge 
                  value={isHydrantOnline ? data.hydrantPressure : 0} 
                  max={10} 
                  color={isHydrantOnline ? "#ef4444" : "#6b7280"} 
                  ticks={['0', '2', '4', '6', '8', '10']}
                />
              </div>
              <div 
                className="mt-4 pt-3 border-top border-light border-opacity-10 d-flex justify-content-between align-items-center action-hover"
                onClick={() => setDetailModal({ show: true, type: 'Hydrant', currentVal: data.hydrantPressure })}
              >
                <span className="text-indigo fw-bold fs-8" style={{ color: '#818cf8' }}>View Detailed Graph</span>
                <FileText size={18} className="text-info" />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* Sprinkler Pressure */}
        <Col lg={4}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="h-100">
            <Card className="glass-card border-0 p-4 h-100 d-flex flex-column">
              <div className="d-flex align-items-center mb-4">
                <div style={{ width: '4px', height: '16px', background: '#6366f1', borderRadius: '2px', marginRight: '10px' }}></div>
                <h6 className="fw-bold text-white mb-0 fs-7">Sprinkler Pressure</h6>
              </div>
              <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                <SemiCircleGauge 
                  value={isSprinklerOnline ? data.sprinklerPressure : 0} 
                  max={12} 
                  color={isSprinklerOnline ? "#0ea5e9" : "#6b7280"} 
                  ticks={['0', '2', '4', '6', '8', '10', '12']}
                />
              </div>
              <div 
                className="mt-4 pt-3 border-top border-light border-opacity-10 d-flex justify-content-between align-items-center action-hover"
                onClick={() => setDetailModal({ show: true, type: 'Sprinkler', currentVal: data.sprinklerPressure })}
              >
                <span className="text-indigo fw-bold fs-8" style={{ color: '#818cf8' }}>View Detailed Graph</span>
                <FileText size={18} className="text-info" />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* Leakage Report */}
        <Col lg={4}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="h-100">
            <Card className="glass-card border-0 p-4 h-100">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center">
                  <div style={{ width: '4px', height: '16px', background: '#6366f1', borderRadius: '2px', marginRight: '10px' }}></div>
                  <h6 className="fw-bold text-white mb-0 fs-7 text-truncate">Today Water Leakage Report</h6>
                </div>
              </div>
              
              <div className="d-flex justify-content-between align-items-center mb-4">
                <ButtonGroup className="glass-tabs">
                  {['Today', 'This Month', 'Total'].map(tab => (
                    <Button 
                      key={tab}
                      variant={activeTab === tab ? 'primary' : 'outline-secondary'}
                      className={`border-0 fs-8 fw-semibold px-3 py-1 ${activeTab === tab ? 'bg-indigo' : 'text-muted bg-transparent'}`}
                      style={{ backgroundColor: activeTab === tab ? '#6366f1' : 'transparent', borderRadius: '4px', transition: '0.3s' }}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </Button>
                  ))}
                </ButtonGroup>

                <input 
                  type="date" 
                  value={leakageFilterDate}
                  onChange={(e) => setLeakageFilterDate(e.target.value)}
                  className="form-control bg-dark text-light border-secondary border-opacity-50 fs-8 px-2 py-1"
                  style={{ width: '130px', borderRadius: '6px' }}
                />
              </div>

              <div className="d-flex flex-column gap-3">
                <Card className="bg-dark bg-opacity-25 border border-light border-opacity-10 p-3 rounded-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center justify-content-center p-2 rounded bg-danger bg-opacity-10">
                      <HydrantIcon />
                    </div>
                    <div className="text-end">
                      <h4 className="fw-bold text-indigo mb-0" style={{ color: '#818cf8' }}>0.0 kLtr</h4>
                      <span className="text-muted fs-8 fw-semibold text-uppercase tracking-widest">Hydrant Leakage</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="bg-dark bg-opacity-25 border border-light border-opacity-10 p-3 rounded-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center justify-content-center p-2 rounded bg-info bg-opacity-10">
                      <SprinklerIcon />
                    </div>
                    <div className="text-end">
                      <h4 className="fw-bold text-indigo mb-0" style={{ color: '#818cf8' }}>0.0 kLtr</h4>
                      <span className="text-muted fs-8 fw-semibold text-uppercase tracking-widest">Sprinkler Leakage</span>
                    </div>
                  </div>
                </Card>
              </div>

              <div 
                className="mt-4 pt-3 border-top border-light border-opacity-10 d-flex justify-content-between align-items-center action-hover"
                onClick={() => setLeakageModal(true)}
                style={{ cursor: 'pointer' }}
              >
                <span className="text-indigo fw-bold fs-8" style={{ color: '#818cf8' }}>View Leakage Details</span>
                <FileText size={18} className="text-info" />
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Start/Stop Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="scada-modal glass-modal">
        <Modal.Header closeButton className="border-secondary border-opacity-25">
          <Modal.Title className="text-white fw-bold d-flex align-items-center gap-2">
            <Activity size={24} className="text-info" />
            Pump Control Command
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-5">
          <h4 className="text-white mb-2">{selectedPumpIndex !== null ? pumps[selectedPumpIndex].title : ''}</h4>
          <p className="text-muted mb-5">Select an operation to perform on this pump</p>
          
          <div className="d-flex justify-content-center gap-4">
            <Button 
              variant="success" 
              className="px-5 py-3 fw-bold rounded-pill shadow-lg d-flex align-items-center gap-2 pump-action-btn start-btn" 
              onClick={() => handleStartStop('START')}
            >
               <div className="pulse-dot bg-white"></div> START PUMP
            </Button>
            <Button 
              variant="danger" 
              className="px-5 py-3 fw-bold rounded-pill shadow-lg d-flex align-items-center gap-2 pump-action-btn stop-btn" 
              onClick={() => handleStartStop('STOP')}
            >
               <div className="pulse-dot bg-white"></div> STOP PUMP
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Pump Details Modal */}
      <Modal show={pumpDetailModal.show} onHide={() => setPumpDetailModal({ show: false, pump: null })} centered className="glass-modal">
        <Modal.Header closeButton className="border-secondary border-opacity-25">
          <Modal.Title className="text-white fw-bold d-flex align-items-center gap-2">
            <Settings size={24} className="text-info" />
            {pumpDetailModal.pump?.title} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Row className="g-3">
            <Col xs={6}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-8 mb-1">Operating Voltage</div>
                <h4 className="fw-bold mb-0 text-warning">{pumpDetailModal.pump?.voltage}</h4>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-8 mb-1">Load Current</div>
                <h4 className="fw-bold mb-0 text-white">
                  {(Math.random() * 5 + 10).toFixed(1)} <span className="fs-6 text-muted">A</span>
                </h4>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-8 mb-1">Total Run Hours</div>
                <h4 className="fw-bold mb-0 text-info">1,245 <span className="fs-6 text-muted">Hrs</span></h4>
              </Card>
            </Col>
            <Col xs={6}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-8 mb-1">Next Maintenance</div>
                <h4 className="fw-bold mb-0 text-success">45 <span className="fs-6 text-muted">Days</span></h4>
              </Card>
            </Col>
            <Col xs={12}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-2">
                   <span className="text-muted fs-8">Motor Temperature</span>
                   <span className="text-danger fw-bold">42°C</span>
                </div>
                <div className="progress" style={{ height: '6px', background: 'rgba(255,255,255,0.1)' }}>
                   <div className="progress-bar bg-danger" role="progressbar" style={{ width: '60%' }}></div>
                </div>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* Leakage Details Modal */}
      <Modal show={leakageModal} onHide={() => setLeakageModal(false)} centered size="lg" className="glass-modal">
        <Modal.Header closeButton className="border-secondary border-opacity-25">
          <Modal.Title className="text-white fw-bold d-flex align-items-center gap-2">
            <Activity size={24} className="text-info" />
            Detailed Leakage Report
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-light">
          <Row className="g-4 mb-4">
            <Col md={6}>
               <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100">
                  <h6 className="text-muted fs-7 mb-3">Hydrant Flow Rate</h6>
                  <div className="flex-grow-1" style={{ minHeight: '150px' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={generateMockHistory(2.5)}>
                           <defs>
                              <linearGradient id="colorHydrantLeak" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                           <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} />
                           <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorHydrantLeak)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </Card>
            </Col>
            <Col md={6}>
               <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100">
                  <h6 className="text-muted fs-7 mb-3">Sprinkler Flow Rate</h6>
                  <div className="flex-grow-1" style={{ minHeight: '150px' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={generateMockHistory(1.8)}>
                           <defs>
                              <linearGradient id="colorSprinklerLeak" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                           <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} />
                           <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSprinklerLeak)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </Card>
            </Col>
          </Row>
          <div className="bg-dark bg-opacity-50 p-3 rounded text-center">
             <p className="mb-0 text-muted">Showing advanced analytics for: <span className="text-white fw-bold">{leakageFilterDate}</span></p>
          </div>
        </Modal.Body>
      </Modal>

      {/* Detail View Modal */}
      <Modal show={detailModal.show} onHide={() => setDetailModal({ ...detailModal, show: false })} centered size="lg" className="glass-modal">
        <Modal.Header closeButton className="border-secondary border-opacity-25">
          <Modal.Title className="text-white fw-bold d-flex align-items-center gap-2">
            <Activity size={24} className={detailModal.type === 'Hydrant' ? 'text-danger' : 'text-info'} />
            {detailModal.type} Pressure History
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Row className="mb-4">
            <Col md={4}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-7 mb-1">Current Pressure</div>
                <h3 className={`fw-bold mb-0 ${detailModal.type === 'Hydrant' ? 'text-danger' : 'text-info'}`}>
                  {detailModal.currentVal.toFixed(2)} <span className="fs-6 text-muted">kg/cm²</span>
                </h3>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-7 mb-1">Average (Last 24h)</div>
                <h3 className="fw-bold mb-0 text-white">
                  {(detailModal.currentVal * 0.95).toFixed(2)} <span className="fs-6 text-muted">kg/cm²</span>
                </h3>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="bg-dark bg-opacity-50 border-0 p-3 rounded-4 h-100 text-center">
                <div className="text-muted fs-7 mb-1">Status</div>
                <h3 className="fw-bold mb-0 text-success d-flex align-items-center justify-content-center gap-2">
                  <CheckCircle2 size={24} /> Normal
                </h3>
              </Card>
            </Col>
          </Row>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={generateMockHistory(detailModal.currentVal)}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={detailModal.type === 'Hydrant' ? '#ef4444' : '#0ea5e9'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={detailModal.type === 'Hydrant' ? '#ef4444' : '#0ea5e9'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke={detailModal.type === 'Hydrant' ? '#ef4444' : '#0ea5e9'} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Modal.Body>
      </Modal>

      <style dangerouslySetInnerHTML={{__html: `
        .action-hover {
          cursor: pointer;
          transition: 0.3s;
          padding: 8px 12px;
          margin: 0 -12px;
          border-radius: 8px;
        }
        .action-hover:hover {
          background: rgba(255,255,255,0.05);
        }
        
        .glass-card {
          background: rgba(15, 23, 42, 0.7) !important;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .pump-card-hover:hover {
          background: rgba(30, 41, 59, 0.8) !important;
          border-color: rgba(99, 102, 241, 0.4) !important;
          box-shadow: 0 10px 40px rgba(99, 102, 241, 0.15);
        }
        .glass-tabs {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          padding: 4px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .text-indigo { color: #818cf8 !important; }
        .bg-indigo { background-color: #6366f1 !important; color: white !important; }
        .tracking-widest { letter-spacing: 1px; }
        .fs-7 { font-size: 0.9rem; }
        .fs-8 { font-size: 0.75rem; }
        
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

        /* Modal Styling */
        .glass-modal .modal-content {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .glass-modal .btn-close { filter: invert(1) grayscale(100%) brightness(200%); }
        .pump-action-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: none; }
        .pump-action-btn:hover { transform: translateY(-3px) scale(1.02); }
        .start-btn { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3) !important; }
        .stop-btn { background: linear-gradient(135deg, #ef4444, #dc2626); box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3) !important; }
        
        .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%;
          animation: dot-pulse 1.5s infinite;
        }
        @keyframes dot-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }

        /* Modern scrollbar if needed */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </Container>
  );
};

export default FireOverview;
