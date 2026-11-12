/**
 * Utility to generate RFC 4180 compliant CSV strings from headers and row data
 */

function escapeCSVField(val) {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If string contains comma, double-quote, or newline, escape double-quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Convert columns and records into a CSV string
 * @param {Array<{ key: string, label: string, format?: Function }>} columns 
 * @param {Array<Object>} records 
 * @returns {string} RFC 4180 CSV
 */
function createCSV(columns, records) {
  const headerRow = columns.map((col) => escapeCSVField(col.label)).join(',');
  const dataRows = records.map((record) => {
    return columns
      .map((col) => {
        let val;
        if (typeof col.format === 'function') {
          val = col.format(record);
        } else {
          val = record[col.key];
        }
        return escapeCSVField(val);
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Express helper to send CSV response with proper headers
 * @param {Object} res - Express response
 * @param {string} filename - Filename for attachment
 * @param {Array} columns 
 * @param {Array} records 
 */
function sendCSVResponse(res, filename, columns, records) {
  const csvContent = createCSV(columns, records);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvContent);
}

module.exports = {
  escapeCSVField,
  createCSV,
  sendCSVResponse
};

