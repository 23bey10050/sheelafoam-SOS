import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import {
  createColorMap, buildPieData, capitalizeBrand,
  formatPercent, getTrendDisplay,
} from '../../utils/chartHelpers';
import { calculateDynamicCurrentSoS, getDynamicTrendDirection } from '../../utils/sosCalculations';

function PieTooltip({ active, payload, darkMode }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div style={{
      background: darkMode ? '#2C2C2E' : '#FFFFFF',
      border: `1px solid ${darkMode ? '#3A3A3C' : '#E5E5EA'}`,
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      <p style={{ fontWeight: 700, color: darkMode ? '#F5F5F7' : '#1D1D1F', fontSize: '13px' }}>
        {capitalizeBrand(name)}
      </p>
      <p style={{ color: payload[0].payload.fill, fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
        {formatPercent(value)}
      </p>
    </div>
  );
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) {
  if (value < 5) return null; // hide labels for tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {value.toFixed(1)}%
    </text>
  );
}

export function SosPieChart({ highlightBrands = [], highlightBrand = null, displayBrands = null }) {
  const { state } = useApp();
  const { brandMonthlyData, allMonths, brands: contextBrands, darkMode } = state;
  const brands = displayBrands || contextBrands;
  const [pieWindow, setPieWindow] = useState(3);

  const colorMap = useMemo(() => createColorMap(contextBrands, darkMode), [contextBrands, darkMode]);
  const highlightList = useMemo(() => highlightBrands.length > 0 ? highlightBrands : (highlightBrand ? [highlightBrand] : []), [highlightBrands, highlightBrand]);
  const currentSoS = useMemo(() => calculateDynamicCurrentSoS(brandMonthlyData, allMonths, brands, pieWindow), [brandMonthlyData, allMonths, brands, pieWindow]);
  const pieData = useMemo(() => buildPieData(currentSoS, brands, colorMap), [currentSoS, brands, colorMap]);

  const rankedBrands = useMemo(() => {
    return [...brands]
      .map(brand => ({
        brand,
        sos: currentSoS[brand] || 0,
        direction: getDynamicTrendDirection(brandMonthlyData, allMonths, brands, brand),
        color: colorMap[brand],
      }))
      .sort((a, b) => b.sos - a.sos);
  }, [brands, currentSoS, brandMonthlyData, allMonths, colorMap]);

  return (
    <div className="mobile-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
      {/* Pie chart */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <select 
            value={pieWindow} 
            onChange={(e) => setPieWindow(e.target.value === 'lifetime' ? 'lifetime' : Number(e.target.value))}
            style={{ 
              padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)',
              background: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', outline: 'none'
            }}
          >
            <option value={3}>Average of last 3 months</option>
            <option value={6}>Average of last 6 months</option>
            <option value={12}>Average of last 12 months</option>
            <option value="lifetime">Lifetime Average</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={440}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="75%"
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={<CustomLabel />}
              animationBegin={0}
              animationDuration={800}
            >
              {pieData.map((entry, index) => {
                const isHighlighted = highlightList.includes(entry.name);
                const showDim = highlightList.length > 0 && !isHighlighted;
                return (
                <Cell
                  key={entry.name}
                  fill={entry.fill}
                  opacity={showDim ? 0.5 : 1}
                  stroke={isHighlighted ? 'white' : 'transparent'}
                  strokeWidth={isHighlighted ? 3 : 0}
                  style={{ filter: isHighlighted ? `drop-shadow(0 0 6px ${entry.fill})` : 'none' }}
                />
              )})}
            </Pie>
            <Tooltip content={<PieTooltip darkMode={darkMode} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Insights panel */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
          Current Rankings
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rankedBrands.map((item, i) => {
            const trendDisplay = getTrendDisplay(item.direction);
            const isHighlighted = highlightList.includes(item.brand);
            return (
              <motion.div
                key={item.brand}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '10px 14px', borderRadius: '10px',
                  background: isHighlighted ? `${item.color}15` : 'var(--bg-hover)',
                  border: isHighlighted ? `1px solid ${item.color}40` : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', width: 18 }}>
                  #{i + 1}
                </span>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, margin: '0 10px', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: isHighlighted ? 700 : 500, color: 'var(--text-primary)' }}>
                  {capitalizeBrand(item.brand)}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: item.color, marginRight: '8px' }}>
                  {formatPercent(item.sos)}
                </span>
                <span style={{ fontSize: '16px', color: trendDisplay.color }} title={trendDisplay.label}>
                  {trendDisplay.arrow}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SosPieChart;
