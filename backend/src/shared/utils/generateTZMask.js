// Helper to generate a 16-hex character TZ bitmask string (64 bits)
// Used by ZKTeco ADMS protocol for timezone assignment
const generateTZMask = (tzId) => {
  if (!tzId || tzId <= 0) return "0000000000000000";
  let mask = BigInt(1) << BigInt(tzId - 1);
  return mask.toString(16).padStart(16, '0').toUpperCase();
};

module.exports = { generateTZMask };
