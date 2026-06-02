import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { fetchKeywordVolume, checkQuota } from '../utils/apiService';
import { processApiResults, calculateSoS } from '../utils/sosCalculations';
import { useNavigate, useLocation } from 'react-router-dom';

export function AutoFetch() {
  const { state, dispatch, hasSession, restoreSession } = useApp();
  const fetchedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetchedRef.current) return;
    if (state.apiRawResults) return; // Already fetched
    fetchedRef.current = true;

    if (hasSession()) {
      restoreSession();
      return;
    }

    const doFetch = async () => {
      // 1. Load CSV
      let keywords = [];
      let tagMap = {};
      try {
        const response = await fetch('/High frequency Keywords (1).csv');
        const csvText = await response.text();
        const rows = csvText.split('\n').map(row => row.split(','));
        const headers = rows[0].map(h => h?.toString().toLowerCase().trim());
        const kwIdx = headers.indexOf('keyword');
        const tagIdx = headers.indexOf('tag');
        
        if (kwIdx !== -1 && tagIdx !== -1) {
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;
            const kw = row[kwIdx]?.toString().trim();
            const tag = row[tagIdx]?.toString().trim().toLowerCase();
            if (!kw || !tag) continue;
            keywords.push(kw);
            if (!tagMap[tag]) tagMap[tag] = [];
            tagMap[tag].push(kw);
          }
          dispatch({
            type: 'SET_UPLOADED_FILE',
            payload: { file: null, fileName: 'High frequency Keywords (1).csv', keywords, tagMap, previewRows: [] }
          });
        }
      } catch (err) {
        console.error('Failed to load CSV for auto-fetch', err);
        return;
      }

      if (keywords.length === 0) return;

      // 2. Fetch API
      dispatch({ type: 'SET_LOADING', payload: true, message: `Auto-fetching data for ${keywords.length} keywords...` });
      try {
        const apiRes = await fetchKeywordVolume({
          keywords,
          engine: state.selectedEngine || 'google',
          country: state.selectedCountry || 'IN',
          locationId: state.selectedLocationId || 2356,
          currency: state.selectedCurrency || 'INR',
        });
        const results = apiRes.results || {};
        dispatch({
          type: 'SET_API_RESULTS',
          payload: { results, apiCallsRemaining: apiRes.apiCallsRemaining, apiCallsMade: apiRes.apiCallsMade }
        });
        
        const brandMonthlyData = processApiResults(results, tagMap);
        const { sosData, allMonths, brands } = calculateSoS(brandMonthlyData, state.excludeGeneric ? ['generic'] : []);
        
        dispatch({
          type: 'SET_PROCESSED_DATA',
          payload: { brandMonthlyData, sosData, allMonths, brands, deviceBreakdown: apiRes.device_breakdown }
        });
        
        checkQuota().then(q => { if (q) dispatch({ type: 'SET_QUOTA', payload: q }); });

        // If they landed on /upload initially, redirect them to /report or /analysis
        if (location.pathname === '/upload' || location.pathname === '/') {
          navigate('/analysis', { replace: true });
        }
      } catch (err) {
        dispatch({ type: 'SET_LOADING', payload: false });
        console.error('Auto-fetch failed', err);
      }
    };

    doFetch();
  }, []);

  return null;
}
