/**
 * SoS Calculations — all pure functions, no side effects
 * These functions transform raw API data into analysis-ready structures.
 *
 * Real keywordtool.io v2 API response per keyword:
 * {
 *   string: "keyword text",
 *   volume: 2740000,              // avg monthly volume
 *   m1: 2740000, m1_month: 12, m1_year: 2025,
 *   m2: ..., m2_month: ..., m2_year: ...,  (up to m48)
 *   trend: -0.33,                 // single float, NOT an array
 *   cpc: 0.3,
 *   cmp: 0.85,
 *   top_of_page_bid_low: ...,
 *   top_of_page_bid_high: ...,
 * }
 */

/**
 * Extract monthly time-series from a single API keyword result.
 * Reads m1...m48 + m1_month/m1_year fields and returns { "YYYY-MM": volume } map.
 */
function extractMonthlyData(kwData) {
  const monthly = {};
  for (let i = 1; i <= 48; i++) {
    const vol = kwData[`m${i}`];
    const month = kwData[`m${i}_month`];
    const year = kwData[`m${i}_year`];
    if (vol != null && month != null && year != null) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + Number(vol);
    }
  }
  return monthly;
}

/**
 * Process raw API results into grouped brand monthly data.
 * @param {Object} apiResults - results from API keyed by keyword string
 * @param {Object} tagMap - { tagName: [keyword, ...] }
 * @returns {Object} brandMonthlyData = { brandName: { "2022-01": 12000, ... } }
 */
export function processApiResults(apiResults, tagMap) {
  const brandMonthlyData = {};

  for (const [tag, keywords] of Object.entries(tagMap)) {
    brandMonthlyData[tag] = {};

    for (const keyword of keywords) {
      const kwData = apiResults[keyword];
      if (!kwData || typeof kwData !== 'object') continue;

      // Extract monthly breakdown from m1...m48 fields
      const monthly = extractMonthlyData(kwData);

      for (const [monthKey, value] of Object.entries(monthly)) {
        brandMonthlyData[tag][monthKey] = (brandMonthlyData[tag][monthKey] || 0) + value;
      }
    }
  }

  return brandMonthlyData;
}

/**
 * Calculate Share of Search % per brand per month.
 * 'generic' tag is excluded from the SoS denominator by default.
 * @param {Object} brandMonthlyData
 * @param {string[]} excludeTags - tags to exclude from % calculation
 * @returns {{ sosData, allMonths, brands }}
 */
export function calculateSoS(brandMonthlyData, excludeTags = ['generic']) {
  const allMonths = [...new Set(
    Object.values(brandMonthlyData).flatMap(m => Object.keys(m))
  )].sort();

  const brands = Object.keys(brandMonthlyData).filter(b => !excludeTags.includes(b));

  // sosData = { "2022-01": { sleepwell: 42.3, wakefit: 28.1, ... }, ... }
  const sosData = {};
  for (const month of allMonths) {
    const totals = {};
    let grandTotal = 0;
    for (const brand of brands) {
      totals[brand] = brandMonthlyData[brand]?.[month] || 0;
      grandTotal += totals[brand];
    }
    sosData[month] = {};
    for (const brand of brands) {
      sosData[month][brand] = grandTotal > 0 ? (totals[brand] / grandTotal) * 100 : 0;
    }
  }

  return { sosData, allMonths, brands };
}

/**
 * Group monthly volume by year (sum all months in each year per brand)
 * @param {Object} brandMonthlyData
 * @returns {Object} { "2022": { sleepwell: 1200000, wakefit: 800000 }, ... }
 */
export function groupByYear(brandMonthlyData) {
  const years = {};
  for (const [brand, monthData] of Object.entries(brandMonthlyData)) {
    for (const [month, value] of Object.entries(monthData)) {
      const year = month.substring(0, 4);
      if (!years[year]) years[year] = {};
      if (!years[year][brand]) years[year][brand] = 0;
      years[year][brand] += value;
    }
  }
  return years;
}

/**
 * Filter brandMonthlyData to only the last N months
 */
export function getLastNMonths(brandMonthlyData, n = 12) {
  const allMonths = [...new Set(
    Object.values(brandMonthlyData).flatMap(m => Object.keys(m))
  )].sort().slice(-n);

  const filtered = {};
  for (const [brand, data] of Object.entries(brandMonthlyData)) {
    filtered[brand] = {};
    for (const month of allMonths) {
      filtered[brand][month] = data[month] || 0;
    }
  }
  return filtered;
}

/**
 * Calculate current SoS (average of last N months for pie chart display)
 */
export function calculateCurrentSoS(sosData, allMonths, brands, windowSize = 3) {
  // If windowSize is 'lifetime', use all months
  const selectedMonths = windowSize === 'lifetime' ? allMonths : allMonths.slice(-windowSize);
  const avgSoS = {};
  for (const brand of brands) {
    const vals = selectedMonths.map(m => sosData[m]?.[brand] || 0);
    avgSoS[brand] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  }
  return avgSoS;
}

/**
 * Dynamically calculate current SoS based strictly on a subset of visible brands.
 * Computes SoS by summing volume of visible brands instead of relying on global sosData.
 */
export function calculateDynamicCurrentSoS(brandMonthlyData, allMonths, brands, windowSize = 3) {
  const selectedMonths = windowSize === 'lifetime' ? allMonths : allMonths.slice(-windowSize);
  const avgSoS = {};
  
  let grandTotal = 0;
  const brandTotals = {};
  for (const brand of brands) {
    brandTotals[brand] = 0;
    for (const m of selectedMonths) {
      brandTotals[brand] += (brandMonthlyData[brand]?.[m] || 0);
    }
    grandTotal += brandTotals[brand];
  }
  
  for (const brand of brands) {
    avgSoS[brand] = grandTotal > 0 ? (brandTotals[brand] / grandTotal) * 100 : 0;
  }
  
  return avgSoS;
}

export function calculateRollingAverage(brandMonthlyData, brands, windowSize = 3, mode = 'sos') {
  const allMonths = [...new Set(
    Object.values(brandMonthlyData).flatMap(m => Object.keys(m))
  )].sort();

  const rollingData = {};

  for (const month of allMonths) {
    const monthIdx = allMonths.indexOf(month);
    const windowMonths = allMonths.slice(Math.max(0, monthIdx - windowSize + 1), monthIdx + 1);

    let grandTotal = 0;
    const totals = {};
    for (const brand of brands) {
      totals[brand] = windowMonths.reduce((sum, m) => sum + (brandMonthlyData[brand]?.[m] || 0), 0);
      grandTotal += totals[brand];
    }

    rollingData[month] = {};
    for (const brand of brands) {
      if (mode === 'absolute') {
        rollingData[month][brand] = totals[brand] / windowMonths.length;
      } else {
        rollingData[month][brand] = grandTotal > 0 ? (totals[brand] / grandTotal) * 100 : 0;
      }
    }
  }

  return { rollingData, allMonths };
}

/**
 * Simple linear regression for trend forecasting
 */
export function linearRegression(values) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0, predict: (x) => values[0] || 0 };

  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * values[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x) => Math.max(0, slope * x + intercept),
  };
}

/**
 * Forecast N months forward using Seasonal Naive approach with a trend multiplier.
 * This is much better for search volume data which is highly seasonal.
 */
export function forecastBrandData(brandMonthlyData, brands, forecastMonths = 6) {
  const allMonths = [...new Set(
    Object.values(brandMonthlyData).flatMap(m => Object.keys(m))
  )].sort();

  const lastMonth = allMonths[allMonths.length - 1];
  const futureMonths = [];
  let [year, month] = lastMonth.split('-').map(Number);
  for (let i = 0; i < forecastMonths; i++) {
    month++;
    if (month > 12) { month = 1; year++; }
    futureMonths.push(`${year}-${String(month).padStart(2, '0')}`);
  }

  const forecastData = {};
  const window24 = allMonths.slice(-24);

  for (const brand of brands) {
    const vals = window24.map(m => brandMonthlyData[brand]?.[m] || 0);
    const { predict } = linearRegression(vals);
    
    forecastData[brand] = {};
    for (let i = 0; i < futureMonths.length; i++) {
      if (vals.length >= 12) {
        // Find the value from exactly 12 months before this forecasted month
        const monthsAgoIdx = vals.length - 12 + (i % 12);
        const seasonalVal = vals[monthsAgoIdx] || vals[vals.length - 1];
        
        // Calculate short-term trend (last 6 months vs previous 6 months)
        const recent6 = vals.slice(-6).reduce((a, b) => a + b, 0);
        const prior6 = vals.slice(-12, -6).reduce((a, b) => a + b, 0);
        let trendMultiplier = prior6 > 0 ? recent6 / prior6 : 1;
        
        // Bound the multiplier to prevent exponential explosion or crashing to 0
        trendMultiplier = Math.max(0.8, Math.min(1.2, trendMultiplier));
        
        forecastData[brand][futureMonths[i]] = Math.max(0, seasonalVal * trendMultiplier);
      } else {
        // Fallback to linear regression if we have less than a year of data
        forecastData[brand][futureMonths[i]] = predict(vals.length + i);
      }
    }
  }

  return { forecastData, forecastMonths: futureMonths };
}

/**
 * Calculate year-over-year change percentage for a brand
 */
export function calculateYoY(yearlyData, brand) {
  const years = Object.keys(yearlyData).sort();
  const result = {};

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const volume = yearlyData[year]?.[brand] || 0;
    const prevVolume = i > 0 ? (yearlyData[years[i - 1]]?.[brand] || 0) : null;
    const yoyChange = prevVolume != null && prevVolume > 0
      ? ((volume - prevVolume) / prevVolume) * 100
      : null;

    result[year] = { volume, yoyChange };
  }

  return result;
}

/**
 * Determine trend direction: 'up', 'down', or 'flat'
 */
export function getTrendDirection(sosData, allMonths, brand, threshold = 2) {
  if (allMonths.length < 6) return 'flat';
  const last3 = allMonths.slice(-3).map(m => sosData[m]?.[brand] || 0);
  const prev3 = allMonths.slice(-6, -3).map(m => sosData[m]?.[brand] || 0);
  const lastAvg = last3.reduce((a, b) => a + b, 0) / 3;
  const prevAvg = prev3.reduce((a, b) => a + b, 0) / 3;
  const diff = lastAvg - prevAvg;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'flat';
}

/**
 * Determine dynamic trend direction based strictly on visible brands.
 */
export function getDynamicTrendDirection(brandMonthlyData, allMonths, displayBrands, targetBrand, threshold = 2) {
  if (allMonths.length < 6) return 'flat';
  
  const last6Months = allMonths.slice(-6);
  const monthSos = {};
  
  for (const month of last6Months) {
    let total = 0;
    for (const b of displayBrands) {
      total += (brandMonthlyData[b]?.[month] || 0);
    }
    const val = brandMonthlyData[targetBrand]?.[month] || 0;
    monthSos[month] = total > 0 ? (val / total) * 100 : 0;
  }

  const last3 = last6Months.slice(-3).map(m => monthSos[m]);
  const prev3 = last6Months.slice(-6, -3).map(m => monthSos[m]);
  const lastAvg = last3.reduce((a, b) => a + b, 0) / 3;
  const prevAvg = prev3.reduce((a, b) => a + b, 0) / 3;
  const diff = lastAvg - prevAvg;
  
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'flat';
}

/**
 * Build competitor status string based on SoS and growth comparison
 */
export function getCompetitorStatus(myCurrentSoS, theirCurrentSoS, myYoY, theirYoY) {
  const iAhead = myCurrentSoS > theirCurrentSoS;
  const iGrowing = (myYoY || 0) > 0;
  const theyFasterGrowth = (theirYoY || 0) > (myYoY || 0);

  if (iAhead && iGrowing && !theyFasterGrowth) return { text: 'You are AHEAD and growing', color: 'green' };
  if (iAhead && theyFasterGrowth) return { text: 'You are AHEAD but competitor is closing gap', color: 'orange' };
  if (!iAhead && iGrowing && !theyFasterGrowth) return { text: 'You are BEHIND but catching up', color: 'blue' };
  return { text: 'You are BEHIND and gap is widening', color: 'red' };
}

/**
 * Generate auto text insights for competitor page
 */
export function generateInsights(brandMonthlyData, sosData, allMonths, brands, myBrand) {
  const insights = [];
  const yearlyData = groupByYear(brandMonthlyData);
  const years = Object.keys(yearlyData).sort();
  const currentSoS = calculateCurrentSoS(sosData, allMonths, brands);

  // Top brand
  const topBrand = brands.reduce((a, b) => (currentSoS[a] || 0) > (currentSoS[b] || 0) ? a : b, brands[0]);
  insights.push(`${topBrand} holds the largest share of search at ${currentSoS[topBrand]?.toFixed(1)}%`);

  // Fastest growing
  if (years.length >= 2) {
    const prevYear = years[years.length - 2];
    const currYear = years[years.length - 1];
    let fastestBrand = null, fastestGrowth = -Infinity;
    for (const brand of brands) {
      const prev = yearlyData[prevYear]?.[brand] || 0;
      const curr = yearlyData[currYear]?.[brand] || 0;
      if (prev > 0) {
        const growth = ((curr - prev) / prev) * 100;
        if (growth > fastestGrowth) { fastestGrowth = growth; fastestBrand = brand; }
      }
    }
    if (fastestBrand && fastestGrowth !== -Infinity) {
      insights.push(`${fastestBrand} has grown ${fastestGrowth.toFixed(1)}% YoY — the fastest in this category`);
    }

    // Declining brands
    for (const brand of brands) {
      const prev = yearlyData[prevYear]?.[brand] || 0;
      const curr = yearlyData[currYear]?.[brand] || 0;
      if (prev > 0) {
        const change = ((curr - prev) / prev) * 100;
        if (change < -5) {
          insights.push(`${brand} has declined ${Math.abs(change).toFixed(1)}% YoY suggesting market share loss`);
        }
      }
    }
  }

  // Category total growth
  const allBrandsTotal = allMonths.slice(-12).reduce((sum, m) => {
    return sum + brands.reduce((s, b) => s + (brandMonthlyData[b]?.[m] || 0), 0);
  }, 0);
  const prevTotal = allMonths.slice(-24, -12).reduce((sum, m) => {
    return sum + brands.reduce((s, b) => s + (brandMonthlyData[b]?.[m] || 0), 0);
  }, 0);
  if (prevTotal > 0) {
    const catGrowth = ((allBrandsTotal - prevTotal) / prevTotal) * 100;
    insights.push(`Category total search volume ${catGrowth >= 0 ? 'grew' : 'declined'} ${Math.abs(catGrowth).toFixed(0)}% in the last 12 months`);
  }

  return insights;
}
