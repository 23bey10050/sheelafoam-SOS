import React from 'react';
import { motion } from 'framer-motion';

export function LoadingSpinner({ size = 40 }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid var(--border-subtle)`,
        borderTopColor: 'var(--accent-blue)',
        display: 'inline-block',
      }}
    />
  );
}

export function LoadingOverlay({ message, subMessage, keywordCount, engine }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '20px',
          padding: '48px 56px',
          textAlign: 'center',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-modal)',
          maxWidth: '400px',
          width: '90%',
        }}
      >
        {/* Animated logo / spinner */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative' }}>
            <LoadingSpinner size={56} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>
              📊
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
          {message || 'Fetching data...'}
        </h3>

        {keywordCount && engine && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
            {keywordCount} keywords → 1 API call
          </p>
        )}

        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {subMessage || 'This may take 10–30 seconds'}
        </p>

        {/* Animated dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent-blue)',
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SkeletonCard({ height = 120, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, borderRadius: 12, width: '100%' }}
    />
  );
}

export function SkeletonText({ width = '60%', height = 16 }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: 4, marginBottom: 8 }} />
  );
}

export default LoadingSpinner;
