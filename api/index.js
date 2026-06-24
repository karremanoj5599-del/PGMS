// Vercel Entry Point
// This file bridges Vercel Serverless Functions to your Express backend
let app;
try {
  app = require('../backend/src/app');
  
  // Dummy requires to ensure Vercel Node File Trace (NFT) bundles these drivers
  // Since Knex requires them dynamically, Vercel sometimes misses them.
  if (false) {
    require('pg');
    require('sqlite3');
  }
} catch (err) {
  // If the backend fails to load, export a fallback handler that returns the error
  app = (req, res) => {
    res.status(500).json({
      error: 'Backend Startup Error',
      message: err.message,
      stack: err.stack
    });
  };
}

module.exports = app;
