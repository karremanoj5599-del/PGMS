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
    await accessService.syncTenantAccess(tenant_id);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add payment' });
  }
};
