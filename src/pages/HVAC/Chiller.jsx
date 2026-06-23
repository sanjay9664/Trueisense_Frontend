import React, { useState } from 'react';
import { Row, Col, Card, Badge, Nav } from 'react-bootstrap';
import { Activity, Zap, Snowflake, TrendingUp, Thermometer, List, Clock, Gauge } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer, Legend
} from 'recharts';

const Chiller = () => {
  const [timeRange, setTimeRange] = useState('DAY');
  const [graphTimeRange, setGraphTimeRange] = useState('DAY');
  const [imageLoaded, setImageLoaded] = useState(false);

  const statsData = {
    DAY: {
      runningTime: "1 hours and 43 minutes",
      energyConsumed: "124.3",
      coolingEffect: "343.3",
      sec: "0.42"
    },
    MONTH: {
      runningTime: "142 hours and 15 minutes",
      energyConsumed: "15,240.5",
      coolingEffect: "42,100.8",
      sec: "0.38"
    }
  };
  const currentStats = statsData[timeRange];

  // Mock data for the Instantaneous Trend chart
  const graphData = {
    DAY: [
      { time: '00:00', power: 120, coolingEffect: 110, sec: 1.1 },
      { time: '04:00', power: 115, coolingEffect: 105, sec: 1.05 },
      { time: '08:00', power: 140, coolingEffect: 125, sec: 1.15 },
      { time: '12:00', power: 155, coolingEffect: 140, sec: 1.2 },
      { time: '16:00', power: 160, coolingEffect: 150, sec: 1.25 },
      { time: '20:00', power: 135, coolingEffect: 120, sec: 1.1 },
      { time: '23:59', power: 125, coolingEffect: 115, sec: 1.08 },
    ],
    WEEK: [
      { time: 'Mon', power: 130, coolingEffect: 120, sec: 1.08 },
      { time: 'Tue', power: 145, coolingEffect: 130, sec: 1.11 },
      { time: 'Wed', power: 150, coolingEffect: 135, sec: 1.15 },
      { time: 'Thu', power: 140, coolingEffect: 125, sec: 1.12 },
      { time: 'Fri', power: 160, coolingEffect: 145, sec: 1.2 },
      { time: 'Sat', power: 110, coolingEffect: 100, sec: 1.05 },
      { time: 'Sun', power: 105, coolingEffect: 95, sec: 1.02 },
    ],
    MONTH: [
      { time: 'Week 1', power: 135, coolingEffect: 125, sec: 1.1 },
      { time: 'Week 2', power: 140, coolingEffect: 130, sec: 1.12 },
      { time: 'Week 3', power: 150, coolingEffect: 140, sec: 1.15 },
      { time: 'Week 4', power: 145, coolingEffect: 135, sec: 1.13 },
    ],
    YEAR: [
      { time: 'Jan', power: 120, coolingEffect: 115, sec: 1.05 },
      { time: 'Feb', power: 125, coolingEffect: 120, sec: 1.08 },
      { time: 'Mar', power: 135, coolingEffect: 130, sec: 1.1 },
      { time: 'Apr', power: 150, coolingEffect: 140, sec: 1.15 },
      { time: 'May', power: 165, coolingEffect: 150, sec: 1.2 },
      { time: 'Jun', power: 180, coolingEffect: 165, sec: 1.25 },
      { time: 'Jul', power: 190, coolingEffect: 175, sec: 1.3 },
      { time: 'Aug', power: 185, coolingEffect: 170, sec: 1.28 },
      { time: 'Sep', power: 170, coolingEffect: 155, sec: 1.22 },
      { time: 'Oct', power: 150, coolingEffect: 140, sec: 1.15 },
      { time: 'Nov', power: 130, coolingEffect: 125, sec: 1.1 },
      { time: 'Dec', power: 120, coolingEffect: 115, sec: 1.05 },
    ],
    CUSTOM: [
      { time: 'Oct 10', power: 140, coolingEffect: 125, sec: 1.12 },
      { time: 'Oct 11', power: 150, coolingEffect: 135, sec: 1.15 },
      { time: 'Oct 12', power: 160, coolingEffect: 145, sec: 1.20 },
      { time: 'Oct 13', power: 155, coolingEffect: 140, sec: 1.18 },
      { time: 'Oct 14', power: 145, coolingEffect: 130, sec: 1.14 },
    ]
  };

  const Tile = ({ title, value, bg, border, text, icon }) => (
    <div 
      className="d-flex flex-column justify-content-center align-items-center px-3 py-2 rounded scada-tile"
      style={{ 
        backgroundColor: bg || 'rgba(0,0,0,0.4)', 
        border: border ? `1px solid ${border}` : '1px solid rgba(255,255,255,0.1)',
        minWidth: '180px',
        backdropFilter: 'blur(8px)',
        boxShadow: border ? `0 0 15px ${border}22 inset` : 'none'
      }}
    >
      <div className="fs-12 fw-bold tracking-widest mb-1 text-uppercase text-center" style={{ color: border ? text : 'rgba(255,255,255,0.7)' }}>{title}</div>
      <div className="fs-4 fw-black d-flex align-items-center justify-content-center gap-2" style={{ color: text || '#fff' }}>
        {icon && <span style={{ opacity: 0.8 }}>{icon}</span>}
        {value}
      </div>
    </div>
  );

  const StatCard = ({ title, value, unit, icon, colorHex }) => (
    <div className="d-flex align-items-center justify-content-between p-3 mb-3 rounded-4 scada-tile" style={{ background: `linear-gradient(90deg, ${colorHex}15 0%, transparent 100%)`, border: `1px solid ${colorHex}30`, borderLeft: `4px solid ${colorHex}` }}>

      <div className="d-flex align-items-center gap-3 w-100">
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: `${colorHex}20`, color: colorHex }}>
          {icon}
        </div>
        <div className="flex-grow-1 text-end">
          <div className="fw-bold fs-12 tracking-wider mb-1 text-uppercase" style={{ color: colorHex, opacity: 0.8 }}>{title}</div>
          <div className="d-flex align-items-baseline justify-content-end gap-1">
            <h4 className="mb-0 fw-black tracking-tight" style={{ color: colorHex }}>{value}</h4>
            {unit && <small className="fw-bold fs-13" style={{ color: colorHex, opacity: 0.8 }}>{unit}</small>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="chiller-wrapper p-4 h-100 d-flex flex-column" style={{ background: 'transparent', minHeight: '100vh', overflowY: 'auto' }}>
      {/* Page Header */}
      <div className="mb-4 d-flex justify-content-between align-items-start bg-panel p-4 rounded-4 border border-white border-opacity-5" style={{ background: '#0f172a' }}>
        <div className="pe-4">
          <h2 className="fw-black tracking-wider mb-3 d-flex align-items-center gap-3" style={{ color: '#fff', textShadow: '0 0 15px rgba(255,255,255,0.2)' }}>
            <Activity className="text-info" size={32} />
            Chiller Monitoring System
          </h2>
          <p className="text-white opacity-75 fs-14 lh-lg max-w-3xl mb-4">
            Monitor your <span className="text-info fw-bold">chiller plant performance</span> in real time by tracking critical energy and thermal parameters. Improve efficiency, reduce energy costs, and maintain optimal cooling performance through continuous system insights.
          </p>
          <div className="d-flex flex-wrap gap-4">
            {[
              "Chilled water inlet temperature",
              "Chilled water outlet temperature",
              "Power consumption (energy drawn)",
              "Cooling effect measurement",
              "Specific Energy Consumption (SEC)"
            ].map((item, i) => (
              <div key={i} className="d-flex align-items-center gap-2 text-white opacity-75 fs-13 fw-bold">
                <List size={16} className="text-info opacity-75" />
                {item}
              </div>
            ))}
          </div>
        </div>
        
        {/* Status Indicators */}
        <div className="d-flex flex-column align-items-end gap-3" style={{ minWidth: '150px' }}>
          <Badge bg="info" className="p-2 px-3 rounded-pill fw-bold tracking-widest bg-opacity-25 border border-info text-info">AUTO MODE</Badge>
          <div className="d-flex align-items-center gap-2">
            <div className="spinner-grow spinner-grow-sm text-success" style={{ width: '0.8rem', height: '0.8rem' }} role="status"></div>
            <span className="text-success fw-bold fs-12 tracking-wider text-uppercase">System Online</span>
          </div>
        </div>
      </div>

      <Row className="g-4 mb-4" style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>
        {/* DIAGRAM SECTION */}
        <Col xl={8}>
          <div className="chiller-diagram-container position-relative w-100 rounded-4 overflow-hidden border border-white border-opacity-5 shadow-lg" style={{ background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)', height: '650px' }}>
            
            {/* Top Row Tiles */}
            <div className="d-flex justify-content-between align-items-start position-absolute w-100 px-4 pt-4" style={{ top: 0, left: 0, zIndex: 11 }}>
              <Tile title="CHILLED WATER INLET" value="31.36 °C" bg="#0c4a6e" border="#0ea5e9" text="#fff" icon={<Thermometer size={18} className="text-info" />} />
              <Tile title="POWER DRAWN" value="135.4 kW" border="#eab308" text="#eab308" icon={<Zap size={18} />} />
              <Tile title="COOLING EFFECT" value="115.0 TR" border="#22d3ee" text="#22d3ee" icon={<Snowflake size={18} />} />
              <Tile title="CHILLED WATER OUTLET" value="13.00 °C" bg="#0891b2" border="#22d3ee" text="#fff" icon={<Thermometer size={18} className="text-white" />} />
            </div>

            {/* Bottom Row Tiles */}
            <div className="d-flex justify-content-between align-items-end position-absolute w-100 px-5 pb-4" style={{ bottom: 0, left: 0, zIndex: 11 }}>
              <Tile title="CONDENSER OUTLET" value="35.20 °C" bg="#450a0a" border="#ef4444" text="#fff" icon={<Thermometer size={18} className="text-danger" />} />
              <div className="rounded-3 px-4 py-3 text-center shadow-lg" style={{ backgroundColor: '#a855f7', border: '2px solid #d8b4fe' }}>
                <h3 className="text-white fw-black m-0 tracking-wider">1.18 kW/TR</h3>
              </div>
              <Tile title="CONDENSER INLET" value="29.10 °C" bg="#422006" border="#eab308" text="#fff" icon={<Thermometer size={18} className="text-warning" />} />
            </div>

            {/* SVG Flow Lines Overlay */}
            <svg className="flow-lines-overlay" viewBox="0 0 1000 650" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}>
              <defs>
                <path id="pathBlue" d="M 220 195 L 380 195 L 380 273" />
                <path id="pathCyan" d="M 620 273 L 620 195 L 780 195" />
                <path id="pathOrange" d="M 220 422 L 380 422 L 380 357" />
                <path id="pathRed" d="M 620 357 L 620 422 L 780 422" />
              </defs>

              {/* Flowing Dashed Tubes */}
              <use href="#pathBlue" className="flow-line blue-glow" fill="none" stroke="#0ea5e9" strokeWidth="6" strokeDasharray="15 15" strokeLinecap="round" strokeLinejoin="round" />
              <use href="#pathCyan" className="flow-line cyan-glow" fill="none" stroke="#22d3ee" strokeWidth="6" strokeDasharray="15 15" strokeLinecap="round" strokeLinejoin="round" />
              <use href="#pathOrange" className="flow-line orange-glow" fill="none" stroke="#f97316" strokeWidth="6" strokeDasharray="15 15" strokeLinecap="round" strokeLinejoin="round" />
              <use href="#pathRed" className="flow-line red-glow" fill="none" stroke="#ef4444" strokeWidth="6" strokeDasharray="15 15" strokeLinecap="round" strokeLinejoin="round" />

              {/* Moving Arrows */}
              <g className="blue-glow">
                <polygon points="-12,-8 12,0 -12,8" fill="#0ea5e9" />
                <animateMotion dur="4s" repeatCount="indefinite" rotate="auto"><mpath href="#pathBlue" /></animateMotion>
              </g>
              <g className="cyan-glow">
                <polygon points="-12,-8 12,0 -12,8" fill="#22d3ee" />
                <animateMotion dur="4s" repeatCount="indefinite" rotate="auto"><mpath href="#pathCyan" /></animateMotion>
              </g>
              <g className="orange-glow">
                <polygon points="-12,-8 12,0 -12,8" fill="#f97316" />
                <animateMotion dur="4s" repeatCount="indefinite" rotate="auto"><mpath href="#pathOrange" /></animateMotion>
              </g>
              <g className="red-glow">
                <polygon points="-12,-8 12,0 -12,8" fill="#ef4444" />
                <animateMotion dur="4s" repeatCount="indefinite" rotate="auto"><mpath href="#pathRed" /></animateMotion>
              </g>
            </svg>

            {/* Line Text Labels */}
            <div className="position-absolute" style={{ top: '28%', left: '12%', zIndex: 11, transform: 'translateX(-50%)' }}>
              <div className="text-white fw-bold fs-11 tracking-widest text-center opacity-75">CHILLED WATER RETURN</div>
              <div className="text-info fw-black fs-13 text-center">Flow: 42.5 kL/hr</div>
            </div>

            <div className="position-absolute" style={{ top: '28%', right: '12%', zIndex: 11, transform: 'translateX(50%)' }}>
              <div className="text-white fw-bold fs-11 tracking-widest text-center opacity-75">CHILLED WATER SUPPLY</div>
              <div className="text-info fw-black fs-13 text-center">Pressure: 3.2 bar</div>
            </div>

            <div className="position-absolute" style={{ top: '63%', left: '12%', zIndex: 11, transform: 'translateX(-50%)' }}>
              <div className="text-white fw-bold fs-11 tracking-widest text-center opacity-75">CONDENSER WATER SUPPLY</div>
              <div className="text-white fw-black fs-13 text-center" style={{ color: '#f97316' }}>Flow: 55.0 kL/hr</div>
            </div>

            <div className="position-absolute" style={{ top: '63%', right: '12%', zIndex: 11, transform: 'translateX(50%)' }}>
              <div className="text-white fw-bold fs-11 tracking-widest text-center opacity-75">CONDENSER WATER RETURN</div>
              <div className="text-danger fw-black fs-13 text-center">Pressure: 2.8 bar</div>
            </div>

            {/* Center Chiller Image from Public Folder */}
            <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ zIndex: 2, width: '40%', maxWidth: '380px' }}>
              <img 
                src="/chiller.png" 
                alt="Chiller System" 
                className="img-fluid drop-shadow-glow" 
                style={{ mixBlendMode: 'screen', filter: 'contrast(1.2) brightness(1.2)' }} 
                onLoad={() => setImageLoaded(true)}
              />
            </div>

          </div>
        </Col>

        {/* PERFORMANCE ANALYTICS SECTION */}
        <Col xl={4}>
          <div className="h-100 rounded-4 p-4 border border-white border-opacity-5 d-flex flex-column" style={{ background: '#0f172a' }}>
            <div className="d-flex justify-content-center mb-5">
              <Nav variant="pills" className="bg-dark bg-opacity-50 p-1 rounded-pill border border-white border-opacity-5">
                <Nav.Item>
                  <Nav.Link 
                    className={`rounded-pill px-4 py-1 fs-12 fw-bold text-uppercase tracking-wider ${timeRange === 'DAY' ? 'bg-info text-dark' : 'text-muted'}`}
                    onClick={() => setTimeRange('DAY')}
                  >
                    Day
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    className={`rounded-pill px-4 py-1 fs-12 fw-bold text-uppercase tracking-wider ${timeRange === 'MONTH' ? 'bg-info text-dark' : 'text-muted'}`}
                    onClick={() => setTimeRange('MONTH')}
                  >
                    Month
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>

            <div className="flex-grow-1 d-flex flex-column justify-content-center">
              <StatCard title="Running Time" value={currentStats.runningTime} unit="" icon={<Clock size={24} />} colorHex="#22c55e" />
              <StatCard title="Energy Consumed" value={currentStats.energyConsumed} unit="kWh" icon={<Zap size={24} />} colorHex="#3b82f6" />
              <StatCard title="Cooling Effect Delivered" value={currentStats.coolingEffect} unit="TRh" icon={<Snowflake size={24} />} colorHex="#06b6d4" />
              <StatCard title="Specific Power Consumption" value={currentStats.sec} unit="kW/TR" icon={<Gauge size={24} />} colorHex="#f59e0b" />
            </div>
          </div>
        </Col>
      </Row>

      {/* TREND CHART SECTION */}
      <Row className="mt-2">
        <Col xl={12}>
          <Card className="bg-panel border-0 rounded-4 overflow-hidden border border-white border-opacity-5" style={{ background: '#0f172a' }}>
            <div className="px-4 py-3 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 text-white fw-black tracking-widest uppercase fs-14 text-nowrap">
                <TrendingUp size={16} className="me-2 text-info" /> Instantaneous Trend
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
                  <BarChart data={graphData[graphTimeRange]} margin={{ top: 20, right: 20, left: 0, bottom: 5 }} barGap={4} maxBarSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} dx={10} />
                    <ChartTooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                      itemStyle={{ fontSize: '13px', fontWeight: 'bold' }} 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 'bold' }} />
                    <Bar yAxisId="left" dataKey="power" name="Power (kW)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="coolingEffect" name="Cooling Effect (TR)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="sec" name="SEC (kW/TR)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
            <div className="bg-black bg-opacity-30 p-4 border-top border-white border-opacity-5">
              <p className="text-muted fw-bold fs-14 mb-3">
                <span className="text-white">Daily and monthly performance analytics</span> help track energy usage patterns and optimize cooling operations for maximum efficiency.
              </p>
              <div className="d-flex flex-wrap gap-4">
                {["Running time analysis", "Energy consumption tracking", "Cooling effect delivered", "SEC performance trends"].map((text, i) => (
                  <div key={i} className="d-flex align-items-center gap-2 text-muted fs-13 fw-bold">
                    <div className="bg-info rounded-circle" style={{ width: 6, height: 6 }}></div>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Internal CSS for scoped styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .scada-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }
        .tracking-widest { letter-spacing: 2px !important; }
        .tracking-wider { letter-spacing: 1px !important; }
        .fw-black { font-weight: 900 !important; }
        .fs-11 { font-size: 0.6875rem !important; }
        .fs-12 { font-size: 0.75rem !important; }
        .fs-13 { font-size: 0.8125rem !important; }
        .fs-14 { font-size: 0.875rem !important; }
        .max-w-3xl { max-width: 48rem; }
        
        .scada-tile {
          transition: all 0.2s ease;
        }
        .scada-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.5) !important;
        }

        .drop-shadow-glow {
          filter: drop-shadow(0 0 30px rgba(14, 165, 233, 0.2));
          animation: pulseGlow 4s infinite alternate;
        }
        
        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 30px rgba(14, 165, 233, 0.1)); }
          100% { filter: drop-shadow(0 0 50px rgba(14, 165, 233, 0.3)); }
        }

        .flow-line {
          animation: flowDash 1s linear infinite;
        }
        
        @keyframes flowDash {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }

        .blue-glow { filter: drop-shadow(0 0 8px #0ea5e9); }
        .cyan-glow { filter: drop-shadow(0 0 8px #22d3ee); }
        .orange-glow { filter: drop-shadow(0 0 8px #f97316); }
        .red-glow { filter: drop-shadow(0 0 8px #ef4444); }
      `}} />
    </div>
  );
};

export default Chiller;
