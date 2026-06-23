import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from 'lucide-react';

const generateMockData = () => {
  const data = [];
  let time = new Date();
  time.setHours(time.getHours() - 2);
  let hp = 8.5;
  let sp = 9.3;

  for (let i = 0; i < 30; i++) {
    hp += (Math.random() - 0.5) * 0.4;
    sp += (Math.random() - 0.5) * 0.3;
    if(hp < 5) hp = 5; if(hp > 10) hp = 10;
    if(sp < 6) sp = 6; if(sp > 12) sp = 12;
    
    data.push({
      time: time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      Hydrant: +hp.toFixed(2),
      Sprinkler: +sp.toFixed(2)
    });
    time.setMinutes(time.getMinutes() + 4);
  }
  return data;
};

const HeaderPressure = () => {
  const [data, setData] = useState(generateMockData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const last = newData[newData.length - 1];
        let newHp = last.Hydrant + (Math.random() - 0.5) * 0.4;
        let newSp = last.Sprinkler + (Math.random() - 0.5) * 0.3;
        
        const now = new Date();
        newData.push({
          time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          Hydrant: +newHp.toFixed(2),
          Sprinkler: +newSp.toFixed(2)
        });
        return newData;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Container fluid className="py-4 px-lg-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 d-flex align-items-center gap-3">
        <Activity size={32} className="text-info" />
        <h3 className="fw-bold text-white mb-0">Header Pressure Trends</h3>
      </motion.div>

      <Row className="g-4 mb-4">
        <Col md={6}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="h-100">
            <Card className="glass-card border-0 p-4 h-100">
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <div style={{width: 12, height: 12, borderRadius: '50%', background: '#ef4444'}}></div>
                Current Hydrant Pressure
              </h5>
              <div className="d-flex align-items-baseline gap-2">
                <h1 className="display-4 fw-bold text-danger mb-0">{data[data.length-1].Hydrant}</h1>
                <span className="text-muted fs-5 fw-semibold">kg/cm²</span>
              </div>
              <p className="text-muted mt-2 fs-7">Maintained within nominal range (7 - 9 kg/cm²).</p>
            </Card>
          </motion.div>
        </Col>
        <Col md={6}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="h-100">
            <Card className="glass-card border-0 p-4 h-100">
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <div style={{width: 12, height: 12, borderRadius: '50%', background: '#0ea5e9'}}></div>
                Current Sprinkler Pressure
              </h5>
              <div className="d-flex align-items-baseline gap-2">
                <h1 className="display-4 fw-bold text-info mb-0">{data[data.length-1].Sprinkler}</h1>
                <span className="text-muted fs-5 fw-semibold">kg/cm²</span>
              </div>
              <p className="text-muted mt-2 fs-7">Maintained within nominal range (8 - 11 kg/cm²).</p>
            </Card>
          </motion.div>
        </Col>
      </Row>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card border-0 p-4">
          <h5 className="text-white fw-bold mb-4">Historical Pressure Chart (Last 2 Hours)</h5>
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHydrant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSprinkler" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#94a3b8'}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8'}} domain={[0, 15]} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Area type="monotone" dataKey="Hydrant" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorHydrant)" />
                <Area type="monotone" dataKey="Sprinkler" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSprinkler)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
      `}} />
    </Container>
  );
};

export default HeaderPressure;
