import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, ButtonGroup, Container } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Sun, Battery, Zap, RefreshCw, Download, CloudRain, Wind, Droplets, Calendar as CalendarIcon, Cpu, Activity, Clock, History } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar } from 'recharts';

// --- MOCK DATA GENERATORS ---

const generatePowerMetrics = () => {
  const data = [];
  let soc = 100;
  for (let i = 0; i < 24; i++) {
    const time = `${i.toString().padStart(2, '0')}:00`;
    // Mock daylight curve
    const production = (i > 6 && i < 18) ? Math.max(0, Math.sin((i - 6) * Math.PI / 12) * 3500 + (Math.random() * 500)) : 0;
    const load = 500 + Math.random() * 1000 + (i > 18 && i < 22 ? 2000 : 0); // Evening peak
    
    let battery = 0;
    let grid = 0;

    if (production > load) {
       // Excess production
       if (soc < 100) {
          battery = -(production - load); // Charging
          soc += 2; // Rough simulation
       } else {
          grid = -(production - load); // Export to grid
       }
    } else {
       // Deficit
       if (soc > 20) {
          battery = (load - production); // Discharging
          soc -= 3;
       } else {
          grid = (load - production); // Import from grid
       }
    }

    data.push({
      time,
      soc: Math.max(0, Math.min(100, soc)),
      production: parseFloat(production.toFixed(0)),
      battery: parseFloat(battery.toFixed(0)),
      grid: parseFloat(grid.toFixed(0)),
      load: parseFloat(load.toFixed(0))
    });
  }
  return data;
};

const generateHistory = () => {
  const data = [];
  for (let i = 1; i <= 15; i++) {
    data.push({
      date: `Jul ${i}`,
      pvYield: 15 + Math.random() * 10,
      load: 10 + Math.random() * 8,
      battCharge: 5 + Math.random() * 5,
      battDischarge: 4 + Math.random() * 5
    });
  }
  return data;
};

const generateHourly = () => {
  const data = [];
  for (let i = 0; i < 24; i++) {
    const isDay = i > 6 && i < 18;
    const ampm = i < 12 ? 'am' : 'pm';
    const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
    const timeLabel = `${displayHour}${ampm}`;
    
    data.push({
      time: timeLabel,
      solar: isDay ? parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)) : 0,
      fromBattery: (!isDay || Math.random() > 0.8) ? parseFloat((Math.random() * 1.0 + 0.2).toFixed(2)) : 0,
      fromGrid: (!isDay && Math.random() > 0.5) ? parseFloat((Math.random() * 0.5).toFixed(2)) : 0,
      toBattery: isDay ? -parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)) : 0,
    });
  }
  return data;
};

// --- STYLED COMPONENTS & ICONS ---

const getTheme = (isDark) => ({ isDark,
  bg: isDark ? '#111216' : '#f8fafc',
  panelBg: isDark ? '#1e2025' : '#ffffff',
  cardBg: isDark ? 'rgba(20, 22, 27, 0.65)' : 'rgba(255, 255, 255, 0.8)',
  cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)',
  text: isDark ? '#e2e8f0' : '#0f172a',
  muted: isDark ? '#8b949e' : '#64748b',
  border: isDark ? '#2e3238' : '#e2e8f0',
  chartGrid: isDark ? '#2e3238' : '#e2e8f0',
  chartTooltipBg: isDark ? '#181a1f' : '#ffffff',
});

const FlowLine = ({ path, color, flowing = true, reverse = false }) => (
  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
     <path 
       d={path} 
       fill="none" 
       stroke={color} 
       strokeWidth="2" 
       strokeOpacity="0.15" 
     />
     {flowing && (
       <path 
         d={path} 
         fill="none" 
         stroke={color} 
         strokeWidth="3" 
         strokeDasharray="6 24"
         strokeLinecap="round"
         style={{
           filter: `drop-shadow(0 0 6px ${color})`,
           animation: `dashFlow ${reverse ? 'reverse' : 'normal'} 1.2s linear infinite`
         }}
       />
     )}
     <style>
        {`
          @keyframes dashFlow {
            to { stroke-dashoffset: -30; }
          }
        `}
     </style>
  </svg>
);

const NodeBox = ({ children, x, y, width = 140, height = 70, borderColor, glowColor = null, zIndex=10, theme }) => (
  <div style={{
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: theme.cardBg, backgroundImage: theme.isDark ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)" : "linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)",
    backdropFilter: 'blur(10px)',
    border: `1px solid ${theme.cardBorder}`,
    borderTop: `2px solid ${borderColor}`,
    color: theme.text,
    borderRadius: '16px',
    boxShadow: glowColor ? `0 4px 20px ${glowColor}30, inset 0 1px 1px rgba(255,255,255,0.1)` : '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex,
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.3s ease'
  }}>
    {children}
  </div>
);

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: '20px' }}>
          <h2>Dashboard crashed.</h2>
          <pre style={{ color: 'red' }}>{this.state.error?.toString()}</pre>
          <pre style={{ color: 'gray' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- MAIN DASHBOARD COMPONENT ---

const SolarDashboard = () => {
  const [topRightTab, setTopRightTab] = useState('Power Metrics');
  const [bottomRightTab, setBottomRightTab] = useState('BMS');
  const [powerData, setPowerData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2025-07-16');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const theme = getTheme(isDarkMode);
  
  // Animated Live Values
  const [liveData, setLiveData] = useState({
     pv1: 640,
     pv2: 1220,
     pvTotal: 1859,
     grid: 0,
     batteryFlow: 389,
     batteryMode: 'Discharging',
     load: 2220,
     soc: 99.2
  });

  useEffect(() => {
    setPowerData(generatePowerMetrics());
    setHistoryData(generateHistory());
    setHourlyData(generateHourly());
  }, [selectedDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => ({
        ...prev,
        pv1: prev.pv1 + (Math.random() * 20 - 10),
        pv2: prev.pv2 + (Math.random() * 30 - 15),
        load: prev.load + (Math.random() * 50 - 25),
        batteryFlow: prev.batteryFlow + (Math.random() * 10 - 5)
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const totalPv = (liveData.pv1 + liveData.pv2).toFixed(0);

  return (
    <ErrorBoundary>
    <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text, fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ borderColor: theme.border }}>
         <Badge bg="success" className="px-3 py-2" style={{ backgroundColor: '#10b981' }}><Activity size={14} className="me-2"/> MQTT</Badge>
         <h4 className="mb-0 d-flex align-items-center gap-2 fw-bold" style={{ color: theme.text }}>
            <Sun className="text-warning" size={24} /> Solar Dashboard
         </h4>
         <Button variant={isDarkMode ? "outline-light" : "outline-dark"} size="sm" className="fw-bold" onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? "Light Mode" : "Dark Mode"}</Button>
      </div>

      <div className="p-3">
        <Row className="g-3">
           
           {/* LEFT PANEL - SVG ANIMATED FLOW DIAGRAM */}
           <Col xl={7} lg={12}>
              <Card className="h-100 border-0 shadow-lg" style={{ background: theme.panelBg, minHeight: '650px', position: 'relative', overflow: 'hidden' }}>
                 
                 {/* Connection Lines */}
                 <FlowLine path="M 200 120 L 250 120 L 250 200 L 350 200" color="#facc15" flowing={true} /> {/* PV1 to PV Total */}
                 <FlowLine path="M 500 120 L 450 120 L 450 200 L 350 200" color="#facc15" flowing={true} /> {/* PV2 to PV Total */}
                 <FlowLine path="M 350 200 L 350 350" color="#facc15" flowing={true} /> {/* PV Total to Inverter */}
                 
                 <FlowLine path="M 120 350 L 350 350" color="#ef4444" flowing={false} /> {/* Grid to Inverter (0W) */}
                 
                 <FlowLine path="M 350 350 L 750 350" color="#a855f7" flowing={true} /> {/* Inverter to Battery */}
                 
                 <FlowLine path="M 350 350 L 350 520" color="#0ea5e9" flowing={true} /> {/* Inverter to Load */}

                 {/* Nodes */}
                 {/* PV 1 */}
                 <NodeBox theme={theme} x={200} y={120} width={140} height={70} borderColor="#ca8a04">
                    <div className="text-muted" style={{ fontSize: '11px', fontWeight: 'bold' }}>PV 1</div>
                    <div className="text-warning fw-bold fs-4 mb-1">{liveData.pv1.toFixed(0)} W</div>
                    <div className="d-flex gap-2" style={{ fontSize: '10px', color: '#fef08a' }}>
                      <span>148.8 V</span> <span>4.3 A</span>
                    </div>
                 </NodeBox>

                 {/* PV 2 */}
                 <NodeBox theme={theme} x={500} y={120} width={140} height={70} borderColor="#ca8a04">
                    <div className="text-muted" style={{ fontSize: '11px', fontWeight: 'bold' }}>PV 2</div>
                    <div className="text-warning fw-bold fs-4 mb-1">{liveData.pv2.toFixed(0)} W</div>
                    <div className="d-flex gap-2" style={{ fontSize: '10px', color: '#fef08a' }}>
                      <span>312.8 V</span> <span>3.9 A</span>
                    </div>
                 </NodeBox>

                 {/* Solar Panel Icon Array */}
                 <div style={{ position: 'absolute', top: '150px', left: '350px', transform: 'translate(-50%, -50%)', zIndex: 11, textAlign: 'center' }}>
                    <Sun className="text-warning mb-1" size={32} />
                    <div style={{ background: '#3b82f6', border: '2px solid #60a5fa', width: '90px', height: '40px', borderRadius: '4px' }}></div>
                 </div>

                 {/* PV Total */}
                 <NodeBox theme={theme} x={350} y={230} width={180} height={65} borderColor="#facc15" glowColor="#facc15">
                    <div className="text-warning fw-bold fs-3">{totalPv} W</div>
                    <div className="d-flex justify-content-between w-100 px-3" style={{ fontSize: '11px', color: '#fef08a', fontWeight: 'bold' }}>
                      <span>28.2 %</span> <span>16.8 kWh</span>
                    </div>
                 </NodeBox>

                 {/* Grid */}
                 <div style={{ position: 'absolute', top: '350px', left: '100px', transform: 'translate(-50%, -50%)', zIndex: 11, textAlign: 'center' }}>
                    <div className="text-success fw-bold" style={{ fontSize: '12px' }}>↑ 0 kWh</div>
                    <svg width="60" height="60" viewBox="0 0 100 100">
                       <path d="M 20 40 L 80 40 M 30 60 L 70 60 M 40 80 L 60 80 M 50 40 L 50 100" stroke="#ef4444" strokeWidth="4" />
                       <path d="M 20 40 L 50 80 L 80 40" fill="none" stroke="#0ea5e9" strokeWidth="4" strokeDasharray="5 5" />
                    </svg>
                    <div className="text-danger fw-bold" style={{ fontSize: '12px' }}>↓ 0 kWh</div>
                 </div>
                 
                 <NodeBox theme={theme} x={200} y={350} width={120} height={40} borderColor="#ef4444">
                    <div className="text-danger fw-bold fs-4">0 W</div>
                 </NodeBox>

                 {/* INVERTER (Center) */}
                 <NodeBox theme={theme} x={350} y={350} width={160} height={150} borderColor="#475569" glowColor="#94a3b8">
                    <div className="w-100 px-3 d-flex justify-content-between align-items-start mb-2">
                       <span className="text-warning fw-bold" style={{ fontSize: "16px", letterSpacing: "0.5px" }}>Solis Inverter</span>
                       <div className="d-flex flex-column gap-1 mt-1">
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></div>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></div>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></div>
                       </div>
                    </div>
                    <div className="text-start w-100 px-3 flex-grow-1" style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
                       <div className="d-flex justify-content-between"><span>Voltage</span><span className="fw-bold" style={{ color: theme.text }}>232.9 V</span></div><div className="d-flex justify-content-between"><span>Current</span><span className="fw-bold" style={{ color: theme.text }}>9.8 A</span></div><div className="d-flex justify-content-between"><span>Freq</span><span className="fw-bold" style={{ color: theme.text }}>60.0 Hz</span></div>
                    </div>
                    <div className="w-100 px-3 d-flex justify-content-between align-items-center mb-1 pt-2 border-top" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                       <Activity size={20} className="text-danger" />
                       <span className="fw-bold fs-5 text-white">42.3 °C</span>
                    </div>
                 </NodeBox>

                 {/* Battery Connector */}
                 <NodeBox theme={theme} x={530} y={350} width={120} height={40} borderColor="#a855f7">
                    <div className="fw-bold fs-4" style={{ color: theme.text }}>{liveData.batteryFlow.toFixed(0)} W</div>
                 </NodeBox>

                 {/* Battery */}
                 <div style={{ position: 'absolute', top: '350px', left: '730px', transform: 'translate(-50%, -50%)', zIndex: 11, display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="text-center">
                       <div className="fw-bold mb-1" style={{ color: theme.text,  }}>↑ 9.20 kWh</div>
                       <div style={{ width: '40px', height: '80px', border: '3px solid #10b981', borderRadius: '4px', position: 'relative', background: '#064e3b', padding: '2px' }}>
                          <div style={{ position: 'absolute', top: '-6px', left: '10px', width: '14px', height: '4px', background: '#10b981', borderRadius: '2px 2px 0 0' }}></div>
                          <div style={{ width: '100%', height: '95%', background: '#10b981', position: 'absolute', bottom: '2px', left: '0' }}></div>
                          <div className="w-100 h-100 d-flex flex-column justify-content-around align-items-center position-relative z-1">
                            <div style={{ width:'4px', height:'4px', background:'rgba(255,255,255,0.5)', borderRadius:'50%'}}></div>
                            <div style={{ width:'4px', height:'4px', background:'rgba(255,255,255,0.5)', borderRadius:'50%'}}></div>
                            <div style={{ width:'4px', height:'4px', background:'rgba(255,255,255,0.5)', borderRadius:'50%'}}></div>
                          </div>
                       </div>
                       <div className="fw-bold mt-1" style={{ color: theme.text,  }}>↓ 3.30 kWh</div>
                    </div>
                    <div>
                       <div className="fw-bold" style={{  color: theme.text ,  fontSize: '36px', lineHeight: '1'  }}>{liveData.soc} %</div>
                       <div className="p-2 px-3 mt-2 rounded border fw-bold" style={{ borderColor: '#a855f7', background: 'rgba(168, 85, 247, 0.1)', fontSize: '13px' }}>
                          <div>53.2 V</div>
                          <div>7.3 A</div>
                          <div className="text-info mt-1">{liveData.batteryMode}</div>
                       </div>
                       <div className="text-muted mt-2 fw-bold" style={{ fontSize: '12px' }}>~ 31h 17m (to 20%)</div>
                    </div>
                 </div>

                 {/* Load Box */}
                 <NodeBox theme={theme} x={350} y={480} width={120} height={40} borderColor="#0ea5e9" glowColor="#0ea5e9">
                    <div className="text-info fw-bold fs-4">{liveData.load.toFixed(0)} W</div>
                 </NodeBox>

                 {/* House Icon */}
                 <div style={{ position: 'absolute', top: '550px', left: '350px', transform: 'translate(-50%, -50%)', zIndex: 11, textAlign: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 100 100">
                       <path d="M 10 50 L 50 10 L 90 50 L 90 90 L 10 90 Z" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
                       <rect x="25" y="60" width="15" height="15" fill="#facc15" />
                       <rect x="60" y="60" width="15" height="15" fill="#facc15" />
                       <path d="M 10 50 L 50 10 L 90 50" fill="none" stroke="#ef4444" strokeWidth="6" />
                    </svg>
                    <div className="fw-bold text-white mt-1">9.9 kWh</div>
                 </div>

                 {/* Production & Load Summary Stats */}
                 <div style={{ position: 'absolute', bottom: '20px', left: '150px', transform: 'translateX(-50%)', width: '250px' }}>
                    <div className="p-3 rounded" style={{ background: 'rgba(20, 22, 27, 0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                       <div className="text-center text-muted fw-bold mb-3" style={{ fontSize: '12px', letterSpacing: '1px' }}>PRODUCTION</div>
                       <div className="d-flex justify-content-between text-center" style={{ fontSize: '11px' }}>
                          <div>
                            <Sun size={14} className="text-warning mb-2" /><br/>
                            Solar Self-<br/>Use<br/><span className="text-muted">(7.6 kWh)</span><br/><b style={{ fontSize: '13px', color: theme.text }}>45.0 %</b>
                          </div>
                          <div>
                            <Battery size={14} className="text-success mb-2" /><br/>
                            Battery<br/>Charge<br/><span className="text-muted">(9.2 kWh)</span><br/><b style={{ fontSize: '13px', color: theme.text }}>55.0 %</b>
                          </div>
                          <div>
                            <Zap size={14} className="text-danger mb-2" /><br/>
                            Grid<br/>Export<br/><span className="text-muted">(0.0 kWh)</span><br/><b style={{ fontSize: '13px', color: theme.text }}>0.0 %</b>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div style={{ position: 'absolute', bottom: '20px', left: '550px', transform: 'translateX(-50%)', width: '250px' }}>
                    <div className="p-3 rounded" style={{ background: 'rgba(20, 22, 27, 0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                       <div className="text-center text-muted fw-bold mb-3" style={{ fontSize: '12px', letterSpacing: '1px' }}>LOAD CONSUMPTION</div>
                       <div className="d-flex justify-content-between text-center" style={{ fontSize: '11px' }}>
                          <div>
                            <Sun size={14} className="text-warning mb-2" /><br/>
                            Solar Self-<br/>Use<br/><span className="text-muted">(7.6 kWh)</span><br/><b style={{ fontSize: '13px', color: theme.text }}>77.0 %</b>
                          </div>
                          <div>
                            <Battery size={14} className="text-success mb-2" /><br/>
                            Battery<br/>Discharge<br/><span className="text-muted">(3.3 kWh)</span><br/><b style={{ fontSize: '13px', color: theme.text }}>33.0 %</b>
                          </div>
                          <div>
                            <Zap size={14} className="text-danger mb-2" /><br/>
                            Grid<br/>Import<br/><span className="text-muted">(0.0 kWh)</span><br/><b style={{ fontSize: '13px', color: theme.text }}>0.0 %</b>
                          </div>
                       </div>
                    </div>
                 </div>

              </Card>
           </Col>

           {/* RIGHT PANEL */}
           <Col xl={5} lg={12} className="d-flex flex-column gap-3">
              
              {/* TOP RIGHT: POWER METRICS / WEATHER */}
              <Card className="border-0 shadow-lg" style={{ background: theme.panelBg, height: '315px' }}>
                 <div className="d-flex justify-content-between p-2 border-bottom" style={{ borderColor: theme.border }}>
                    <div className="d-flex gap-3 px-2">
                       <span 
                          onClick={() => setTopRightTab('Power Metrics')}
                          className={`fw-bold action-hover ${topRightTab === 'Power Metrics' ? 'text-info border-bottom border-info border-2 pb-1' : 'text-muted'}`}
                          style={{ cursor: 'pointer', fontSize: '12px' }}>
                          <Activity size={14} className="me-1"/> Power Metrics
                       </span>
                       <span 
                          onClick={() => setTopRightTab('Weather')}
                          className={`fw-bold action-hover ${topRightTab === 'Weather' ? 'text-info border-bottom border-info border-2 pb-1' : 'text-muted'}`}
                          style={{ cursor: 'pointer', fontSize: '12px' }}>
                          <CloudRain size={14} className="me-1"/> Weather
                       </span>
                    </div>
                    <div className="d-flex gap-2 text-muted">
                       <RefreshCw size={14} style={{ cursor: 'pointer' }} />
                       <Download size={14} style={{ cursor: 'pointer' }} />
                    </div>
                 </div>

                 <div className="p-2 h-100">
                   {topRightTab === 'Power Metrics' ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={powerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} vertical={false} />
                          <XAxis dataKey="time" stroke="#8b949e" tick={{fontSize: 10}} minTickGap={30} />
                          <YAxis yAxisId="left" stroke="#8b949e" tick={{fontSize: 10}} domain={[0, 100]} orientation="left" />
                          <YAxis yAxisId="right" stroke="#8b949e" tick={{fontSize: 10}} domain={[-4000, 4000]} orientation="right" />
                          <Tooltip contentStyle={{ backgroundColor: '#181a1f', borderColor: '#2e3238', color: theme.text }} itemStyle={{ color: theme.text }} />
                          <Legend wrapperStyle={{ fontSize: '11px', top: -10 }} />
                          
                          <Area yAxisId="right" type="step" dataKey="production" name="Production" fill="#ca8a04" stroke="#ca8a04" opacity={0.6} />
                          <Area yAxisId="right" type="step" dataKey="load" name="Load" fill="#0284c7" stroke="#0284c7" opacity={0.6} />
                          <Area yAxisId="right" type="step" dataKey="battery" name="Battery" fill="#10b981" stroke="#10b981" opacity={0.6} />
                          <Area yAxisId="right" type="step" dataKey="grid" name="Grid" fill="#ef4444" stroke="#ef4444" opacity={0.6} />
                          <Line yAxisId="left" type="monotone" dataKey="soc" name="SOC %" stroke="#d946ef" strokeWidth={2} dot={false} />
                        </ComposedChart>
                     </ResponsiveContainer>
                   ) : (
                     <div className="h-100 d-flex text-white p-0">
                        {/* Weather Details (Left) */}
                        <div className="flex-grow-1 p-3 d-flex flex-column justify-content-center align-items-center text-center" style={{ minWidth: '45%' }}>
                           <h6 className="fw-bold mb-3 text-muted">San Fernando, Philippines</h6>
                           <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                              <CloudRain size={54} className="text-info" />
                              <div className="text-start">
                                 <div style={{ fontSize: '38px', fontWeight: 'bold', lineHeight: '1' }}>29°C</div>
                                 <div className="text-muted fs-6">Slight showers</div>
                              </div>
                           </div>
                           <Row className="w-100 text-muted mt-2 g-2" style={{ fontSize: '11px' }}>
                              <Col xs={6} className="d-flex align-items-center gap-2"><Droplets size={12} className="text-info"/> 85%</Col>
                              <Col xs={6} className="d-flex align-items-center gap-2"><Wind size={12} className="text-secondary"/> 11.4 km/h</Col>
                              <Col xs={6} className="d-flex align-items-center gap-2"><Sun size={12} className="text-warning"/> 5:34 AM</Col>
                              <Col xs={6} className="d-flex align-items-center gap-2"><Activity size={12} className="text-warning"/> 6:34 PM</Col>
                           </Row>
                        </div>
                        {/* Map Area (Right) - Real Google Map Embed */}
                        <div style={{ width: '55%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '0 8px 8px 0', borderLeft: `1px solid ${theme.border}` }}>
                           <iframe 
                             width="100%" 
                             height="100%" 
                             src="https://maps.google.com/maps?q=San%20Fernando,Philippines&t=k&z=10&ie=UTF8&iwloc=&output=embed" 
                             frameBorder="0"
                             style={{ border: 0, filter: isDarkMode ? 'contrast(1.1) brightness(0.9)' : 'none', transition: 'all 0.3s ease' }}
                           ></iframe>
                           <div style={{ position: 'absolute', top: '10px', right: '10px', background: theme.cardBg, backgroundImage: theme.isDark ? "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)" : "linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0) 100%)", padding: '4px 10px', borderRadius: '20px', fontSize: '10px', color: theme.text, backdropFilter: 'blur(4px)', border: `1px solid ${theme.cardBorder}` }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', marginRight: '6px', boxShadow: '0 0 5px #10b981' }}></span>
                              Live Satellite View
                           </div>
                        </div>
                     </div>
                   )}
                 </div>
              </Card>

              {/* BOTTOM RIGHT: BMS / HISTORY */}
              <Card className="border-0 shadow-lg flex-grow-1" style={{ background: theme.panelBg, minHeight: '315px' }}>
                 <div className="d-flex justify-content-between p-2 border-bottom" style={{ borderColor: theme.border }}>
                    <div className="d-flex gap-3 px-2">
                       <span 
                          onClick={() => setBottomRightTab('BMS')}
                          className={`fw-bold action-hover ${bottomRightTab === 'BMS' ? 'text-warning border-bottom border-warning border-2 pb-1' : 'text-muted'}`}
                          style={{ cursor: 'pointer', fontSize: '12px' }}>
                          <Battery size={14} className="me-1"/> BMS
                       </span>
                       <span 
                          onClick={() => setBottomRightTab('History')}
                          className={`fw-bold action-hover ${bottomRightTab === 'History' ? 'text-info border-bottom border-info border-2 pb-1' : 'text-muted'}`}
                          style={{ cursor: 'pointer', fontSize: '12px' }}>
                          <History size={14} className="me-1"/> History
                       </span>
                       <span 
                          onClick={() => setBottomRightTab('Hourly')}
                          className={`fw-bold action-hover ${bottomRightTab === 'Hourly' ? 'text-info border-bottom border-info border-2 pb-1' : 'text-muted'}`}
                          style={{ cursor: 'pointer', fontSize: '12px' }}>
                          <Clock size={14} className="me-1"/> Hourly
                       </span>
                    </div>
                    <div className="d-flex gap-2 align-items-center text-muted">
                       {(bottomRightTab === 'History' || bottomRightTab === 'Hourly') && (
                         <div className="d-flex align-items-center bg-dark rounded px-2" style={{ border: '1px solid #2e3238' }}>
                           <input 
                             type="date" 
                             value={selectedDate}
                             onChange={(e) => setSelectedDate(e.target.value)}
                             style={{ background: 'transparent', border: 'none', color: theme.text, fontSize: '11px', outline: 'none' }}
                           />
                         </div>
                       )}
                       <RefreshCw size={14} style={{ cursor: 'pointer' }} />
                       <Download size={14} style={{ cursor: 'pointer' }} />
                    </div>
                 </div>

                 <div className="p-3 h-100 d-flex flex-column">
                   {bottomRightTab === 'BMS' ? (
                     <>
                        <Row className="mb-3 g-2" style={{ fontSize: '11px' }}>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><Activity size={12} className="text-info"/> Flow: <b style={{ color: theme.text }}>389W</b></Col>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><Battery size={12} className="text-warning"/> Pack V: <b className="text-warning">53.2V</b></Col>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><Zap size={12} className="text-info"/> Port V: <b style={{ color: theme.text }}>53.2V</b></Col>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><Zap size={12} className="text-info"/> Ah Rem: <b className="text-success">298Ah</b></Col>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><Battery size={12} style={{ color: theme.text }}/> SOC: <b className="text-success">99%</b></Col>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><Activity size={12} className="text-danger"/> SOH: <b className="text-success">100%</b></Col>
                           <Col xs={3} className="d-flex gap-1 align-items-center"><RefreshCw size={12} className="text-info"/> Cycles: <b style={{ color: theme.text }}>440</b></Col>
                           <Col xs={5} className="d-flex gap-1 align-items-center"><Wind size={12} className="text-info"/> Temps: <b className="text-success">31.1°C / 35.2°C</b></Col>
                        </Row>

                        <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                           {Array.from({ length: 16 }).map((_, i) => (
                             <div key={i} className="rounded d-flex flex-column align-items-center justify-content-center position-relative" style={{ width: '11%', height: '60px', background: '#0f766e', border: '1px solid #14b8a6' }}>
                                <div style={{ width: '20px', height: '4px', background: '#5eead4', position: 'absolute', top: '-4px', borderRadius: '2px 2px 0 0' }}></div>
                                <div className="fw-bold" style={{  color: theme.text ,  fontSize: '11px'  }}>3.32{Math.floor(Math.random()*9)}V</div>
                                <div className="text-white text-opacity-50" style={{ fontSize: '9px' }}>C{i+1}</div>
                             </div>
                           ))}
                        </div>

                        <Row className="mt-auto border-top pt-2" style={{ borderColor: theme.border, fontSize: '10px', color: theme.muted }}>
                           <Col xs={3}>ΔV Cell: <b className="text-success">0.005V</b></Col>
                           <Col xs={3}>Hi Cell: <b style={{ color: theme.text }}>4</b></Col>
                           <Col xs={3}>Lo Cell: <b style={{ color: theme.text }}>7, 11</b></Col>
                           <Col xs={3}>Avg Cell: <b style={{ color: theme.text }}>3.32V</b></Col>
                        </Row>
                     </>
                   ) : bottomRightTab === 'History' ? (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} vertical={false} />
                           <XAxis dataKey="date" stroke="#8b949e" tick={{fontSize: 10}} />
                           <YAxis stroke="#8b949e" tick={{fontSize: 10}} />
                           <Tooltip cursor={{fill: '#2e3238'}} contentStyle={{ backgroundColor: '#181a1f', borderColor: '#2e3238', color: theme.text }} />
                           <Legend wrapperStyle={{ fontSize: '11px', top: -10 }} />
                           <Bar dataKey="pvYield" name="PV Yield" fill="#ca8a04" />
                           <Bar dataKey="load" name="Load" fill="#0284c7" />
                           <Bar dataKey="battCharge" name="Battery Charge" fill="#10b981" />
                           <Bar dataKey="battDischarge" name="Battery Discharge" fill="#ef4444" />
                        </BarChart>
                     </ResponsiveContainer>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} stackOffset="sign">
                           <CartesianGrid strokeDasharray="3 3" stroke={theme.chartGrid} vertical={false} />
                           <XAxis dataKey="time" stroke="#8b949e" tick={{fontSize: 9}} interval={1} angle={-45} textAnchor="end" height={40} />
                           <YAxis stroke="#8b949e" tick={{fontSize: 10}} domain={[-3, 3]} />
                           <Tooltip cursor={{fill: '#2e3238'}} contentStyle={{ backgroundColor: '#181a1f', borderColor: '#2e3238', color: theme.text }} />
                           <Legend wrapperStyle={{ fontSize: '11px', top: -10 }} />
                           <Bar dataKey="solar" name="From Solar" stackId="stack" fill="#ca8a04" />
                           <Bar dataKey="fromBattery" name="From Battery" stackId="stack" fill="#4ade80" />
                           <Bar dataKey="fromGrid" name="From Grid" stackId="stack" fill="#ef4444" />
                           <Bar dataKey="toBattery" name="To Battery" stackId="stack" fill="#0284c7" />
                        </BarChart>
                     </ResponsiveContainer>
                   )}
                 </div>
              </Card>

           </Col>
        </Row>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default SolarDashboard;
