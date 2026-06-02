import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Settings2, X } from 'lucide-react';
import { TrendLineChart } from '../components/analysis/TrendLineChart';
import { SosPieChart } from '../components/analysis/SosPieChart';
import { CompetitorAnalysis } from '../components/analysis/CompetitorAnalysis';
import { useApp } from '../context/AppContext';
import { createColorMap, capitalizeBrand, formatPercent } from '../utils/chartHelpers';
import { calculateCurrentSoS, getTrendDirection } from '../utils/sosCalculations';

// Settings inspector panel (right slide-out)
function SettingsPanel({ isOpen, onClose }) {
  const { state, dispatch } = useApp();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', right: 0, top: 0, bottom: 0,
            width: 300, zIndex: 60,
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-subtle)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            padding: '24px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Analysis Settings</h3>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
              <X size={15} />
            </button>
          </div>

          {/* Settings options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <SelectSetting
              label="Rolling Average"
              description="Smooth the chart with a rolling average"
              value={state.rollingWindow}
              options={[
                { value: 0, label: 'None (raw)' },
                { value: 3, label: '3-month' },
                { value: 6, label: '6-month' },
                { value: 12, label: '12-month' },
              ]}
              onChange={v => dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'rollingWindow', value: Number(v) })}
            />
            <SelectSetting
              label="Graph Duration Gap"
              description="X-axis tick gap interval"
              value={state.graphTickInterval}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: '6', label: '6 months' },
                { value: '12', label: '12 months' },
              ]}
              onChange={v => dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'graphTickInterval', value: v })}
            />
            <ToggleSetting
              label="Forecast future months"
              description="Projects 6 months forward using linear regression"
              value={state.showForecast}
              onChange={v => dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'showForecast', value: v })}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToggleSetting({ label, description, value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{description}</p>
        </div>
        <button
          onClick={() => onChange(!value)}
          style={{
            width: 40, height: 24, borderRadius: 12, border: 'none',
            background: value ? 'var(--accent-blue)' : 'var(--border)',
            cursor: 'pointer', position: 'relative', flexShrink: 0,
            transition: 'background 0.2s ease',
          }}
        >
          <motion.div
            animate={{ x: value ? 18 : 2 }}
            transition={{ duration: 0.2 }}
            style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3 }}
          />
        </button>
      </div>
    </div>
  );
}

function SelectSetting({ label, description, value, options, onChange }) {
  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{description}</p>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export function AnalysisPage() {
  const navigate = useNavigate();
  const { state } = useApp();
  const { brands, sosData, allMonths, brandMonthlyData, darkMode, showForecast } = state;
  const [showSettings, setShowSettings] = useState(false);

  const colorMap = useMemo(() => createColorMap(brands, darkMode), [brands, darkMode]);
  const currentSoS = useMemo(() => calculateCurrentSoS(sosData, allMonths, brands), [sosData, allMonths, brands]);

  const visibleBrands = useMemo(() => {
    const defaultVisible = ['sleepwell', 'flo', 'wakefit', 'emma', 'kurlon', 'duroflex', 'the sleep company'];
    return brands.filter(b => defaultVisible.includes(b));
  }, [brands]);



  // Guard
  if (!brands.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No analysis data yet.</p>
        <button className="btn-primary" onClick={() => navigate('/upload')}>Go to Upload</button>
      </div>
    );
  }



  return (
    <div style={{ paddingRight: showSettings ? 300 : 0, transition: 'padding-right 0.3s ease' }}>
      {/* Header action row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '20px', gap: '16px' }}>


        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            className="btn-secondary"
            style={{ gap: '6px', fontSize: '13px' }}
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings2 size={14} />
            Settings
          </button>
          <button
            className="btn-primary"
            style={{ gap: '8px' }}
            onClick={() => navigate('/competitor')}
          >
            <Target size={14} />
            Competitor Analysis →
          </button>
        </div>
      </div>

      {/* Main trend chart */}
      <div style={{ marginBottom: '24px' }}>
        <TrendLineChart showForecast={showForecast} visibleBrands={visibleBrands} />
      </div>

      {/* Pie chart + insights */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Current Share of Search
          {/* <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
            (avg. last 3 months)
          </span> */}
        </h3>
        <SosPieChart displayBrands={visibleBrands} />
      </div>

      {/* Generic trend + YoY table */}
      <CompetitorAnalysis colorMap={colorMap} displayBrands={visibleBrands} />

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <motion.button
          className="btn-primary"
          style={{ padding: '14px 32px', fontSize: '15px' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/competitor')}
        >
          🔍 View Competitor Analysis →
        </motion.button>
      </div>

      {/* Settings panel */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default AnalysisPage;
