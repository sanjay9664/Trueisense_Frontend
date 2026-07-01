import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const { isDark } = useTheme();
  const [time, setTime] = useState(new Date());
  const [selectedRole, setSelectedRole] = useState(() => {
    const rawRole = (localStorage.getItem('userRole') || 'Zone Manager').replace(/_/g, ' ').toLowerCase();
    if (rawRole.includes('super')) return 'Super Admin';
    if (rawRole.includes('org')) return 'Organization Admin';
    if (rawRole.includes('zone')) return 'Zone Manager';
    if (rawRole.includes('area')) return 'Area Manager';
    if (rawRole.includes('location')) return 'Location Manager';
    if (rawRole.includes('unit')) return 'Unit Head';
    if (rawRole.includes('operator')) return 'Operator';
    return 'Zone Manager';
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const rawRole = (localStorage.getItem('userRole') || 'Zone Manager').replace(/_/g, ' ').toLowerCase();
      let updatedRole = 'Zone Manager';
      if (rawRole.includes('super')) updatedRole = 'Super Admin';
      else if (rawRole.includes('org')) updatedRole = 'Organization Admin';
      else if (rawRole.includes('zone')) updatedRole = 'Zone Manager';
      else if (rawRole.includes('area')) updatedRole = 'Area Manager';
      else if (rawRole.includes('location')) updatedRole = 'Location Manager';
      else if (rawRole.includes('unit')) updatedRole = 'Unit Head';
      else if (rawRole.includes('operator')) updatedRole = 'Operator';
      setSelectedRole(updatedRole);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('storage-update', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('storage-update', handleStorage);
    };
  }, []);

  return (
    <div className="dashboard-wrapper p-4 d-flex align-items-center justify-content-center" style={{ 
      minHeight: '85vh', 
      background: 'transparent',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dynamic Background Animated HMI Grid */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: isDark
          ? 'linear-gradient(rgba(249, 115, 22, 0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.01) 1px, transparent 1px)'
          : 'linear-gradient(rgba(249, 115, 22, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        animation: 'gridPan 40s linear infinite',
        opacity: 0.7,
        zIndex: 1,
        pointerEvents: 'none'
      }}></div>

      {/* Radial Glow Overlay */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: isDark
          ? 'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, transparent 70%)',
        zIndex: 1,
        pointerEvents: 'none'
      }}></div>

      {/* Main Container */}
      <div className="text-center position-relative z-2" style={{ maxWidth: '650px', animation: 'slideUpFade 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        
        {/* SCADA Animated Logo Node */}
        <div className="position-relative mx-auto mb-5" style={{ width: '120px', height: '120px' }}>
          {/* Outer Orbit 1 */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            border: isDark ? '2px dashed rgba(249, 115, 22, 0.25)' : '2px dashed rgba(249, 115, 22, 0.35)',
            borderRadius: '50%',
            animation: 'orbit 25s linear infinite'
          }}></div>
          
          {/* Outer Orbit 2 */}
          <div style={{
            position: 'absolute',
            top: '15px', left: '15px', right: '15px', bottom: '15px',
            border: isDark ? '1.5px solid rgba(255, 255, 255, 0.05)' : '1.5px solid rgba(0, 0, 0, 0.04)',
            borderTopColor: '#f97316',
            borderRadius: '50%',
            animation: 'orbit 8s linear infinite reverse'
          }}></div>

          {/* Central Pulse Sphere */}
          <div className="d-flex align-items-center justify-content-center" style={{
            position: 'absolute',
            top: '30px', left: '30px', right: '30px', bottom: '30px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(8, 8, 12, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
            borderRadius: '50%',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            boxShadow: isDark
              ? '0 0 25px rgba(249, 115, 22, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
              : '0 8px 25px rgba(249, 115, 22, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
            animation: 'pulseGlow 4s ease-in-out infinite'
          }}>
            <Activity size={32} className="text-warning" style={{ filter: 'drop-shadow(0 0 8px #f97316)', color: '#f97316' }} />
          </div>
        </div>

        {/* Animated Brand Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '14px',
            color: isDark ? '#a1a1aa' : '#475569',
            textTransform: 'uppercase',
            letterSpacing: '5px',
            fontWeight: 800,
            animation: 'slideUpFade 1s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            opacity: 0.8
          }}>
            Welcome to
          </h2>
          <h1 className="gradient-brand-title animate-text-reveal" style={{
            filter: isDark ? 'drop-shadow(0 4px 12px rgba(255, 122, 0, 0.25))' : 'drop-shadow(0 4px 8px rgba(255, 122, 0, 0.15))',
            margin: '8px 0 16px 0'
          }}>
            TRUEiSENSE
          </h1>
          <div style={{
            width: '80px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
            margin: '0 auto',
            opacity: 0.6
          }}></div>
        </div>

        {/* Tagline / Subtitle */}
        <p className="text-secondary" style={{
          fontSize: '12px',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: isDark ? '#71717a' : '#4b5563',
          marginBottom: '48px',
          animation: 'slideUpFade 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          Secure Building Management & Telemetry System
        </p>

        {/* Dynamic Session Information Panel */}
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(16, 16, 24, 0.6) 0%, rgba(8, 8, 12, 0.85) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.95) 100%)',
          border: isDark
            ? '1px solid rgba(249, 115, 22, 0.15)'
            : '1px solid rgba(249, 115, 22, 0.22)',
          borderRadius: '16px',
          padding: '20px 32px',
          boxShadow: isDark
            ? '0 15px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
            : '0 10px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
          display: 'inline-flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          animation: 'slideUpFade 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {/* Pulse Status */}
          <div className="d-flex align-items-center gap-2">
            <span style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981',
              animation: 'pulseGlow 2s infinite'
            }}></span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase' }}>
              SCADA System Active
            </span>
          </div>

          <div style={{ width: '100%', height: '1px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}></div>

          {/* User Details */}
          <div className="d-flex flex-wrap align-items-center justify-content-center gap-4 text-secondary" style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            letterSpacing: '0.5px',
            color: isDark ? '#a1a1aa' : '#4b5563'
          }}>
            <span>
              Session: <strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>Active</strong>
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}></span>
            <span>
              Role: <strong style={{ color: '#f97316' }}>{selectedRole}</strong>
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}></span>
            <span>
              Time: <strong style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{time.toLocaleTimeString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Inject Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        .gradient-brand-title {
          font-size: clamp(3.2rem, 6vw, 4.8rem);
          font-weight: 950;
          letter-spacing: 3px;
          background: linear-gradient(90deg, #ff8a00 0%, #ff4b00 100%) !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          display: inline-block;
        }

        .animate-text-reveal {
          animation: textReveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes pulseGlow {
          0% { transform: scale(0.98); opacity: 0.85; filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.2)); }
          50% { transform: scale(1.02); opacity: 1; filter: drop-shadow(0 0 35px rgba(249, 115, 22, 0.55)); }
          100% { transform: scale(0.98); opacity: 0.85; filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.2)); }
        }

        @keyframes textReveal {
          0% { letter-spacing: -10px; opacity: 0; filter: blur(10px); }
          100% { letter-spacing: 2px; opacity: 1; filter: blur(0px); }
        }

        @keyframes slideUpFade {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @keyframes gridPan {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 100%; }
        }

        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default Dashboard;
