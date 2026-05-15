// Helper to convert empty strings or 'null' strings to real null for DB
const toNull = (val) => (val === '' || val === 'null' || val === undefined) ? null : val;

module.exports = { toNull };
