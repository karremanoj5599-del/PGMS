// Tenant mobile app authentication middleware
const db = require('../config/database');

const tenantAuth = async (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    return res.status(401).json({ error: 'Access denied. Missing tenant identifier.' });
  }

  try {
    const tenant = await db('tenants').where('tenant_id', tenantId).first();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant record not found.' });
    }
    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('Tenant Auth Error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { tenantAuth };
