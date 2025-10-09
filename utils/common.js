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

module.exports = { queryToDateRange };