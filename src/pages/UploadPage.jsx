import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ChevronDown, ChevronUp, Search, Zap, Database, Globe } from 'lucide-react';
import { FileUpload } from '../components/upload/FileUpload';
import { EngineSelector } from '../components/upload/EngineSelector';
import { LoadingOverlay } from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { fetchKeywordVolume, checkQuota, COUNTRY_OPTIONS } from '../utils/apiService';
import { processApiResults, calculateSoS } from '../utils/sosCalculations';

export function UploadPage() {
  const navigate = useNavigate();
  const { state, dispatch, showToast, hasSession, restoreSession } = useApp();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  useEffect(() => {
    if (hasSession()) setShowResumeBanner(true);
    checkQuota().then(q => {
      if (q) dispatch({ type: 'SET_QUOTA', payload: q });
    });
  }, []);

  const canFetch = state.parsedKeywords.length > 0 && state.selectedEngine;

  const handleFetch = async () => {
    dispatch({ type: 'SET_LOADING', payload: true, message: `Fetching data for ${state.parsedKeywords.length} keywords from ${state.selectedEngine}...` });

    try {
      const response = await fetchKeywordVolume({
        keywords: state.parsedKeywords,
        engine: state.selectedEngine,
        country: state.selectedCountry,
        locationId: state.selectedLocationId,
        currency: state.selectedCurrency,
      });

      const results = response.results || {};

      dispatch({
        type: 'SET_API_RESULTS',
        payload: {
          results,
          apiCallsRemaining: response.apiCallsRemaining,
          apiCallsMade: response.apiCallsMade,
        },
      });

      // Fetch fresh quota after call
      checkQuota().then(q => {
        if (q) dispatch({ type: 'SET_QUOTA', payload: q });
      });

      const brandMonthlyData = processApiResults(results, state.tagMap);
      const { sosData, allMonths, brands } = calculateSoS(brandMonthlyData, state.excludeGeneric ? ['generic'] : []);

      dispatch({
        type: 'SET_PROCESSED_DATA',
        payload: { brandMonthlyData, sosData, allMonths, brands, deviceBreakdown: response.device_breakdown },
      });

      showToast(`✅ Data fetched! ${Object.keys(results).length} keywords with volume data.`, 'success');
      navigate('/report');
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      showToast(err.message || 'Failed to fetch data.', 'error');
    }
  };

  const handleResume = () => {
    restoreSession();
    setShowResumeBanner(false);
    navigate('/report');
  };

  // Quota display logic
  const quota = state.quotaInfo;
  const quotaRemaining = quota?.apiCallsRemaining ?? null;
  const quotaMade = quota?.apiCallsMade ?? null;
  const quotaTotal = quota?.apiCallsTotal ?? (
    quotaRemaining !== null && quotaMade !== null ? quotaRemaining + quotaMade : null
  );
  const quotaPct = (quotaTotal > 0 && quotaRemaining !== null)
    ? (quotaRemaining / quotaTotal) * 100
    : 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Loading overlay */}
      <AnimatePresence>
        {state.isLoading && (
          <LoadingOverlay
            message={state.loadingMessage}
            keywordCount={state.parsedKeywords.length}
            engine={state.selectedEngine}
          />
        )}
      </AnimatePresence>

      {/* macOS window chrome — full width title bar */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 20px',
        height: 48,
        display: 'flex', alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        userSelect: 'none',
      }}>
        <div className="traffic-lights">
          <div className="traffic-light traffic-light-red" />
          <div className="traffic-light traffic-light-yellow" />
          <div className="traffic-light traffic-light-green" />
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: '5px',
            background: 'linear-gradient(135deg, #0071E3, #BF5AF2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp size={11} color="white" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Share of Search — Keyword Analysis
          </span>
        </div>

        {/* Quota pill in title bar */}
        {quota && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: quotaPct > 30 ? '#30D158' : quotaPct > 10 ? '#FF9F0A' : '#FF453A',
            }} />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {quotaRemaining != null ? `${quotaRemaining} calls left` : 'Quota loaded'}
            </span>
          </div>
        )}
      </div>

      {/* Session resume banner */}
      <AnimatePresence>
        {showResumeBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(0,113,227,0.08)',
              borderBottom: '1px solid rgba(0,113,227,0.2)',
            }}
          >
            <div style={{
              padding: '10px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 500 }}>
                📂 Previous session found — resume your analysis?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleResume} className="btn-primary" style={{ padding: '5px 14px', fontSize: 12 }}>
                  Resume
                </button>
                <button onClick={() => setShowResumeBanner(false)} className="btn-ghost" style={{ fontSize: 12 }}>
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content — desktop two-panel layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        overflow: 'hidden',
      }}>

        {/* ─── LEFT SIDEBAR PANEL ─── */}
        <div style={{
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          padding: '28px 24px',
          display: 'flex', flexDirection: 'column',
          gap: 20,
          overflowY: 'auto',
        }}>

          {/* Hero */}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 6 }}>
              Analyze Your Brand's<br/>Search Presence
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Upload a keyword list tagged by brand, fetch real-time search volumes, and unlock deep Share of Search insights.
            </p>
          </div>

          {/* STEP 1: Upload */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: state.parsedKeywords.length > 0 ? '#30D158' : 'var(--accent-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0,
              }}>
                {state.parsedKeywords.length > 0 ? '✓' : '1'}
              </div>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Upload Keyword File
              </h2>
            </div>
            <FileUpload />
          </div>

          <div className="divider" />

          {/* STEP 2: Advanced Options (Country) */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn-ghost"
              style={{ width: '100%', justifyContent: 'space-between', fontSize: 12, padding: '6px 0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Globe size={13} color="var(--text-secondary)" />
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Location &amp; Currency
                </span>
              </div>
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Country
                      </label>
                      <select
                        className="input"
                        style={{ fontSize: 12, padding: '7px 10px' }}
                        value={state.selectedCountry}
                        onChange={(e) => {
                          const opt = COUNTRY_OPTIONS.find(o => o.code === e.target.value);
                          if (opt) dispatch({ type: 'SET_COUNTRY', payload: opt });
                        }}
                      >
                        {COUNTRY_OPTIONS.map(opt => (
                          <option key={opt.code} value={opt.code}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Currency
                      </label>
                      <select className="input" style={{ fontSize: 12, padding: '7px 10px' }} value={state.selectedCurrency} disabled>
                        <option>{state.selectedCurrency}</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Quota Bar */}
          {quota && quotaRemaining !== null && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>API Quota</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: quotaPct > 30 ? '#30D158' : quotaPct > 10 ? '#FF9F0A' : '#FF453A',
                }}>
                  {quotaRemaining} remaining
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${quotaPct}%`,
                  background: quotaPct > 30 ? '#30D158' : quotaPct > 10 ? '#FF9F0A' : '#FF453A',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              {quotaTotal !== null && (
                <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5 }}>
                  {quotaMade ?? 0} used of {quotaTotal} daily requests
                </p>
              )}
            </div>
          )}

          {/* Fetch CTA */}
          <motion.button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14, borderRadius: 10 }}
            disabled={!canFetch || state.isLoading}
            onClick={handleFetch}
            whileHover={canFetch ? { scale: 1.01 } : {}}
            whileTap={canFetch ? { scale: 0.99 } : {}}
          >
            <Search size={15} />
            Fetch Realtime Data
            {state.parsedKeywords.length > 0 && (
              <span style={{ opacity: 0.7, fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                ({state.parsedKeywords.length} keywords)
              </span>
            )}
          </motion.button>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div style={{
          padding: '28px 32px',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>

          {/* Engine selector header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: state.selectedEngine ? '#30D158' : 'var(--accent-blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0,
              }}>
                {state.selectedEngine ? '✓' : '2'}
              </div>
              <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Select Search Engine
              </h2>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16, marginLeft: 28 }}>
              Choose the platform to fetch search volume data from. Google &amp; Bing use exact Keyword Planner data.
            </p>
            <EngineSelector />
          </div>

          {/* Stats cards when file is loaded */}
          {state.parsedKeywords.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
            >
              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,113,227,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={13} color="var(--accent-blue)" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Keywords</span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  {state.parsedKeywords.length.toLocaleString()}
                </p>
              </div>

              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(48,209,88,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={13} color="#30D158" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Brands</span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  {Object.keys(state.tagMap).filter(t => t !== 'generic').length}
                </p>
              </div>

              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,159,10,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={13} color="var(--accent-warning)" />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market</span>
                </div>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  {COUNTRY_OPTIONS.find(c => c.code === state.selectedCountry)?.label?.split(' ')[0] || state.selectedCountry}
                </p>
              </div>
            </motion.div>
          )}

          {/* Empty state when no file */}
          {state.parsedKeywords.length === 0 && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: '60px 0',
              color: 'var(--text-tertiary)',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'var(--bg-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Database size={28} color="var(--text-tertiary)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Upload a keyword file to begin
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                  Upload a CSV or Excel file with columns: <strong>Keyword</strong> and <strong>Tag</strong><br/>
                  Tags group keywords by brand (e.g. Sleepwell, Wakefit, Generic)
                </p>
              </div>

              {/* File format example */}
              <div style={{
                borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                fontSize: 12, width: 320,
              }}>
                <div style={{
                  background: 'var(--bg-hover)', padding: '8px 14px',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  fontWeight: 700, color: 'var(--text-secondary)',
                  fontSize: 11, letterSpacing: '0.04em',
                }}>
                  <span>Rank</span><span>Keyword</span><span>Tag</span>
                </div>
                {[
                  ['1', 'mattress', 'Generic'],
                  ['2', 'sleepwell mattress', 'Sleepwell'],
                  ['3', 'wakefit mattress', 'Wakefit'],
                ].map(([rank, kw, tag], i) => (
                  <div key={i} style={{
                    padding: '7px 14px',
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    borderTop: '1px solid var(--border-subtle)',
                  }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{rank}</span>
                    <span>{kw}</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{tag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
