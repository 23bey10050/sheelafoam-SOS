import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatVolume, formatMonthShort } from '../../utils/chartHelpers';
import { groupByYear, calculateYoY } from '../../utils/sosCalculations';



// Year-over-year growth table
function YoYTable({ brandMonthlyData, brands, colorMap, allMonths }) {
  const yearlyData = useMemo(() => groupByYear(brandMonthlyData), [brandMonthlyData]);

  // Only include completed years (must have exactly 12 months in the dataset)
  const years = Object.keys(yearlyData).sort().filter(year => {
    return allMonths.filter(m => m.startsWith(year)).length === 12;
  });

  const rows = useMemo(() => {
    return brands.map(brand => {
      const yoyData = calculateYoY(yearlyData, brand);
      return { brand, yoyData };
    });
  }, [brands, yearlyData]);

  return (
    <div className="card">
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
        Year-over-Year Growth
      </h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Brand</th>
              {years.map(y => <th key={y}>{y}</th>)}
              <th>Latest YoY</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ brand, yoyData }) => {
              const latestYear = years[years.length - 1];
              const latestYoY = yoyData[latestYear]?.yoyChange;
              return (
                <tr key={brand}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorMap[brand] }} />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{brand}</span>
                    </div>
                  </td>
                  {years.map(y => (
                    <td key={y} style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{formatVolume(yoyData[y]?.volume || 0)}</span>
                        {yoyData[y]?.yoyChange != null && (
                          <div style={{
                            fontSize: '10px',
                            color: yoyData[y].yoyChange > 0 ? '#30D158' : yoyData[y].yoyChange < 0 ? '#FF453A' : '#8E8E93',
                            fontWeight: 600,
                          }}>
                            {yoyData[y].yoyChange > 0 ? '+' : ''}{yoyData[y].yoyChange.toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </td>
                  ))}
                  <td>
                    {latestYoY != null ? (
                      <span style={{
                        fontSize: '14px', fontWeight: 800,
                        color: latestYoY > 0 ? '#30D158' : latestYoY < 0 ? '#FF453A' : '#8E8E93',
                      }}>
                        {latestYoY > 0 ? '↑ +' : latestYoY < 0 ? '↓ ' : '→ '}{latestYoY.toFixed(1)}%
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompetitorAnalysis({ colorMap, displayBrands }) {
  const { state } = useApp();
  const { brandMonthlyData, allMonths, brands, darkMode, graphTickInterval } = state;
  const targetBrands = displayBrands || brands;

  return (
    <>
      <YoYTable brandMonthlyData={brandMonthlyData} brands={targetBrands.filter(b => b !== 'generic')} colorMap={colorMap} allMonths={allMonths} />
    </>
  );
}

export default CompetitorAnalysis;
