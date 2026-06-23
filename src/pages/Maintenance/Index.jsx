import React, { useState, useMemo } from 'react';
import { Row, Col, Badge, Table, Modal, Form, Button } from 'react-bootstrap';
import {
  Wrench, History, CheckCircle, AlertTriangle, Clock, Plus, Search,
  Filter, Calendar, Zap, Droplets, Wind, Thermometer, ShieldAlert,
  Database, Activity, Flame, Settings, FileText, ChevronRight,
  BarChart2, RefreshCw, Download, Bell, X, Edit3, Trash2, Eye
} from 'lucide-react';

// ─── Asset Registry (all BMS assets) ─────────────────────────────────────────
const ASSET_REGISTRY = [
  { id: 'WM-AG',   category: 'Water Management', name: 'AG Tank Pump',        icon: <Droplets size={16}/>,   color: '#06b6d4', location: 'Pump Room B1' },
  { id: 'WM-UG',   category: 'Water Management', name: 'UG Tank Pump',        icon: <Droplets size={16}/>,   color: '#06b6d4', location: 'Pump Room B1' },
  { id: 'DG-1',    category: 'DG Set',           name: 'DG Set-1',            icon: <Database size={16}/>,   color: '#f59e0b', location: 'DG Room GF' },
  { id: 'DG-2',    category: 'DG Set',           name: 'DG Set-2',            icon: <Database size={16}/>,   color: '#f59e0b', location: 'DG Room GF' },
  { id: 'DG-3',    category: 'DG Set',           name: 'DG Set-3',            icon: <Database size={16}/>,   color: '#f59e0b', location: 'DG Room GF' },
  { id: 'LT-R1',   category: 'LT Panel',         name: 'LT Room-1 Panel',     icon: <Zap size={16}/>,        color: '#8b5cf6', location: 'LT Room 1' },
  { id: 'LT-R2',   category: 'LT Panel',         name: 'LT Room-2 Panel',     icon: <Zap size={16}/>,        color: '#8b5cf6', location: 'LT Room 2' },
  { id: 'LT-R3',   category: 'LT Panel',         name: 'LT Room-3 Panel',     icon: <Zap size={16}/>,        color: '#8b5cf6', location: 'LT Room 3' },
  { id: 'TR-1',    category: 'Transformer',       name: 'Transformer-1',       icon: <Zap size={16}/>,        color: '#ec4899', location: 'Transformer Room' },
  { id: 'TR-2',    category: 'Transformer',       name: 'Transformer-2',       icon: <Zap size={16}/>,        color: '#ec4899', location: 'Transformer Room' },
  { id: 'HVAC-CH', category: 'HVAC',             name: 'Chiller Unit',        icon: <Thermometer size={16}/>,color: '#22d3ee', location: 'Terrace / Plant Room' },
  { id: 'HVAC-AH', category: 'HVAC',             name: 'AHU System',          icon: <Wind size={16}/>,       color: '#22d3ee', location: 'Floor AHU Room' },
  { id: 'HVAC-CT', category: 'HVAC',             name: 'Cooling Tower',       icon: <Thermometer size={16}/>,color: '#22d3ee', location: 'Terrace' },
  { id: 'VRV-1',   category: 'VRV',              name: 'VRV System',          icon: <Wind size={16}/>,       color: '#34d399', location: 'Terrace ODU' },
  { id: 'FP-JK',   category: 'Fire',             name: 'Jockey Pump',         icon: <ShieldAlert size={16}/>,color: '#ef4444', location: 'Fire Pump Room' },
  { id: 'FP-MN',   category: 'Fire',             name: 'Main Fire Pump',      icon: <Flame size={16}/>,      color: '#ef4444', location: 'Fire Pump Room' },
  { id: 'AC-FL1',  category: 'AC',               name: 'Floor-1 AC Units',    icon: <Wind size={16}/>,       color: '#a78bfa', location: 'Floor 1' },
  { id: 'MOT-1',   category: 'Motors',           name: 'Pump Motor-1',        icon: <Activity size={16}/>,   color: '#f97316', location: 'Pump Room 1' },
  { id: 'MOT-2',   category: 'Motors',           name: 'Pump Motor-2',        icon: <Activity size={16}/>,   color: '#f97316', location: 'Pump Room 2' },
  { id: 'EM-MM',   category: 'Energy Metering',  name: 'Main Meter',          icon: <BarChart2 size={16}/>,  color: '#60a5fa', location: 'LT Room 1' },
];

// ─── Sample maintenance records ───────────────────────────────────────────────
const INITIAL_RECORDS = [
  { id: 1,  assetId: 'DG-1',    type: 'Preventive', status: 'Completed', title: 'Engine Oil Change',        date: '2026-06-01', nextDue: '2026-09-01', tech: 'Ramesh K.',   cost: 4500,  remarks: 'Oil changed, filter replaced, coolant checked.' },
  { id: 2,  assetId: 'HVAC-CH', type: 'Preventive', status: 'Completed', title: 'Annual Refrigerant Check', date: '2026-05-20', nextDue: '2027-05-20', tech: 'Suresh P.',   cost: 12000, remarks: 'Refrigerant topped up, condenser cleaned.' },
  { id: 3,  assetId: 'FP-JK',   type: 'Corrective', status: 'Completed', title: 'Pressure Switch Repair',   date: '2026-05-15', nextDue: null,         tech: 'Mohan S.',    cost: 2800,  remarks: 'Faulty pressure switch replaced.' },
  { id: 4,  assetId: 'DG-2',    type: 'Preventive', status: 'Scheduled', title: 'Battery Maintenance',      date: '2026-06-15', nextDue: '2026-12-15', tech: 'Ramesh K.',   cost: 1500,  remarks: 'Scheduled battery load test.' },
  { id: 5,  assetId: 'WM-AG',   type: 'Preventive', status: 'Overdue',   title: 'Impeller Inspection',      date: '2026-05-01', nextDue: '2026-06-01', tech: 'Anand V.',    cost: 3200,  remarks: 'Missed — rescheduled.' },
  { id: 6,  assetId: 'TR-1',    type: 'Preventive', status: 'Scheduled', title: 'Oil Level & IR Test',      date: '2026-06-20', nextDue: '2027-06-20', tech: 'Vendor-ABB',  cost: 18000, remarks: 'Annual transformer servicing.' },
  { id: 7,  assetId: 'VRV-1',   type: 'Preventive', status: 'Completed', title: 'Filter Cleaning',          date: '2026-06-05', nextDue: '2026-09-05', tech: 'Suresh P.',   cost: 2000,  remarks: 'Indoor filters cleaned, drain checked.' },
  { id: 8,  assetId: 'FP-MN',   type: 'Corrective', status: 'In Progress',title:'Bearing Replacement',      date: '2026-06-10', nextDue: null,         tech: 'Mohan S.',    cost: 6500,  remarks: 'Bearing worn — replacement in progress.' },
  { id: 9,  assetId: 'LT-R1',   type: 'Preventive', status: 'Scheduled', title: 'Thermal Imaging Scan',    date: '2026-06-25', nextDue: '2026-12-25', tech: 'Vendor-Siemens',cost:8000, remarks: 'Scheduled thermal scan of all busbars.' },
  { id: 10, assetId: 'MOT-1',   type: 'Corrective', status: 'Completed', title: 'Winding Resistance Test',  date: '2026-06-03', nextDue: null,         tech: 'Anand V.',    cost: 1200,  remarks: 'Winding tested — within limits.' },
  { id: 11, assetId: 'HVAC-AH', type: 'Preventive', status: 'Overdue',   title: 'Belt & Filter Service',    date: '2026-05-25', nextDue: '2026-06-10', tech: 'Suresh P.',   cost: 2500,  remarks: 'Pending.' },
  { id: 12, assetId: 'EM-MM',   type: 'Preventive', status: 'Completed', title: 'Calibration Check',        date: '2026-05-10', nextDue: '2026-11-10', tech: 'Anand V.',    cost: 800,   remarks: 'Meter calibrated, CT ratios verified.' },
];

const STATUS_CONFIG = {
  'Completed':   { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  dot: '#10b981' },
  'Scheduled':   { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.3)',   dot: '#06b6d4' },
  'In Progress': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  dot: '#f59e0b' },
  'Overdue':     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   dot: '#ef4444' },
  'Cancelled':   { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', dot: '#94a3b8' },
};

const TYPE_CONFIG = {
  'Preventive': { color: '#06b6d4', label: 'PM' },
  'Corrective': { color: '#f97316', label: 'CM' },
  'Breakdown':  { color: '#ef4444', label: 'BM' },
  'Inspection': { color: '#a78bfa', label: 'INS' },
};

const CATEGORIES = ['All', ...Array.from(new Set(ASSET_REGISTRY.map(a => a.category)))];

// ─── StatusBadge Component ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Scheduled'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, padding: '3px 10px', borderRadius: 20,
      fontSize: '0.68rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 0.5,
      whiteSpace: 'nowrap'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MaintenancePage = () => {
  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    assetId: '', type: 'Preventive', status: 'Scheduled',
    title: '', date: new Date().toISOString().split('T')[0],
    nextDue: '', tech: '', cost: '', remarks: ''
  });

  // Stats
  const stats = useMemo(() => ({
    total: records.length,
    completed: records.filter(r => r.status === 'Completed').length,
    overdue: records.filter(r => r.status === 'Overdue').length,
    scheduled: records.filter(r => r.status === 'Scheduled').length,
    inProgress: records.filter(r => r.status === 'In Progress').length,
    totalCost: records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0),
  }), [records]);

  // Filtered records
  const filtered = useMemo(() => {
    return records.filter(r => {
      const asset = ASSET_REGISTRY.find(a => a.id === r.assetId);
      const matchSearch = !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tech.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = filterCategory === 'All' || asset?.category === filterCategory;
      const matchStatus = filterStatus === 'All' || r.status === filterStatus;
      const matchType = filterType === 'All' || r.type === filterType;
      return matchSearch && matchCat && matchStatus && matchType;
    });
  }, [records, searchQuery, filterCategory, filterStatus, filterType]);

  const handleAddRecord = () => {
    if (!newRecord.assetId || !newRecord.title) return;
    const id = Date.now();
    setRecords(prev => [{ ...newRecord, id, cost: Number(newRecord.cost) || 0 }, ...prev]);
    setNewRecord({ assetId: '', type: 'Preventive', status: 'Scheduled', title: '', date: new Date().toISOString().split('T')[0], nextDue: '', tech: '', cost: '', remarks: '' });
    setShowAddModal(false);
  };

  const handleDelete = (id) => setRecords(prev => prev.filter(r => r.id !== id));

  // Asset cards for overview
  const assetSummary = useMemo(() => {
    return ASSET_REGISTRY.map(asset => {
      const assetRecords = records.filter(r => r.assetId === asset.id);
      const lastDone = assetRecords.filter(r => r.status === 'Completed').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const upcoming = assetRecords.filter(r => r.status === 'Scheduled').sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      const overdue = assetRecords.some(r => r.status === 'Overdue');
      const inProg = assetRecords.some(r => r.status === 'In Progress');
      const health = overdue ? 'Overdue' : inProg ? 'In Progress' : upcoming ? 'Scheduled' : lastDone ? 'Good' : 'No Records';
      return { ...asset, assetRecords, lastDone, upcoming, overdue, health };
    });
  }, [records]);

  const glassCard = {
    background: 'linear-gradient(135deg, rgba(13,20,38,0.95) 0%, rgba(8,12,24,0.98) 100%)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
  };

  const tab = (key, label, Icon) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        background: activeTab === key ? 'rgba(6,182,212,0.15)' : 'transparent',
        border: activeTab === key ? '1px solid rgba(6,182,212,0.35)' : '1px solid transparent',
        color: activeTab === key ? '#06b6d4' : '#64748b',
        borderRadius: 10, padding: '8px 18px', fontSize: '0.78rem',
        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all 0.2s', letterSpacing: 0.5, textTransform: 'uppercase'
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div className="fade-in" style={{ minHeight: '100vh', padding: '0 0 40px' }}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div style={{ ...glassCard, padding: '20px 24px', marginBottom: 20, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}>
              <Wrench size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, color: '#f8fafc', fontSize: '1.25rem', letterSpacing: '0.5px' }}>
                Maintenance & Service History
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.75rem', marginTop: 2 }}>
                Asset-wise maintenance tracking • {ASSET_REGISTRY.length} assets registered • All systems
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 18px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(239,68,68,0.25)' }}
            >
              <Plus size={15} /> Add Record
            </button>
            <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 10, padding: '8px 14px', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Stats ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Records', value: stats.total,      color: '#06b6d4', icon: <FileText size={18}/> },
          { label: 'Completed',     value: stats.completed,  color: '#10b981', icon: <CheckCircle size={18}/> },
          { label: 'Scheduled',     value: stats.scheduled,  color: '#06b6d4', icon: <Calendar size={18}/> },
          { label: 'In Progress',   value: stats.inProgress, color: '#f59e0b', icon: <RefreshCw size={18}/> },
          { label: 'Overdue',       value: stats.overdue,    color: '#ef4444', icon: <AlertTriangle size={18}/> },
          { label: 'Total Cost',    value: `₹${(stats.totalCost/1000).toFixed(1)}K`, color: '#a78bfa', icon: <BarChart2 size={18}/> },
        ].map((kpi, i) => (
          <div key={i} style={{ ...glassCard, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: '50%', background: kpi.color, opacity: 0.06, filter: 'blur(16px)' }} />
            <div style={{ color: kpi.color, marginBottom: 8 }}>{kpi.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: kpi.color, fontFamily: 'monospace', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tab('overview',  'Asset Overview', Wrench)}
        {tab('scheduled', 'Schedules',      Calendar)}
        {tab('history',   'Service History',History)}
        {tab('report',    'Summary Report', FileText)}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: ASSET OVERVIEW */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Category filter buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  background: filterCategory === cat ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)',
                  border: filterCategory === cat ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: filterCategory === cat ? '#06b6d4' : '#64748b',
                  borderRadius: 8, padding: '5px 13px', fontSize: '0.72rem',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
                }}
              >{cat}</button>
            ))}
          </div>

          {/* Asset Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {assetSummary.filter(a => filterCategory === 'All' || a.category === filterCategory).map(asset => {
              const healthCfg = STATUS_CONFIG[asset.health] || STATUS_CONFIG['Scheduled'];
              return (
                <div
                  key={asset.id}
                  style={{ ...glassCard, padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.25s, transform 0.2s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = asset.color + '55'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  onClick={() => setFilterCategory(asset.category)}
                >
                  {/* Background glow */}
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: asset.color, opacity: 0.04, filter: 'blur(24px)', pointerEvents: 'none' }} />

                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${asset.color}20`, border: `1px solid ${asset.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: asset.color }}>
                        {asset.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#e2e8f0' }}>{asset.name}</div>
                        <div style={{ fontSize: '0.62rem', color: '#475569', fontFamily: 'monospace' }}>{asset.id} • {asset.location}</div>
                      </div>
                    </div>
                    <StatusBadge status={asset.health} />
                  </div>

                  {/* Category tag */}
                  <div style={{ display: 'inline-block', background: `${asset.color}15`, border: `1px solid ${asset.color}30`, color: asset.color, borderRadius: 6, padding: '2px 8px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                    {asset.category}
                  </div>

                  {/* Info rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#475569' }}>Last Serviced</span>
                      <span style={{ color: asset.lastDone ? '#10b981' : '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                        {asset.lastDone ? asset.lastDone.date : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#475569' }}>Next Due</span>
                      <span style={{ color: asset.upcoming ? '#06b6d4' : '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                        {asset.upcoming ? asset.upcoming.date : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#475569' }}>Total Records</span>
                      <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>{asset.assetRecords.length}</span>
                    </div>
                  </div>

                  {/* Mini status bar */}
                  {asset.assetRecords.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 3, height: 4, borderRadius: 4, overflow: 'hidden' }}>
                      {['Completed','Scheduled','In Progress','Overdue'].map(s => {
                        const cnt = asset.assetRecords.filter(r => r.status === s).length;
                        if (!cnt) return null;
                        return <div key={s} style={{ flex: cnt, background: STATUS_CONFIG[s]?.dot, borderRadius: 4 }} title={`${s}: ${cnt}`} />;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: SCHEDULES */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scheduled' && (
        <div style={glassCard}>
          {/* Filters */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search asset, task, technician…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: '0.78rem', outline: 'none' }}
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', outline: 'none' }}>
              <option value="All">All Status</option>
              {Object.keys(STATUS_CONFIG).map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', outline: 'none' }}>
              <option value="All">All Types</option>
              {Object.keys(TYPE_CONFIG).map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', outline: 'none' }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: '0.72rem', color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{filtered.length} records</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Asset', 'Category', 'Task', 'Type', 'Date', 'Next Due', 'Technician', 'Cost', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', color: '#475569', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>No records found</td></tr>
                ) : filtered.map(rec => {
                  const asset = ASSET_REGISTRY.find(a => a.id === rec.assetId);
                  const typeCfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG['Preventive'];
                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${asset?.color || '#06b6d4'}20`, border: `1px solid ${asset?.color || '#06b6d4'}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: asset?.color || '#06b6d4', flexShrink: 0 }}>
                            {asset?.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{asset?.name || rec.assetId}</div>
                            <div style={{ fontSize: '0.62rem', color: '#475569', fontFamily: 'monospace' }}>{rec.assetId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{asset?.category}</span>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600, maxWidth: 200 }}>{rec.title}</div>
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ background: `${typeCfg.color}18`, border: `1px solid ${typeCfg.color}35`, color: typeCfg.color, borderRadius: 6, padding: '2px 8px', fontSize: '0.62rem', fontWeight: 800, fontFamily: 'monospace' }}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{rec.date}</td>
                      <td style={{ padding: '11px 16px', fontSize: '0.75rem', color: rec.nextDue ? '#06b6d4' : '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{rec.nextDue || '—'}</td>
                      <td style={{ padding: '11px 16px', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{rec.tech}</td>
                      <td style={{ padding: '11px 16px', fontSize: '0.75rem', color: '#10b981', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>₹{Number(rec.cost).toLocaleString()}</td>
                      <td style={{ padding: '11px 16px' }}><StatusBadge status={rec.status} /></td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setSelectedRecord(rec); setShowDetailModal(true); }}
                            style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Eye size={12} />
                          </button>
                          <button onClick={() => handleDelete(rec.id)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: SERVICE HISTORY */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {records.filter(r => r.status === 'Completed').sort((a, b) => new Date(b.date) - new Date(a.date)).map(rec => {
            const asset = ASSET_REGISTRY.find(a => a.id === rec.assetId);
            const typeCfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG['Preventive'];
            return (
              <div key={rec.id} style={{ ...glassCard, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'flex-start', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = (asset?.color || '#06b6d4') + '45'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
              >
                {/* Timeline dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${asset?.color || '#10b981'}20`, border: `1px solid ${asset?.color || '#10b981'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: asset?.color || '#10b981' }}>
                    {asset?.icon || <CheckCircle size={16} />}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#e2e8f0', marginBottom: 3 }}>{rec.title}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: asset?.color || '#06b6d4', fontWeight: 700 }}>{asset?.name}</span>
                        <span style={{ color: '#334155', fontSize: '0.7rem' }}>•</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{asset?.category}</span>
                        <span style={{ color: '#334155', fontSize: '0.7rem' }}>•</span>
                        <span style={{ background: `${typeCfg.color}18`, border: `1px solid ${typeCfg.color}35`, color: typeCfg.color, borderRadius: 4, padding: '1px 6px', fontSize: '0.6rem', fontWeight: 800, fontFamily: 'monospace' }}>{rec.type}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.78rem', color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>₹{Number(rec.cost).toLocaleString()}</div>
                      <div style={{ fontSize: '0.68rem', color: '#475569', fontFamily: 'monospace' }}>{rec.date}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#64748b', borderLeft: `2px solid ${asset?.color || '#10b981'}40`, paddingLeft: 10 }}>
                    {rec.remarks}
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                    <span style={{ fontSize: '0.68rem', color: '#475569' }}><span style={{ color: '#64748b' }}>Tech:</span> {rec.tech}</span>
                    {rec.nextDue && <span style={{ fontSize: '0.68rem', color: '#475569' }}><span style={{ color: '#64748b' }}>Next Due:</span> <span style={{ color: '#06b6d4', fontFamily: 'monospace' }}>{rec.nextDue}</span></span>}
                    <span style={{ fontSize: '0.68rem', color: '#475569' }}><span style={{ color: '#64748b' }}>Location:</span> {asset?.location}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {records.filter(r => r.status === 'Completed').length === 0 && (
            <div style={{ ...glassCard, padding: 40, textAlign: 'center', color: '#475569' }}>
              <History size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div>No completed service records yet.</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: SUMMARY REPORT */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'report' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* By Category */}
          <div style={{ ...glassCard, padding: '18px 20px' }}>
            <h6 style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Records by Category</h6>
            {CATEGORIES.filter(c => c !== 'All').map(cat => {
              const cnt = records.filter(r => ASSET_REGISTRY.find(a => a.id === r.assetId)?.category === cat).length;
              const pct = records.length ? (cnt / records.length) * 100 : 0;
              const catColor = ASSET_REGISTRY.find(a => a.category === cat)?.color || '#06b6d4';
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{cat}</span>
                    <span style={{ fontSize: '0.75rem', color: catColor, fontFamily: 'monospace' }}>{cnt}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: catColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* By Status */}
          <div style={{ ...glassCard, padding: '18px 20px' }}>
            <h6 style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Records by Status</h6>
            {Object.keys(STATUS_CONFIG).map(status => {
              const cnt = records.filter(r => r.status === status).length;
              const pct = records.length ? (cnt / records.length) * 100 : 0;
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{status}</span>
                    <span style={{ fontSize: '0.75rem', color: cfg.color, fontFamily: 'monospace' }}>{cnt}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cost by Asset */}
          <div style={{ ...glassCard, padding: '18px 20px', gridColumn: '1 / -1' }}>
            <h6 style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Cost by Asset</h6>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
              {ASSET_REGISTRY.map(asset => {
                const totalCost = records.filter(r => r.assetId === asset.id).reduce((s, r) => s + (Number(r.cost) || 0), 0);
                if (!totalCost) return null;
                return (
                  <div key={asset.id} style={{ background: `${asset.color}10`, border: `1px solid ${asset.color}25`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ color: asset.color }}>{asset.icon}</div>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{asset.name}</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: asset.color, fontFamily: 'monospace' }}>₹{totalCost.toLocaleString()}</div>
                    <div style={{ fontSize: '0.6rem', color: '#475569' }}>{records.filter(r => r.assetId === asset.id).length} records</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ADD RECORD MODAL */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered size="lg" contentClassName="border-0 text-white" dialogClassName="scada-modal">
        <div style={{ background: 'linear-gradient(135deg, #0d1426 0%, #080c18 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Plus size={18} style={{ color: '#f59e0b' }} />
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>Add Maintenance Record</span>
            </div>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
          </div>
          <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Asset', field: 'assetId', type: 'select', options: ASSET_REGISTRY.map(a => ({ value: a.id, label: `${a.name} (${a.id})` })) },
              { label: 'Task Title', field: 'title', type: 'text', placeholder: 'e.g. Oil Change, Filter Cleaning' },
              { label: 'Type', field: 'type', type: 'select', options: Object.keys(TYPE_CONFIG).map(t => ({ value: t, label: t })) },
              { label: 'Status', field: 'status', type: 'select', options: Object.keys(STATUS_CONFIG).map(s => ({ value: s, label: s })) },
              { label: 'Date', field: 'date', type: 'date' },
              { label: 'Next Due Date', field: 'nextDue', type: 'date' },
              { label: 'Technician / Vendor', field: 'tech', type: 'text', placeholder: 'Name or vendor' },
              { label: 'Cost (₹)', field: 'cost', type: 'number', placeholder: '0' },
            ].map(f => (
              <div key={f.field} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select value={newRecord[f.field]} onChange={e => setNewRecord(prev => ({ ...prev, [f.field]: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: '0.78rem', outline: 'none' }}>
                    <option value="">Select…</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type} value={newRecord[f.field]} placeholder={f.placeholder}
                    onChange={e => setNewRecord(prev => ({ ...prev, [f.field]: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: '0.78rem', outline: 'none', colorScheme: 'dark' }} />
                )}
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Remarks / Notes</label>
              <textarea value={newRecord.remarks} onChange={e => setNewRecord(prev => ({ ...prev, remarks: e.target.value }))} rows={3}
                placeholder="Describe what was done, parts replaced, observations…"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: '0.78rem', outline: 'none', resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: '0.78rem' }}>Cancel</button>
            <button onClick={handleAddRecord} style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
              <Plus size={13} style={{ marginRight: 5 }} />Save Record
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DETAIL MODAL */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {selectedRecord && (
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered contentClassName="border-0 text-white" dialogClassName="scada-modal">
          <div style={{ background: 'linear-gradient(135deg, #0d1426 0%, #080c18 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
            {(() => {
              const asset = ASSET_REGISTRY.find(a => a.id === selectedRecord.assetId);
              const typeCfg = TYPE_CONFIG[selectedRecord.type] || TYPE_CONFIG['Preventive'];
              return (
                <>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${asset?.color || '#06b6d4'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: asset?.color || '#06b6d4' }}>{asset?.icon}</div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f8fafc' }}>{selectedRecord.title}</div>
                        <div style={{ fontSize: '0.68rem', color: '#475569' }}>{asset?.name} • {asset?.category}</div>
                      </div>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18}/></button>
                  </div>
                  <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Asset ID',     value: selectedRecord.assetId },
                      { label: 'Location',     value: asset?.location },
                      { label: 'Type',         value: selectedRecord.type,   color: typeCfg.color },
                      { label: 'Status',       value: <StatusBadge status={selectedRecord.status} /> },
                      { label: 'Date',         value: selectedRecord.date,   mono: true },
                      { label: 'Next Due',     value: selectedRecord.nextDue || '—', mono: true, color: '#06b6d4' },
                      { label: 'Technician',   value: selectedRecord.tech },
                      { label: 'Cost',         value: `₹${Number(selectedRecord.cost).toLocaleString()}`, color: '#10b981', mono: true },
                    ].map((f, i) => (
                      <div key={i}>
                        <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 3 }}>{f.label}</div>
                        {React.isValidElement(f.value) ? f.value : (
                          <div style={{ fontSize: '0.82rem', color: f.color || '#e2e8f0', fontFamily: f.mono ? 'monospace' : 'inherit', fontWeight: 600 }}>{f.value}</div>
                        )}
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '0.62rem', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>Remarks</div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#94a3b8', borderLeft: `3px solid ${asset?.color || '#06b6d4'}` }}>
                        {selectedRecord.remarks || '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowDetailModal(false)} style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#06b6d4', borderRadius: 8, padding: '7px 18px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>Close</button>
                  </div>
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MaintenancePage;
