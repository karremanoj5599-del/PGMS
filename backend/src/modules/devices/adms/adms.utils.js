/**
 * ADMS Protocol Utility Functions
 * Centralizes common logic for device communication to ensure consistency and protocol compliance.
 */

/**
 * Extract and trim the device Serial Number from various possible locations (query params or headers).
 * @param {import('express').Request} req 
 * @returns {string} The trimmed Serial Number or an empty string.
 */
const extractSN = (req) => {
  const { SN, sn: snParam } = req.query;
  const snHeader = req.headers['x-device-sn'] || req.headers['sn'];
  return (SN || snParam || snHeader || '').toString().trim();
};

/**
 * Extract Command ID from request query or body, handling various possible casings.
 * @param {import('express').Request} req 
 * @returns {string|null} The Command ID or null if not found.
 */
const getCommandId = (req) => {
  const { ID, id, cmdid, CmdID, CMDID } = { ...req.query, ...(req.body || {}) };
  return ID || id || cmdid || CmdID || CMDID || null;
};

/**
 * Send a standardized ADMS response with correct headers and line endings.
 * @param {import('express').Response} res 
 * @param {string} content - The content to send (defaults to 'OK').
 * @param {number} status - HTTP status code (defaults to 200).
 */
const sendADMSResponse = (res, content = 'OK', status = 200) => {
  res.set('Content-Type', 'text/plain');
  // Ensure the response ends with \r\n as expected by many firmware versions
  const responseText = content.endsWith('\r\n') ? content : `${content}\r\n`;
  res.status(status).send(responseText);
};

/**
 * Safely extract raw body, handling Vercel Serverless Function automatic urlencoded parsing.
 * @param {import('express').Request} req 
 * @returns {string} The raw body string.
 */
const extractRawBody = (req) => {
  if (!req.body) return '';
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (typeof req.body === 'object') {
    const lines = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === '') {
            lines.push(key);
          } else {
            lines.push(`${key}=${item}`);
          }
        }
      } else {
        if (value === '') {
          lines.push(key);
        } else {
          lines.push(`${key}=${value}`);
        }
      }
    }
    return lines.join('\n');
  }
  return String(req.body);
};

module.exports = {
  extractSN,
  getCommandId,
  sendADMSResponse,
  extractRawBody
};
