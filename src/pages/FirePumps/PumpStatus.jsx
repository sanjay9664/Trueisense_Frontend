import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Activity, Zap, Power, AlertTriangle, CheckCircle2 } from 'lucide-react';

const PumpStatus = () => {
  const [pumps, setPumps] = useState([
    { id: 1, name: 'Sprinkler Jockey Pump', mode: 'Auto', status: 'Running', voltage: 242.6, current: 5.2, power: 1.2, runtime: '12h 45m', trip: false },
    { id: 2, name: 'Hydrant Jockey Pump', mode: 'Auto', status: 'Standby', voltage: 241.2, current: 0.0, power: 0.0, runtime: '45h 10m', trip: false },
    { id: 3, name: 'Master Pump 1', mode: 'Manual', status: 'Off', voltage: 0.0, current: 0.0, power: 0.0, runtime: '120h 00m', trip: false },
    { id: 4, name: 'Master Pump 2', mode: 'Auto', status: 'Standby', voltage: 415.0, current: 0.0, power: 0.0, runtime: '85h 30m', trip: false },
    { id: 5, name: 'Diesel Engine Pump', mode: 'Auto', status: 'Standby', voltage: 12.4, current: 0.0, power: 0.0, runtime: '15h 20m', trip: false, fuel: 85, battery: 'Good' },
  ]);

  // Simulate slight voltage fluctuations for running pumps
  useEffect(() => {
    const interval = setInterval(() => {
      setPumps(prev => prev.map(pump => {
        if (pump.status === 'Running') {
          return { ...pump, voltage: +(pump.voltage + (Math.random() * 0.4 - 0.2)).toFixed(1), current: +(pump.current + (Math.random() * 0.2 - 0.1)).toFixed(1) };
        }
        return pump;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status, trip) => {
    if (trip) return <Badge bg="danger" className="px-3 py-2 rounded-pill">Tripped</Badge>;
    switch (status) {
      case 'Running': return <Badge bg="success" className="px-3 py-2 rounded-pill d-flex align-items-center gap-1"><Activity size={14}/> Running</Badge>;
      case 'Standby': return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Standby</Badge>;
      case 'Off': return <Badge bg="secondary" className="px-3 py-2 rounded-pill">Off</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const getModeBadge = (mode) => {
    return mode === 'Auto' ? 
      <Badge bg="info" className="px-2 py-1">Auto</Badge> : 
      <Badge bg="light" text="dark" className="px-2 py-1">Manual</Badge>;
  };

  return (
    <Container fluid className="py-4 px-lg-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 d-flex align-items-center gap-3">
        <Activity size={32} className="text-info" />
        <h3 className="fw-bold text-white mb-0">Detailed Pump Status</h3>
      </motion.div>

      <Row className="g-4 mb-4">
        <Col md={3}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card border-0 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted fw-semibold">Total Pumps</span>
                <Activity size={20} className="text-info" />
              </div>
              <h2 className="text-white fw-bold mb-0">5</h2>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card border-0 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted fw-semibold">Running</span>
                <CheckCircle2 size={20} className="text-success" />
              </div>
              <h2 className="text-success fw-bold mb-0">1</h2>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card border-0 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted fw-semibold">Standby</span>
                <Power size={20} className="text-warning" />
              </div>
              <h2 className="text-warning fw-bold mb-0">3</h2>
            </Card>
          </motion.div>
        </Col>
        <Col md={3}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Card className="glass-card border-0 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted fw-semibold">Faults / Trips</span>
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <h2 className="text-danger fw-bold mb-0">0</h2>
            </Card>
          </motion.div>
        </Col>
      </Row>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card border-0 overflow-hidden">
          <Table responsive variant="dark" className="mb-0 table-hover align-middle custom-table">
            <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
              <tr>
                <th className="py-3 px-4 fw-semibold text-muted border-0">PUMP NAME</th>
                <th className="py-3 px-4 fw-semibold text-muted border-0 text-center">MODE</th>
                <th className="py-3 px-4 fw-semibold text-muted border-0 text-center">STATUS</th>
                <th className="py-3 px-4 fw-semibold text-muted border-0 text-end">VOLTAGE (V)</th>
                <th className="py-3 px-4 fw-semibold text-muted border-0 text-end">CURRENT (A)</th>
                <th className="py-3 px-4 fw-semibold text-muted border-0 text-end">POWER (kW)</th>
                <th className="py-3 px-4 fw-semibold text-muted border-0 text-end">TOTAL RUNTIME</th>
              </tr>
            </thead>
            <tbody>
              {pumps.map((pump, idx) => (
                <tr key={pump.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="py-3 px-4 fw-bold text-white d-flex align-items-center gap-3 border-0">
                    <div className="p-2 rounded bg-opacity-10" style={{ backgroundColor: pump.status === 'Running' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)' }}>
                      <Zap size={18} className={pump.status === 'Running' ? 'text-success' : 'text-secondary'} />
                    </div>
                    {pump.name}
                    {pump.fuel && <Badge bg="dark" border="light" className="ms-2 fs-9">Fuel: {pump.fuel}%</Badge>}
                  </td>
                  <td className="py-3 px-4 border-0 text-center">{getModeBadge(pump.mode)}</td>
                  <td className="py-3 px-4 border-0 text-center">{getStatusBadge(pump.status, pump.trip)}</td>
                  <td className="py-3 px-4 border-0 text-end fw-semibold text-warning">{pump.voltage.toFixed(1)}</td>
                  <td className="py-3 px-4 border-0 text-end fw-semibold text-info">{pump.current.toFixed(1)}</td>
                  <td className="py-3 px-4 border-0 text-end fw-semibold" style={{ color: '#818cf8' }}>{pump.power.toFixed(1)}</td>
                  <td className="py-3 px-4 border-0 text-end fw-semibold text-muted">{pump.runtime}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </motion.div>

      <style dangerouslySetInnerHTML={{__html: `
        .glass-card {
          background: rgba(15, 23, 42, 0.7) !important;
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .custom-table {
          background: transparent !important;
        }
        .custom-table tbody tr { transition: 0.3s; }
        .custom-table tbody tr:hover { background: rgba(255,255,255,0.03) !important; }
        .fs-9 { font-size: 0.7rem; }
      `}} />
    </Container>
  );
};

export default PumpStatus;
