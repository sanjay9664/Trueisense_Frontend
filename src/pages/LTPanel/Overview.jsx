import React, { useState, useEffect } from 'react';
import { Row, Col, Card, ProgressBar } from 'react-bootstrap';
import { Zap, Activity, Power, ShieldAlert } from 'lucide-react';

const LTOverview = () => {
  const [time, setTime] = useState(new Date());

  // Simulated state for Overview
  const [data, setData] = useState({
    totalLoad: 124.5,
    powerFactor: 0.97,
    dailyEnergy: 1450,
    activeAlarms: 2,
    rooms: [
      { id: 1, name: 'LT Room 1', load: 35.4, capacity: 100, pf: 0.98, status: 'Healthy' },
      { id: 2, name: 'LT Room 2', load: 45.1, capacity: 100, pf: 0.96, status: 'Warning' },
      { id: 3, name: 'LT Room 3', load: 44.0, capacity: 100, pf: 0.97, status: 'Healthy' }
    ]
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setData(prev => {
        const newRooms = prev.rooms.map(room => ({
          ...room,
          load: Math.max(10, room.load + (Math.random() * 2 - 1)),
          pf: Math.min(1.0, Math.max(0.85, room.pf + (Math.random() * 0.02 - 0.01)))
        }));
        const newTotalLoad = newRooms.reduce((acc, curr) => acc + curr.load, 0);
        return {
          ...prev,
          totalLoad: newTotalLoad,
          rooms: newRooms
        };
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

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
            <Activity className="me-2 text-primary" size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' }} />
            LT Panel Overview
          </h2>
          <p className="text-secondary fs-8 mb-0 uppercase tracking-widest">Facility-Wide Low Tension Network</p>
        </div>
      </div>

      {/* KPI BAR */}
      <Row className="g-4 mb-4">
        {[
          { label: 'Total Active Load', val: data.totalLoad.toFixed(1), unit: 'kW', icon: <Zap />, color: '#3b82f6' },
          { label: 'Avg Power Factor', val: data.powerFactor.toFixed(2), unit: 'PF', icon: <Activity />, color: '#10b981' },
          { label: 'Daily Energy', val: data.dailyEnergy, unit: 'kWh', icon: <Power />, color: '#8b5cf6' },
          { label: 'Active Alarms', val: data.activeAlarms, unit: '', icon: <ShieldAlert />, color: '#ef4444' }
        ].map((kpi, i) => (
          <Col xl={3} lg={6} key={i}>
            <Card className="border-0 overflow-hidden h-100 scada-card" style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div className="position-absolute" style={{ top: '-20px', right: '-20px', width: '80px', height: '80px', background: kpi.color, filter: 'blur(40px)', opacity: 0.15 }}></div>
               <Card.Body className="p-4 d-flex align-items-center">
                 <div className="rounded-circle d-flex align-items-center justify-content-center me-4 shadow-sm" style={{ width: '56px', height: '56px', background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.1)` }}>
                   {React.cloneElement(kpi.icon, { color: kpi.color, size: 24 })}
                 </div>
                 <div>
                   <span className="text-secondary fw-bold fs-10 uppercase tracking-widest d-block mb-1">{kpi.label}</span>
                   <h3 className="text-white fw-bold mb-0 font-monospace">
                     {kpi.val} <span className="fs-6 text-secondary">{kpi.unit}</span>
                   </h3>
                 </div>
               </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ROOM COMPARISON */}
      <h5 className="text-white fw-bold text-uppercase fs-6 mb-3 d-flex align-items-center mt-2">
        <Power className="me-2 text-primary" size={20} />
        Room-wise Performance
      </h5>
      <Row className="g-4">
        {data.rooms.map(room => {
          const loadPercent = (room.load / room.capacity) * 100;
          const isWarning = room.status === 'Warning';
          const pColor = isWarning ? '#f59e0b' : '#10b981';
          
          return (
            <Col xl={4} lg={12} key={room.id}>
              <Card className={`border-0 h-100 ${isWarning ? 'animate-pulse' : ''}`} style={{ background: `linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)`, borderRadius: '16px', border: `1px solid ${pColor}40`, boxShadow: isWarning ? `0 0 20px ${pColor}30` : 'none' }}>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="text-white fw-bold m-0">{room.name}</h5>
                    <div className="px-3 py-1 rounded-pill fs-9 fw-bold text-uppercase" style={{ background: `${pColor}20`, color: pColor, border: `1px solid ${pColor}50` }}>
                      {room.status}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary fs-9 uppercase tracking-widest">Current Load</span>
                      <span className="text-white font-monospace">{room.load.toFixed(1)} kW / {room.capacity} kW</span>
                    </div>
                    <ProgressBar now={loadPercent} variant={isWarning ? 'warning' : 'success'} style={{ height: '8px', background: 'rgba(255,255,255,0.05)' }} />
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-3 rounded-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-secondary fw-bold fs-9 uppercase">Power Factor</span>
                    <span className="text-white font-monospace fw-bold">{room.pf.toFixed(3)}</span>
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

export default LTOverview;
