import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { AppProvider } from './context/AppContext';
import { UploadPage } from './pages/UploadPage';
import { ReportPage } from './pages/ReportPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { CompetitorPage } from './pages/CompetitorPage';
import { SuggestionsPage } from './pages/SuggestionsPage';
import { UrlAnalysisPage } from './pages/UrlAnalysisPage';

import { AutoFetch } from './components/AutoFetch';

function App() {
  return (
    <AppProvider>
      <Router>
        <AutoFetch />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/competitor" element={<CompetitorPage />} />
            <Route path="/suggestions" element={<SuggestionsPage />} />
            <Route path="/url-analysis" element={<UrlAnalysisPage />} />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/upload" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;
