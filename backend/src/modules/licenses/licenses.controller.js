const service = require('./licenses.service');

exports.list = async (req, res, next) => {
  try {
    const db = require('../../config/database');
    const licenses = await db('licenses')
      .join('users', 'licenses.user_id', 'users.user_id')
      .select('licenses.*', 'users.email')
      .orderBy('licenses.created_at', 'desc');
    res.json(licenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
};

exports.create = async (req, res, next) => {
  try {
    const { email, product_id, max_activations, duration_months, max_tenants } = req.body;
    const license = await service.issueLicense(email, product_id, max_activations, duration_months, max_tenants);
    res.json(license);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
