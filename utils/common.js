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
    pageViews: item.pageViews
  }));
}
module.exports = { queryToDateRange, getYearDateRange, formatMonthlyDataForChart };