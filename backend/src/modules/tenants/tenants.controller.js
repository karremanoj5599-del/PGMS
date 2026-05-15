const service = require('./tenants.service');
const { syncTenantAccess } = require('../access-control/access.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.getAll(req.userId)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const newId = await service.create(req.body, req.userId);
    await syncTenantAccess(newId);
    const tenant = await require('../../config/database')('tenants').where('tenant_id', newId).first();
    res.json(tenant);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const tenant = await service.update(req.params.id, req.body, req.userId);
    await syncTenantAccess(req.params.id);
    res.json(tenant);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.userId);
    res.json({ message: 'Tenant deleted' });
  } catch (err) { next(err); }
};

exports.bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Invalid tenant IDs' });
    const count = await service.bulkDelete(ids, req.userId);
    res.json({ message: `Deleted ${count} tenant(s)` });
  } catch (err) { next(err); }
};

exports.revoke = async (req, res, next) => {
  try {
    await service.revokeTenant(req.params.id, req.userId);
    res.json({ message: 'Tenant revoked and access removed from devices' });
  } catch (err) { next(err); }
};

exports.setPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required' });
    await service.setPin(req.params.id, pin, req.userId);
    await syncTenantAccess(req.params.id);
    res.json({ success: true, message: 'Mobile access enabled/updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update PIN' }); }
};
