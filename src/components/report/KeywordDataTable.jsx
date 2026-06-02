import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, ArrowUpDown, Download, BarChart2,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatVolume, formatPercent, capitalizeBrand, BRAND_COLORS, formatMonthShort } from '../../utils/chartHelpers';
import { exportEnrichedData } from '../../utils/excelParser';

const PAGE_SIZE = 50;

export function KeywordDataTable() {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortCol, setSortCol] = useState('vol');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);

  const { apiRawResults, tagMap, parsedKeywords } = state;

  // Build kwToTag map
  const kwToTag = useMemo(() => {
    const map = {};
    for (const [tag, kws] of Object.entries(tagMap)) {
      for (const kw of kws) map[kw] = tag;
    }
    return map;
  }, [tagMap]);

  const allTags = ['all', ...Object.keys(tagMap)];

  // Build flat rows from apiRawResults
  const allRows = useMemo(() => {
    if (!apiRawResults) return [];
    return parsedKeywords.map(kw => {
      const data = apiRawResults[kw] || {};
      const tag = kwToTag[kw] || 'unknown';

      // Real API fields: volume, cmp, cpc (flat number), trend (single float)
      const vol = Number(data.volume || data.vol || 0);
      const cpc = parseFloat(data.cpc || 0);
      const bidLow = parseFloat(data.top_of_page_bid_low || 0);
      const bidHigh = parseFloat(data.top_of_page_bid_high || 0);
      const competition = parseFloat(data.cmp || data.competition || 0);
      const trendFloat = parseFloat(data.trend || 0); // single float like -0.33 or 0.5

      // Build monthly sparkline from m1..m48 flat fields, sorted chronologically
      const monthlyPoints = [];
      for (let i = 48; i >= 1; i--) {
        const v = data[`m${i}`];
        const mo = data[`m${i}_month`];
        const yr = data[`m${i}_year`];
        if (v != null && mo != null && yr != null) {
          monthlyPoints.push({ month: `${yr}-${String(mo).padStart(2, '0')}`, value: Number(v) });
        }
      }
      // Sort chronologically
      monthlyPoints.sort((a, b) => a.month.localeCompare(b.month));

      // Trend direction from the API float (positive = growing, negative = declining)
      // API: trend = (m1 - m48) / m48 — positive means recent month > oldest month
      const trendDir = isFinite(trendFloat) ? trendFloat * 100 : 0;

      return { kw, tag, vol, cpc, bidLow, bidHigh, competition, trendDir, trend: monthlyPoints };
    });
  }, [apiRawResults, parsedKeywords, kwToTag]);


  // Filter
  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (filterTag !== 'all' && r.tag !== filterTag) return false;
      if (search && !r.kw.toLowerCase().includes(search.toLowerCase()) && !r.tag.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allRows, filterTag, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA = a[sortCol] ?? 0, valB = b[sortCol] ?? 0;
      if (sortCol === 'kw') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      if (sortDir === 'asc') return valA < valB ? -1 : 1;
      return valA > valB ? -1 : 1;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(0);
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ArrowUpDown size={11} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ArrowUp size={11} color="var(--accent-blue)" /> : <ArrowDown size={11} color="var(--accent-blue)" />;
  };

  const HoverTrendGraph = ({ data, kw }) => {
    const chartData = (data || []).map(d => ({ ...d, label: formatMonthShort(d.month) }));
    return (
      <div style={{
        position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)',
        marginRight: '12px', background: 'var(--bg-card)', padding: '16px',
        borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        width: '300px', height: '180px', zIndex: 100,
        border: '1px solid var(--border-subtle)',
        cursor: 'default', pointerEvents: 'none'
      }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          {kw}
        </p>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={20} />
            <RechartsTooltip 
              formatter={(v) => [formatVolume(v), 'Volume']}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', fontSize: '12px', color: 'var(--text-primary)' }}
            />
            <Bar dataKey="value" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const TrendBar = ({ value, kw }) => {
    const [isHovered, setIsHovered] = useState(false);
    const safeArr = Array.isArray(value) ? value : [];
    if (safeArr.length === 0) return <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>;
    const maxV = Math.max(...safeArr.map(t => (t && typeof t === 'object' ? t.value : 0) || 0));
    return (
      <div 
        style={{ position: 'relative', display: 'flex', gap: '1px', alignItems: 'flex-end', height: '20px', cursor: 'pointer' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isHovered && <HoverTrendGraph data={safeArr} kw={kw} />}
        {safeArr.slice(-12).map((t, i) => {
          const v = (t && typeof t === 'object' ? t.value : 0) || 0;
          const h = maxV > 0 ? Math.max(2, (v / maxV) * 20) : 2;
          return (
            <div key={i} style={{
              width: 3, height: h, borderRadius: '1px',
              background: 'var(--accent-blue)', opacity: 0.7,
              flexShrink: 0,
            }} />
          );
        })}
      </div>
    );
  };

  if (!apiRawResults) return null;

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input"
            placeholder="Search keywords..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{ paddingLeft: 32 }}
          />
        </div>

        <select
          className="input"
          style={{ width: 'auto' }}
          value={filterTag}
          onChange={e => { setFilterTag(e.target.value); setPage(0); }}
        >
          {allTags.map(t => <option key={t} value={t}>{t === 'all' ? 'All brands' : capitalizeBrand(t)}</option>)}
        </select>

        <button
          className="btn-secondary"
          onClick={() => exportEnrichedData(parsedKeywords, apiRawResults, tagMap)}
          style={{ gap: '6px', fontSize: '13px' }}
        >
          <Download size={13} />
          Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('kw')} style={{ minWidth: 220 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Keyword <SortIcon col="kw" /></span>
              </th>
              <th>Brand/Tag</th>
              <th onClick={() => handleSort('vol')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Avg Monthly Vol <SortIcon col="vol" /></span>
              </th>
              <th onClick={() => handleSort('cpc')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Avg CPC <SortIcon col="cpc" /></span>
              </th>
              <th onClick={() => handleSort('bidLow')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Bid (Low) <SortIcon col="bidLow" /></span>
              </th>
              <th onClick={() => handleSort('bidHigh')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Bid (High) <SortIcon col="bidHigh" /></span>
              </th>
              <th onClick={() => handleSort('competition')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Competition <SortIcon col="competition" /></span>
              </th>
              <th>Trend (12mo)</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <motion.tr
                key={row.kw}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.01 }}
              >
                <td style={{ fontWeight: 500, fontSize: '13px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.kw}
                </td>
                <td>
                  <span className={`badge ${row.tag === 'generic' ? 'badge-gray' : 'badge-blue'}`}>
                    {row.tag}
                  </span>
                </td>
                <td style={{ fontWeight: 600, color: row.vol > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {formatVolume(row.vol)}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {row.cpc > 0 ? `₹${row.cpc.toFixed(2)}` : '—'}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {row.bidLow > 0 ? `₹${row.bidLow.toFixed(2)}` : '—'}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {row.bidHigh > 0 ? `₹${row.bidHigh.toFixed(2)}` : '—'}
                </td>
                <td>
                  {row.competition > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: 40, height: 5, borderRadius: 3,
                        background: 'var(--border-subtle)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${row.competition * 100}%`,
                          height: '100%', borderRadius: 3,
                          background: row.competition > 0.7 ? '#FF453A' : row.competition > 0.4 ? '#FF9F0A' : '#30D158',
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {formatPercent(row.competition * 100)}
                      </span>
                    </div>
                  ) : '—'}
                </td>
                <td>
                  {row.trendDir !== 0 && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: row.trendDir > 0 ? '#30D158' : '#FF453A',
                      marginRight: 6,
                    }}>
                      {row.trendDir > 0 ? '↑' : '↓'} {Math.abs(row.trendDir).toFixed(0)}%
                    </span>
                  )}
                  <TrendBar value={row.trend} kw={row.kw} />
                </td>
              </motion.tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No keywords match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length} keywords
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default KeywordDataTable;
