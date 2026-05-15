const service = require('./reports.service');

exports.stats = async (req, res, next) => {
  try { res.json(await service.getStats(req.userId, req.query.startDate, req.query.endDate)); }
  catch (err) { next(err); }
};

exports.tenantWise = async (req, res, next) => {
  try { res.json(await service.getTenantWise(req.userId, req.query)); }
  catch (err) { next(err); }
};

exports.tenantAttendance = async (req, res, next) => {
  try { res.json(await service.getTenantAttendance(req.userId, req.query)); }
  catch (err) {
    console.error('Tenant Attendance Report Error:', err);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
};

exports.transactions = async (req, res, next) => {
  try { res.json(await service.getTransactions(req.userId, req.query)); }
  catch (err) { next(err); }
};
