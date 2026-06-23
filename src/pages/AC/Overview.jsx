import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Form, Button, Modal } from 'react-bootstrap';
import { Wind, Thermometer, Droplets, Zap, Power, Settings, Fan, MapPin, Clock, Info, Activity, Edit2, Eye, EyeOff, Trash2, Play, Square, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

// --- MOCK DATA ---
const INITIAL_ACS = [
  { id: 1, name: 'Master AC', type: '1.5 Ton Inverter Split AC', room: 'Master Bedroom', status: 'ON', mode: '--', setTemp: '--', roomTemp: 23.5, fanSpeed: '--', powerUsage: 1.2, scheduleStart: '', scheduleEnd: '', operationMode: 'Auto', activeAutoOptions: [] },
  { id: 2, name: 'Lobby AC', type: '2.0 Ton Cassette AC', room: 'Lobby', status: 'ON', mode: '--', setTemp: '--', roomTemp: 25.0, fanSpeed: '--', powerUsage: 2.1, scheduleStart: '', scheduleEnd: '', operationMode: 'Auto', activeAutoOptions: [] },
  { id: 3, name: 'Main Hall AC', type: '2.0 Ton Split AC', room: 'Hall', status: 'OFF', mode: '--', setTemp: '--', roomTemp: 26.5, fanSpeed: '--', powerUsage: 0.0, scheduleStart: '', scheduleEnd: '', operationMode: 'Manual', activeAutoOptions: [] },
  { id: 4, name: 'Server Room AC', type: '2.0 Ton Cassette AC', room: 'Server Room', status: 'ON', mode: '--', setTemp: '--', roomTemp: 18.5, fanSpeed: '--', powerUsage: 2.5, scheduleStart: '', scheduleEnd: '', operationMode: 'Auto', activeAutoOptions: [] },
];

const RealisticAC = ({ unit }) => {
  return (
    <div style={{
      width: '100%',
      height: '85px',
      background: 'linear-gradient(to bottom, #cbd5e1 0%, #94a3b8 100%)',
      borderRadius: '12px',
      position: 'relative',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.6)',
      border: '1px solid rgba(255,255,255,0.3)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '8px 0',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Brand Line */}
      <div className="d-flex justify-content-center">
        <div style={{ width: '40px', height: '2px', background: '#475569', borderRadius: '4px', opacity: 0.4 }}></div>
      </div>
      
      {/* Sensor (IR/Temp Receiver) */}
      <div style={{
        position: 'absolute',
        left: '25px',
        top: '25px',
        width: '12px',
        height: '6px',
        borderRadius: '3px',
        background: '#020617',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), 0 1px 1px rgba(255,255,255,0.1)',
        border: '1px solid rgba(0,0,0,0.5)'
      }}></div>

      {/* Digital Display (Power & Temp) */}
      <div style={{
        position: 'absolute',
        right: '15px',
        top: '20px',
        background: '#0f172a',
        padding: '4px 10px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Courier New', monospace",
        fontWeight: 'bold',
        fontSize: '12px',
        boxShadow: unit.status === 'ON' ? '0 0 10px rgba(14, 165, 233, 0.4)' : 'inset 0 0 4px rgba(0,0,0,0.8)',
        transition: 'all 0.3s ease',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Power Display */}
        <span style={{ 
          color: unit.status === 'ON' ? '#10b981' : '#475569', 
          borderRight: '1px solid #334155', 
          paddingRight: '8px',
          textShadow: unit.status === 'ON' ? '0 0 5px #10b981' : 'none'
        }}>
          {unit.status === 'ON' ? `${unit.powerUsage}kW` : '--'}
        </span>
        {/* Temp Display */}
        <span style={{ 
          color: unit.status === 'ON' ? '#0ea5e9' : '#475569',
          textShadow: unit.status === 'ON' ? '0 0 5px #0ea5e9' : 'none'
        }}>
          {unit.status === 'ON' ? (unit.setTemp === '--' ? '--' : `${unit.setTemp}°`) : '--'}
        </span>
      </div>
      
      {/* Status LED */}
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '25px',
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: unit.status === 'ON' ? '#10b981' : '#ef4444',
        boxShadow: unit.status === 'ON' ? '0 0 8px #10b981' : '0 0 5px rgba(239, 68, 68, 0.5)',
        transition: 'all 0.3s ease'
      }}></div>

      {/* Flap Area (Vent) */}
      <div style={{
        width: '88%',
        margin: '0 auto',
        height: '14px',
        background: '#0f172a', // Deep dark vent
        borderRadius: '4px',
        marginTop: 'auto',
        marginBottom: '4px',
        boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.8)',
        position: 'relative',
        perspective: '400px'
      }}>
        <div style={{
           position: 'absolute',
           top: 0, left: 0, right: 0, bottom: 0,
           background: 'linear-gradient(to bottom, #94a3b8, #64748b)',
           transformOrigin: 'top',
           transform: unit.status === 'ON' ? 'rotateX(75deg)' : 'rotateX(0deg)',
           transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
           borderRadius: '3px',
           boxShadow: unit.status === 'ON' ? '0 8px 10px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.2)',
           borderBottom: '1px solid rgba(255,255,255,0.4)'
        }}></div>
      </div>
      
      {/* Airflow Animation (Only visible when ON) */}
      {unit.status === 'ON' && (
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '0',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          opacity: 0.6,
          zIndex: 0
        }}>
          <div className="airflow-line" style={{ width: '2px', height: '15px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.2s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '20px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.4s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '25px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.1s' }}></div>
          <div className="airflow-line" style={{ width: '2px', height: '15px', background: 'linear-gradient(to bottom, #0ea5e9, transparent)', animationDelay: '0.3s' }}></div>
        </div>
      )}
    </div>
  );
};

const ACOverview = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [units, setUnits] = useState(() => {
    const saved = localStorage.getItem('bms_ac_units');
    return saved ? JSON.parse(saved) : INITIAL_ACS;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [formData, setFormData] = useState({});

  // Group & Schedule State
  const [acGroups, setAcGroups] = useState(() => {
    const saved = localStorage.getItem('bms_ac_groups');
    return saved ? JSON.parse(saved) : [{ id: 'g1', name: 'Master Control', acIds: [1, 2] }];
  });
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  useEffect(() => {
    localStorage.setItem('bms_ac_units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('bms_ac_groups', JSON.stringify(acGroups));
  }, [acGroups]);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedACsForGroup, setSelectedACsForGroup] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [scheduleTargetId, setScheduleTargetId] = useState('');
  const [scheduleData, setScheduleData] = useState({ scheduleStart: '', scheduleEnd: '', mode: 'Cool', setTemp: 24 });

  // Control Action Modal State
  const [showControlModal, setShowControlModal] = useState(false);
  const [controlTargetId, setControlTargetId] = useState(null);
  const [controlMode, setControlMode] = useState('Manual');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [autoOptions, setAutoOptions] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Realtime Schedule Runner
  useEffect(() => {
    const now = currentTime;
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;

    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (!savedSchedulesStr) return;
    
    try {
      const savedSchedules = JSON.parse(savedSchedulesStr);
      
      setUnits(prevUnits => {
        let hasChanges = false;
        const newUnits = prevUnits.map(unit => {
          if (!unit.activeAutoOptions?.includes('SCHEDULE')) return unit;
          
          const acIdStr = unit.id.toString();
          
          const specialSchedules = savedSchedules.special || {};
          let activeSpecialDate = null;
          if (specialSchedules[acIdStr] && specialSchedules[acIdStr].length > 0) {
            activeSpecialDate = specialSchedules[acIdStr].find(d => d.date === dateStr);
          }
          if (!activeSpecialDate && specialSchedules['ALL']) {
            activeSpecialDate = specialSchedules['ALL'].find(d => d.date === dateStr);
          }
          
          const dailySchedules = savedSchedules.daily || {};
          let todaySlots = [];
          if (dailySchedules[acIdStr] && dailySchedules[acIdStr][currentDay] && dailySchedules[acIdStr][currentDay].length > 0) {
            todaySlots = dailySchedules[acIdStr][currentDay];
          } else if (dailySchedules['ALL'] && dailySchedules['ALL'][currentDay]) {
            todaySlots = dailySchedules['ALL'][currentDay];
          }
          
          const activeSlot = todaySlots.find(slot => {
             return currentTimeStr >= slot.start && currentTimeStr < slot.end;
          });

          let expectedPower = unit.status;
          let expectedTemp = unit.setTemp;
          
          if (activeSpecialDate) {
            if (activeSpecialDate.action === 'System OFF') {
              expectedPower = 'OFF';
            } else if (activeSpecialDate.action === 'Custom Temp') {
              expectedTemp = Number(activeSpecialDate.temp);
              expectedPower = 'ON';
            }
          } else if (activeSlot) {
            expectedPower = activeSlot.power;
            if (activeSlot.temp) expectedTemp = Number(activeSlot.temp);
          } else {
             // Turn OFF if out of schedule
             expectedPower = 'OFF';
          }
          
          if (unit.status !== expectedPower || unit.setTemp !== expectedTemp) {
            hasChanges = true;
            return {
              ...unit,
              status: expectedPower,
              setTemp: expectedTemp,
              powerUsage: expectedPower === 'ON' ? 1.5 : 0
            };
          }
          
          return unit;
        });
        
        return hasChanges ? newUnits : prevUnits;
      });
      
    } catch (e) {
      // ignore
    }
  }, [currentTime]);

  const togglePower = (id) => {
    setUnits(units.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'ON' ? 'OFF' : 'ON', powerUsage: u.status === 'ON' ? 0 : 1.5 };
      }
      return u;
    }));
  };

  const openControlModal = (id) => {
    const unit = units.find(u => u.id === id);
    setControlTargetId(id);
    setControlMode(unit?.operationMode || 'Manual');
    setAutoOptions(unit?.activeAutoOptions || []);
    setControlSuccessMessage('');
    setShowControlModal(true);
  };

  const handleAutoToggle = (option) => {
    setAutoOptions(prev => {
      const newOptions = prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option];
      setUnits(units.map(u => u.id === controlTargetId ? { ...u, activeAutoOptions: newOptions } : u));
      return newOptions;
    });
  };

  const handleControlAction = (action) => {
    if (action === 'SCHEDULE') {
      setShowControlModal(false);
      setScheduleTargetId(controlTargetId.toString());
      setShowScheduleModal(true);
      return;
    }

    setControlSuccessMessage(`SUCCESSFULL ${action}`);
    
    if (action === 'START') {
      setUnits(units.map(u => u.id === controlTargetId ? { ...u, status: 'ON', powerUsage: 1.5 } : u));
    } else if (action === 'STOP') {
      setUnits(units.map(u => u.id === controlTargetId ? { ...u, status: 'OFF', powerUsage: 0 } : u));
    }

    setTimeout(() => {
      setControlSuccessMessage('');
      setShowControlModal(false);
    }, 2000);
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'Cool': return <Thermometer size={14} className="text-info" />;
      case 'Dry': return <Droplets size={14} className="text-warning" />;
      case 'Fan': return <Fan size={14} className="text-secondary" />;
      case 'Heat': return <Thermometer size={14} className="text-danger" />;
      default: return <Wind size={14} />;
    }
  };

  const handleViewDetails = (unit) => {
    navigate(`/ac/${unit.id}`);
  };

  const getActiveScheduleForUnit = (unit) => {
    if (!unit.activeAutoOptions?.includes('SCHEDULE')) return null;
    
    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (!savedSchedulesStr) return null;
    
    try {
      const savedSchedules = JSON.parse(savedSchedulesStr);
      const acIdStr = unit.id.toString();
      
      const dailySchedules = savedSchedules.daily || {};
      const targetDaily = dailySchedules[acIdStr] || dailySchedules['ALL'] || {};
      
      const specialSchedules = savedSchedules.special || {};
      const targetSpecial = specialSchedules[acIdStr] || specialSchedules['ALL'] || [];
      
      const hasDailySlots = Object.values(targetDaily).some(daySlots => daySlots && daySlots.length > 0);
      const hasSpecialDates = targetSpecial.length > 0;
      
      return (hasDailySlots || hasSpecialDates) ? true : null;
    } catch (e) {
      return null;
    }
  };

  const getScheduleStats = (unit) => {
    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (!savedSchedulesStr) return { done: 0, upcoming: 0, total: 0 };
    try {
      const savedSchedules = JSON.parse(savedSchedulesStr);
      const acIdStr = unit.id.toString();
      const dailySchedules = savedSchedules.daily || {};
      
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      
      let todaySlots = [];
      if (dailySchedules[acIdStr] && dailySchedules[acIdStr][currentDay] && dailySchedules[acIdStr][currentDay].length > 0) {
        todaySlots = dailySchedules[acIdStr][currentDay];
      } else if (dailySchedules['ALL'] && dailySchedules['ALL'][currentDay]) {
        todaySlots = dailySchedules['ALL'][currentDay];
      }
      
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      let done = 0;
      let upcoming = 0;
      todaySlots.forEach(slot => {
        if (slot.end <= currentTimeStr) done++;
        else if (slot.start > currentTimeStr) upcoming++;
      });
      
      return { done, upcoming, total: todaySlots.length };
    } catch (e) {
      return { done: 0, upcoming: 0, total: 0 };
    }
  };

  const openSettings = (unit) => {
    setSelectedUnit(unit);
    setFormData({ ...unit });
    setShowSettings(true);
  };

  const saveSettings = () => {
    setUnits(units.map(u => u.id === formData.id ? { ...u, ...formData } : u));
    setShowSettings(false);
  };

  const handleACGroupSelection = (id) => {
    if (selectedACsForGroup.includes(id)) {
      setSelectedACsForGroup(selectedACsForGroup.filter(acId => acId !== id));
    } else {
      setSelectedACsForGroup([...selectedACsForGroup, id]);
    }
  };

  const createOrUpdateGroup = () => {
    if (!newGroupName || selectedACsForGroup.length === 0) return;
    if (editingGroupId) {
       setAcGroups(acGroups.map(g => g.id === editingGroupId ? { ...g, name: newGroupName, acIds: selectedACsForGroup } : g));
       setEditingGroupId(null);
    } else {
       setAcGroups([...acGroups, { id: 'g' + Date.now(), name: newGroupName, acIds: selectedACsForGroup }]);
    }
    setNewGroupName('');
    setSelectedACsForGroup([]);
  };

  const startEditGroup = (group) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    setSelectedACsForGroup(group.acIds);
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setNewGroupName('');
    setSelectedACsForGroup([]);
  };

  const deleteGroup = (id) => {
    setAcGroups(acGroups.filter(g => g.id !== id));
  };

  const controlGroup = (groupId, action, value) => {
    const group = acGroups.find(g => g.id === groupId);
    if (!group) return;

    setUnits(units.map(u => {
      if (group.acIds.includes(u.id)) {
        if (action === 'POWER') return { ...u, status: value, powerUsage: value === 'ON' ? 2.0 : 0 };
        if (action === 'MODE') return { ...u, mode: value };
        if (action === 'TEMP') return { ...u, setTemp: value };
      }
      return u;
    }));
  };

  const applySchedule = () => {
    if (!scheduleTargetId) return;

    let targetACIds = [];
    if (scheduleTargetId === 'ALL') {
      targetACIds = units.map(u => u.id);
    } else if (scheduleTargetId.toString().startsWith('g')) {
      const group = acGroups.find(g => g.id === scheduleTargetId);
      if (group) targetACIds = group.acIds;
    } else {
      targetACIds = [Number(scheduleTargetId)];
    }

    setUnits(units.map(u => {
      if (targetACIds.includes(u.id)) {
        return {
          ...u,
          scheduleStart: scheduleData.scheduleStart || u.scheduleStart,
          scheduleEnd: scheduleData.scheduleEnd || u.scheduleEnd,
          mode: scheduleData.mode || u.mode,
          setTemp: scheduleData.setTemp || u.setTemp
        };
      }
      return u;
    }));
    setShowScheduleModal(false);
    setScheduleData({ scheduleStart: '', scheduleEnd: '', mode: 'Cool', setTemp: 24 });
  };

  return (
    <div className="ac-dashboard-wrapper fade-in p-4" style={{ 
      minHeight: '100vh', 
      background: 'transparent',
      fontFamily: "'Inter', sans-serif" 
    }}>
      
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-5 pb-4 position-relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <h3 className="text-white fw-bold mb-2 d-flex align-items-center" style={{ letterSpacing: '0.5px' }}>
            <Wind className="me-3 text-info" size={28} />
            AC Control Center
          </h3>
          <div className="d-flex align-items-center gap-4">
            <span className="text-secondary fw-bold" style={{ fontSize: '12px', letterSpacing: '1px' }}>{currentTime.toLocaleTimeString()}</span>
            <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
               <div className="pulse-dot"></div>
               <span className="text-success fw-bold" style={{ fontSize: '11px', letterSpacing: '1px' }}>SYSTEM ACTIVE</span>
            </div>
          </div>
        </div>
        
        {/* SUMMARY WIDGET */}
        <div className="d-flex align-items-center gap-3">
          <Button 
            className="rounded-pill fw-bold d-flex align-items-center border-0 shadow-none text-white" 
            style={{ background: '#0ea5e9', padding: '10px 24px', letterSpacing: '0.3px', transition: 'all 0.3s ease' }} 
            onClick={() => setShowGroupModal(true)}
          >
            <Settings size={18} className="me-2"/> Manage Groups
          </Button>
          <Button 
            variant="outline-secondary" 
            className="rounded-pill fw-bold d-flex align-items-center bg-transparent" 
            style={{ padding: '10px 24px', borderColor: isDark ? '#334155' : '#cbd5e1', color: isDark ? '#94a3b8' : '#64748b', letterSpacing: '0.3px', transition: 'all 0.3s ease' }} 
            onClick={() => navigate('/ac/schedule')}
          >
            <Clock size={18} className="me-2"/> Global Schedule
          </Button>
        </div>
      </div>

      <Row className="g-4 mb-5">
        {/* AC UNIT CARDS */}
        {units.map((unit) => (
          <Col xl={3} lg={4} md={6} key={unit.id}>
            <Card className="border-0 h-100 overflow-hidden premium-card" style={{ 
              background: 'rgba(15, 23, 42, 0.4)', 
              borderRadius: '24px', 
              border: '1px solid rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              
              {/* Elegant Top Border Indicator */}
              <div style={{ height: '4px', background: unit.status === 'ON' ? 'linear-gradient(90deg, #0ea5e9, #10b981)' : '#334155', transition: 'all 0.3s ease' }}></div>

              <Card.Body className="p-4 d-flex flex-column position-relative">
                {/* Settings Button */}
                <button 
                  onClick={() => openSettings(unit)}
                  className="position-absolute btn p-2 rounded-circle hover-glow" 
                  style={{ top: '16px', right: '16px', zIndex: 10, background: 'rgba(255,255,255,0.03)', border: 'none', color: '#64748b' }}
                >
                  <Settings size={18} />
                </button>

                {/* ROOM INFO */}
                <div className="mb-4 pe-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <MapPin size={12} className="text-info" />
                    <span className="text-info fw-bold text-uppercase" style={{ fontSize: '10px', letterSpacing: '1.5px' }}>{unit.room}</span>
                  </div>
                  <h4 className="text-white fw-bold mb-1">{unit.name}</h4>
                  <div className="text-secondary fw-medium" style={{ fontSize: '12px' }}>{unit.type}</div>
                </div>

                {/* REALISTIC AC GRAPHIC */}
                <div className="mb-4 px-2">
                  <RealisticAC unit={unit} />
                </div>

                {/* CONTROLS AREA */}
                <div className="mt-auto">
                  
                  {/* Room Temp & Power */}
                  <div className="d-flex align-items-center justify-content-between p-3 rounded-4 mb-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <div className="text-secondary fw-bold mb-1 text-uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>Room Temp</div>
                      <div className="d-flex align-items-start">
                        <span className="text-white fw-bold lh-1" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>{unit.setTemp}</span>
                        <span className="text-info fw-bold ms-1 mt-1" style={{ fontSize: '1.2rem' }}>{unit.setTemp === '--' ? '' : '°C'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => openControlModal(unit.id)}
                      className={`rounded-circle d-flex align-items-center justify-content-center sleek-power ${unit.status === 'ON' ? 'on' : 'off'}`} 
                      style={{ 
                        width: '56px', height: '56px', 
                        background: unit.status === 'ON' 
                          ? (isDark ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#ffffff') 
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                        border: unit.status === 'ON' ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        color: unit.status === 'ON' 
                          ? (isDark ? '#fff' : '#0ea5e9') 
                          : (isDark ? '#64748b' : '#94a3b8'),
                        boxShadow: unit.status === 'ON' ? '0 10px 20px rgba(14, 165, 233, 0.3)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Power size={24} strokeWidth={unit.status === 'ON' ? 2.5 : 2} />
                    </button>
                  </div>

                  {/* Status Badges */}
                  <div className="d-flex gap-2 mb-4">
                    <Badge bg="transparent" className="flex-grow-1 py-2 px-0 text-light fw-normal d-flex justify-content-center align-items-center border border-secondary border-opacity-25 rounded-pill" style={{ background: 'rgba(255,255,255,0.02) !important' }}>
                      {getModeIcon(unit.mode)} <span className="ms-2 fs-12">{unit.status === 'ON' ? unit.mode : '--'}</span>
                    </Badge>
                    <Badge bg="transparent" className="flex-grow-1 py-2 px-0 text-light fw-normal d-flex justify-content-center align-items-center border border-secondary border-opacity-25 rounded-pill" style={{ background: 'rgba(255,255,255,0.02) !important' }}>
                      <Fan size={14} className="text-secondary me-2" /> <span className="fs-12">{unit.status === 'ON' ? unit.fanSpeed : '--'}</span>
                    </Badge>
                    <Badge bg="transparent" className="flex-grow-1 py-2 px-0 text-light fw-normal d-flex justify-content-center align-items-center border border-secondary border-opacity-25 rounded-pill" style={{ background: 'rgba(255,255,255,0.02) !important' }}>
                      <Zap size={14} className={unit.powerUsage > 0 ? "text-warning me-2" : "text-secondary me-2"} /> <span className="fs-12">{unit.status === 'ON' ? `${unit.powerUsage}kW` : '--'}</span>
                    </Badge>
                  </div>

                  {/* Schedule Indicator */}
                  {getActiveScheduleForUnit(unit) ? (
                    <div className="d-flex flex-column gap-2 mt-2">
                      <div className="d-flex align-items-center justify-content-between px-3 py-2 rounded-pill" style={{ background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                        <div className="d-flex align-items-center gap-2">
                          <Clock size={12} className="text-info" />
                          <span className="text-info fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                            {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="bg-info rounded-circle" style={{ width: '6px', height: '6px', boxShadow: '0 0 8px #0ea5e9' }}></div>
                      </div>
                      
                      {(() => {
                        const stats = getScheduleStats(unit);
                        return (
                          <div className="d-flex justify-content-between px-2 text-secondary fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                            <span>Done: <span className={isDark ? 'text-white' : 'text-dark'}>{stats.done}</span></span>
                            <span>Upcoming: <span className={isDark ? 'text-white' : 'text-dark'}>{stats.upcoming}</span></span>
                            <span>Total: <span className={isDark ? 'text-white' : 'text-dark'}>{stats.total}</span></span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center px-3 py-2 rounded-pill mt-2" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)' }}>
                      <span className="text-secondary fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>No Active Schedule</span>
                    </div>
                  )}

                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* AC INDIVIDUAL SETTINGS MODAL */}
      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered className="premium-modal">
        {selectedUnit && (
          <>
            <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
              <Modal.Title className="text-white fs-5 fw-bold d-flex align-items-center gap-3">
                <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '36px', height: '36px' }}>
                  <Settings size={20} color="white" />
                </div>
                Configure Unit
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="px-4 py-4" style={{ background: '#0f172a', color: '#fff' }}>
              
              <div className="mb-4">
                <h6 className="text-info fw-bold mb-3 fs-12 tracking-widest text-uppercase">Identification</h6>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Room / Location</Form.Label>
                      <Form.Control type="text" value={formData.room || ''} onChange={e => setFormData({...formData, room: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">AC Type</Form.Label>
                      <Form.Control type="text" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <div className="mb-4">
                <h6 className="text-info fw-bold mb-3 fs-12 tracking-widest text-uppercase">Automation Schedule</h6>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12 d-flex align-items-center gap-1"><Clock size={12}/> Auto ON Time</Form.Label>
                      <Form.Control type="time" value={formData.scheduleStart || ''} onChange={e => setFormData({...formData, scheduleStart: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12 d-flex align-items-center gap-1"><Clock size={12}/> Auto OFF Time</Form.Label>
                      <Form.Control type="time" value={formData.scheduleEnd || ''} onChange={e => setFormData({...formData, scheduleEnd: e.target.value})} className="premium-input" />
                    </Form.Group>
                  </Col>
                </Row>
              </div>

              <div>
                <h6 className="text-info fw-bold mb-3 fs-12 tracking-widest text-uppercase">Operation Default</h6>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Mode</Form.Label>
                      <Form.Select value={formData.mode || '--'} onChange={e => setFormData({...formData, mode: e.target.value})} className="premium-input">
                        <option value="--" disabled>-- Select --</option>
                        <option value="Cool">Cool</option>
                        <option value="Fan">Fan</option>
                        <option value="Dry">Dry</option>
                        <option value="Heat">Heat</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Fan Speed</Form.Label>
                      <Form.Select value={formData.fanSpeed || '--'} onChange={e => setFormData({...formData, fanSpeed: e.target.value})} className="premium-input">
                        <option value="--" disabled>-- Select --</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Auto">Auto</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="text-secondary fs-12">Room Temp</Form.Label>
                      <Form.Control type="number" min="16" max="30" value={formData.setTemp === '--' ? '' : formData.setTemp} onChange={e => setFormData({...formData, setTemp: e.target.value ? Number(e.target.value) : '--'})} className="premium-input" placeholder="--" />

                    </Form.Group>
                  </Col>
                </Row>
              </div>

            </Modal.Body>
            <Modal.Footer className="border-top-0 pt-0 px-4 pb-4" style={{ background: '#0f172a' }}>
              <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button variant="info" className="rounded-pill px-5 fw-bold shadow" onClick={saveSettings}>Apply Changes</Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* MANAGE GROUPS MODAL */}
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)} centered size="xl" className="premium-modal">
        <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
          <Modal.Title className="text-white fs-4 fw-bold d-flex align-items-center gap-3">
            <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '42px', height: '42px' }}>
              <Wind size={24} color="white" />
            </div>
            AC Group Management
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ background: '#0f172a', color: '#fff' }}>
          <Row className="g-5">
            <Col lg={5}>
              <div className="bg-slate-800 p-4 rounded-4" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 41, 59, 0.3)' }}>
                <h5 className="text-white fw-bold mb-4">{editingGroupId ? 'Update Existing Group' : 'Create New Group'}</h5>
                <Form.Group className="mb-4">
                  <Form.Label className="text-secondary fs-12 fw-bold tracking-widest text-uppercase">Group Name</Form.Label>
                  <Form.Control type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g. Server Rooms" className="premium-input py-3" />
                </Form.Group>
                
                <Form.Label className="text-secondary fs-12 fw-bold tracking-widest text-uppercase mb-3">Assign Units to Group</Form.Label>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="mb-4 pe-2">
                  {units.map(u => {
                    const isManual = u.operationMode === 'Manual';
                    const isSelected = selectedACsForGroup.includes(u.id);
                    return (
                      <div 
                        key={u.id} 
                        className="d-flex align-items-center justify-content-between p-3 mb-2 rounded-3 position-relative" 
                        style={{ 
                          background: isSelected ? 'rgba(14, 165, 233, 0.1)' : 'rgba(0,0,0,0.2)', 
                          border: `1px solid ${isSelected ? 'rgba(14, 165, 233, 0.3)' : 'transparent'}`, 
                          cursor: isManual ? 'not-allowed' : 'pointer',
                          opacity: isManual ? 0.5 : 1
                        }} 
                        onClick={() => !isManual && handleACGroupSelection(u.id)}
                      >
                        <div className="d-flex align-items-center">
                          <Form.Check 
                            type="checkbox" 
                            id={`group-ac-${u.id}`} 
                            checked={isSelected} 
                            disabled={isManual}
                            onChange={() => {}} 
                            className="me-3" 
                          />
                          <div>
                            <div className="text-white fw-bold fs-12">{u.name}</div>
                            <div className="text-secondary fs-11"><MapPin size={10} className="me-1"/>{u.room}</div>
                          </div>
                        </div>
                        {isManual && (
                          <Badge bg="dark" className="text-secondary border border-secondary border-opacity-25 px-2 py-1" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>MANUAL</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="d-flex gap-3">
                  {editingGroupId && <Button variant="outline-secondary" className="w-50 rounded-pill fw-bold py-2" onClick={cancelEdit}>CANCEL</Button>}
                  <Button variant="info" onClick={createOrUpdateGroup} disabled={!newGroupName || selectedACsForGroup.length === 0} className={`${editingGroupId ? 'w-50' : 'w-100'} rounded-pill fw-bold py-2 shadow`}>
                    {editingGroupId ? 'UPDATE GROUP' : 'CREATE GROUP'}
                  </Button>
                </div>
              </div>
            </Col>
            
            <Col lg={7}>
              <h5 className="text-white fw-bold mb-4">Active Groups & Control</h5>
              {acGroups.length === 0 ? (
                <div className="text-center p-5 border border-dashed rounded-4" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Wind size={48} className="text-secondary mb-3 opacity-50" />
                  <h6 className="text-secondary">No groups configured yet.</h6>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                  {acGroups.map(group => (
                    <Card key={group.id} className="border-0 shadow-sm" style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="text-white fw-bold mb-1">{group.name}</h5>
                            <Badge bg="transparent" className="px-2 py-1 rounded-pill fw-bold" style={{ background: 'rgba(14, 165, 233, 0.2) !important', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.3)' }}>{group.acIds.length} Linked Units</Badge>
                          </div>
                          <div className="d-flex gap-2">
                            <Button variant="link" className="text-info p-2" onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}>
                              {expandedGroupId === group.id ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </Button>
                            <Button variant="link" className="text-warning p-2" onClick={() => startEditGroup(group)}>
                              <Edit2 size={16}/>
                            </Button>
                            <Button variant="link" className="text-danger p-2" onClick={() => deleteGroup(group.id)}>
                              <Trash2 size={16}/>
                            </Button>
                          </div>
                        </div>

                        {expandedGroupId === group.id && (
                          <div className="bg-black bg-opacity-30 p-3 rounded-3 mb-3 border border-secondary border-opacity-25 mt-3">
                            <div className="d-flex flex-wrap gap-2">
                              {group.acIds.map(id => {
                                const ac = units.find(u => u.id === id);
                                return ac ? <Badge bg="dark" className="border border-secondary border-opacity-50 px-3 py-2 text-light fw-normal" key={id}>{ac.name}</Badge> : null;
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-black bg-opacity-20 rounded-3 p-3 mt-3 border border-secondary border-opacity-10">
                           <Row className="g-2">
                             <Col xs={6} md={3}>
                               <Button variant="outline-success" className="w-100 fw-bold rounded-pill" onClick={() => controlGroup(group.id, 'POWER', 'ON')}><Power size={14} className="me-1"/> ON</Button>
                             </Col>
                             <Col xs={6} md={3}>
                               <Button variant="outline-danger" className="w-100 fw-bold rounded-pill" onClick={() => controlGroup(group.id, 'POWER', 'OFF')}><Power size={14} className="me-1"/> OFF</Button>
                             </Col>
                             <Col xs={6} md={3}>
                               <Form.Select className="premium-select rounded-pill" onChange={(e) => controlGroup(group.id, 'MODE', e.target.value)}>
                                 <option value="">Set Mode</option>
                                 <option value="Cool">Cool</option>
                                 <option value="Fan">Fan</option>
                                 <option value="Dry">Dry</option>
                                 <option value="Heat">Heat</option>
                               </Form.Select>
                             </Col>
                             <Col xs={6} md={3}>
                               <Form.Select className="premium-select rounded-pill" onChange={(e) => controlGroup(group.id, 'TEMP', Number(e.target.value))}>
                                 <option value="">Set Temp</option>
                                 {[16,18,20,22,24,26,28,30].map(t => <option key={t} value={t}>{t}°C</option>)}
                               </Form.Select>
                             </Col>
                           </Row>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Col>
          </Row>
        </Modal.Body>
      </Modal>

      {/* SCHEDULE SETTINGS MODAL */}
      <Modal show={showScheduleModal} onHide={() => setShowScheduleModal(false)} centered size="md" className="premium-modal">
        <Modal.Header closeButton closeVariant="white" className="border-bottom-0 pb-0" style={{ background: '#0f172a' }}>
          <Modal.Title className="text-white fs-5 fw-bold d-flex align-items-center gap-3">
            <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '36px', height: '36px' }}>
              <Clock size={20} color="white" />
            </div>
            Global Scheduler
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4" style={{ background: '#0f172a', color: '#fff' }}>
          
          <div className="bg-slate-800 p-4 rounded-4 mb-4" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 41, 59, 0.3)' }}>
            <Form.Group>
              <Form.Label className="text-info fw-bold fs-12 tracking-widest text-uppercase">1. Select Target Application</Form.Label>
              <Form.Select value={scheduleTargetId} onChange={(e) => setScheduleTargetId(e.target.value)} className="premium-input py-3">
                <option value="">-- Choose Target --</option>
                <option value="ALL" className="fw-bold text-info">★ ALL AC UNITS IN FACILITY</option>
                {acGroups.length > 0 && <optgroup label="Custom Groups">
                  {acGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.acIds.length} Units)</option>)}
                </optgroup>}
                <optgroup label="Individual Units">
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} - {u.room}</option>)}
                </optgroup>
              </Form.Select>
            </Form.Group>
          </div>
          
          <div className="bg-slate-800 p-4 rounded-4" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(30, 41, 59, 0.3)' }}>
            <h6 className="text-info fw-bold mb-4 fs-12 tracking-widest text-uppercase">2. Execution Parameters</h6>
            
            <Row className="mb-4 g-4">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold d-flex align-items-center gap-2"><div className="w-2 h-2 rounded-circle bg-success" style={{width:'8px',height:'8px'}}></div> Power ON Time</Form.Label>
                  <Form.Control type="time" value={scheduleData.scheduleStart || ''} onChange={e => setScheduleData({...scheduleData, scheduleStart: e.target.value})} className="premium-input py-2" />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold d-flex align-items-center gap-2"><div className="w-2 h-2 rounded-circle bg-danger" style={{width:'8px',height:'8px'}}></div> Power OFF Time</Form.Label>
                  <Form.Control type="time" value={scheduleData.scheduleEnd || ''} onChange={e => setScheduleData({...scheduleData, scheduleEnd: e.target.value})} className="premium-input py-2" />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-4">
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold">Target Mode</Form.Label>
                  <Form.Select value={scheduleData.mode || 'Cool'} onChange={e => setScheduleData({...scheduleData, mode: e.target.value})} className="premium-input py-2">
                    <option value="Cool">Cool</option>
                    <option value="Fan">Fan</option>
                    <option value="Dry">Dry</option>
                    <option value="Heat">Heat</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group>
                  <Form.Label className="text-secondary fs-12 fw-bold">Room Temp (°C)</Form.Label>
                  <Form.Control type="number" min="16" max="30" value={scheduleData.setTemp || 24} onChange={e => setScheduleData({...scheduleData, setTemp: Number(e.target.value)})} className="premium-input py-2" />
                </Form.Group>
              </Col>
            </Row>
          </div>

        </Modal.Body>
        <Modal.Footer className="border-top-0 pt-0 px-4 pb-4" style={{ background: '#0f172a' }}>
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
          <Button variant="info" className="rounded-pill px-5 fw-bold shadow" onClick={applySchedule} disabled={!scheduleTargetId}>
            Dispatch Schedule
          </Button>
        </Modal.Footer>
      </Modal>

      {/* POWER CONTROL MODAL */}
      <Modal show={showControlModal} onHide={() => setShowControlModal(false)} centered size="sm" className={`premium-modal ${isDark ? '' : 'light-mode-modal'}`}>
        <Modal.Header closeButton closeVariant={isDark ? "white" : "black"} className="border-bottom-0 pb-0" style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
          <Modal.Title className={`fs-5 fw-bold d-flex align-items-center gap-3 ${isDark ? 'text-white' : 'text-dark'}`}>
            <div className="bg-info rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '36px', height: '36px' }}>
              <Power size={18} color="white" />
            </div>
            Operation Mode
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4 text-center position-relative" style={{ background: isDark ? '#0f172a' : '#f8fafc', color: isDark ? '#fff' : '#0f172a' }}>
          
          {/* Segmented Control for Auto/Manual */}
          <div className="d-flex align-items-center justify-content-between p-1 rounded-pill mb-4 mx-auto" style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)', width: '220px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'}`, boxShadow: isDark ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            <div 
              onClick={() => {
                setControlMode('Manual'); 
                setControlSuccessMessage('');
                setUnits(units.map(u => u.id === controlTargetId ? { ...u, operationMode: 'Manual' } : u));
              }}
              className={`w-50 text-center py-2 rounded-pill fw-bold transition-all ${controlMode === 'Manual' ? 'bg-info text-white shadow' : (isDark ? 'text-secondary' : 'text-dark')}`}
              style={{ fontSize: '12px', letterSpacing: '1px', cursor: 'pointer' }}
            >
              MANUAL
            </div>
            <div 
              onClick={() => {
                setControlMode('Auto'); 
                setControlSuccessMessage('');
                setUnits(units.map(u => u.id === controlTargetId ? { ...u, operationMode: 'Auto' } : u));
              }}
              className={`w-50 text-center py-2 rounded-pill fw-bold transition-all ${controlMode === 'Auto' ? 'bg-info text-white shadow' : (isDark ? 'text-secondary' : 'text-dark')}`}
              style={{ fontSize: '12px', letterSpacing: '1px', cursor: 'pointer' }}
            >
              AUTO
            </div>
          </div>

          {/* Floating Success Message Overlay */}
          <div 
            className="alert py-2 border-0 fw-bold shadow-lg d-flex align-items-center justify-content-center m-0" 
            style={{ 
              position: 'absolute', 
              top: '65%', 
              left: '50%', 
              transform: controlSuccessMessage ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.9)', 
              width: '85%', 
              zIndex: 100,
              background: 'rgba(16, 185, 129, 0.95)', 
              color: '#fff', 
              borderRadius: '12px', 
              border: '1px solid rgba(16, 185, 129, 1)',
              opacity: controlSuccessMessage ? 1 : 0,
              visibility: controlSuccessMessage ? 'visible' : 'hidden',
              transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              backdropFilter: 'blur(4px)'
            }}>
            {controlSuccessMessage || 'SUCCESS'}
          </div>

          {/* Premium Action Buttons */}
          <div className="d-flex justify-content-center align-items-center gap-2 w-100" style={{ minHeight: '110px', transition: 'all 0.3s ease' }}>
            {controlMode === 'Manual' ? (
              <>
                <button onClick={() => handleControlAction('START')} className="action-btn-premium start-btn" style={{ width: '100px', height: '85px' }}>
                  <Play size={24} className="mb-2" />
                  <span>START</span>
                </button>
                <button onClick={() => handleControlAction('STOP')} className="action-btn-premium stop-btn" style={{ width: '100px', height: '85px' }}>
                  <Square size={22} className="mb-2" fill="currentColor" />
                  <span>STOP</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => handleAutoToggle('SCHEDULE')} className={`action-btn-premium schedule-btn ${autoOptions.includes('SCHEDULE') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} style={{ width: '70px', height: '105px', position: 'relative' }}>
                  {autoOptions.includes('SCHEDULE') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Clock size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SCHEDULE</span>
                </button>
                <button onClick={() => handleAutoToggle('SENSOR')} className={`action-btn-premium sensor-btn ${autoOptions.includes('SENSOR') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} style={{ width: '70px', height: '105px', position: 'relative' }}>
                  {autoOptions.includes('SENSOR') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Activity size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SENSOR</span>
                </button>
                <button onClick={() => handleAutoToggle('TEMP')} className={`action-btn-premium temp-btn ${autoOptions.includes('TEMP') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} style={{ width: '70px', height: '105px', position: 'relative' }}>
                  {autoOptions.includes('TEMP') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Thermometer size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TEMP</span>
                </button>
                <button 
                  className={`action-btn-premium local-btn ${autoOptions.includes('LOCAL') ? 'active-opt' : ''} ${!isDark ? 'light-btn' : ''}`} 
                  style={{ width: '70px', height: '105px', position: 'relative', cursor: 'not-allowed', opacity: 0.8 }}
                  title="This is selected automatically when the AC is operated from a physical switch."
                >
                  {autoOptions.includes('LOCAL') && <CheckCircle size={18} fill="#10b981" color="#ffffff" style={{position: 'absolute', top: '4px', right: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'}} />}
                  <Settings size={24} className="mb-2" />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px' }}>LOCAL</span>
                </button>
              </>
            )}
          </div>

        </Modal.Body>
      </Modal>

      {/* STYLE SHEET */}
      <style dangerouslySetInnerHTML={{__html: `
        
        .premium-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }

        .hover-glow:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }

        .sleek-power.on:hover {
          box-shadow: 0 12px 25px rgba(14, 165, 233, 0.5) !important;
          transform: scale(1.05);
        }
        .sleek-power.off:hover {
          background: rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }

        .hover-white:hover {
          color: #fff !important;
          background: rgba(255,255,255,0.05);
        }

        .premium-input {
          background: rgba(15, 23, 42, 0.8) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
          border-radius: 12px;
          transition: all 0.3s;
        }
        .premium-input:focus {
          border-color: #0ea5e9 !important;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2) !important;
        }

        .premium-select {
          background-color: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          font-size: 11px;
          font-weight: bold;
        }

        .action-btn-premium {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.5px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 10px rgba(0,0,0,0.2);
          cursor: pointer;
        }

        .action-btn-premium.light-btn:not(.active-opt) {
          background: #ffffff;
          border-color: rgba(0,0,0,0.1);
          color: #475569;
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }
        
        .action-btn-premium.light-btn:not(.active-opt):hover {
          background: #f8fafc;
          border-color: rgba(0,0,0,0.15);
        }

        .action-btn-premium:hover {
          transform: translateY(-5px);
        }

        .start-btn { color: #10b981; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.05); }
        .stop-btn { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); }
        .schedule-btn { color: #0ea5e9; border-color: rgba(14, 165, 233, 0.3); background: rgba(14, 165, 233, 0.02); }
        .sensor-btn { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.02); }
        .temp-btn { color: #ec4899; border-color: rgba(236, 72, 153, 0.3); background: rgba(236, 72, 153, 0.02); }
        .local-btn { color: #a855f7; border-color: rgba(168, 85, 247, 0.3); background: rgba(168, 85, 247, 0.02); }

        .start-btn:hover { background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.3)); border-color: rgba(16, 185, 129, 0.5); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
        .stop-btn:hover { background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3)); border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2); }
        .schedule-btn:hover { background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(2, 132, 199, 0.2)); border-color: rgba(14, 165, 233, 0.5); box-shadow: 0 10px 20px rgba(14, 165, 233, 0.2); }
        .sensor-btn:hover { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.2)); border-color: rgba(245, 158, 11, 0.5); box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2); }
        .temp-btn:hover { background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.2)); border-color: rgba(236, 72, 153, 0.5); box-shadow: 0 10px 20px rgba(236, 72, 153, 0.2); }
        .local-btn:hover { background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.2)); border-color: rgba(168, 85, 247, 0.5); box-shadow: 0 10px 20px rgba(168, 85, 247, 0.2); }

        .schedule-btn.active-opt { background: linear-gradient(135deg, rgba(14, 165, 233, 0.4), rgba(2, 132, 199, 0.6)); border-color: rgba(14, 165, 233, 0.8); box-shadow: 0 10px 20px rgba(14, 165, 233, 0.4); color: #fff; }
        .sensor-btn.active-opt { background: linear-gradient(135deg, rgba(245, 158, 11, 0.4), rgba(217, 119, 6, 0.6)); border-color: rgba(245, 158, 11, 0.8); box-shadow: 0 10px 20px rgba(245, 158, 11, 0.4); color: #fff; }
        .temp-btn.active-opt { background: linear-gradient(135deg, rgba(236, 72, 153, 0.4), rgba(219, 39, 119, 0.6)); border-color: rgba(236, 72, 153, 0.8); box-shadow: 0 10px 20px rgba(236, 72, 153, 0.4); color: #fff; }
        .local-btn.active-opt { background: linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(147, 51, 234, 0.6)); border-color: rgba(168, 85, 247, 0.8); box-shadow: 0 10px 20px rgba(168, 85, 247, 0.4); color: #fff; }

        
        .fs-12 { font-size: 0.75rem !important; }
        .fs-11 { font-size: 0.7rem !important; }
        .tracking-widest { letter-spacing: 1.5px !important; }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background-color: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 2s infinite;
        }
        .pulse-badge {
          animation: pulse 2s infinite;
        }
        
        @keyframes airflow {
          0% { transform: translateY(-5px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(15px); opacity: 0; }
        }
        .airflow-line {
          animation: airflow 1.5s infinite linear;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />
    </div>
  );
};

export default ACOverview;
