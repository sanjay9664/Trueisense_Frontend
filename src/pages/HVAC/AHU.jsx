import React, { useState } from 'react';
import { Row, Col, Card, Nav, Badge } from 'react-bootstrap';
import { Activity, Wind, RefreshCw, TrendingUp, Clock, Zap, Snowflake } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer, Legend
} from 'recharts';

const AHU = () => {
  const [graphTimeRange, setGraphTimeRange] = useState('DAY');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Mock data for the Instantaneous Trend chart (AHU Temp Tracking)
  const graphData = {
    DAY: [
      { time: '00:00', supplyTemp: 14.5, returnTemp: 23.2, setpoint: 14.0 },
      { time: '04:00', supplyTemp: 14.2, returnTemp: 22.8, setpoint: 14.0 },
      { time: '08:00', supplyTemp: 14.8, returnTemp: 24.5, setpoint: 14.0 },
      { time: '12:00', supplyTemp: 15.2, returnTemp: 25.8, setpoint: 14.0 },
      { time: '16:00', supplyTemp: 15.0, returnTemp: 25.0, setpoint: 14.0 },
      { time: '20:00', supplyTemp: 14.6, returnTemp: 23.5, setpoint: 14.0 },
      { time: '23:59', supplyTemp: 14.3, returnTemp: 23.0, setpoint: 14.0 },
    ],
    WEEK: [
      { time: 'Mon', supplyTemp: 14.6, returnTemp: 24.2, setpoint: 14.0 },
      { time: 'Tue', supplyTemp: 14.8, returnTemp: 24.5, setpoint: 14.0 },
      { time: 'Wed', supplyTemp: 14.5, returnTemp: 23.8, setpoint: 14.0 },
      { time: 'Thu', supplyTemp: 14.7, returnTemp: 24.0, setpoint: 14.0 },
      { time: 'Fri', supplyTemp: 15.1, returnTemp: 25.2, setpoint: 14.0 },
      { time: 'Sat', supplyTemp: 14.2, returnTemp: 22.5, setpoint: 14.0 },
      { time: 'Sun', supplyTemp: 14.1, returnTemp: 22.2, setpoint: 14.0 },
    ],
    MONTH: [
      { time: 'Week 1', supplyTemp: 14.5, returnTemp: 24.0, setpoint: 14.0 },
      { time: 'Week 2', supplyTemp: 14.8, returnTemp: 24.5, setpoint: 14.0 },
      { time: 'Week 3', supplyTemp: 14.6, returnTemp: 23.8, setpoint: 14.0 },
      { time: 'Week 4', supplyTemp: 14.4, returnTemp: 23.5, setpoint: 14.0 },
    ],
    YEAR: [
      { time: 'Jan', supplyTemp: 14.2, returnTemp: 22.0, setpoint: 14.0 },
      { time: 'Feb', supplyTemp: 14.3, returnTemp: 22.5, setpoint: 14.0 },
      { time: 'Mar', supplyTemp: 14.5, returnTemp: 23.5, setpoint: 14.0 },
      { time: 'Apr', supplyTemp: 14.8, returnTemp: 24.5, setpoint: 14.0 },
      { time: 'May', supplyTemp: 15.2, returnTemp: 25.8, setpoint: 14.0 },
      { time: 'Jun', supplyTemp: 15.5, returnTemp: 26.5, setpoint: 14.0 },
      { time: 'Jul', supplyTemp: 15.8, returnTemp: 27.2, setpoint: 14.0 },
      { time: 'Aug', supplyTemp: 15.6, returnTemp: 26.8, setpoint: 14.0 },
      { time: 'Sep', supplyTemp: 15.0, returnTemp: 25.0, setpoint: 14.0 },
      { time: 'Oct', supplyTemp: 14.6, returnTemp: 24.0, setpoint: 14.0 },
      { time: 'Nov', supplyTemp: 14.4, returnTemp: 23.0, setpoint: 14.0 },
      { time: 'Dec', supplyTemp: 14.2, returnTemp: 22.2, setpoint: 14.0 },
    ],
    CUSTOM: [
      { time: 'Oct 10', supplyTemp: 14.5, returnTemp: 24.0, setpoint: 14.0 },
      { time: 'Oct 11', supplyTemp: 14.6, returnTemp: 24.2, setpoint: 14.0 },
      { time: 'Oct 12', supplyTemp: 14.8, returnTemp: 24.5, setpoint: 14.0 },
      { time: 'Oct 13', supplyTemp: 14.7, returnTemp: 24.1, setpoint: 14.0 },
      { time: 'Oct 14', supplyTemp: 14.5, returnTemp: 23.8, setpoint: 14.0 },
    ]
  };

  const LabelCard = ({ title, data, top, left, right, bottom, bgColor = 'rgba(15, 23, 42, 0.85)', labelColor = 'text-info' }) => (
    <div className="position-absolute p-3 rounded-4 shadow-lg" style={{ top, left, right, bottom, background: bgColor, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', minWidth: '160px', zIndex: 10 }}>
      <div className={`fs-11 fw-bold text-white text-opacity-75 text-uppercase mb-2 border-bottom border-white border-opacity-25 pb-1 tracking-wider`}>{title}</div>
      {data.map((item, i) => (
        <div key={i} className="fs-13 text-white mb-1 d-flex justify-content-between gap-3 align-items-center">
          <span className={labelColor}>{item.label}</span> 
          <span className="fw-black fs-5">{item.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="ahu-wrapper p-4 h-100 d-flex flex-column" style={{ background: 'transparent', minHeight: '100vh', overflowY: 'auto' }}>
      {/* Page Header */}
      <div className="mb-4 d-flex justify-content-between align-items-start bg-panel p-4 rounded-4 border border-white border-opacity-5" style={{ background: '#0f172a' }}>
        <div className="pe-4">
          <div className="d-flex align-items-center gap-3 mb-2">
            <div className="p-2 bg-info bg-opacity-10 rounded-3">
              <Wind className="text-info" size={24} />
            </div>
            <h4 className="mb-0 text-white fw-black tracking-tight">Air Handling Unit (AHU)</h4>
          </div>
          <p className="text-muted fs-14 mb-0 mt-3" style={{ maxWidth: '900px', lineHeight: '1.6' }}>
            The <strong className="text-white">AHU Control System</strong> monitors and regulates air circulation, filtration, cooling, and heating across the facility. Real-time telemetry ensures optimal indoor air quality (IAQ), temperature compliance, and energy efficiency.
          </p>
        </div>
        <div className="d-flex flex-column gap-2 text-end">
          <Badge bg="success" className="px-3 py-2 rounded-pill fw-bold tracking-wider">SYSTEM ONLINE</Badge>
          <Badge bg="primary" className="px-3 py-2 rounded-pill fw-bold tracking-wider">COOLING MODE</Badge>
        </div>
      </div>

      <style>
        {`
          @keyframes spin-fan {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes airflow {
            0% { transform: translateX(0); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateX(40px); opacity: 0; }
          }
          @keyframes airflow-reverse {
            0% { transform: translateX(0); opacity: 0; }
            50% { opacity: 0.8; }
            100% { transform: translateX(-40px); opacity: 0; }
          }
        `}
      </style>
      
      <Row className="g-4 mb-4" style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>
        {/* DIAGRAM SECTION */}
        <Col xl={12}>
          <div className="ahu-diagram-container position-relative w-100 rounded-4 overflow-hidden border border-white border-opacity-5 shadow-lg" style={{ background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)', height: '850px' }}>
            
            {/* Center AHU Image */}
            <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ zIndex: 2, width: '95%', maxWidth: '900px' }}>
              <img 
                src="/ahu_v3.png" 
                alt="AHU Machine" 
                className="img-fluid drop-shadow-glow" 
                style={{ filter: 'contrast(1.1) brightness(0.85)' }} 
                onLoad={() => setImageLoaded(true)}
              />
              
              {/* Massive Glowing Airflow SVG Animation Overlay */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none', overflow: 'visible' }}>
                <defs>
                   <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="4" result="blur" />
                     <feComposite in="SourceGraphic" in2="blur" operator="over" />
                   </filter>
                   <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="4" result="blur" />
                     <feComposite in="SourceGraphic" in2="blur" operator="over" />
                   </filter>
                   <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                     <feGaussianBlur stdDeviation="4" result="blur" />
                     <feComposite in="SourceGraphic" in2="blur" operator="over" />
                   </filter>
                   
                   <marker id="arrowHeadRed" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                     <path d="M 0 0 L 8 4 L 0 8 z" fill="#ef4444" />
                   </marker>
                   <marker id="arrowHeadCyan" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                     <path d="M 0 0 L 8 4 L 0 8 z" fill="#00e5ff" />
                   </marker>
                   <marker id="arrowHeadGreen" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                     <path d="M 0 0 L 8 4 L 0 8 z" fill="#10b981" />
                   </marker>
                   <marker id="arrowHeadOrange" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
                     <path d="M 0 0 L 8 4 L 0 8 z" fill="#f59e0b" />
                   </marker>
                </defs>

                {/* FRESH AIR / VENTILATION IN (Coming from Top Mixing Box) */}
                <g filter="url(#glowGreen)">
                  <line x1="38%" y1="5%" x2="38%" y2="30%" stroke="#10b981" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadGreen)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <line x1="44%" y1="2%" x2="44%" y2="27%" stroke="#10b981" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadGreen)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <text x="38%" y="1%" fill="#10b981" fontSize="16" fontWeight="bold" letterSpacing="1" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }} transform="skewY(-15)">FRESH AIR</text>
                  <text x="38%" y="4%" fill="#10b981" fontSize="13" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }} transform="skewY(-15)">(From Outside)</text>
                </g>

                {/* RETURN AIR IN (Entering Left Intake) - 3D Angled */}
                <g filter="url(#glowRed)">
                  <line x1="10%" y1="50%" x2="28%" y2="44%" stroke="#ef4444" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadRed)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <line x1="10%" y1="70%" x2="28%" y2="64%" stroke="#ef4444" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadRed)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <text x="5%" y="44%" fill="#ef4444" fontSize="16" fontWeight="bold" letterSpacing="1" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }} transform="skewY(-15)">RETURN AIR</text>
                  <text x="5%" y="48%" fill="#ef4444" fontSize="13" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }} transform="skewY(-15)">(From Building)</text>
                </g>

                {/* MIXED AIR (Through Filter & Coil) - 3D Angled */}
                <g filter="url(#glowRed)" opacity="0.8">
                  <line x1="32%" y1="42%" x2="48%" y2="36%" stroke="#f59e0b" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadOrange)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <line x1="32%" y1="62%" x2="48%" y2="56%" stroke="#f59e0b" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadOrange)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <text x="35%" y="42%" fill="#f59e0b" fontSize="16" fontWeight="bold" letterSpacing="1" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }} transform="skewY(-15)">MIXED AIR</text>
                  <text x="35%" y="46%" fill="#f59e0b" fontSize="13" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }} transform="skewY(-15)">(Entering Coil)</text>
                </g>

                {/* SUPPLY AIR OUT (Exiting Right Fan) - 3D Angled */}
                <g filter="url(#glowCyan)">
                  <line x1="60%" y1="50%" x2="85%" y2="41%" stroke="#00e5ff" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadCyan)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <line x1="60%" y1="70%" x2="85%" y2="61%" stroke="#00e5ff" strokeWidth="6" strokeDasharray="20 20" fill="none" markerEnd="url(#arrowHeadCyan)">
                    <animate attributeName="stroke-dashoffset" from="40" to="0" dur="0.8s" repeatCount="indefinite" />
                  </line>
                  <text x="70%" y="46%" fill="#00e5ff" fontSize="16" fontWeight="bold" letterSpacing="1" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }} transform="skewY(-15)">SUPPLY AIR</text>
                  <text x="70%" y="50%" fill="#00e5ff" fontSize="13" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }} transform="skewY(-15)">(To Building)</text>
                </g>
              </svg>
            </div>

            {/* Left Side Cards */}
            <LabelCard title="Fresh Air Damper" data={[{label: 'Position', value: '25%'}, {label: 'Flow', value: '1,200 CFM'}]} top="8%" left="2%" />
            <LabelCard title="Supply Filter" data={[{label: 'Diff Press', value: '120 Pa'}, {label: 'Status', value: 'CLEAN'}]} top="26%" left="2%" />
            <LabelCard title="Cooling Coil" data={[{label: 'Valve', value: '45%'}, {label: 'Chilled Wtr', value: '7.2 °C'}]} top="46%" left="2%" />
            <LabelCard title="Heating Coil" data={[{label: 'Valve', value: '0%'}, {label: 'Hot Wtr', value: '---'}]} top="64%" left="2%" />
            <LabelCard title="Supply Fan" data={[{label: 'Status', value: 'ON'}, {label: 'VFD', value: '42 Hz'}]} top="82%" left="2%" />
            
            {/* Right Side Cards */}
            <LabelCard title="Exhaust Damper" data={[{label: 'Position', value: '15%'}, {label: 'Flow', value: '800 CFM'}]} top="8%" right="2%" />
            <LabelCard title="Return Air" data={[{label: 'Temp', value: '24.2 °C'}, {label: 'Hum', value: '55%'}, {label: 'CO2', value: '620 ppm'}]} top="26%" right="2%" />
            <LabelCard title="Supply Air" data={[{label: 'Temp', value: '14.5 °C'}, {label: 'Hum', value: '88%'}, {label: 'Static', value: '450 Pa'}]} top="46%" right="2%" />
            <LabelCard title="Return Fan" data={[{label: 'Status', value: 'ON'}, {label: 'VFD', value: '38 Hz'}]} top="64%" right="2%" />
            <LabelCard title="Motor Diag." data={[{label: 'Vibration', value: '0.8 mm/s'}, {label: 'Current', value: '12.4 A'}]} top="82%" right="2%" />

            {/* Last Sync Overlay */}
            <div className="position-absolute p-3 rounded-4 shadow-lg" style={{ top: '3%', right: '2%', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
              <div className="d-flex align-items-center gap-2">
                <RefreshCw size={14} className="text-info" />
                <div className="text-white text-opacity-75 fs-12 fw-bold tracking-wider">LAST SYNC: 07-APR-2026 14:52</div>
              </div>
            </div>

            {/* KPI Bottom Overlay */}
            <div className="position-absolute start-50 translate-middle-x p-4 rounded-4 shadow-lg d-flex gap-5 align-items-center justify-content-center" style={{ bottom: '4%', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', zIndex: 10, minWidth: '500px' }}>
              <div className="pe-4 border-end border-secondary border-opacity-25">
                <div className="text-white text-opacity-75 fs-12 fw-bold text-uppercase mb-1 tracking-wider">Key Performance Index</div>
                <div className="text-info fs-10 text-opacity-75 text-uppercase">AHU Efficiency</div>
              </div>
              <div className="text-center">
                <div className="fs-11 text-muted mb-1 text-uppercase fw-bold">Total Airflow</div>
                <div className="fs-3 fw-black text-white">12,500 <span className="fs-6 text-muted">CFM</span></div>
              </div>
              <div className="text-center">
                <div className="fs-11 text-muted mb-1 text-uppercase fw-bold">Cooling Load</div>
                <div className="fs-3 fw-black text-white">85 <span className="fs-6 text-muted">kW</span></div>
              </div>
              <div className="text-center">
                <div className="fs-11 text-muted mb-1 text-uppercase fw-bold">Power Draw</div>
                <div className="fs-3 fw-black text-white">14.2 <span className="fs-6 text-muted">kW</span></div>
              </div>
            </div>

          </div>
        </Col>
      </Row>

      {/* TREND CHART SECTION */}
      <Row className="mb-4">
        <Col xl={12}>
          <Card className="bg-panel border-0 rounded-4 overflow-hidden border border-white border-opacity-5" style={{ background: '#0f172a' }}>
            <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white fw-black tracking-widest uppercase fs-14 text-nowrap">
                <TrendingUp size={16} className="me-2 text-info" /> Temperature Tracking
              </h6>
              
              <div className="d-flex align-items-center gap-3">
                {graphTimeRange === 'CUSTOM' && (
                  <input 
                    type="date" 
                    className="form-control form-control-sm bg-dark text-white border-white border-opacity-25 rounded-pill px-3 shadow-none" 
                    style={{ fontSize: '12px' }}
                  />
                )}
                <Nav variant="pills" className="flex-nowrap bg-dark bg-opacity-50 p-1 rounded-pill border border-white border-opacity-5">
                  {['DAY', 'WEEK', 'MONTH', 'YEAR', 'CUSTOM'].map(range => (
                    <Nav.Item key={range}>
                      <Nav.Link 
                        className={`rounded-pill px-3 py-1 fs-11 fw-bold text-uppercase tracking-wider ${graphTimeRange === range ? 'bg-info text-dark' : 'text-muted'}`}
                        onClick={() => setGraphTimeRange(range)}
                      >
                        {range}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
              </div>
            </div>
            <Card.Body className="p-4">
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData[graphTimeRange]} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={['auto', 'auto']} />
                    <ChartTooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                      itemStyle={{ fontSize: '13px', fontWeight: 'bold' }} 
                      cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="returnTemp" name="Return Air (°C)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="supplyTemp" name="Supply Air (°C)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="dashed" dataKey="setpoint" name="Setpoint (°C)" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AHU;
