import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ReportSummary } from '../components/report/ReportSummary';
import { KeywordDataTable } from '../components/report/KeywordDataTable';

export function ReportPage() {
  const navigate = useNavigate();
  const { state } = useApp();

  // Guard: need API results
  if (!state.apiRawResults) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '12px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>No data yet. Please upload a file and fetch data first.</p>
        <button className="btn-primary" onClick={() => navigate('/upload')}>Go to Upload</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Keyword Report
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Raw API data for {state.parsedKeywords.length} keywords · Engine: {state.selectedEngine}
          </p>
        </div>
        <motion.button
          className="btn-primary"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/analysis')}
          style={{ gap: '8px' }}
        >
          <BarChart2 size={16} />
          Generate Analysis →
        </motion.button>
      </div>

      {/* Summary cards + brand table */}
      <ReportSummary />

      {/* Full keyword table */}
      <div className="card">
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          All Keywords
        </h3>
        <KeywordDataTable />
      </div>
    </div>
  );
}

export default ReportPage;
