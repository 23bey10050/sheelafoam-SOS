import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Database } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchKeywordSuggestions, checkQuota, COUNTRY_OPTIONS, SUPPORTED_ENGINES } from '../utils/apiService';
import { LoadingOverlay } from '../components/ui/LoadingSpinner';

export function SuggestionsPage() {
  const { state, dispatch, showToast } = useApp();
  const [keyword, setKeyword] = useState('');
  const [engine, setEngine] = useState('google');
  const [country, setCountry] = useState('US');
  const [language, setLanguage] = useState('en');
  const [type, setType] = useState('suggestions');
  
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const canFetch = keyword.trim().length > 0;

  const handleFetch = async () => {
    if (!canFetch) return;
    setIsLoading(true);

    try {
      const response = await fetchKeywordSuggestions({
        keyword, engine, country, language, type, currency: 'USD'
      });

      // Typical response has results under response.results, but might vary
      let dataList = [];
      if (response.results && typeof response.results === 'object') {
        const firstKey = Object.keys(response.results)[0];
        if (firstKey) {
          const innerData = response.results[firstKey];
          if (Array.isArray(innerData)) dataList = innerData;
        }
      } else if (Array.isArray(response.results)) {
        dataList = response.results;
      }

      setResults(dataList);

      // Refresh quota
      checkQuota().then(q => {
        if (q) dispatch({ type: 'SET_QUOTA', payload: q });
      });

      showToast(`✅ Found ${dataList.length} suggestions`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to fetch suggestions', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const exportResults = () => {
    if (!results || results.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Keyword,Volume,CPC,Competition\n"
      + results.map(r => `${r.string || r.keyword},${r.volume || 0},${r.cpc || 0},${r.cmp || 0}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${keyword}_suggestions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 48px)' }}>
      
      <AnimatePresence>
        {isLoading && <LoadingOverlay message={`Fetching suggestions for "${keyword}"...`} />}
      </AnimatePresence>

      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Keyword Ideas
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Get autocomplete suggestions, related keywords, and questions from multiple search engines.</p>
      </div>

      {/* Control Panel */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Seed Keyword
            </label>
            <input 
              className="input" 
              placeholder="e.g. digital marketing" 
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Search Engine
            </label>
            <select className="input" value={engine} onChange={e => setEngine(e.target.value)}>
              {SUPPORTED_ENGINES.map(eng => (
                <option key={eng.id} value={eng.id}>{eng.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Result Type
            </label>
            <select className="input" value={type} onChange={e => setType(e.target.value)}>
              <option value="suggestions">Autocomplete Suggestions</option>
              <option value="related">Related Keywords</option>
              <option value="questions">Questions</option>
              <option value="prepositions">Prepositions</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Country
            </label>
            <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Language
            </label>
            <input className="input" value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g. en" />
          </div>
        </div>

        <button 
          className="btn-primary" 
          disabled={!canFetch || isLoading} 
          onClick={handleFetch}
          style={{ width: 'fit-content', padding: '10px 24px' }}
        >
          <Search size={16} /> Get Suggestions
        </button>
      </div>

      {/* Results Table */}
      {results && (
        <div className="card" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Results ({results.length})</h3>
            <button className="btn-secondary" onClick={exportResults} style={{ fontSize: 13, padding: '6px 12px' }}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          
          <div className="table-container" style={{ flex: 1 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th>Search Volume</th>
                  <th>CPC</th>
                  <th>Competition</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{row.string || row.keyword}</td>
                    <td>{row.volume ? row.volume.toLocaleString() : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{row.cpc ? `₹${Number(row.cpc).toFixed(2)}` : '—'}</td>
                    <td>
                      {row.cmp ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                            <div style={{ width: `${row.cmp * 100}%`, height: '100%', background: row.cmp > 0.7 ? '#FF453A' : row.cmp > 0.4 ? '#FF9F0A' : '#30D158' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{(row.cmp * 100).toFixed(0)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!results && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          <Database size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p>Enter a seed keyword to get suggestions.</p>
        </div>
      )}

    </div>
  );
}

export default SuggestionsPage;
