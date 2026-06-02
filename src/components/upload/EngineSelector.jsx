import React from 'react';
import { motion } from 'framer-motion';
import { SUPPORTED_ENGINES } from '../../utils/apiService';
import { useApp } from '../../context/AppContext';

// Perplexity SVG inline (not provided as file)
const PerplexityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function EngineSelector() {
  const { state, dispatch } = useApp();

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '8px',
      }}>
        {SUPPORTED_ENGINES.map((engine) => {
          const isSelected = state.selectedEngine === engine.id;
          return (
            <motion.button
              key={engine.id}
              onClick={() => dispatch({ type: 'SET_ENGINE', payload: engine.id })}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.96 }}
              title={`${engine.label} — ${engine.type} volume`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '5px', padding: '10px 6px 8px',
                borderRadius: '10px',
                border: isSelected
                  ? '2px solid var(--accent-blue)'
                  : '1.5px solid var(--border-subtle)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(0,113,227,0.10), rgba(0,113,227,0.04))'
                  : 'var(--bg-card)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
                outline: 'none',
                boxShadow: isSelected ? '0 0 0 3px rgba(0,113,227,0.12)' : 'none',
              }}
            >
              {/* EXACT badge */}
              {engine.popular && (
                <span style={{
                  position: 'absolute', top: -7, right: -4,
                  background: 'linear-gradient(135deg, #0071E3, #30A0FF)',
                  color: 'white',
                  fontSize: '7px', fontWeight: 700, padding: '2px 5px',
                  borderRadius: '4px', letterSpacing: '0.06em',
                  boxShadow: '0 1px 4px rgba(0,113,227,0.4)',
                }}>
                  EXACT
                </span>
              )}

              {/* Engine icon */}
              <div style={{
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '7px',
                background: isSelected ? 'rgba(0,113,227,0.08)' : 'var(--bg-hover)',
                overflow: 'hidden',
                flexShrink: 0,
              }}>
                {engine.svgIcon ? (
                  <img
                    src={engine.svgIcon}
                    alt={engine.label}
                    style={{ width: 18, height: 18, objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <PerplexityIcon />
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '10px', fontWeight: 600,
                color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                textAlign: 'center', lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}>
                {engine.label}
              </span>

              {/* Type dot */}
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: engine.type === 'exact' ? '#30D158' : 'var(--border-default)',
                flexShrink: 0,
              }} />
            </motion.button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#30D158', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Exact (Google Keyword Planner data)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border-default)', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Estimated</span>
        </div>
      </div>
    </div>
  );
}

export default EngineSelector;
