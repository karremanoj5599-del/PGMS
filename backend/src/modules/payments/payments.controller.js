const service = require('./payments.service');
const receiptService = require('./receipt.service');
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

exports.receipt = async (req, res, next) => {
  try {
    const pdfStream = await receiptService.generateReceipt(req.params.id, req.userId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${req.params.id}.pdf`);
    pdfStream.pipe(res);
  } catch (err) {
    console.error('Receipt generation error:', err);
    res.status(err.message === 'Payment not found' ? 404 : 500)
      .json({ error: err.message || 'Failed to generate receipt' });
  }
};
