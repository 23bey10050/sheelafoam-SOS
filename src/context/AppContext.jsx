import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { calculateSoS } from '../utils/sosCalculations';

const AppContext = createContext(null);

const initialState = {
  // Step 1: Upload
  uploadedFile: null,
  uploadedFileName: null,
  parsedKeywords: [],
  tagMap: {},
  previewRows: [],
  selectedEngine: 'google',
  selectedCountry: 'IN',
  selectedLocationId: 2356,
  selectedCurrency: 'INR',

  // Step 2: API Result
  apiRawResults: null,
  apiCallsRemaining: null,
  apiCallsMade: null,
  isLoading: false,
  error: null,
  loadingMessage: '',

  // Step 3: Processed data
  brandMonthlyData: {},
  sosData: {},
  allMonths: [],
  brands: [],
  deviceBreakdown: null, // New: root device breakdown from API

  // Step 4: Competitor selection
  myBrands: ['sleepwell', 'kurlon'],
  competitors: [],

  // Analysis settings
  excludeGeneric: false,
  rollingWindow: 12, // 0 = none, 3, 6, 12
  showForecast: false,
  normalizeYAxis: false, // show % vs absolute
  graphTickInterval: '12', // 'auto', '6', '12'

  // Quota
  quotaInfo: null,

  // UI
  currentPage: 'upload',
  darkMode: false,
  toast: null,

  // Color overrides (user-customizable)
  brandColorOverrides: {},
};

const SESSION_KEY = 'sos-session-data';
const DARK_KEY = 'sos-dark-mode';

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DARK_MODE':
      return { ...state, darkMode: action.payload };

    case 'SET_UPLOADED_FILE':
      return {
        ...state,
        uploadedFile: action.payload.file,
        uploadedFileName: action.payload.fileName,
        parsedKeywords: action.payload.keywords,
        tagMap: action.payload.tagMap,
        previewRows: action.payload.previewRows || [],
      };

    case 'CLEAR_FILE':
      return {
        ...state,
        uploadedFile: null,
        uploadedFileName: null,
        parsedKeywords: [],
        tagMap: {},
        previewRows: [],
      };

    case 'SET_ENGINE':
      return { ...state, selectedEngine: action.payload };

    case 'SET_COUNTRY':
      return {
        ...state,
        selectedCountry: action.payload.code,
        selectedLocationId: action.payload.locationId,
        selectedCurrency: action.payload.currency,
      };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, loadingMessage: action.message || '' };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'SET_API_RESULTS':
      return {
        ...state,
        apiRawResults: action.payload.results,
        apiCallsRemaining: action.payload.apiCallsRemaining,
        apiCallsMade: action.payload.apiCallsMade,
        isLoading: false,
        error: null,
      };

    case 'SET_PROCESSED_DATA':
      return {
        ...state,
        brandMonthlyData: action.payload.brandMonthlyData,
        sosData: action.payload.sosData,
        allMonths: action.payload.allMonths,
        brands: action.payload.brands,
        deviceBreakdown: action.payload.deviceBreakdown !== undefined ? action.payload.deviceBreakdown : state.deviceBreakdown,
      };

    case 'SET_MY_BRANDS':
      return {
        ...state,
        myBrands: action.payload,
        competitors: state.brands.filter(b => !action.payload.includes(b) && b !== 'generic'),
      };

    case 'SET_ANALYSIS_SETTING': {
      const newState = { ...state, [action.key]: action.value };
      if (action.key === 'excludeGeneric' && state.brandMonthlyData) {
        const excludeTags = action.value ? ['generic'] : [];
        const { sosData, allMonths, brands } = calculateSoS(state.brandMonthlyData, excludeTags);
        newState.sosData = sosData;
        newState.brands = brands;
        newState.allMonths = allMonths;
      }
      return newState;
    }

    case 'SET_QUOTA':
      return { ...state, quotaInfo: action.payload };

    case 'SET_TOAST':
      return { ...state, toast: action.payload };

    case 'CLEAR_TOAST':
      return { ...state, toast: null };

    case 'SET_BRAND_COLOR':
      return {
        ...state,
        brandColorOverrides: { ...state.brandColorOverrides, [action.brand]: action.color },
      };

    case 'RESTORE_SESSION':
      return { ...state, ...action.payload };

    case 'RESET':
      return { ...initialState, darkMode: state.darkMode };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    // Restore dark mode preference
    const darkMode = localStorage.getItem(DARK_KEY) === 'true';
    return { ...init, darkMode };
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(DARK_KEY, state.darkMode);
  }, [state.darkMode]);

  // Persist analysis to session storage
  useEffect(() => {
    if (state.apiRawResults) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          parsedKeywords: state.parsedKeywords,
          tagMap: state.tagMap,
          uploadedFileName: state.uploadedFileName,
          selectedEngine: state.selectedEngine,
          apiRawResults: state.apiRawResults,
          apiCallsRemaining: state.apiCallsRemaining,
          brandMonthlyData: state.brandMonthlyData,
          sosData: state.sosData,
          allMonths: state.allMonths,
          brands: state.brands,
          myBrands: state.myBrands,
        }));
      } catch (_) { /* quota exceeded */ }
    }
  }, [state.apiRawResults, state.brandMonthlyData, state.myBrands]);

  // Toast auto-dismiss
  useEffect(() => {
    if (state.toast) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [state.toast]);

  const showToast = useCallback((message, type = 'info') => {
    dispatch({ type: 'SET_TOAST', payload: { message, type, id: Date.now() } });
  }, []);

  const restoreSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        dispatch({ type: 'RESTORE_SESSION', payload: JSON.parse(saved) });
        return true;
      }
    } catch (_) {}
    return false;
  }, []);

  const hasSession = useCallback(() => {
    return !!sessionStorage.getItem(SESSION_KEY);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, showToast, restoreSession, hasSession, clearSession }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
