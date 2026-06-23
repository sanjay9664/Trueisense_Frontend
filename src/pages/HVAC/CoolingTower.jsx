import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Nav, Badge } from 'react-bootstrap';
import { Activity, Thermometer, Wind, RefreshCw, Zap, TrendingUp, List } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, ResponsiveContainer, Legend
} from 'recharts';

const CoolingTower = () => {
  const [graphTimeRange, setGraphTimeRange] = useState('DAY');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(true);

  const fanRotationRef = useRef(0);
  const fanVelocityRef = useRef(15); // Current rotational velocity (balanced fast)
  const targetVelocityRef = useRef(15); // Target velocity
  const requestRef = useRef();

  useEffect(() => {
    targetVelocityRef.current = isRunning ? 15 : 0;
  }, [isRunning]);

  useEffect(() => {
    const animate = () => {
      // Smoothly approach target velocity (inertia effect)
      if (fanVelocityRef.current < targetVelocityRef.current) {
        fanVelocityRef.current += 0.08; // Slowly speed up
        if (fanVelocityRef.current > targetVelocityRef.current) fanVelocityRef.current = targetVelocityRef.current;
      } else if (fanVelocityRef.current > targetVelocityRef.current) {
        fanVelocityRef.current -= 0.08; // Slowly slow down
        if (fanVelocityRef.current < 0) fanVelocityRef.current = 0;
      }

      fanRotationRef.current += fanVelocityRef.current;

      // Apply rotation directly to DOM for performance
      const fanSvg = document.getElementById('cooling-tower-fan');
      if (fanSvg) {
        fanSvg.style.transform = `rotate(${fanRotationRef.current}deg)`;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // Mock data for the Instantaneous Trend chart
  const graphData = {
    DAY: [
      { time: '00:00', approach: 2.1, effectiveness: 45, range: 4.5 },
      { time: '04:00', approach: 2.5, effectiveness: 50, range: 5.0 },
      { time: '08:00', approach: 3.1, effectiveness: 58, range: 6.2 },
      { time: '12:00', approach: 4.2, effectiveness: 65, range: 7.5 },
      { time: '16:00', approach: 3.8, effectiveness: 60, range: 7.0 },
      { time: '20:00', approach: 2.8, effectiveness: 52, range: 5.5 },
      { time: '23:59', approach: 2.2, effectiveness: 48, range: 4.8 },
    ],
    WEEK: [
      { time: 'Mon', approach: 2.8, effectiveness: 55, range: 5.2 },
      { time: 'Tue', approach: 3.1, effectiveness: 58, range: 6.0 },
      { time: 'Wed', approach: 3.5, effectiveness: 62, range: 6.5 },
      { time: 'Thu', approach: 2.9, effectiveness: 56, range: 5.5 },
      { time: 'Fri', approach: 3.8, effectiveness: 65, range: 7.1 },
      { time: 'Sat', approach: 2.5, effectiveness: 50, range: 4.8 },
      { time: 'Sun', approach: 2.2, effectiveness: 45, range: 4.5 },
    ],
    MONTH: [
      { time: 'Week 1', approach: 3.0, effectiveness: 56, range: 5.8 },
      { time: 'Week 2', approach: 3.2, effectiveness: 59, range: 6.1 },
      { time: 'Week 3', approach: 3.5, effectiveness: 63, range: 6.6 },
      { time: 'Week 4', approach: 2.8, effectiveness: 54, range: 5.2 },
    ],
    YEAR: [
      { time: 'Jan', approach: 2.0, effectiveness: 40, range: 4.0 },
      { time: 'Feb', approach: 2.2, effectiveness: 42, range: 4.5 },
      { time: 'Mar', approach: 2.8, effectiveness: 50, range: 5.5 },
      { time: 'Apr', approach: 3.5, effectiveness: 60, range: 6.8 },
      { time: 'May', approach: 4.2, effectiveness: 68, range: 7.5 },
      { time: 'Jun', approach: 4.8, effectiveness: 72, range: 8.2 },
      { time: 'Jul', approach: 5.0, effectiveness: 75, range: 8.5 },
      { time: 'Aug', approach: 4.5, effectiveness: 70, range: 8.0 },
      { time: 'Sep', approach: 3.8, effectiveness: 65, range: 7.0 },
      { time: 'Oct', approach: 3.0, effectiveness: 55, range: 6.0 },
      { time: 'Nov', approach: 2.5, effectiveness: 48, range: 5.0 },
      { time: 'Dec', approach: 2.1, effectiveness: 42, range: 4.2 },
    ],
    CUSTOM: [
      { time: 'Oct 10', approach: 3.0, effectiveness: 56, range: 5.8 },
      { time: 'Oct 11', approach: 3.2, effectiveness: 59, range: 6.1 },
      { time: 'Oct 12', approach: 3.5, effectiveness: 63, range: 6.6 },
      { time: 'Oct 13', approach: 3.4, effectiveness: 61, range: 6.4 },
      { time: 'Oct 14', approach: 3.1, effectiveness: 58, range: 6.0 },
    ]
  };

  const StatCard = ({ title, value, unit, icon, colorHex, bgColor = 'transparent' }) => (
    <div className="d-flex align-items-center justify-content-between p-3 mb-3 rounded-4 scada-tile" style={{ background: bgColor === 'transparent' ? `linear-gradient(90deg, ${colorHex}15 0%, transparent 100%)` : bgColor, border: `1px solid ${colorHex}30`, borderLeft: `4px solid ${colorHex}` }}>
      <div className="d-flex align-items-center gap-3 w-100">
        <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: `${colorHex}20`, color: colorHex }}>
          {icon}
        </div>
        <div className="flex-grow-1">
          <div className="text-muted text-uppercase fw-bold fs-11 tracking-wider mb-1">{title}</div>
          <div className="d-flex align-items-baseline gap-1">
            <span className="fs-4 fw-black text-white">{value}</span>
            {unit && <span className="text-muted fs-12 fw-bold">{unit}</span>}
          </div>
        </div>
      </div>
    </div>
  );

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
    <div className="cooling-tower-wrapper p-4 h-100 d-flex flex-column" style={{ background: 'transparent', minHeight: '100vh', overflowY: 'auto' }}>
      {/* Page Header */}
      <div className="mb-4 d-flex justify-content-between align-items-start bg-panel p-4 rounded-4 border border-white border-opacity-5" style={{ background: '#0f172a' }}>
        <div className="pe-4">
          <div className="d-flex align-items-center gap-3 mb-2">
            <div className="p-2 bg-info bg-opacity-10 rounded-3">
              <Activity className="text-info" size={24} />
            </div>
            <h4 className="mb-0 text-white fw-black tracking-tight">Cooling Tower Monitoring System</h4>
          </div>
          <p className="text-muted fs-14 mb-0 mt-3" style={{ maxWidth: '900px', lineHeight: '1.6' }}>
            The <strong className="text-white">Cooling Tower Monitoring System</strong> provides real-time visibility into thermal performance, water circulation efficiency, and energy consumption of cooling tower operations. It helps optimize heat rejection, reduce energy waste, and ensure stable HVAC system performance through continuous monitoring and analytics.
          </p>
        </div>
        <div className="d-flex flex-column gap-2 text-end align-items-end">
          <div className="d-flex gap-2">
            <Badge bg={isRunning ? "success" : "danger"} className="px-3 py-2 rounded-pill fw-bold tracking-wider">{isRunning ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}</Badge>
            <Badge bg="info" className="px-3 py-2 rounded-pill fw-bold tracking-wider">AUTO MODE</Badge>
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`btn mt-2 fw-bold rounded-pill text-white shadow ${isRunning ? 'bg-danger hover-darken' : 'bg-success hover-darken'}`}
            style={{ border: 'none', padding: '8px 24px', letterSpacing: '1px', transition: 'all 0.3s' }}
          >
            {isRunning ? '■ STOP FAN' : '▶ START FAN'}
          </button>
        </div>
      </div>

      <style>
        {`
          /* Keeping empty block in case other keyframes are added later, or remove entirely if unused */
        `}
      </style>
      <Row className="g-4 mb-4" style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>
        {/* DIAGRAM SECTION */}
        <Col xl={12}>
          <div className="cooling-diagram-container position-relative w-100 rounded-4 overflow-hidden border border-white border-opacity-5 shadow-lg" style={{ background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)', height: '850px' }}>

            {/* SVG Flow Lines Overlay */}
            <svg className="flow-lines-overlay" viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }}>
              <defs>
                <path id="pathAmbient" d="M 220 250 L 350 250" />
                <path id="pathReturn" d="M 780 250 L 650 250" />
                <path id="pathSump" d="M 650 450 L 780 450" />
                <path id="pathExhaust" d="M 500 180 L 500 60" />
                <path id="pathExhaustLeft" d="M 450 180 L 400 60" />
                <path id="pathExhaustRight" d="M 550 180 L 600 60" />

                <marker id="arrowWhite" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#e2e8f0" />
                </marker>
                <marker id="arrowOrange" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#f97316" />
                </marker>
                <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#0ea5e9" />
                </marker>
                <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                  <path d="M 0 0 L 6 3 L 0 6 z" fill="#ef4444" />
                </marker>
              </defs>

              <use href="#pathAmbient" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeDasharray="10 5" markerEnd="url(#arrowWhite)" opacity="0.6">
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
              </use>
              <use href="#pathReturn" stroke="#f97316" strokeWidth="3" fill="none" strokeDasharray="10 5" markerEnd="url(#arrowOrange)">
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
              </use>
              <use href="#pathSump" stroke="#0ea5e9" strokeWidth="3" fill="none" strokeDasharray="10 5" markerEnd="url(#arrowBlue)">
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
              </use>
              <use href="#pathExhaust" stroke="#ef4444" strokeWidth="3" fill="none" strokeDasharray="10 5" markerEnd="url(#arrowRed)" opacity="0.8">
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
              </use>
              <use href="#pathExhaustLeft" stroke="#ef4444" strokeWidth="3" fill="none" strokeDasharray="10 5" markerEnd="url(#arrowRed)" opacity="0.6">
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
              </use>
              <use href="#pathExhaustRight" stroke="#ef4444" strokeWidth="3" fill="none" strokeDasharray="10 5" markerEnd="url(#arrowRed)" opacity="0.6">
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1s" repeatCount="indefinite" />
              </use>

              {/* Text Labels for Flows */}
              {/* Ambient Air (Left) */}
              <text x="220" y="220" fill="#e2e8f0" fontSize="16" fontWeight="bold" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }}>AMBIENT AIR</text>
              <text x="220" y="240" fill="#e2e8f0" fontSize="12" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }}>(Entering Tower)</text>

              {/* Hot Return Water (Right Top) */}
              <text x="780" y="220" fill="#f97316" fontSize="16" fontWeight="bold" textAnchor="end" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }}>HOT RETURN WATER</text>
              <text x="780" y="240" fill="#f97316" fontSize="12" textAnchor="end" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }}>(From Chiller Condenser)</text>

              {/* Cooled Water (Right Bottom) */}
              <text x="780" y="420" fill="#0ea5e9" fontSize="16" fontWeight="bold" textAnchor="end" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }}>COOLED WATER</text>
              <text x="780" y="440" fill="#0ea5e9" fontSize="12" textAnchor="end" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }}>(To Chiller Condenser)</text>

              {/* Exhaust Air (Top Center) */}
              <text x="500" y="25" fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="middle" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000, 0px 0px 8px #000' }}>EXHAUST AIR</text>
              <text x="500" y="45" fill="#ef4444" fontSize="12" textAnchor="middle" style={{ textShadow: '2px 2px 4px #000, -1px -1px 4px #000' }}>(Hot, Moist Air Out)</text>
            </svg>


            <style>
              {`
                @keyframes spin-fan {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}
            </style>

            {/* Center Cooling Tower Image */}
            <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ zIndex: 2, width: '95%', maxWidth: '850px' }}>
              <img
                src="/cooling_tower.png"
                alt="Cooling Tower"
                className="img-fluid drop-shadow-glow"
                style={{ mixBlendMode: 'screen', filter: 'contrast(1.1)' }}
                onLoad={() => setImageLoaded(true)}
              />

              {/* Spinning Fan Overlay */}
              <div style={{
                position: 'absolute',
                top: '24%',
                left: '50.5%',
                transform: 'translate(-50%, -50%) rotateX(60deg)',
                width: '38%',
                aspectRatio: '1/1',
                zIndex: 3,
                pointerEvents: 'none'
              }}>
                <svg id="cooling-tower-fan" viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  <g stroke="#1e293b" strokeWidth="1">
                    {[0, 60, 120, 180, 240, 300].map(angle => (
                      <g key={angle} transform={`rotate(${angle} 50 50)`}>
                        <path d="M 50 50 L 32 12 A 42 42 0 0 1 68 12 Z" fill="rgba(2, 6, 23, 0.92)" />
                      </g>
                    ))}
                    <circle cx="50" cy="50" r="14" fill="#0f172a" />
                    <circle cx="50" cy="50" r="6" fill="#334155" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Left Side Cards */}
            <LabelCard title="Pump" data={[{ label: 'Status', value: 'Off' }, { label: 'Power', value: '---' }]} top="8%" left="2%" />
            <LabelCard title="Ambient" data={[{ label: 'WBT', value: '21.28 °C' }, { label: 'DBT', value: '26.80 °C' }, { label: 'Hum', value: '61.1 %' }]} top="26%" left="2%" />
            <LabelCard title="Pressure" data={[{ label: 'Inlet', value: '---' }, { label: 'Outlet', value: '---' }]} top="46%" left="2%" />
            <LabelCard title="Make-Up Water" data={[{ label: 'Valve', value: 'OPEN' }, { label: 'Flow', value: '15 LPM' }]} top="64%" left="2%" />
            <LabelCard title="Cooling Load" data={[{ label: 'Capacity', value: '82%' }, { label: 'Rejection', value: '1250 kW' }]} top="82%" left="2%" />

            {/* Right Side Cards */}
            <LabelCard title="Fan Status" data={[{ label: 'Status', value: 'ON' }, { label: 'Power', value: '4.2 kW' }]} top="8%" right="2%" />
            <LabelCard title="Motor Diag." data={[{ label: 'Vibration', value: '1.2 mm/s' }, { label: 'VFD Freq', value: '48 Hz' }]} top="26%" right="2%" />
            <LabelCard title="Return Water" data={[{ label: 'Temp', value: '28.00 °C' }, { label: 'Flow', value: '450 LPM' }]} top="46%" right="2%" />
            <LabelCard title="Sump Water" data={[{ label: 'Temp', value: '27.30 °C' }, { label: 'Level', value: '85%' }]} top="64%" right="2%" />
            <LabelCard title="Blowdown" data={[{ label: 'Valve', value: 'CLOSED' }, { label: 'Cond.', value: '1200 µS' }]} top="82%" right="2%" />

            {/* Last Sync Overlay */}
            <div className="position-absolute p-3 rounded-4 shadow-lg" style={{ top: '3%', right: '2%', background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
              <div className="d-flex align-items-center gap-2">
                <RefreshCw size={14} className="text-info" />
                <div className="text-white text-opacity-75 fs-12 fw-bold tracking-wider">LAST SYNC: 07-APR-2026 14:48</div>
              </div>
            </div>

          </div>

          {/* KPI Bottom Overlay - Moved outside container to uncover the cooling tower basin */}
          <div className="mx-auto p-4 rounded-4 shadow-lg d-flex gap-5 align-items-center justify-content-center position-relative" style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', zIndex: 10, width: 'fit-content', marginTop: '-40px' }}>
            <div className="pe-4 border-end border-secondary border-opacity-25">
              <div className="text-white text-opacity-75 fs-12 fw-bold text-uppercase mb-1 tracking-wider">Key Performance Index</div>
              <div className="text-info fs-10 text-opacity-75 text-uppercase">Live Analytics</div>
            </div>
            <div className="text-center">
              <div className="fs-11 text-muted mb-1 text-uppercase fw-bold">Range</div>
              <div className="fs-3 fw-black text-white">0.7</div>
            </div>
            <div className="text-center">
              <div className="fs-11 text-muted mb-1 text-uppercase fw-bold">Approach</div>
              <div className="fs-3 fw-black text-white">0.5</div>
            </div>
            <div className="text-center">
              <div className="fs-11 text-muted mb-1 text-uppercase fw-bold">Effectiveness</div>
              <div className="fs-3 fw-black text-white">58.3%</div>
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
                <TrendingUp size={16} className="me-2 text-info" /> Instantaneous
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
                    <Bar yAxisId="left" dataKey="effectiveness" name="Effectiveness (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="approach" name="Approach" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="range" name="Range" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>


    </div>
  );
};

export default CoolingTower;
