const service = require('./payments.service');
const accessService = require('../access-control/access.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.getAll(req.userId)); } catch (err) { res.status(500).json({ error: 'Failed to fetch payments' }); }
};

exports.status = async (req, res, next) => {
  try { res.json(await service.getStatus(req.userId)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { payment, tenant_id } = await service.create(req.body, req.userId);
    // Trigger hardware sync after payment
    // Only toggle Enabled=1 — templates are already on the device
    await accessService.syncTenantAccess(tenant_id, true);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add payment' });
  }
};
