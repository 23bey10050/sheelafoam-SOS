import * as XLSX from 'xlsx';

/**
 * Parse an uploaded .xlsx or .csv file and extract keywords + tagMap
 * @param {File} file
 * @returns {Promise<{keywords: string[], tagMap: Object}>}
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!rows || rows.length < 2) {
          reject(new Error('File appears to be empty or has no data rows.'));
          return;
        }

        // Find header row (case-insensitive)
        const headers = rows[0].map(h => h?.toString().toLowerCase().trim());
        const kwIdx = headers.indexOf('keyword');
        const tagIdx = headers.indexOf('tag');

        if (kwIdx === -1 || tagIdx === -1) {
          reject(new Error('Excel must have "keyword" and "tag" columns. Please download the template.'));
          return;
        }

        const keywords = [];
        const tagMap = {}; // { tagName: [keyword, keyword, ...] }
        const previewRows = []; // first 5 rows for preview

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const kw = row[kwIdx]?.toString().trim();
          const tag = row[tagIdx]?.toString().trim().toLowerCase();
          if (!kw || !tag) continue;

          keywords.push(kw);
          if (!tagMap[tag]) tagMap[tag] = [];
          tagMap[tag].push(kw);

          if (previewRows.length < 5) {
            previewRows.push({ keyword: kw, tag });
          }
        }

        if (keywords.length === 0) {
          reject(new Error('No valid keyword rows found in the file.'));
          return;
        }

        // Enforce 1000 keyword API limit
        if (keywords.length > 1000) {
          reject(new Error(`File has ${keywords.length} keywords. Maximum allowed is 1,000 per API call.`));
          return;
        }

        resolve({ keywords, tagMap, previewRows });
      } catch (err) {
        reject(new Error('Failed to parse file. Please ensure it is a valid .xlsx or .csv file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate and download a template Excel file for users
 */
export function downloadTemplate() {
  const templateData = [
    ['keyword', 'tag'],
    ['sleepwell mattress', 'sleepwell'],
    ['buy sleepwell mattress online', 'sleepwell'],
    ['sleepwell ortho mattress', 'sleepwell'],
    ['wakefit mattress', 'wakefit'],
    ['wakefit memory foam mattress', 'wakefit'],
    ['kurl-on mattress', 'kurl-on'],
    ['kurl-on spring mattress', 'kurl-on'],
    ['best mattress india', 'generic'],
    ['mattress price', 'generic'],
    ['buy mattress online india', 'generic'],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths
  worksheet['!cols'] = [{ wch: 40 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Keywords');
  XLSX.writeFile(workbook, 'sos_keywords_template.xlsx');
}

/**
 * Export enriched keyword data with API volumes as Excel
 */
export function exportEnrichedData(keywords, apiResults, tagMap) {
  const headers = ['Keyword', 'Brand/Tag', 'Avg Monthly Volume', 'CPC (INR)', 'Competition'];
  const rows = [headers];

  // Build reverse map: keyword -> tag
  const kwToTag = {};
  for (const [tag, kws] of Object.entries(tagMap)) {
    for (const kw of kws) kwToTag[kw] = tag;
  }

  for (const kw of keywords) {
    const data = apiResults[kw];
    const tag = kwToTag[kw] || 'unknown';
    rows.push([
      kw,
      tag,
      data?.vol || 0,
      data?.cpc?.value || 0,
      data?.competition ? (data.competition * 100).toFixed(1) + '%' : 'N/A',
    ]);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Keyword Report');
  XLSX.writeFile(workbook, 'sos_keyword_report.xlsx');
}
