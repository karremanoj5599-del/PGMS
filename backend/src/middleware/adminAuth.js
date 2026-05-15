// Admin API key authentication middleware
const config = require('../config');

const isAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'];
  if (apiKey === config.adminApiKey) {
    return next();
  }
  res.status(403).json({ error: 'Unauthorized: Admin access required' });
};

module.exports = { isAdmin };
