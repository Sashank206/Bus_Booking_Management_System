const AppError = require('./appError');

/**
 * Parse date range query parameters into a Mongoose date filter
 * Supports presets: 'today', '7days', '30days', 'this_month', 'prev_month', 'custom'
 * Or direct 'startDate' and 'endDate' query parameters.
 * 
 * @param {Object} query - Express req.query
 * @param {string} fieldName - Field to apply filter on (default 'createdAt')
 * @returns {{ filter: Object, rangeInfo: { label: string, start: Date|null, end: Date|null } }}
 */
function parseDateRange(query = {}, fieldName = 'createdAt') {
  const { range, startDate, endDate } = query;
  const now = new Date();
  let start = null;
  let end = null;
  let label = 'all_time';

  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    label = 'today';
  } else if (range === '7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    end = new Date(now);
    label = 'last_7_days';
  } else if (range === '30days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    end = new Date(now);
    label = 'last_30_days';
  } else if (range === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    label = 'this_month';
  } else if (range === 'prev_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    label = 'previous_month';
  } else if (startDate || endDate || range === 'custom') {
    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw new AppError('Invalid startDate format. Must be a valid ISO date.', 400);
      }
    }
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw new AppError('Invalid endDate format. Must be a valid ISO date.', 400);
      }
      // If no time is set on endDate (e.g., YYYY-MM-DD), set to end of day
      if (typeof endDate === 'string' && endDate.length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
    }
    if (start && end && start > end) {
      throw new AppError('startDate cannot be greater than endDate.', 400);
    }
    label = 'custom';
  }

  const filter = {};
  if (start || end) {
    filter[fieldName] = {};
    if (start) filter[fieldName].$gte = start;
    if (end) filter[fieldName].$lte = end;
  }

  return {
    filter,
    start,
    end,
    label
  };
}

module.exports = {
  parseDateRange
};

