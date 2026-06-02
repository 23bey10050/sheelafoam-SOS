import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Hash, Tag, Calendar, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatVolume, formatPercent, capitalizeBrand, createColorMap } from '../../utils/chartHelpers';
import { calculateYoY, groupByYear } from '../../utils/sosCalculations';

export function ReportSummary() {
  const { state } = useApp();
  const { parsedKeywords, brands, apiRawResults, apiCallsRemaining, brandMonthlyData, allMonths, tagMap } = state;

  const yearlyData = useMemo(() => groupByYear(brandMonthlyData), [brandMonthlyData]);
  const colorMap = useMemo(() => createColorMap(brands, state.darkMode), [brands, state.darkMode]);

  const totalDataPoints = allMonths.length;

  // Brand summary stats
  const brandStats = useMemo(() => {
    if (!brands.length || !apiRawResults) return [];
    return brands.map(brand => {
      const kws = tagMap[brand] || [];
      let totalVol = 0;
      let totalCPC = 0, cpcCount = 0;
      let totalComp = 0, compCount = 0;

      for (const kw of kws) {
        const d = apiRawResults[kw];
        if (!d) continue;
        // Real API: volume (not vol), cpc (flat float), cmp (not competition)
        totalVol += Number(d.volume || d.vol || 0);
        if (d.cpc) { totalCPC += parseFloat(d.cpc); cpcCount++; }
        if (d.cmp) { totalComp += parseFloat(d.cmp); compCount++; }
      }

      // YoY for this brand
      const yoyData = calculateYoY(yearlyData, brand);
      const years = Object.keys(yoyData).sort();
      const latestYoY = years.length >= 2 ? yoyData[years[years.length - 1]]?.yoyChange : null;

      return {
        brand,
        kwCount: kws.length,
        totalVol,
        avgCPC: cpcCount > 0 ? totalCPC / cpcCount : 0,
        avgComp: compCount > 0 ? totalComp / compCount : 0,
        yoyChange: latestYoY,
        color: colorMap[brand],
      };
    }).sort((a, b) => b.totalVol - a.totalVol);
  }, [brands, apiRawResults, tagMap, yearlyData, colorMap]);


  const qi = state.quotaInfo;
  const qRemaining = qi?.apiCallsRemaining;

  const statCards = [
    {
      icon: Hash, label: 'Total Keywords',
      value: parsedKeywords.length.toLocaleString(),
      color: '#0071E3',
    },
    {
      icon: Tag, label: 'Brands Found',
      value: brands.length,
      color: '#30D158',
    },
    {
      icon: Calendar, label: 'Data Points',
      value: `${totalDataPoints} months`,
      color: '#FF9F0A',
    },
    {
      icon: Zap, label: 'API Calls Left',
      value: qRemaining != null ? qRemaining : '—',
      color: qRemaining != null && qRemaining < 20 ? '#FF9F0A' : '#BF5AF2',
    },
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="stat-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '9px',
                  background: `${card.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={card.color} />
                </div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {card.label}
                </p>
              </div>
              <p style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {card.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Device Breakdown (if available) */}
      {state.deviceBreakdown && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Device Breakdown (Share of Search Impressions)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--border-subtle)', display: 'flex', overflow: 'hidden' }}>
              <div style={{ width: `${state.deviceBreakdown.desktop?.percentage || 0}%`, background: '#0071E3' }} />
              <div style={{ width: `${state.deviceBreakdown.mobile?.percentage || 0}%`, background: '#30D158' }} />
              <div style={{ width: `${state.deviceBreakdown.tablet?.percentage || 0}%`, background: '#FF9F0A' }} />
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0071E3' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Desktop: {state.deviceBreakdown.desktop?.percentage || 0}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#30D158' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mobile: {state.deviceBreakdown.mobile?.percentage || 0}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF9F0A' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tablet: {state.deviceBreakdown.tablet?.percentage || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand volume summary table */}
      {brandStats.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Brand Volume Summary
          </h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Keywords</th>
                  <th>Total Avg Monthly Vol</th>
                  <th>Avg CPC</th>
                  <th>Competition</th>
                  <th>YoY Trend</th>
                </tr>
              </thead>
              <tbody>
                {brandStats.map((b) => (
                  <tr key={b.brand}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{capitalizeBrand(b.brand)}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{b.kwCount}</td>
                    <td style={{ fontWeight: 600 }}>{formatVolume(b.totalVol)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {b.avgCPC > 0 ? `₹${b.avgCPC.toFixed(2)}` : '—'}
                    </td>
                    <td>
                      {b.avgComp > 0 ? (
                        <span style={{ fontSize: '12px', color: b.avgComp > 0.7 ? '#FF453A' : b.avgComp > 0.4 ? '#FF9F0A' : '#30D158' }}>
                          {formatPercent(b.avgComp * 100)}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {b.yoyChange != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {b.yoyChange > 2 ? <TrendingUp size={13} color="#30D158" /> : b.yoyChange < -2 ? <TrendingDown size={13} color="#FF453A" /> : <Minus size={13} color="#8E8E93" />}
                          <span style={{
                            fontSize: '12px', fontWeight: 600,
                            color: b.yoyChange > 2 ? '#30D158' : b.yoyChange < -2 ? '#FF453A' : '#8E8E93',
                          }}>
                            {b.yoyChange > 0 ? '+' : ''}{b.yoyChange.toFixed(1)}%
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportSummary;
