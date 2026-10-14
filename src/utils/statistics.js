const allowedGroupings = new Set(['day', 'week', 'month']);

const parseDate = (value, fieldName, endOfDay = false) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid ISO-8601 date`);
    error.statusCode = 400;
    throw error;
  }

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
};

export const parseStatisticsQuery = (query = {}) => {
  const groupBy = query.groupBy || 'day';
  if (!allowedGroupings.has(groupBy)) {
    const error = new Error('groupBy must be one of: day, week, month');
    error.statusCode = 400;
    throw error;
  }

  const from = parseDate(query.from, 'from');
  const to = parseDate(query.to, 'to', true);

  if (from && to && from > to) {
    const error = new Error('from must be earlier than or equal to to');
    error.statusCode = 400;
    throw error;
  }

  return { from, to, groupBy };
};

export const buildCreatedAtFilter = ({ from, to }) => {
  if (!from && !to) return undefined;

  return {
    ...(from && { $gte: from }),
    ...(to && { $lte: to }),
  };
};
