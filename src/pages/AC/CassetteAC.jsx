import React, { useState } from 'react';
import { Row, Col, Card, Badge, Form, Button } from 'react-bootstrap';
import { Wind, Thermometer, Droplets, Zap, Power, Fan, Settings, LayoutGrid } from 'lucide-react';

const MOCK_CASSETTE_ACS = [
  { id: 2, name: 'Conference Room AC', location: '1st Floor', status: 'ON', mode: 'Cool', setTemp: 20, roomTemp: 21.0, fanSpeed: 'Auto', powerUsage: 2.1, louvers: 'Swing' },
  { id: 3, name: 'Server Room AC 1', location: 'Ground Floor', status: 'ON', mode: 'Cool', setTemp: 18, roomTemp: 18.5, fanSpeed: 'High', powerUsage: 2.5, louvers: 'Fixed' },
  { id: 6, name: 'Reception Area', location: 'Ground Floor', status: 'OFF', mode: 'Fan', setTemp: 23, roomTemp: 24.5, fanSpeed: 'Low', powerUsage: 0.0, louvers: 'Fixed' }
];

const CassetteAC = () => {
  const [units, setUnits] = useState(MOCK_CASSETTE_ACS);

  const togglePower = (id) => {
    setUnits(units.map(u => u.id === id ? { ...u, status: u.status === 'ON' ? 'OFF' : 'ON', powerUsage: u.status === 'ON' ? 0 : 2.0 } : u));
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'Cool': return <Thermometer size={16} className="text-info" />;
      case 'Dry': return <Droplets size={16} className="text-warning" />;
      case 'Fan': return <Fan size={16} className="text-secondary" />;
      default: return <Wind size={16} />;
    }
  };

  return (
    <div className="fade-in p-4 h-100" style={{ background: '#0b1121', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <h4 className="text-white fw-black mb-1 d-flex align-items-center" style={{ letterSpacing: '1px' }}>
          <LayoutGrid className="me-2 text-info" size={28} />
          CASSETTE AC CONTROL
        </h4>
      </div>

      <Row className="g-4">
        {units.map((unit) => (
          <Col lg={4} md={6} key={unit.id}>
            <Card className="border-0 shadow-lg h-100 overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="position-absolute" style={{ top: 0, left: 0, right: 0, height: '4px', background: unit.status === 'ON' ? '#10b981' : '#ef4444' }}></div>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6 className="text-white fw-bold mb-1">{unit.name}</h6>
                    <div className="text-secondary" style={{ fontSize: '11px', letterSpacing: '1px' }}>{unit.location.toUpperCase()}</div>
                  </div>
                  <button 
                    onClick={() => togglePower(unit.id)}
                    className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center" 
                    style={{ width: '40px', height: '40px', background: unit.status === 'ON' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${unit.status === 'ON' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, color: unit.status === 'ON' ? '#10b981' : '#ef4444', transition: 'all 0.3s ease' }}
                  >
                    <Power size={18} />
                  </button>
                </div>

                <div className="d-flex align-items-center justify-content-between py-3 border-top border-bottom my-3" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                  <div className="text-center w-50 border-end" style={{ borderColor: 'rgba(255,255,255,0.05) !important' }}>
                    <div className="text-secondary fw-bold mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>SET TEMP</div>
                    <div className="d-flex align-items-center justify-content-center gap-2">
                      <Button variant="outline-secondary" size="sm" className="rounded-circle p-1" style={{ width: '28px', height: '28px' }}>-</Button>
                      <div className="text-info fs-3 fw-black font-monospace">{unit.setTemp}<span className="fs-6 text-muted">°C</span></div>
                      <Button variant="outline-secondary" size="sm" className="rounded-circle p-1" style={{ width: '28px', height: '28px' }}>+</Button>
                    </div>
                  </div>
                  <div className="text-center w-50">
                    <div className="text-secondary fw-bold mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>ROOM TEMP</div>
                    <div className="text-white fs-3 fw-bold font-monospace">{unit.roomTemp}<span className="fs-6 text-muted">°C</span></div>
                  </div>
                </div>

                <Row className="g-2 text-center text-secondary mb-3" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  <Col xs={3}>
                    <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="mb-1">{getModeIcon(unit.mode)}</div>
                      <div className="fw-bold">{unit.mode}</div>
                    </div>
                  </Col>
                  <Col xs={3}>
                    <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="mb-1"><Fan size={16} /></div>
                      <div className="fw-bold">{unit.fanSpeed}</div>
                    </div>
                  </Col>
                  <Col xs={3}>
                    <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="mb-1"><Settings size={16} /></div>
                      <div className="fw-bold">{unit.louvers}</div>
                    </div>
                  </Col>
                  <Col xs={3}>
                    <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="mb-1"><Zap size={16} className={unit.powerUsage > 0 ? "text-warning" : ""} /></div>
                      <div className="fw-bold font-monospace">{unit.powerUsage}kW</div>
                    </div>
                  </Col>
                </Row>
                
                <div className="mt-3 d-flex gap-2">
                  <Button variant="outline-info" size="sm" className="w-50 rounded-pill fs-12 fw-bold">SWING</Button>
                  <Button variant="outline-info" size="sm" className="w-50 rounded-pill fs-12 fw-bold">MODE</Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default CassetteAC;
