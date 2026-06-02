/**
 * Chart helper utilities
 */

// Professional, vibrant dashboard color palette
export const BRAND_COLORS = [
  '#F97316', // Orange
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#D946EF', // Fuchsia
  '#0EA5E9', // Sky
  '#7C3AED', // Violet
  '#E65100', // Orange-Red
  '#9ACD32', // Yellow-Green
  '#64748B', // Slate
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#EC4899', // Pink
  '#059669', // Emerald Dark
  '#D97706', // Amber Dark
];

export const BRAND_COLORS_DARK = [
  // Slightly brighter variants for dark mode
  '#FB923C', // Orange
  '#34D399', // Emerald
  '#22D3EE', // Cyan
  '#818CF8', // Indigo
  '#A3E635', // Lime
  '#E879F9', // Fuchsia
  '#38BDF8', // Sky
  '#8B5CF6', // Violet
  '#FF8A65', // Orange-Red
  '#BBE550', // Yellow-Green
  '#94A3B8', // Slate
  '#FB7185', // Rose
  '#2DD4BF', // Teal
  '#FBBF24', // Amber
  '#A78BFA', // Purple
  '#60A5FA', // Blue
  '#F87171', // Red
  '#F472B6', // Pink
  '#10B981', // Emerald Dark
  '#F59E0B', // Amber Dark
];

/**
 * Deterministic hash function for assigning consistent random colors
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get brand color by index
 * @param {number} index
 * @param {boolean} darkMode
 * @returns {string} hex color
 */
export function getBrandColor(index, darkMode = false) {
  const colors = darkMode ? BRAND_COLORS_DARK : BRAND_COLORS;
  return colors[index % colors.length];
}

export function createColorMap(brands, darkMode = false) {
  const map = {};
  
  const reserved = {
    generic: { light: '#9CA3AF', dark: '#6B7280' },         // Grey
    sleepwell: { light: '#3B82F6', dark: '#60A5FA' },       // Blue
    kurlon: { light: '#EF4444', dark: '#EF4444' },          // Red
    wakefit: { light: '#5a31dd', dark: '#5a31ddff' },         // Purple
    duroflex: { light: '#F97316', dark: '#F97316' },        // Orange
    sleepycat: { light: '#f50bb7ff', dark: '#f50bb7ff' },       // Pink
    'the sleep company': { light: '#67cee7ff', dark: '#ef6f84ff' }, // Rose/Red
    peps: { light: '#8B5CF6', dark: '#A78BFA' },            // Purple
    flo: { light: '#EAB308', dark: '#FACC15' },             // Yellow
    emma: { light: '#4ADE80', dark: '#86EFAC' },            // Light Green
  };

  const allGeneralColors = darkMode ? BRAND_COLORS_DARK : BRAND_COLORS;
  const usedColors = new Set();

  // First pass: map reserved colors
  brands.forEach(brand => {
    const brandLower = brand.toLowerCase().trim();
    if (reserved[brandLower]) {
      const color = darkMode ? reserved[brandLower].dark : reserved[brandLower].light;
      map[brand] = color;
      usedColors.add(color);
    }
  });

  // Filter out any colors already assigned
  const availableColors = allGeneralColors.filter(color => !usedColors.has(color));

  // Second pass: assign random unused colors to the rest (sorted for consistency)
  const unreservedBrands = brands.filter(b => !map[b]).sort();
  
  unreservedBrands.forEach(brand => {
    if (availableColors.length === 0) {
      // Fallback if we run out of unique colors
      const hash = hashString(brand);
      map[brand] = allGeneralColors[hash % allGeneralColors.length];
    } else {
      const hash = hashString(brand);
      const index = hash % availableColors.length;
      const color = availableColors[index];
      map[brand] = color;
      availableColors.splice(index, 1); // remove from pool
      usedColors.add(color);
    }
  });

  return map;
}

/**
 * Format a month string like "2022-01" to "Jan 2022"
 */
export function formatMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Format a month string to short label like "Jan '22"
 */
export function formatMonthShort(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/**
 * Format a large number to K/M suffix
 * @param {number} val
 * @returns {string}
 */
export function formatVolume(val) {
  if (val == null || isNaN(val)) return '0';
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

/**
 * Format percentage with 1 decimal
 */
export function formatPercent(val) {
  if (val == null || isNaN(val)) return '0%';
  return `${val.toFixed(1)}%`;
}

/**
 * Build Recharts-compatible data array from brandMonthlyData
 * Returns array of { month, brandA, brandB, ... }
 */
export function buildChartData(brandMonthlyData, allMonths, brands) {
  return allMonths.map(month => {
    const entry = { month, label: formatMonthLabel(month) };
    for (const brand of brands) {
      entry[brand] = brandMonthlyData[brand]?.[month] || 0;
    }
    return entry;
  });
}

/**
 * Build Recharts data from pre-calculated global sosData
 */
export function buildSoSChartData(sosData, allMonths, brands) {
  return allMonths.map(month => {
    const entry = { month, label: formatMonthLabel(month) };
    for (const brand of brands) {
      entry[brand] = parseFloat((sosData[month]?.[brand] || 0).toFixed(2));
    }
    return entry;
  });
}

/**
 * Build dynamic SoS data directly from volume data using only specific brands as the denominator.
 */
export function buildDynamicSoSChartData(brandMonthlyData, allMonths, brands) {
  return allMonths.map(month => {
    const entry = { month, label: formatMonthLabel(month) };
    let total = 0;
    for (const brand of brands) {
      total += (brandMonthlyData[brand]?.[month] || 0);
    }
    for (const brand of brands) {
      const val = brandMonthlyData[brand]?.[month] || 0;
      entry[brand] = total > 0 ? parseFloat(((val / total) * 100).toFixed(2)) : 0;
    }
    return entry;
  });
}

/**
 * Build yearly chart data
 */
export function buildYearlyChartData(yearlyData, brands) {
  return Object.keys(yearlyData).sort().map(year => {
    const entry = { year, label: year };
    for (const brand of brands) {
      entry[brand] = yearlyData[year]?.[brand] || 0;
    }
    return entry;
  });
}

/**
 * Build pie chart data from currentSoS averages
 */
export function buildPieData(currentSoS, brands, colorMap) {
  return brands
    .filter(b => (currentSoS[b] || 0) > 0)
    .map(brand => ({
      name: brand,
      value: parseFloat((currentSoS[brand] || 0).toFixed(2)),
      fill: colorMap[brand],
    }));
}

/**
 * Capitalize brand name nicely
 */
export function capitalizeBrand(brand) {
  if (!brand) return '';
  return brand.split(/[\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get trend direction arrow + color
 */
export function getTrendDisplay(direction) {
  if (direction === 'up') return { arrow: '↑', color: '#30D158', label: 'Growing' };
  if (direction === 'down') return { arrow: '↓', color: '#FF453A', label: 'Declining' };
  return { arrow: '→', color: '#8E8E93', label: 'Stable' };
}

/**
 * Get YoY color class
 */
export function getYoYColor(change) {
  if (change == null) return '#8E8E93';
  if (change > 0) return '#30D158';
  if (change < 0) return '#FF453A';
  return '#8E8E93';
}
