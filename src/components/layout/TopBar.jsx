import React from 'react';
import { Sun, Moon, AlertTriangle, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PAGE_TITLES = {
  '/upload': 'Upload Keywords',
  '/report': 'Keyword Report',
  '/analysis': 'Share of Search Analysis',
  '/competitor': 'Competitor Analysis',
  '/suggestions': 'Keyword Ideas',
  '/url-analysis': 'URL Analysis',
};

export function TopBar({ currentPath, onMenuClick }) {
  const { state, dispatch } = useApp();
  const title = PAGE_TITLES[currentPath] || 'Share of Search';

  const toggleDark = () => {
    dispatch({ type: 'SET_DARK_MODE', payload: !state.darkMode });
  };

  const qi = state.quotaInfo;
  const qRemaining = qi?.apiCallsRemaining;
  const qMade = qi?.apiCallsMade;
  const qTotal = qi?.apiCallsTotal ?? ((qRemaining ?? 0) + (qMade ?? 0));
  // Only warn if we have a real number and it's genuinely low
  const lowQuota = qi && qRemaining !== null && qRemaining < 20;

  return (
    <>
      {/* Low quota banner */}
      {lowQuota && (
        <div style={{
          background: 'rgba(255,159,10,0.12)',
          borderBottom: '1px solid rgba(255,159,10,0.3)',
          padding: '8px 24px',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '12px', color: 'var(--accent-warning)',
          marginLeft: 'var(--sidebar-width)',
        }}>
          <AlertTriangle size={13} />
          ⚠️ Low API quota: {qRemaining} of {qTotal} requests remaining today
        </div>
      )}

      <header style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-topbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 30,
        marginLeft: 'var(--sidebar-width)',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Left: page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn-ghost mobile-only" 
            style={{ padding: '6px', marginRight: '4px' }} 
            onClick={onMenuClick}
          >
            <Menu size={18} />
          </button>
          
          <h1 style={{
            fontSize: '16px', fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            {title}
          </h1>

          {/* Sandbox badge */}
          {state.apiRawResults && (
            <span className="badge badge-gray" style={{ fontSize: '10px' }}>
              {state.selectedEngine?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Quota display */}
          {qi && qRemaining !== null && (
            <span style={{
              fontSize: '11px', color: 'var(--text-secondary)',
              padding: '4px 10px',
              background: 'var(--bg-hover)',
              borderRadius: '20px',
              border: '1px solid var(--border-subtle)',
            }}>
              {qRemaining} / {qTotal || '—'} quota
            </span>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="btn-ghost"
            style={{ padding: '7px', borderRadius: '8px' }}
            title={state.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {state.darkMode
              ? <Sun size={16} color="var(--text-secondary)" />
              : <Moon size={16} color="var(--text-secondary)" />
            }
          </button>
        </div>
      </header>
    </>
  );
}

export default TopBar;
