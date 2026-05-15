// Bulk input parsers for batch creation of rooms and beds

/**
 * Parse room number input — supports comma-separated list or numeric range
 * Examples: "101, 102, 103" or "101-110"
 */
const parseRoomBatch = (input) => {
  if (input.includes('-')) {
    const [start, end] = input.split('-').map(s => parseInt(s.trim()));
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString());
    }
  }
  return input.split(',').map(r => r.trim()).filter(r => r);
};

/**
 * Parse bed label input — supports list, numeric range, char range, or count
 * Examples: "A, B", "1-6", "A-F", or "6" (creates 1 to 6)
 */
const parseBedBatch = (input) => {
  const s = input.toString().trim();
  // 1. Numeric Range: 1-6
  if (s.includes('-') && /^\d+-\d+$/.test(s)) {
    const [start, end] = s.split('-').map(Number);
    return Array.from({ length: end - start + 1 }, (_, i) => (start + i).toString());
  }
  // 2. Char Range: A-D
  if (s.includes('-') && /^[A-Z]-[A-Z]$/i.test(s)) {
    const [start, end] = s.toUpperCase().split('-').map(c => c.charCodeAt(0));
    return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
  }
  // 3. Simple Count: 6 (creates 1 to 6)
  if (/^\d+$/.test(s) && parseInt(s) <= 20) {
    return Array.from({ length: parseInt(s) }, (_, i) => (i + 1).toString());
  }
  // 4. Comma List
  return s.split(',').map(b => b.trim()).filter(b => b);
};

module.exports = { parseRoomBatch, parseBedBatch };
