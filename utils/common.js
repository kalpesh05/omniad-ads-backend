/**
 * Converts query string into date range for GA4 API
 * Supports: 'last-7-days', 'last-30-days', 'last-90-days', 'last-year'
 * @param {string} query - e.g. 'last-7-days'
 * @returns {{startDate: string, endDate: string}} date range in 'YYYY-MM-DD' format
 */
function queryToDateRange(query) {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);

  let startDate;
  switch (query) {
    case 'last-7-days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 6); // inclusive of today
      break;
    case 'last-30-days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 29);
      break;
    case 'last-90-days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 89);
      break;
    case 'last-year':
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      throw new Error("Unsupported period: " + query);
  }
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate
  };
}

/***
 * Get date range for a year
 * @param {number} year
 * @returns {{startDate: string, endDate: string}}
 */
function getYearDateRange(year) {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

/**
 * Converts raw GA4 monthly data to chart format
 * @param {MonthlyMetric[]} data - Array from getGA4MonthlyMetrics
 * @returns {Array<{month: string; sessions: number; users: number; pageViews: number}>}
 */
function formatMonthlyDataForChart(data) {
  // Map month numbers to abbreviations
  const monthAbbr = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Create chart array
  return data.map(item => ({
    month: monthAbbr[parseInt(item.month, 10) - 1], // '1' -> Jan, etc.
    sessions: item.sessions,
    users: item.users,
    pageviews: item.pageViews
  }));
}
function sortMonthlyChartData(monthlyData) {
  // Map month abbreviations to index
  const monthOrder = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  return monthlyData.sort((a, b) => monthOrder[a.month] - monthOrder[b.month]);
}

function formatDeviceDistributionForChart(deviceMetrics) {
  const colorMap = {
    desktop: 'hsl(var(--primary))',
    mobile: 'hsl(var(--accent))',
    tablet: 'hsl(var(--chart-2))',
    smarttv: 'hsl(var(--chart-3))',
  };

  // Map deviceCategory from GA4 to formatted name & color
  const nameMap = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablet',
    smarttv: 'Smart Tv',
  };

  // Output in [ { name, value, color } ] format
  return deviceMetrics.map(device => ({
    name: nameMap[device.deviceCategory.replace(" ","").toLowerCase()] || device.deviceCategory,
    sessions: device.sessions,
    color: colorMap[device.deviceCategory.replace(" ","").toLowerCase()] || 'hsl(var(--primary))'
  }));
}

/**
 * Adds percentage field to each object in an array, based on their 'count' or 'value' property.
 * @param {Array} data - Array of objects with 'count' or 'value'
 * @param {String} field - Field to base percentage (default: 'count')
 * @returns {Array} - New array with 'percentage' field added
 */
function addPercentageToData(data, field = 'count') {
  const total = data.reduce((sum, item) => sum + Number(item[field] ?? 0), 0);
  // Output new array with percentage field
  return data.map(item => ({
    ...item,
    value: total ? Number(((Number(item[field] ?? 0) / total) * 100).toFixed(2)) : 0
  }));
}



module.exports = { queryToDateRange, getYearDateRange, formatMonthlyDataForChart, sortMonthlyChartData, formatDeviceDistributionForChart, addPercentageToData };