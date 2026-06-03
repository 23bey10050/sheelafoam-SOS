import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { Download, Settings2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useApp } from '../../context/AppContext';
import {
  buildChartData, buildSoSChartData, buildYearlyChartData,
  formatVolume, formatPercent, formatMonthLabel, formatMonthShort,
  createColorMap, capitalizeBrand,
} from '../../utils/chartHelpers';
import { groupByYear, forecastBrandData, getLastNMonths, calculateRollingAverage } from '../../utils/sosCalculations';

const YEAR_MONTHS = {
  '2021': '2021-01', '2022': '2022-01', '2023': '2023-01',
  '2024': '2024-01', '2025': '2025-01', '2026': '2026-01',
};

// Custom tooltip
function CustomTooltip({ active, payload, label, mode, darkMode }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: darkMode ? '#2C2C2E' : '#FFFFFF',
      border: `1px solid ${darkMode ? '#3A3A3C' : '#E5E5EA'}`,
      borderRadius: '12px',
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      minWidth: 180,
    }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: darkMode ? '#8E8E93' : '#6E6E73', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      {[...payload].sort((a, b) => b.value - a.value).map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: darkMode ? '#F5F5F7' : '#1D1D1F', fontWeight: 500 }}>
              {capitalizeBrand(entry.dataKey)}
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: entry.color }}>
            {mode === 'sos' ? formatPercent(entry.value) : formatVolume(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TrendLineChart({ showForecast = false, visibleBrands = null }) {
  const { state, dispatch } = useApp();
  const { brandMonthlyData, sosData, allMonths, brands, darkMode } = state;
  const chartRef = useRef(null);

  const [selectedYear, setSelectedYear] = useState('all');
  const [mode, setMode] = useState('sos'); // 'absolute' | 'sos'
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (year === 'all' || year === 'range') {
      dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'rollingWindow', value: 12 });
      dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'graphTickInterval', value: '12' });
    } else {
      dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'rollingWindow', value: 0 });
      dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'graphTickInterval', value: 'auto' });
    }
  };

  const colorMap = useMemo(() => createColorMap(brands, darkMode), [brands, darkMode]);
  const displayBrands = useMemo(() => {
    return (visibleBrands || brands).filter(b => b !== 'generic');
  }, [visibleBrands, brands]);

  const yearlyData = useMemo(() => groupByYear(brandMonthlyData), [brandMonthlyData]);
  const availableYears = Object.keys(yearlyData).sort();

  // Build chart data based on selection
  // Compute filtered months for range mode
  const rangeMonths = useMemo(() => {
    if (selectedYear !== 'range' || !rangeFrom || !rangeTo) return allMonths;
    return allMonths.filter(m => {
      const y = m.substring(0, 4);
      return y >= rangeFrom && y <= rangeTo;
    });
  }, [selectedYear, rangeFrom, rangeTo, allMonths]);

  const { chartData, xKey, isMonthly } = useMemo(() => {
    if (selectedYear === 'all' || selectedYear === 'range') {
      const baseMonths = selectedYear === 'range' ? rangeMonths : allMonths;
      let data;
      let monthsToUse = baseMonths;
      if (state.rollingWindow === 12 && state.rollOverMonth && state.rollOverMonth !== 'auto') {
        const firstMatchIndex = baseMonths.findIndex(m => m.endsWith(`-${state.rollOverMonth}`));
        if (firstMatchIndex !== -1) {
          monthsToUse = baseMonths.slice(firstMatchIndex);
        }
      }

      if (state.rollingWindow > 0) {
        const { rollingData } = calculateRollingAverage(brandMonthlyData, brands, state.rollingWindow, mode);
        data = monthsToUse.map(month => {
          const entry = { month };
          for (const brand of brands) {
            entry[brand] = parseFloat((rollingData[month]?.[brand] || 0).toFixed(2));
          }
          return entry;
        });
      } else {
        data = mode === 'sos'
          ? buildSoSChartData(sosData, monthsToUse, brands)
          : buildChartData(brandMonthlyData, monthsToUse, brands);
      }

      // Add forecast if needed
      if (showForecast && mode === 'absolute') {
        const { forecastData, forecastMonths: fMonths } = forecastBrandData(brandMonthlyData, brands, 6);
        const chartDataWithForecast = [...data];

        // Connect the last real data point to the forecast line to prevent visual gap
        const lastRealDataIndex = chartDataWithForecast.length - 1;
        if (lastRealDataIndex >= 0) {
          for (const brand of brands) {
            chartDataWithForecast[lastRealDataIndex][`${brand}_forecast`] = chartDataWithForecast[lastRealDataIndex][brand];
          }
        }

        const forecastRows = fMonths.map(month => {
          const entry = { month, label: formatMonthLabel(month), isForecast: true };
          for (const brand of brands) {
            entry[`${brand}_forecast`] = forecastData[brand]?.[month] || 0;
          }
          return entry;
        });
        return { chartData: [...chartDataWithForecast, ...forecastRows].map(d => ({ ...d, label: d.label || formatMonthShort(d.month) })), xKey: 'label', isMonthly: true };
      }

      return { chartData: data.map(d => ({ ...d, label: formatMonthShort(d.month) })), xKey: 'label', isMonthly: true };
    }

    if (selectedYear === 'yearly') {
      const data = mode === 'sos'
        ? buildSoSChartData(sosData, allMonths, brands).reduce((acc, d) => {
          const year = d.month.substring(0, 4);
          if (!acc.find(a => a.year === year)) {
            const yearMonths = allMonths.filter(m => m.startsWith(year));
            const entry = { year, label: year };
            for (const brand of brands) {
              entry[brand] = yearMonths.reduce((s, m) => s + (sosData[m]?.[brand] || 0), 0) / (yearMonths.length || 1);
            }
            acc.push(entry);
          }
          return acc;
        }, [])
        : buildYearlyChartData(yearlyData, brands);
      return { chartData: data, xKey: 'label', isMonthly: false };
    }

    // Specific year — show monthly breakdown for that year
    const yearMonths = allMonths.filter(m => m.startsWith(selectedYear));

    let data;
    if (state.rollingWindow > 0) {
      const { rollingData } = calculateRollingAverage(brandMonthlyData, brands, state.rollingWindow, mode);
      data = yearMonths.map(month => {
        const entry = { month };
        for (const brand of brands) {
          entry[brand] = parseFloat((rollingData[month]?.[brand] || 0).toFixed(2));
        }
        return entry;
      });
    } else {
      data = mode === 'sos'
        ? buildSoSChartData(sosData, yearMonths, brands)
        : buildChartData(brandMonthlyData, yearMonths, brands);
    }
    return { chartData: data.map(d => ({ ...d, label: formatMonthLabel(d.month) })), xKey: 'label', isMonthly: true };
  }, [selectedYear, mode, brandMonthlyData, sosData, allMonths, rangeMonths, brands, showForecast, state.rollingWindow, state.rollOverMonth]);

  const handleExportPNG = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const url = await toPng(chartRef.current, { quality: 0.95, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = url;
      a.download = `sos-trend-chart.png`;
      a.click();
    } catch (e) {
      console.error('Export failed', e);
    }
  }, []);

  const sortedBrands = useMemo(() => {
    if (!chartData || chartData.length === 0) return displayBrands;
    const lastPoint = chartData.slice().reverse().find(d => !d.isForecast) || chartData[chartData.length - 1];
    return [...displayBrands].sort((a, b) => (lastPoint[b] || 0) - (lastPoint[a] || 0));
  }, [chartData, displayBrands]);

  const axisColor = darkMode ? '#636366' : '#8E8E93';
  const gridColor = darkMode ? '#2C2C2E' : '#F0F0F3';

  return (
    <div className="card" style={{ padding: '24px' }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {mode === 'sos' ? 'Share of Search (%)' : 'Search Volume Trends'}
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {selectedYear === 'all' ? `All ${allMonths.length} months` : selectedYear === 'range' ? `${rangeFrom || '?'} – ${rangeTo || '?'}` : selectedYear === 'yearly' ? 'Year-over-year' : `Monthly breakdown — ${selectedYear}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-hover)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid var(--border-subtle)',
          }}>
            {['absolute', 'sos'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: 'none',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  background: mode === m ? 'var(--accent-blue)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {m === 'absolute' ? 'Volume' : 'SoS %'}
              </button>
            ))}
          </div>

          {/* Export PNG */}
          <button className="btn-ghost" onClick={handleExportPNG} style={{ padding: '7px' }}>
            <Download size={14} />
          </button>
        </div>
      </div>
      {/* Year selector */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => handleYearChange(year)}
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
          onClick={() => handleYearChange('all')}
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
        <button
          onClick={() => {
            handleYearChange('range');
            if (!rangeFrom && availableYears.length > 0) setRangeFrom(availableYears[0]);
            if (!rangeTo && availableYears.length > 0) setRangeTo(availableYears[availableYears.length - 1]);
          }}
          style={{
            padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600,
            background: selectedYear === 'range' ? 'var(--accent-blue)' : 'var(--bg-hover)',
            color: selectedYear === 'range' ? 'white' : 'var(--text-secondary)',
            border: '1px solid ' + (selectedYear === 'range' ? 'var(--accent-blue)' : 'var(--border-subtle)'),
            transition: 'all 0.15s ease',
          }}
        >
          Range
        </button>

        {selectedYear === 'range' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '4px' }}>
            <select
              value={rangeFrom}
              onChange={(e) => {
                setRangeFrom(e.target.value);
                if (rangeTo && e.target.value > rangeTo) setRangeTo(e.target.value);
              }}
              style={{
                padding: '4px 10px', borderRadius: '20px', height: 'auto', width: 'auto',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                outline: 'none'
              }}
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>to</span>
            <select
              value={rangeTo}
              onChange={(e) => {
                setRangeTo(e.target.value);
                if (rangeFrom && e.target.value < rangeFrom) setRangeFrom(e.target.value);
              }}
              style={{
                padding: '4px 10px', borderRadius: '20px', height: 'auto', width: 'auto',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                outline: 'none'
              }}
            >
              {availableYears.filter(y => y >= rangeFrom).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {(selectedYear === 'all' || selectedYear === 'range') && state.rollingWindow === 12 && (
          <select
            value={state.rollOverMonth || 'auto'}
            onChange={(e) => dispatch({ type: 'SET_ANALYSIS_SETTING', key: 'rollOverMonth', value: e.target.value })}
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              height: 'auto',
              width: 'auto',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 500,
              marginLeft: '4px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="auto">Start Month: Auto</option>
            <option value="01">Jan</option>
            <option value="02">Feb</option>
            <option value="03">Mar</option>
            <option value="04">Apr</option>
            <option value="05">May</option>
            <option value="06">Jun</option>
            <option value="07">Jul</option>
            <option value="08">Aug</option>
            <option value="09">Sep</option>
            <option value="10">Oct</option>
            <option value="11">Nov</option>
            <option value="12">Dec</option>
          </select>
        )}
      </div>
      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedYear}-${mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          ref={chartRef}
          style={{ background: 'transparent' }}
        >
          {/* Custom legend sorted by last month data */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center', paddingBottom: '16px' }}>
            {sortedBrands.map(brand => (
              <div key={brand} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorMap[brand], flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {capitalizeBrand(brand)}
                </span>
              </div>
            ))}
          </div>
          <div className="chart-scroll-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '12px', margin: '0 -12px', padding: '0 12px' }}>
            <div style={{ minWidth: '600px', width: '100%', paddingRight: '12px' }}>
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fontSize: 11, fill: axisColor }}
                    tickLine={false}
                    axisLine={{ stroke: gridColor }}
                    interval={
                      !isMonthly ? 0 :
                        (!state.graphTickInterval || state.graphTickInterval === 'auto')
                          ? (chartData.length > 24 ? Math.floor(chartData.length / 12) : 0)
                          : (Number(state.graphTickInterval) - 1 || 0)
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisColor }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={mode === 'sos' ? (v) => `${v.toFixed(0)}%` : formatVolume}
                    width={mode === 'sos' ? 40 : 54}
                  />
                  <Tooltip
                    content={<CustomTooltip mode={mode} darkMode={darkMode} />}
                    cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '4 4' }}
                  />

                  {sortedBrands.map((brand) => (
                    <Line
                      key={brand}
                      type="monotone"
                      dataKey={brand}
                      stroke={colorMap[brand]}
                      strokeWidth={['sleepwell', 'kurlon'].includes(brand) ? 3.5 : 2}
                      dot={false}
                      activeDot={['sleepwell', 'kurlon'].includes(brand) ? { r: 6, strokeWidth: 2, stroke: 'white' } : { r: 5, strokeWidth: 0 }}
                      connectNulls
                      strokeOpacity={['sleepwell', 'kurlon'].includes(brand) ? 1 : 0.8}
                    />
                  ))}

                  {/* Forecast lines */}
                  {showForecast && mode === 'absolute' && displayBrands.map((brand) => (
                    <Line
                      key={`${brand}_forecast`}
                      type="monotone"
                      dataKey={`${brand}_forecast`}
                      stroke={colorMap[brand]}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                      legendType="none"
                    />
                  ))}

                  {/* Forecast reference line */}
                  {showForecast && chartData.some(d => d.isForecast) && (
                    <ReferenceLine
                      x={chartData.filter(d => !d.isForecast).pop()?.label}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      label={{ value: 'Forecast', position: 'top', fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {showForecast && (
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px' }}>
          Dashed lines show 6-month forecast based on linear regression (last 12 months)
        </p>
      )}
    </div>
  );
}

export default TrendLineChart;
