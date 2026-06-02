import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Modal } from '../components/ui/Modal';
import { SosPieChart } from '../components/analysis/SosPieChart';
import { useApp } from '../context/AppContext';
import {
  createColorMap, capitalizeBrand, formatPercent, formatVolume,
  buildChartData, buildDynamicSoSChartData, formatMonthShort,
} from '../utils/chartHelpers';
import {
  calculateCurrentSoS, groupByYear
} from '../utils/sosCalculations';

// Settings inspector panel for Competitor Page
function CompetitorSettingsPanel({ isOpen, onClose, brands, colorMap, hiddenBrands, setHiddenBrands }) {
  const toggleBrand = (brand) => {
    const newHidden = new Set(hiddenBrands);
    if (newHidden.has(brand)) {
      newHidden.delete(brand);
    } else {
      newHidden.add(brand);
    }
    setHiddenBrands(newHidden);
  };

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
            <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Competitor Settings</h3>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '6px' }}>
              <X size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Visible Brands</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Choose which brands to show in this view</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {brands.filter(b => b !== 'generic').map(brand => (
                  <label key={brand} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!hiddenBrands.has(brand)}
                      onChange={() => toggleBrand(brand)}
                      style={{ accentColor: colorMap[brand] }}
                    />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorMap[brand] }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {capitalizeBrand(brand)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Brand selection modal
function BrandSelector({ isOpen, initialSelection = [], onSave }) {
  const { state } = useApp();
  const { brands, sosData, allMonths, tagMap, darkMode } = state;
  const [selected, setSelected] = useState(initialSelection);
  const colorMap = useMemo(() => createColorMap(brands, darkMode), [brands, darkMode]);
  const currentSoS = useMemo(() => calculateCurrentSoS(sosData, allMonths, brands), [sosData, allMonths, brands]);

  React.useEffect(() => {
    if (isOpen) setSelected(initialSelection);
  }, [isOpen, initialSelection]);

  const toggleBrand = (brand) => {
    if (selected.includes(brand)) {
      setSelected(selected.filter(b => b !== brand));
    } else {
      if (selected.length < 2) {
        setSelected([...selected, brand]);
      } else {
        setSelected([selected[1], brand]); // keep the last 2 selected
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Select primary brands" width="560px">
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Select up to two brands to see a personalized competitor comparison.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {brands.filter(b => b !== 'generic').map((brand, i) => {
          const isSelected = selected.includes(brand);
          return (
          <motion.button
            key={brand}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => toggleBrand(brand)}
            style={{
              padding: '16px', borderRadius: '12px',
              border: `2px solid ${isSelected ? colorMap[brand] : colorMap[brand] + '40'}`,
              background: isSelected ? `${colorMap[brand]}20` : `${colorMap[brand]}10`,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: colorMap[brand] }} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {capitalizeBrand(brand)}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
              {tagMap[brand]?.length || 0} keywords
            </p>
            <p style={{ fontSize: '18px', fontWeight: 800, color: colorMap[brand] }}>
              {formatPercent(currentSoS[brand] || 0)} SoS
            </p>
          </motion.button>
        )})}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button 
          className="btn-primary" 
          onClick={() => onSave(selected)}
          disabled={selected.length === 0}
        >
          Confirm Selection
        </button>
      </div>
    </Modal>
  );
}

// Competitor line chart
function CompetitorLineChart({ displayBrands, colorMap }) {
  const { state } = useApp();
  const { brandMonthlyData, sosData, allMonths, darkMode, myBrands = [] } = state;
  const [mode, setMode] = useState('sos');
  const [selectedYear, setSelectedYear] = useState('all');

  const yearlyData = useMemo(() => groupByYear(brandMonthlyData), [brandMonthlyData]);
  const availableYears = Object.keys(yearlyData).sort();

  const { chartData } = useMemo(() => {
    if (selectedYear === 'all') {
      const data = mode === 'sos'
        ? buildDynamicSoSChartData(brandMonthlyData, allMonths, displayBrands)
        : buildChartData(brandMonthlyData, allMonths, displayBrands);
      return { chartData: data.map(d => ({ ...d, label: formatMonthShort(d.month) })) };
    }
    const yearMonths = allMonths.filter(m => m.startsWith(selectedYear));
    const data = mode === 'sos'
      ? buildDynamicSoSChartData(brandMonthlyData, yearMonths, displayBrands)
      : buildChartData(brandMonthlyData, yearMonths, displayBrands);
    return { chartData: data.map(d => ({ ...d, label: formatMonthShort(d.month) })) };
  }, [selectedYear, mode, brandMonthlyData, allMonths, displayBrands]);

  const axisColor = darkMode ? '#636366' : '#8E8E93';
  const gridColor = darkMode ? '#2C2C2E' : '#F0F0F3';

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {myBrands.map(capitalizeBrand).join(' & ')} vs. Competitors
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>
            Share of Search Over Time
          </span>
        </h3>
        <div style={{
          display: 'flex', background: 'var(--bg-hover)', borderRadius: '8px',
          padding: '3px', border: '1px solid var(--border-subtle)',
        }}>
          {['absolute', 'sos'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer',
              background: mode === m ? 'var(--accent-blue)' : 'transparent',
              color: mode === m ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}>
              {m === 'absolute' ? 'Volume' : 'SoS %'}
            </button>
          ))}
        </div>
      </div>

      {/* Year selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            style={{
              padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600,
              background: selectedYear === year ? 'var(--accent-blue)' : 'var(--bg-hover)',
              color: selectedYear === year ? 'white' : 'var(--text-secondary)',
              border: '1px solid ' + (selectedYear === year ? 'var(--accent-blue)' : 'var(--border-subtle)'),
              transition: 'all 0.15s ease',
            }}
          >
            {year}
          </button>
        ))}
        <button
          onClick={() => setSelectedYear('all')}
          style={{
            padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600,
            background: selectedYear === 'all' ? 'var(--accent-blue)' : 'var(--bg-hover)',
            color: selectedYear === 'all' ? 'white' : 'var(--text-secondary)',
            border: '1px solid ' + (selectedYear === 'all' ? 'var(--accent-blue)' : 'var(--border-subtle)'),
            transition: 'all 0.15s ease',
          }}
        >
          All Time
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: axisColor }} tickLine={false}
            axisLine={{ stroke: gridColor }} interval={0} angle={-45} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false}
            tickFormatter={mode === 'sos' ? (v) => `${v.toFixed(0)}%` : formatVolume} width={48} />
          <Tooltip
            contentStyle={{
              background: darkMode ? '#2C2C2E' : '#FFFFFF',
              border: `1px solid ${darkMode ? '#3A3A3C' : '#E5E5EA'}`,
              borderRadius: '10px', fontSize: '12px',
            }}
            formatter={(v, name) => [
              mode === 'sos' ? formatPercent(v) : formatVolume(v),
              capitalizeBrand(name) + (myBrands.includes(name) ? ' (you)' : ''),
            ]}
          />
          <Legend formatter={(v) => (
            <span style={{ color: myBrands.includes(v) ? colorMap[v] : 'var(--text-secondary)', fontWeight: myBrands.includes(v) ? 700 : 400 }}>
              {capitalizeBrand(v)}{myBrands.includes(v) ? ' (you)' : ''}
            </span>
          )} />

          {/* Render all display brands */}
          {displayBrands.map(brand => (
            <Line key={brand} type="monotone" dataKey={brand}
              stroke={colorMap[brand]} 
              strokeWidth={myBrands.includes(brand) ? 3.5 : 1.5} 
              dot={false}
              activeDot={myBrands.includes(brand) ? { r: 6, strokeWidth: 2, stroke: 'white' } : { r: 4 }} 
              connectNulls 
              strokeOpacity={myBrands.includes(brand) ? 1 : 0.8} 
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetitorPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { brands, myBrands = [], competitors, darkMode } = state;
  const [showBrandSelector, setShowBrandSelector] = useState(!myBrands || myBrands.length === 0);
  
  const [showSettings, setShowSettings] = useState(false);
  const [hiddenBrands, setHiddenBrands] = useState(() => {
    const defaultVisible = ['sleepwell', 'flo', 'wakefit', 'emma', 'kurlon', 'duroflex', 'the sleep company'];
    const hidden = new Set();
    brands.forEach(b => {
      if (b !== 'generic' && !defaultVisible.includes(b)) {
        hidden.add(b);
      }
    });
    return hidden;
  });

  const colorMap = useMemo(() => createColorMap(brands, darkMode), [brands, darkMode]);

  const handleSaveBrands = (selectedBrands) => {
    dispatch({ type: 'SET_MY_BRANDS', payload: selectedBrands });
    setShowBrandSelector(false);
  };

  // Guard
  if (!brands.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No data yet.</p>
        <button className="btn-primary" onClick={() => navigate('/upload')}>Go to Upload</button>
      </div>
    );
  }

  // Calculate visible brands
  const allBrandsWithoutGeneric = brands.filter(b => b !== 'generic');
  const visibleBrands = allBrandsWithoutGeneric.filter(b => !hiddenBrands.has(b));
  
  // Format the header list
  const visibleCompetitors = visibleBrands.filter(b => !myBrands.includes(b));

  return (
    <div style={{ paddingRight: showSettings ? 300 : 0, transition: 'padding-right 0.3s ease' }}>
      {/* Brand selector modal */}
      <BrandSelector isOpen={showBrandSelector} initialSelection={myBrands} onSave={handleSaveBrands} />
      
      {/* Settings panel */}
      <CompetitorSettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        brands={brands}
        colorMap={colorMap}
        hiddenBrands={hiddenBrands}
        setHiddenBrands={setHiddenBrands}
      />

      {myBrands && myBrands.length > 0 && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '4px' }}>
                Competitor Analysis
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                You are: {myBrands.map((b, idx) => (
                  <React.Fragment key={b}>
                    {idx > 0 && <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}> & </span>}
                    <span style={{ color: colorMap[b] }}>{capitalizeBrand(b)}</span>
                  </React.Fragment>
                ))}
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  vs. {visibleCompetitors.map(c => capitalizeBrand(c)).join(', ') || 'None'}
                </span>
              </h2>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary"
                style={{ fontSize: '12px', gap: '6px' }}
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 size={14} />
                Settings
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '12px' }}
                onClick={() => setShowBrandSelector(true)}
              >
                Change Brand
              </button>
            </div>
          </div>

          {/* Competitor line chart */}
          <CompetitorLineChart
            displayBrands={visibleBrands}
            colorMap={colorMap}
          />

          {/* Pie + insights side by side */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Current Share of Search
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--accent-blue)', marginLeft: '8px' }}>
                Your brands highlighted
              </span>
            </h3>
            <SosPieChart highlightBrands={myBrands} displayBrands={visibleBrands} />
          </div>

        </>
      )}
    </div>
  );
}

export default CompetitorPage;
