import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, FileText, BarChart2, Target,
  Settings, HelpCircle, TrendingUp,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { path: '/upload', icon: Upload, label: 'UPLOAD FILE', step: null },
  { path: '/report', icon: FileText, label: 'KEYWORD REPORT', step: 2, requiresData: 'apiRawResults' },
  { path: '/analysis', icon: BarChart2, label: 'SoS ANALYSIS', step: 3, requiresData: 'brandMonthlyData' },
  { path: '/competitor', icon: Target, label: 'COMPETITOR VIEW', step: 4, requiresData: 'brands' },
];

const BOTTOM_ITEMS = [
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/help', icon: HelpCircle, label: 'Help' },
];

export function Sidebar({ isOpen, setIsOpen }) {
  const { state } = useApp();
  const navigate = useNavigate();

  const stepComplete = (item) => {
    if (!item.requiresData) return false;
    const val = state[item.requiresData];
    return val && (Array.isArray(val) ? val.length > 0 : Object.keys(val).length > 0);
  };

  const handleNavClick = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <motion.aside
      initial={{ x: -220 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`sidebar-mobile-transform ${isOpen ? 'open' : ''}`}
      style={{
        width: 'var(--sidebar-desktop-width)',
        height: '100vh',
        background: 'rgb(32, 51, 108)',
        position: 'fixed',
        left: 0, top: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        flexShrink: 0,
        overflow: 'hidden',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo and Close Button */}
      <div style={{ padding: '20px 6px 6px', position: 'relative' }}>
        <button 
          className="btn-ghost mobile-only" 
          onClick={() => setIsOpen && setIsOpen(false)}
          style={{ position: 'absolute', top: '16px', right: '10px', padding: '6px', color: '#FFF' }}
        >
          <X size={20} />
        </button>
        <div
          onClick={() => { navigate('/upload'); handleNavClick(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', padding: '8px 10px', borderRadius: '10px',
          }}
          className="hover:bg-white/5 transition-colors"
        >
          <img 
            src="/sheela-foam-logo.png" 
            alt="SheelaFoam" 
            style={{ height: '32px', objectFit: 'contain',mixBlendMode: 'screen' }} 
          />
        </div>
        <div
          onClick={() => { navigate('/upload'); handleNavClick(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', padding: '8px 10px', borderRadius: '10px', paddingTop: '25px',
          }}
          className="hover:bg-white/5 transition-colors"
        >
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'linear-gradient(135deg, #0071E3, #BF5AF2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <TrendingUp size={18} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2 }}>
              Share of Search
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-sidebar-muted)', lineHeight: 1 }}>
              Analysis Tool
            </p>
          </div>
        </div>
      </div>



      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isAvailable = !item.requiresData || stepComplete(item);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (isAvailable) handleNavClick();
              }}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px',
                fontSize: '13px', fontWeight: 500,
                textDecoration: 'none',
                marginBottom: '2px',
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.4,
                color: isActive ? '#FFFFFF' : 'rgb(219, 172, 123)',
                background: isActive
                  ? 'linear-gradient(135deg, #0071E3, #0062c4)'
                  : 'transparent',
                transition: 'all 0.15s ease',
                pointerEvents: isAvailable ? 'auto' : 'none',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '8px 10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {/* API quota */}
        {state.quotaInfo && state.quotaInfo.apiCallsRemaining !== null && (
          <div style={{
            padding: '8px 12px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            marginBottom: '6px',
          }}>
            <p style={{ fontSize: '10px', color: 'var(--text-sidebar-muted)', marginBottom: '3px' }}>
              API Quota
            </p>
            <p style={{
              fontSize: '12px', fontWeight: 600,
              color: state.quotaInfo.apiCallsRemaining < 20 ? '#FF9F0A' : '#30D158',
            }}>
              {state.quotaInfo.apiCallsRemaining} remaining
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default Sidebar;
