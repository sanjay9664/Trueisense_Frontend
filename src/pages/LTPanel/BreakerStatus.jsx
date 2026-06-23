import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Table, Form, InputGroup } from 'react-bootstrap';
import { Power, ShieldAlert, CheckCircle2, Search, Filter } from 'lucide-react';

const BreakerStatus = () => {
  const [time, setTime] = useState(new Date());

  const [breakers, setBreakers] = useState([
    { id: 'BRK-001', location: 'LT Room 1', type: 'ACB', rating: '1200A', load: 85, spring: 'Charged', trips: 0, status: 'ON' },
    { id: 'BRK-002', location: 'LT Room 1', type: 'ACB', rating: '1200A', load: 45, spring: 'Charged', trips: 1, status: 'ON' },
    { id: 'BRK-003', location: 'LT Room 1', type: 'MCCB', rating: '400A', load: 0, spring: 'Discharged', trips: 3, status: 'TRIP' },
    { id: 'BRK-004', location: 'LT Room 2', type: 'MCCB', rating: '630A', load: 92, spring: 'Charged', trips: 0, status: 'ON' },
    { id: 'BRK-005', location: 'LT Room 2', type: 'MCCB', rating: '250A', load: 0, spring: 'Discharged', trips: 0, status: 'OFF' },
    { id: 'BRK-006', location: 'LT Room 3', type: 'ACB', rating: '2000A', load: 60, spring: 'Charged', trips: 0, status: 'ON' },
    { id: 'BRK-007', location: 'LT Room 3', type: 'MCCB', rating: '800A', load: 78, spring: 'Charged', trips: 2, status: 'ON' }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setBreakers(prev => prev.map(b => b.status === 'ON' ? {
        ...b,
        load: Math.min(100, Math.max(0, b.load + (Math.random() * 4 - 2)))
      } : b));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const stats = {
    total: breakers.length,
    on: breakers.filter(b => b.status === 'ON').length,
    off: breakers.filter(b => b.status === 'OFF').length,
    trip: breakers.filter(b => b.status === 'TRIP').length
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
            <Power className="me-2 text-danger" size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.8))' }} />
            Breaker Diagnostics
          </h2>
          <p className="text-secondary fs-8 mb-0 uppercase tracking-widest">Centralized Breaker State & Protection Monitoring</p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {[
          { label: 'Total Breakers', val: stats.total, color: '#3b82f6', icon: <Power /> },
          { label: 'Active (ON)', val: stats.on, color: '#10b981', icon: <CheckCircle2 /> },
          { label: 'Standby (OFF)', val: stats.off, color: '#64748b', icon: <Power /> },
          { label: 'Tripped (FAULT)', val: stats.trip, color: '#ef4444', icon: <ShieldAlert /> }
        ].map((s, i) => (
          <Col xl={3} lg={6} key={i}>
            <Card className="border-0 overflow-hidden h-100" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div className="position-absolute" style={{ top: '-20px', right: '-20px', width: '80px', height: '80px', background: s.color, filter: 'blur(40px)', opacity: 0.15 }}></div>
               <Card.Body className="p-4 d-flex align-items-center justify-content-between">
                 <div>
                   <span className="text-secondary fw-bold fs-10 uppercase tracking-widest d-block mb-1">{s.label}</span>
                   <h3 className="text-white fw-bold mb-0 font-monospace">{s.val}</h3>
                 </div>
                 <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '48px', height: '48px', background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.1)` }}>
                   {React.cloneElement(s.icon, { color: s.color, size: 20 })}
                 </div>
               </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="border-0 flex-grow-1 overflow-hidden" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="p-4 border-bottom border-secondary border-opacity-25 d-flex justify-content-between align-items-center bg-dark bg-opacity-25">
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text className="bg-transparent border-secondary border-opacity-25 text-secondary">
              <Search size={16} />
            </InputGroup.Text>
            <Form.Control placeholder="Search Breaker ID..." className="bg-transparent border-secondary border-opacity-25 text-white shadow-none" />
          </InputGroup>
          <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2 rounded-pill px-3 fs-9 uppercase tracking-widest fw-bold">
            <Filter size={14} /> Filter Status
          </button>
        </div>
        <div className="table-responsive">
          <Table hover variant="dark" className="mb-0 align-middle" style={{ backgroundColor: 'transparent' }}>
            <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
              <tr>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 px-4 border-bottom-0">Breaker ID</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 border-bottom-0">Location</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 border-bottom-0">Type & Rating</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 border-bottom-0 text-center">Spring Status</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 text-center border-bottom-0">Current Load</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 text-center border-bottom-0">State</th>
              </tr>
            </thead>
            <tbody>
              {breakers.map(b => {
                const isTrip = b.status === 'TRIP';
                const isOff = b.status === 'OFF';
                const sColor = isTrip ? '#ef4444' : isOff ? '#64748b' : '#10b981';

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className={isTrip ? 'bg-danger bg-opacity-10' : ''}>
                    <td className="px-4 py-3">
                      <div className="d-flex flex-column">
                        <span className="text-white fw-bold font-monospace">{b.id}</span>
                        {isTrip && <span className="text-danger fs-11 uppercase tracking-widest fw-bold mt-1">Check Required</span>}
                      </div>
                    </td>
                    <td className="py-3 text-secondary fw-bold fs-9">{b.location}</td>
                    <td className="py-3">
                      <div className="d-flex align-items-center gap-2">
                        <Badge bg="dark" className="border border-secondary border-opacity-50 text-white fs-10 px-2 py-1">{b.type}</Badge>
                        <span className="text-info fw-bold font-monospace fs-9">{b.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                       <span className={`fw-bold fs-10 uppercase tracking-widest ${b.spring === 'Charged' ? 'text-success' : 'text-warning'}`}>
                         {b.spring}
                       </span>
                    </td>
                    <td className="py-3 text-center">
                      <div className="d-flex flex-column align-items-center">
                        <span className={`font-monospace fw-bold ${isOff || isTrip ? 'text-secondary' : 'text-white'}`}>{b.load.toFixed(1)}%</span>
                        <div className="progress mt-1" style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                          <div className={`progress-bar ${b.load > 90 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${b.load}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <Badge bg="transparent" className={`border px-3 py-1 rounded-pill ${isTrip ? 'animate-pulse' : ''}`} style={{ borderColor: sColor, color: sColor, background: `${sColor}15` }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle" style={{ width: 6, height: 6, background: sColor, boxShadow: `0 0 8px ${sColor}` }}></div>
                          {b.status}
                        </div>
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default BreakerStatus;
