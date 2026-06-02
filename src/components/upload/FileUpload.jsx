import React, { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseExcelFile, downloadTemplate } from '../../utils/excelParser';
import { useApp } from '../../context/AppContext';

const ACCEPTED = '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';

export function FileUpload() {
  const { state, dispatch, showToast } = useApp();
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'csv'].includes(ext)) {
      showToast('Please upload an .xlsx or .csv file.', 'error');
      return;
    }

    try {
      const { keywords, tagMap, previewRows } = await parseExcelFile(file);
      dispatch({
        type: 'SET_UPLOADED_FILE',
        payload: { file, fileName: file.name, keywords, tagMap, previewRows },
      });
      showToast(`✅ Parsed ${keywords.length} keywords from "${file.name}"`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [dispatch, showToast]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onInputChange = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = ''; // reset so same file can be re-uploaded
  };

  const clearFile = () => {
    dispatch({ type: 'CLEAR_FILE' });
  };

  const { parsedKeywords, tagMap, previewRows, uploadedFileName } = state;
  const hasFile = parsedKeywords.length > 0;
  const brands = Object.entries(tagMap).filter(([t]) => t !== 'generic');
  const genericCount = tagMap['generic']?.length || 0;

  return (
    <div>
      {/* Drop Zone */}
      <AnimatePresence mode="wait">
        {!hasFile ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <label
              htmlFor="file-input"
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              style={{ cursor: 'pointer', display: 'block' }}
            >
              <input
                id="file-input"
                type="file"
                accept={ACCEPTED}
                onChange={onInputChange}
                style={{ display: 'none' }}
              />
              <motion.div
                animate={{ y: dragOver ? -4 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <UploadCloud
                  size={42}
                  color={dragOver ? 'var(--accent-blue)' : 'var(--text-tertiary)'}
                  style={{ margin: '0 auto 14px', display: 'block' }}
                />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Drop your keyword Excel file here
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Supported: .xlsx, .csv — Max 1,000 keywords
                </p>
                <p style={{ fontSize: '12px', color: 'var(--accent-blue)', marginTop: '8px', fontWeight: 500 }}>
                  Click to browse files
                </p>
              </motion.div>
            </label>
          </motion.div>
        ) : (
          <motion.div
            key="fileinfo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '20px',
            }}
          >
            {/* File header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '10px',
                  background: 'rgba(48,209,88,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileSpreadsheet size={20} color="#30D158" />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {uploadedFileName}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ✅ {parsedKeywords.length} keywords found
                  </p>
                </div>
              </div>
              <button onClick={clearFile} className="btn-ghost" style={{ padding: '6px' }}>
                <X size={15} />
              </button>
            </div>

            {/* Tag breakdown */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {brands.map(([tag, kws]) => (
                <span key={tag} className="badge badge-blue">
                  🏷️ {tag} ({kws.length} kw)
                </span>
              ))}
              {genericCount > 0 && (
                <span className="badge badge-gray">
                  📂 generic ({genericCount} kw)
                </span>
              )}
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Preview (first 5 rows)
                </p>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Keyword</th>
                        <th>Tag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.keyword}</td>
                          <td>
                            <span className={`badge ${row.tag === 'generic' ? 'badge-gray' : 'badge-blue'}`}>
                              {row.tag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template download */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={downloadTemplate}
          className="btn-ghost"
          style={{ fontSize: '12px', gap: '6px' }}
        >
          <Download size={13} />
          Download Template
        </button>
      </div>
    </div>
  );
}

export default FileUpload;
