import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Form, Button } from 'react-bootstrap';
import { Clock, Calendar as CalendarIcon, Settings, Plus, Trash2, Thermometer, Power } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
  { id: 'sunday', label: 'Sunday' }
];

const INITIAL_SCHEDULE = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: []
};

const BLANK_SCHEDULE = {
  monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
};

const ACScheduler = () => {
  const { isDark } = useTheme();
  const [acList, setAcList] = useState([]);
  const [selectedAC, setSelectedAC] = useState(() => sessionStorage.getItem('bms_ac_scheduler_last_ac') || 'ALL');
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDay, setSelectedDay] = useState('monday');
  
  const [allSchedules, setAllSchedules] = useState({});
  const [allSpecialDates, setAllSpecialDates] = useState({});

  useEffect(() => {
    sessionStorage.setItem('bms_ac_scheduler_last_ac', selectedAC);
  }, [selectedAC]);

  useEffect(() => {
    const storedUnits = JSON.parse(localStorage.getItem('bms_ac_units') || '[]');
    if (storedUnits.length > 0) {
      setAcList(storedUnits);
    }
    
    const savedSchedulesStr = localStorage.getItem('bms_ac_schedules');
    if (savedSchedulesStr) {
      try {
        const saved = JSON.parse(savedSchedulesStr);
        let dailySchedules = saved.daily || { 'ALL': INITIAL_SCHEDULE };
        
        // Wipe old default schedule if it's still saved in local storage
        if (dailySchedules['ALL'] && dailySchedules['ALL'].tuesday?.length === 1 && dailySchedules['ALL'].tuesday[0].id === 2 && dailySchedules['ALL'].tuesday[0].start === '08:00') {
           dailySchedules['ALL'] = INITIAL_SCHEDULE;
           localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: dailySchedules, special: saved.special || { 'ALL': [] } }));
        }
        
        setAllSchedules(dailySchedules);
        setAllSpecialDates(saved.special || { 'ALL': [] });
      } catch(e) {
        setAllSchedules({ 'ALL': INITIAL_SCHEDULE });
        setAllSpecialDates({ 'ALL': [] });
      }
    } else {
      setAllSchedules({ 'ALL': INITIAL_SCHEDULE });
      setAllSpecialDates({ 'ALL': [] });
    }
  }, []);

  const currentSchedules = selectedAC === 'ALL' 
    ? (allSchedules['ALL'] || INITIAL_SCHEDULE) 
    : (allSchedules[selectedAC] || BLANK_SCHEDULE);
    
  const currentSpecialDates = allSpecialDates[selectedAC] || [];

  const activeDaySlots = currentSchedules[selectedDay] || [];

  const getNextDateForDay = (dayId) => {
    const dayIndexMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    const targetDay = dayIndexMap[dayId];
    const now = new Date();
    const currentDay = now.getDay();
    
    let daysToAdd = targetDay - currentDay;
    let isToday = false;
    if (daysToAdd === 0) {
      isToday = true;
    } else if (daysToAdd < 0) {
      daysToAdd += 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysToAdd);
    
    return {
      dateStr: targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      isToday
    };
  };

  const handleAddSlot = () => {
    const newId = Date.now();
    const updated = {
      ...currentSchedules,
      [selectedDay]: [...activeDaySlots, { id: newId, start: '09:00', end: '17:00', temp: 24, power: 'ON' }]
    };
    const newAll = { ...allSchedules, [selectedAC]: updated };
    setAllSchedules(newAll);
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: newAll, special: allSpecialDates }));
  };

  const handleDeleteSlot = (slotId) => {
    const updated = {
      ...currentSchedules,
      [selectedDay]: activeDaySlots.filter(s => s.id !== slotId)
    };
    const newAll = { ...allSchedules, [selectedAC]: updated };
    setAllSchedules(newAll);
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: newAll, special: allSpecialDates }));
  };

  const handleUpdateSlot = (slotId, field, value) => {
    const updated = {
      ...currentSchedules,
      [selectedDay]: activeDaySlots.map(s => s.id === slotId ? { ...s, [field]: value } : s)
    };
    const newAll = { ...allSchedules, [selectedAC]: updated };
    setAllSchedules(newAll);
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: newAll, special: allSpecialDates }));
  };

  const handleAddSpecialDate = () => {
    const updated = [...currentSpecialDates, { id: Date.now(), name: 'New Event', date: '', action: 'System OFF', temp: 24 }];
    const newSpecial = { ...allSpecialDates, [selectedAC]: updated };
    setAllSpecialDates(newSpecial);
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: allSchedules, special: newSpecial }));
  };

  const handleDeleteSpecialDate = (id) => {
    const updated = currentSpecialDates.filter(d => d.id !== id);
    const newSpecial = { ...allSpecialDates, [selectedAC]: updated };
    setAllSpecialDates(newSpecial);
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: allSchedules, special: newSpecial }));
  };

  const handleUpdateSpecialDate = (id, field, value) => {
    const updated = currentSpecialDates.map(d => d.id === id ? { ...d, [field]: value } : d);
    const newSpecial = { ...allSpecialDates, [selectedAC]: updated };
    setAllSpecialDates(newSpecial);
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: allSchedules, special: newSpecial }));
  };

  const handleSaveAll = () => {
    localStorage.setItem('bms_ac_schedules', JSON.stringify({ daily: allSchedules, special: allSpecialDates }));
    alert("Schedule saved successfully!");
  };

  return (
    <div className="fade-in p-4 h-100" style={{ background: isDark ? '#0b1121' : '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      
      {/* HEADER SECTION */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
        <div>
          <h4 className={`fw-black mb-1 d-flex align-items-center ${isDark ? 'text-white' : 'text-dark'}`} style={{ letterSpacing: '0.5px' }}>
            <CalendarIcon className="me-2 text-info" size={24} />
            Schedule Management
          </h4>
          <p className={`${isDark ? 'text-secondary' : 'text-muted'} mb-0`} style={{ fontSize: '11px', letterSpacing: '0.3px' }}>
            Automate AC operation schedules based on days, holidays, and automated return rules.
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Form.Select 
            value={selectedAC}
            onChange={(e) => setSelectedAC(e.target.value)}
            className="fw-bold shadow-sm"
            style={{ 
              width: '200px', 
              background: isDark ? '#1e293b' : '#ffffff', 
              color: isDark ? '#fff' : '#000',
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'
            }}
          >
            <option value="ALL">Global (All ACs)</option>
            {acList.map(ac => (
              <option key={ac.id} value={ac.id.toString()}>{ac.name}</option>
            ))}
          </Form.Select>
          <Button 
            className="fw-bold px-4 rounded-2 border-0" 
            style={{ background: '#0ea5e9', color: '#0f172a', letterSpacing: '0.5px' }}
            onClick={handleSaveAll}
          >
            Save All Schedules
          </Button>
        </div>
      </div>

      {/* TABS SECTION */}
      <div className="d-flex gap-4 mb-4 border-bottom" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
        <button 
          className={`btn fw-bold pb-3 px-3 rounded-0 border-0 ${activeTab === 'daily' ? 'border-bottom border-2 border-info text-info' : (isDark ? 'text-secondary' : 'text-muted')}`}
          onClick={() => setActiveTab('daily')}
          style={{ background: 'transparent' }}
        >
          <Clock size={16} className="me-2 mb-1" />
          Daily & Weekly
        </button>
        <button 
          className={`btn fw-bold pb-3 px-3 rounded-0 border-0 ${activeTab === 'annual' ? 'border-bottom border-2 border-info text-info' : (isDark ? 'text-secondary' : 'text-muted')}`}
          onClick={() => setActiveTab('annual')}
          style={{ background: 'transparent' }}
        >
          <CalendarIcon size={16} className="me-2 mb-1" />
          Specific Date Schedules
        </button>
      </div>

      {/* MAIN CONTENT */}
      {activeTab === 'daily' && (
        <Row className="gx-4">
          {/* SIDEBAR: DAYS OF WEEK */}
          <Col md={3} lg={2}>
            <div className={`fw-bold mb-3 ${isDark ? 'text-secondary' : 'text-muted'}`} style={{ fontSize: '10px', letterSpacing: '1px' }}>
              <Clock size={12} className="me-1 mb-1" /> DAYS OF WEEK
            </div>
            <div className="d-flex flex-column gap-1">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`btn text-start p-3 d-flex justify-content-between align-items-center rounded-3 border-0 transition-all ${selectedDay === day.id ? 'active-day-btn' : 'inactive-day-btn'}`}
                >
                  <span className={`fw-bold ${selectedDay === day.id ? 'text-white' : (isDark ? 'text-secondary' : 'text-dark')}`}>{day.label}</span>
                  <Badge 
                    bg={currentSchedules[day.id]?.length > 0 ? 'info' : 'secondary'} 
                    className="rounded-pill px-2 py-1"
                    style={{ fontSize: '10px', color: currentSchedules[day.id]?.length > 0 ? '#fff' : 'inherit' }}
                  >
                    {currentSchedules[day.id]?.length || 0} Slots
                  </Badge>
                </button>
              ))}
            </div>
          </Col>

          {/* MAIN SCHEDULE AREA */}
          <Col md={9} lg={10}>
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
              <div className="d-flex align-items-center gap-3">
                <h5 className={`fw-bold mb-0 ${isDark ? 'text-white' : 'text-dark'}`}>
                  {DAYS_OF_WEEK.find(d => d.id === selectedDay)?.label} Schedule
                </h5>
                {(() => {
                  const { dateStr, isToday } = getNextDateForDay(selectedDay);
                  return (
                    <Badge bg={isToday ? 'info' : 'secondary'} className="rounded-pill px-3 py-2 fw-bold" style={{ letterSpacing: '0.5px' }}>
                      <CalendarIcon size={12} className="me-1 mb-1" />
                      {isToday ? 'Today, ' : 'Next: '} {dateStr}
                    </Badge>
                  );
                })()}
              </div>
              <Button 
                variant="outline-info" 
                className="rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                onClick={handleAddSlot}
                style={{ borderColor: '#0ea5e9', color: '#0ea5e9', boxShadow: isDark ? '0 0 10px rgba(14, 165, 233, 0.2)' : 'none' }}
              >
                <Plus size={16} /> Add Time Slot
              </Button>
            </div>

            <div className="d-flex flex-column gap-3">
              {activeDaySlots.length === 0 ? (
                <div className={`text-center py-5 rounded-4 ${isDark ? 'text-secondary' : 'text-muted'}`} style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)' }}>
                  <Clock size={40} className="mb-3 opacity-50" />
                  <h5>No Schedule Slots</h5>
                  <p>Click "Add Time Slot" to create a new schedule for this day.</p>
                </div>
              ) : (
                activeDaySlots.map((slot, index) => (
                  <div key={slot.id} className="schedule-slot-card p-3 rounded-4 d-flex align-items-center justify-content-between position-relative" 
                       style={{ 
                         background: isDark ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.4))' : 'linear-gradient(145deg, #ffffff, #f8fafc)', 
                         border: isDark ? '1px solid rgba(14, 165, 233, 0.2)' : '1px solid rgba(14, 165, 233, 0.4)', 
                         boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 15px rgba(14, 165, 233, 0.1)',
                         borderLeft: '4px solid #0ea5e9',
                         transition: 'all 0.3s ease'
                       }}>
                    <div className="d-flex align-items-center gap-4">
                      <div className={`fw-bold ${isDark ? 'text-info' : 'text-primary'}`} style={{ width: '60px', letterSpacing: '0.5px' }}>Slot {index + 1}</div>
                      
                      <div className="d-flex align-items-center gap-3">
                        <div className="time-input-wrapper d-flex align-items-center gap-1" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                          <Form.Control 
                            type="time" 
                            value={slot.start}
                            onChange={(e) => handleUpdateSlot(slot.id, 'start', e.target.value)}
                            className="bg-transparent border-0 fw-bold px-0"
                            style={{ color: isDark ? '#fff' : '#000', outline: 'none', boxShadow: 'none' }}
                          />
                        </div>
                        <span className={`fw-bold ${isDark ? 'text-secondary' : 'text-muted'}`}>to</span>
                        <div className="time-input-wrapper d-flex align-items-center gap-1" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', padding: '6px 12px', borderRadius: '8px', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                          <Form.Control 
                            type="time" 
                            value={slot.end}
                            onChange={(e) => handleUpdateSlot(slot.id, 'end', e.target.value)}
                            className="bg-transparent border-0 fw-bold px-0"
                            style={{ color: isDark ? '#fff' : '#000', outline: 'none', boxShadow: 'none' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-4">
                      {/* Temp Input */}
                      <div className="temp-input-wrapper d-flex align-items-center px-3 rounded-3" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#f1f5f9', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', padding: '6px 0' }}>
                        <Thermometer size={16} className="text-info me-1" />
                        <Form.Control 
                          type="number" 
                          min="16" max="30"
                          value={slot.temp}
                          onChange={(e) => handleUpdateSlot(slot.id, 'temp', e.target.value)}
                          className="bg-transparent border-0 text-center fw-bold px-1"
                          style={{ width: '45px', color: isDark ? '#fff' : '#000', appearance: 'none', boxShadow: 'none' }}
                        />
                        <span className="text-secondary fw-bold">°C</span>
                      </div>

                      {/* Power Toggle */}
                      <button 
                        className={`btn rounded-pill px-4 fw-bold d-flex align-items-center gap-2 transition-all`}
                        onClick={() => handleUpdateSlot(slot.id, 'power', slot.power === 'ON' ? 'OFF' : 'ON')}
                        style={{ 
                          height: '38px', minWidth: '90px',
                          background: slot.power === 'ON' ? '#0ea5e9' : (isDark ? '#334155' : '#cbd5e1'), 
                          color: slot.power === 'ON' ? '#0f172a' : (isDark ? '#94a3b8' : '#64748b'),
                          boxShadow: slot.power === 'ON' ? '0 0 15px rgba(14, 165, 233, 0.4)' : 'none'
                        }}
                      >
                        <Power size={16} /> {slot.power}
                      </button>

                      {/* Delete */}
                      <button 
                        className="btn btn-link text-danger p-2 hover-bg-danger rounded-circle"
                        onClick={() => handleDeleteSlot(slot.id)}
                        title="Delete Slot"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Col>
        </Row>
      )}

      {/* ANNUAL & HOLIDAYS CONTENT */}
      {activeTab === 'annual' && (
        <div className="fade-in pt-2">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className={`fw-bold mb-1 d-flex align-items-center ${isDark ? 'text-white' : 'text-dark'}`}>
                <CalendarIcon className="me-2 text-info" size={20} />
                Annual & Holiday Schedule
              </h5>
              <p className={`${isDark ? 'text-secondary' : 'text-muted'} mb-0`} style={{ fontSize: '11px', letterSpacing: '0.3px' }}>
                Program special settings for weekends, holidays, and store closings.
              </p>
            </div>
            <Button 
              variant="outline-info" 
              className="rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
              style={{ borderColor: '#0ea5e9', color: '#0ea5e9' }}
              onClick={handleAddSpecialDate}
            >
              <Plus size={16} /> Add Special Date
            </Button>
          </div>

          {/* Global Weekend Rule */}
          <div className="mb-5">
            <h6 className="fw-bold mb-3" style={{ color: '#0ea5e9' }}>Global Weekend Rule (Saturday & Sunday)</h6>
            <div className="d-flex align-items-center gap-3 p-3 rounded-3" style={{ background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0' }}>
              <Form.Select 
                className="fw-bold"
                style={{ 
                  width: '250px', 
                  background: isDark ? '#1e293b' : '#ffffff', 
                  color: isDark ? '#fff' : '#000',
                  border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'
                }}
              >
                <option>Force OFF (System Shutdown)</option>
                <option>Custom Schedule</option>
              </Form.Select>
              <span className={isDark ? 'text-secondary' : 'text-muted'} style={{ fontSize: '11px' }}>
                This rule applies automatically to all weekends unless overridden by a specific holiday date below.
              </span>
            </div>
          </div>

          {/* Specific Dates */}
          <div>
            <h6 className={`fw-bold mb-3 ${isDark ? 'text-white' : 'text-dark'}`}>Specific Dates / Store Closings</h6>
            <div className="d-flex flex-column gap-3">
              {currentSpecialDates.length === 0 ? (
                <div className={`text-center py-4 rounded-3 ${isDark ? 'text-secondary' : 'text-muted'}`} style={{ border: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)' }}>
                  No special dates added.
                </div>
              ) : (
                currentSpecialDates.map(sd => (
                  <div key={sd.id} className="p-3 rounded-3 d-flex align-items-center justify-content-between" style={{ background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0' }}>
                    <div className="d-flex align-items-center gap-4">
                      <Form.Control 
                        type="text" 
                        value={sd.name}
                        onChange={(e) => handleUpdateSpecialDate(sd.id, 'name', e.target.value)}
                        className="fw-medium"
                        style={{ 
                          width: '200px', 
                          background: isDark ? '#1e293b' : '#ffffff', 
                          color: isDark ? '#fff' : '#000',
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'
                        }}
                      />
                      <div className="d-flex align-items-center" style={{ 
                          background: isDark ? '#1e293b' : '#ffffff', 
                          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0 10px'
                        }}>
                        <Form.Control 
                          type="text" 
                          value={sd.date}
                          placeholder="DD-MM-YYYY"
                          onChange={(e) => handleUpdateSpecialDate(sd.id, 'date', e.target.value)}
                          className="border-0 bg-transparent text-center"
                          style={{ width: '120px', color: isDark ? '#fff' : '#000' }}
                        />
                        <CalendarIcon size={14} className={isDark ? 'text-secondary' : 'text-muted'} />
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className={isDark ? 'text-secondary' : 'text-muted'} style={{ fontSize: '12px' }}>Action:</span>
                        <Form.Select 
                          className="fw-bold"
                          value={sd.action}
                          onChange={(e) => handleUpdateSpecialDate(sd.id, 'action', e.target.value)}
                          style={{ 
                            width: '180px', 
                            background: isDark ? '#1e293b' : '#ffffff', 
                            color: isDark ? '#fff' : '#000',
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1'
                          }}
                        >
                          <option>System OFF</option>
                          <option>Custom Temp</option>
                        </Form.Select>
                        
                        {/* Temp Input for Custom Temp */}
                        {sd.action === 'Custom Temp' && (
                          <div className="temp-input-wrapper d-flex align-items-center px-2 rounded-3 ms-2 fade-in" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1', height: '38px' }}>
                            <Form.Control 
                              type="number" 
                              value={sd.temp}
                              onChange={(e) => handleUpdateSpecialDate(sd.id, 'temp', e.target.value)}
                              className="bg-transparent border-0 text-center fw-bold px-1"
                              style={{ width: '40px', color: isDark ? '#fff' : '#000', appearance: 'none' }}
                            />
                            <span className="text-secondary fw-bold" style={{ fontSize: '12px' }}>°C</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      className="btn btn-link text-danger p-2 hover-bg-danger rounded-circle"
                      onClick={() => handleDeleteSpecialDate(sd.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style dangerouslySetInnerHTML={{__html: `
        .active-day-btn {
          background: rgba(15, 23, 42, 0.8) !important;
          border-left: 3px solid #0ea5e9 !important;
          border-radius: 4px !important;
        }
        .inactive-day-btn {
          background: transparent !important;
          color: ${isDark ? '#94a3b8' : '#475569'} !important;
          border-left: 3px solid transparent !important;
          border-radius: 4px !important;
        }
        .inactive-day-btn:hover {
          background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} !important;
        }

        .time-input-wrapper {
          background: ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'};
          border-radius: 8px;
          overflow: hidden;
        }
        
        .time-input {
          background: transparent !important;
          border: none !important;
          color: ${isDark ? '#fff' : '#000'} !important;
          font-weight: 600;
          padding: 6px 10px;
        }

        .time-input::-webkit-calendar-picker-indicator {
          filter: ${isDark ? 'invert(1)' : 'none'};
          opacity: 0.5;
          cursor: pointer;
        }

        .hover-bg-danger:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .schedule-slot-card {
          border-left: 3px solid #0ea5e9 !important;
        }
      `}} />
    </div>
  );
};

export default ACScheduler;
