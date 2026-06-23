import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Table } from 'react-bootstrap';
import { Zap, Activity, ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';

const IncomingOutgoing = () => {
  const [time, setTime] = useState(new Date());

  const [incomers, setIncomers] = useState([
    { id: 'INC-1', name: 'Main Transformer Incomer', voltage: 415, current: 850, kw: 600, pf: 0.99, status: 'Healthy' },
    { id: 'INC-2', name: 'DG Backup Incomer', voltage: 0, current: 0, kw: 0, pf: 0.0, status: 'Standby' }
  ]);

  const [outgoers, setOutgoers] = useState([
    { id: 'OUT-1', dest: 'HVAC Plant', current: 350, kw: 250, pf: 0.95, status: 'Active' },
    { id: 'OUT-2', dest: 'Lighting DBs', current: 120, kw: 85, pf: 0.98, status: 'Active' },
    { id: 'OUT-3', dest: 'Server Farm', current: 200, kw: 140, pf: 0.99, status: 'Active' },
    { id: 'OUT-4', dest: 'Pumps & Motors', current: 180, kw: 120, pf: 0.92, status: 'Active' }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      // Simulate live fluctuations for INC-1 and outgoers
      setIncomers(prev => [
        { ...prev[0], current: Math.max(0, prev[0].current + (Math.random() * 10 - 5)), kw: Math.max(0, prev[0].kw + (Math.random() * 5 - 2)) },
        prev[1]
      ]);
      setOutgoers(prev => prev.map(out => ({
        ...out,
        current: Math.max(0, out.current + (Math.random() * 6 - 3)),
        kw: Math.max(0, out.kw + (Math.random() * 4 - 2))
      })));
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
            <TrendingUp className="me-2 text-info" size={28} style={{ filter: 'drop-shadow(0 0 8px rgba(14,165,233,0.8))' }} />
            Incoming & Outgoing Feeders
          </h2>
          <p className="text-secondary fs-8 mb-0 uppercase tracking-widest">Feeder Level Load Distribution</p>
        </div>
      </div>

      <h5 className="text-white fw-bold text-uppercase fs-6 mb-3 d-flex align-items-center mt-2">
        <ArrowDownRight className="me-2 text-success" size={20} />
        Main Incomers
      </h5>
      <Row className="g-4 mb-5">
        {incomers.map(inc => (
          <Col xl={6} key={inc.id}>
            <Card className="border-0 h-100" style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-4 border-bottom border-secondary border-opacity-25 pb-3">
                  <div>
                    <h5 className="text-white fw-bold text-uppercase m-0">{inc.name}</h5>
                    <small className="text-secondary fw-bold fs-10 uppercase tracking-widest">{inc.id}</small>
                  </div>
                  <Badge bg={inc.status === 'Healthy' ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill fs-9 text-uppercase">
                    {inc.status}
                  </Badge>
                </div>
                
                <Row className="g-4 text-center">
                  <Col xs={4}>
                    <div className="p-3 rounded-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span className="text-secondary opacity-75 fw-bold uppercase tracking-widest d-block mb-1 fs-11">Current</span>
                      <span className="text-white fw-bold font-monospace fs-4">{inc.current.toFixed(1)} <small className="fs-9 text-muted">A</small></span>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="p-3 rounded-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span className="text-secondary opacity-75 fw-bold uppercase tracking-widest d-block mb-1 fs-11">Active Power</span>
                      <span className="text-white fw-bold font-monospace fs-4">{inc.kw.toFixed(1)} <small className="fs-9 text-muted">kW</small></span>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="p-3 rounded-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span className="text-secondary opacity-75 fw-bold uppercase tracking-widest d-block mb-1 fs-11">P. Factor</span>
                      <span className="text-white fw-bold font-monospace fs-4">{inc.pf.toFixed(2)}</span>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h5 className="text-white fw-bold text-uppercase fs-6 mb-3 d-flex align-items-center mt-2">
        <ArrowUpRight className="me-2 text-warning" size={20} />
        Outgoing Feeders Matrix
      </h5>
      <Card className="border-0 flex-grow-1 overflow-hidden" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="table-responsive">
          <Table hover variant="dark" className="mb-0 align-middle" style={{ backgroundColor: 'transparent' }}>
            <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
              <tr>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 px-4 border-bottom-0">Feeder ID</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 border-bottom-0">Destination</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 text-end border-bottom-0">Current (A)</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 text-end border-bottom-0">Power (kW)</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 text-end border-bottom-0">P. Factor</th>
                <th className="text-secondary text-uppercase fs-10 tracking-widest fw-bold py-3 text-center border-bottom-0">Status</th>
              </tr>
            </thead>
            <tbody>
              {outgoers.map(out => (
                <tr key={out.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td className="px-4 py-3"><span className="text-white fw-bold font-monospace">{out.id}</span></td>
                  <td className="py-3 text-white fw-bold fs-9">{out.dest}</td>
                  <td className="py-3 text-end font-monospace text-info fw-bold">{out.current.toFixed(1)}</td>
                  <td className="py-3 text-end font-monospace text-warning fw-bold">{out.kw.toFixed(1)}</td>
                  <td className="py-3 text-end font-monospace text-success fw-bold">{out.pf.toFixed(2)}</td>
                  <td className="py-3 text-center">
                    <Badge bg="transparent" className="border px-3 py-1 rounded-pill" style={{ borderColor: '#10b981', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                      {out.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default IncomingOutgoing;
