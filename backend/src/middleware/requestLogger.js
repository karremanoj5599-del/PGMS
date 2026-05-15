// ADMS protocol debug logging middleware and helper
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Middleware: log all /iclock requests
const admsDebugLogger = (req, res, next) => {
  if (req.url.toLowerCase().includes('iclock')) {
    console.log(`[ADMS DEBUG] ${req.method} ${req.url}`);

    if (!config.isVercel) {
      const now = new Date().toISOString();
      const logMsg = `[${now}] DEBUG: ${req.method} ${req.url}\nHeaders: ${JSON.stringify(req.headers)}\n-------------------\n`;
      try {
        fs.appendFileSync(path.join(__dirname, '../../adms_packets.log'), logMsg);
      } catch (err) {
        // Silently fail on read-only FS
      }
    }
  }
  next();
};

// Helper to log ADMS traffic to file
const logADMS = (req, msg, data = '') => {
  if (config.isVercel) {
    const dataStr = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : '';
    console.log(`[ADMS] ${req.method} ${req.url} - ${msg} ${dataStr.substring(0, 500)}`);
    return;
  }
  const logPath = path.join(__dirname, '../../adms_packets.log');
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.url}\n${msg}\n${data ? 'Data: ' + data.substring(0, 500) + '\n' : ''}-------------------\n`;
  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error('[ADMS] Failed to write log:', err.message);
  }
  console.log(logEntry);
};

module.exports = { admsDebugLogger, logADMS };
