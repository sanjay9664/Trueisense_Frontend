import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Settings, RefreshCw, Sliders } from 'lucide-react';

const JockeyMain = () => {
  const [settings, setSettings] = useState({
    hydrantJockeyCutIn: 7.0,
    hydrantJockeyCutOut: 8.5,
    sprinklerJockeyCutIn: 8.0,
    sprinklerJockeyCutOut: 9.5,
    masterPumpCutIn: 6.0,
    masterPumpCutOut: 9.0,
    leadLagMode: 'Auto Swap (7 Days)',
    jockeyMode: 'Auto',
    masterMode: 'Auto'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const SettingCard = ({ title, cutIn, cutOut, mode, onModeChange, delay }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-100">
      <Card className="glass-card border-0 p-4 h-100">
        <div className="d-flex justify-content-between align-items-start mb-4">
          <h5 className="fw-bold text-white d-flex align-items-center gap-2">
            <Sliders size={20} className="text-info" />
            {title}
          </h5>
          <Badge bg={mode === 'Auto' ? 'success' : 'secondary'} className="px-3 py-2 rounded-pill fs-8">
            {mode} Mode
          </Badge>
        </div>
        
        <Row className="g-4">
          <Col xs={6}>
            <div className="p-3 bg-dark bg-opacity-50 rounded-3 border border-light border-opacity-10 text-center">
              <span className="text-muted d-block mb-1 fs-8 fw-semibold">CUT-IN PRESSURE</span>
              <h3 className="text-warning fw-bold mb-0">{cutIn} <span className="fs-6 text-muted">kg/cm²</span></h3>
            </div>
          </Col>
          <Col xs={6}>
            <div className="p-3 bg-dark bg-opacity-50 rounded-3 border border-light border-opacity-10 text-center">
              <span className="text-muted d-block mb-1 fs-8 fw-semibold">CUT-OUT PRESSURE</span>
              <h3 className="text-info fw-bold mb-0">{cutOut} <span className="fs-6 text-muted">kg/cm²</span></h3>
            </div>
          </Col>
        </Row>

        <div className="mt-4 pt-3 border-top border-light border-opacity-10 d-flex justify-content-between align-items-center">
          <span className="text-muted fs-8 fw-semibold">Operation Mode</span>
          <Form.Check 
            type="switch"
            id={`switch-${title.replace(/\s+/g, '')}`}
            label={mode}
            checked={mode === 'Auto'}
            onChange={(e) => onModeChange(e.target.checked ? 'Auto' : 'Manual')}
            className="custom-switch fs-7 text-white"
          />
        </div>
      </Card>
    </motion.div>
  );

  return (
    <Container fluid className="py-4 px-lg-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 d-flex align-items-center gap-3">
        <Settings size={32} className="text-info" />
        <h3 className="fw-bold text-white mb-0">Jockey & Main Logic Settings</h3>
      </motion.div>

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <SettingCard 
            title="Hydrant Jockey Logic" 
            cutIn={settings.hydrantJockeyCutIn} 
            cutOut={settings.hydrantJockeyCutOut} 
            mode={settings.jockeyMode}
            onModeChange={(m) => handleSettingChange('jockeyMode', m)}
            delay={0.1}
          />
        </Col>
        <Col lg={4}>
          <SettingCard 
            title="Sprinkler Jockey Logic" 
            cutIn={settings.sprinklerJockeyCutIn} 
            cutOut={settings.sprinklerJockeyCutOut} 
            mode={settings.jockeyMode}
            onModeChange={(m) => handleSettingChange('jockeyMode', m)}
            delay={0.2}
          />
        </Col>
        <Col lg={4}>
          <SettingCard 
            title="Master Pumps Logic" 
            cutIn={settings.masterPumpCutIn} 
            cutOut={settings.masterPumpCutOut} 
            mode={settings.masterMode}
            onModeChange={(m) => handleSettingChange('masterMode', m)}
            delay={0.3}
          />
        </Col>
      </Row>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card border-0 p-4">
          <div className="d-flex align-items-center gap-2 mb-4">
            <RefreshCw size={24} className="text-indigo" style={{ color: '#818cf8' }} />
            <h5 className="fw-bold text-white mb-0">Lead/Lag Swap Settings (Master Pumps)</h5>
          </div>
          
          <Row className="align-items-center">
            <Col md={6}>
              <p className="text-muted mb-0">
                Automatically rotate Master Pump 1 and Master Pump 2 as the Lead pump to ensure even wear and tear across both duty pumps.
              </p>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              <Form.Select 
                className="bg-dark text-white border-secondary shadow-none d-inline-block w-auto py-2 px-4 rounded-pill"
                value={settings.leadLagMode}
                onChange={(e) => handleSettingChange('leadLagMode', e.target.value)}
              >
                <option>Auto Swap (24 Hours)</option>
                <option>Auto Swap (7 Days)</option>
                <option>Manual Lead: Pump 1</option>
                <option>Manual Lead: Pump 2</option>
              </Form.Select>
            </Col>
          </Row>
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
        .custom-switch .form-check-input {
          background-color: rgba(255,255,255,0.2);
          border-color: rgba(255,255,255,0.3);
          height: 1.5rem;
          width: 3rem;
          cursor: pointer;
        }
        .custom-switch .form-check-input:checked {
          background-color: #10b981;
          border-color: #10b981;
        }
      `}} />
    </Container>
  );
};

export default JockeyMain;
