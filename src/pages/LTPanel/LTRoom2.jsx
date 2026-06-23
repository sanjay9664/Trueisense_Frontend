import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, ProgressBar } from 'react-bootstrap';
import { Zap, Activity, Power, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

const LTRoom2 = () => {
  const [time, setTime] = useState(new Date());
  
  // Simulated data state for Room 2
  const [metrics, setMetrics] = useState({
    voltage: { r: 232, y: 233, b: 234 },
    current: { r: 160, y: 158, b: 165 },
    powerFactor: 0.95,
    frequency: 49.9,
    totalLoad: 45.1,
    energy: 22104,
    breakers: [
      { id: 'INC-2', name: 'Main Incomer 2', status: 'ON', load: 72, type: 'ACB' },
      { id: 'OUT-10', name: 'Chiller Plant A', status: 'ON', load: 88, type: 'MCCB' },
      { id: 'OUT-11', name: 'Chiller Plant B', status: 'ON', load: 85, type: 'MCCB' },
      { id: 'OUT-12', name: 'AHU Panel 1', status: 'ON', load: 55, type: 'MCCB' }
    ]
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setMetrics(prev => ({
        ...prev,
        voltage: {
          r: 232 + (Math.random() * 4 - 2),
          y: 233 + (Math.random() * 4 - 2),
          b: 234 + (Math.random() * 4 - 2)
        },
        current: {
          r: 160 + (Math.random() * 10 - 5),
          y: 158 + (Math.random() * 10 - 5),
          b: 165 + (Math.random() * 10 - 5)
        },
        powerFactor: Math.min(1.0, Math.max(0.9, prev.powerFactor + (Math.random() * 0.02 - 0.01))),
        frequency: 49.9 + (Math.random() * 0.1 - 0.05),
        totalLoad: 45.1 + (Math.random() * 2 - 1)
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON': return '#10b981';
      case 'OFF': return '#64748b';
      case 'TRIP': return '#ef4444';
      default: return '#fbbf24';
    }
  };

  return (
    <div className="fade-in p-3 h-100 d-flex flex-column" style={{ background: '#0f172a', minHeight: '100vh' }}>
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-start mb-4 pb-3 border-bottom border-secondary border-opacity-25">
        <div>
          <div className="d-flex align-items-center gap-3 mb-2">
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div className="rounded-circle" style={{ width: '8px', height: '8px', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
              <span className="text-success fw-bold fs-9 uppercase tracking-widest">LIVE SYNC</span>
            </div>
            <div className="text-secondary fw-bold fs-9 uppercase px-3 py-1 rounded-pill" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {time.toLocaleTimeString()}
            </div>
          </div>
          <h2 className="text-white fw-bold mb-1 d-flex align-items-center text-uppercase tracking-wide">
            <Zap className="me-2 text-warning" size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.8))' }} />
            LT Room - 2
          </h2>
          <p className="text-secondary fs-8 mb-0 uppercase tracking-widest">HVAC & Heavy Machinery Distribution</p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {/* QUICK STATS */}
        {[
          { label: 'Total Load', val: metrics.totalLoad.toFixed(1), unit: 'kW', icon: <Activity />, color: '#38bdf8' },
          { label: 'Power Factor', val: metrics.powerFactor.toFixed(3), unit: 'PF', icon: <Zap />, color: '#10b981' },
          { label: 'Frequency', val: metrics.frequency.toFixed(2), unit: 'Hz', icon: <Activity />, color: '#f59e0b' },
          { label: 'Total Energy', val: metrics.energy, unit: 'kWh', icon: <Power />, color: '#8b5cf6' }
        ].map((stat, i) => (
          <Col xl={3} lg={6} key={i}>
             <Card className="border-0 overflow-hidden h-100 scada-card" style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="position-absolute" style={{ top: '-20px', right: '-20px', width: '80px', height: '80px', background: stat.color, filter: 'blur(40px)', opacity: 0.15 }}></div>
                <Card.Body className="p-4 d-flex align-items-center">
                  <div className="rounded-circle d-flex align-items-center justify-content-center me-4 shadow-sm" style={{ width: '56px', height: '56px', background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.1)` }}>
                    {React.cloneElement(stat.icon, { color: stat.color, size: 24 })}
                  </div>
                  <div>
                    <span className="text-secondary fw-bold fs-10 uppercase tracking-widest d-block mb-1">{stat.label}</span>
                    <h3 className="text-white fw-bold mb-0 font-monospace">
                      {stat.val} <span className="fs-6 text-secondary">{stat.unit}</span>
                    </h3>
                  </div>
                </Card.Body>
             </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4 mb-4">
        {/* PHASE MONITORING */}
        <Col xl={8} lg={12}>
          <Card className="border-0 h-100" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Card.Header className="bg-transparent border-bottom border-secondary border-opacity-25 p-4">
               <h5 className="text-white fw-bold text-uppercase fs-6 m-0 d-flex align-items-center">
                 <Activity className="me-2 text-info" size={20} />
                 Live Phase Metrics
               </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row className="g-4">
                {['r', 'y', 'b'].map((phase, i) => {
                  const colors = { r: '#ef4444', y: '#eab308', b: '#3b82f6' };
                  const labels = { r: 'R Phase', y: 'Y Phase', b: 'B Phase' };
                  const color = colors[phase];
                  return (
                    <Col md={4} key={phase}>
                      <div className="p-4 rounded-4 position-relative overflow-hidden text-center" style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${color}30` }}>
                        <div className="position-absolute" style={{ top: 0, left: 0, right: 0, height: '4px', background: color, boxShadow: `0 0 10px ${color}` }}></div>
                        <h6 className="text-white fw-bold text-uppercase mb-4" style={{ letterSpacing: '1px' }}>{labels[phase]}</h6>
                        
                        <div className="mb-4">
                          <span className="text-secondary opacity-75 fw-bold uppercase tracking-widest d-block mb-1 fs-11">Voltage (V-N)</span>
                          <div className="display-5 fw-bold font-monospace" style={{ color: color, textShadow: `0 0 15px ${color}60` }}>
                            {metrics.voltage[phase].toFixed(1)} <small className="fs-6 text-muted">V</small>
                          </div>
                        </div>

                        <div>
                          <span className="text-secondary opacity-75 fw-bold uppercase tracking-widest d-block mb-1 fs-11">Current</span>
                          <div className="fs-3 fw-bold font-monospace text-white">
                            {metrics.current[phase].toFixed(1)} <small className="fs-6 text-muted">A</small>
                          </div>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* SYSTEM STATUS */}
        <Col xl={4} lg={12}>
          <Card className="border-0 h-100" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Card.Header className="bg-transparent border-bottom border-secondary border-opacity-25 p-4">
               <h5 className="text-white fw-bold text-uppercase fs-6 m-0 d-flex align-items-center">
                 <ShieldAlert className="me-2 text-primary" size={20} />
                 System Diagnostics
               </h5>
            </Card.Header>
            <Card.Body className="p-4 d-flex flex-column justify-content-center">
              <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span className="text-white fw-bold text-uppercase fs-9">Main Mains Status</span>
                <Badge bg="success" className="px-3 py-2 rounded-pill fs-9 text-uppercase">Healthy</Badge>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span className="text-white fw-bold text-uppercase fs-9">Temperature</span>
                <span className="text-warning fw-bold font-monospace fs-6">38°C</span>
              </div>
              <div className="d-flex justify-content-between align-items-center p-3 rounded-3" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span className="text-white fw-bold text-uppercase fs-9">Cooling Fans</span>
                <Badge bg="success" className="px-3 py-2 rounded-pill fs-9 text-uppercase">Running</Badge>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* OUTGOING BREAKERS */}
      <h5 className="text-white fw-bold text-uppercase fs-6 mb-3 d-flex align-items-center mt-2">
        <Power className="me-2 text-primary" size={20} />
        Breaker Status (Outgoing Feeders - Room 2)
      </h5>
      <Row className="g-4">
        {metrics.breakers.map((breaker, i) => {
          const sColor = getStatusColor(breaker.status);
          const isTrip = breaker.status === 'TRIP';
          const isOff = breaker.status === 'OFF';
          
          return (
            <Col xl={4} lg={6} md={12} key={i}>
               <Card className={`border-0 h-100 ${isTrip ? 'animate-pulse' : ''}`} style={{ background: `linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)`, borderRadius: '16px', border: `1px solid ${sColor}40`, boxShadow: isTrip ? `0 0 20px ${sColor}40` : 'none' }}>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <Badge bg="transparent" className="border px-2 py-1 rounded fs-11 text-uppercase mb-2" style={{ borderColor: sColor, color: sColor }}>
                          {breaker.type}
                        </Badge>
                        <h6 className="text-white fw-bold text-uppercase fs-6 m-0">{breaker.name}</h6>
                        <small className="text-secondary fw-bold fs-10 uppercase tracking-widest">{breaker.id}</small>
                      </div>
                      <Badge bg="transparent" className="border px-3 py-2 rounded-pill shadow-sm fs-9 text-uppercase d-flex align-items-center gap-2" style={{ borderColor: sColor, color: sColor, background: `${sColor}15` }}>
                        <div className="rounded-circle" style={{ width: 8, height: 8, background: sColor, boxShadow: `0 0 8px ${sColor}` }}></div>
                        {breaker.status}
                      </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                       <div>
                         <span className="text-secondary opacity-75 fw-bold uppercase tracking-widest d-block mb-1 fs-11">Current Load</span>
                         <span className={`fw-bold font-monospace fs-5 ${isOff ? 'text-secondary' : 'text-white'}`}>
                           {breaker.load} <small className="fs-9 text-muted">%</small>
                         </span>
                       </div>
                       <div style={{ width: '50%' }}>
                         <ProgressBar 
                           now={breaker.load} 
                           variant={isTrip ? 'danger' : isOff ? 'secondary' : breaker.load > 80 ? 'warning' : 'success'} 
                           style={{ height: '6px', background: 'rgba(255,255,255,0.05)' }} 
                         />
                       </div>
                    </div>
                  </Card.Body>
               </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default LTRoom2;
