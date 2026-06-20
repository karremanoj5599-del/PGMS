const service = require('./staff.service');
const { toggleStaffAccess, syncStaffAccess } = require('../access-control/access.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.getAll(req.userId)); } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try { res.json(await service.getSummary(req.userId)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const staff = await service.create(req.body, req.userId);
    res.json(staff);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const staff = await service.update(req.params.id, req.body, req.userId);
    res.json(staff);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.userId);
    res.json({ message: 'Staff deleted' });
  } catch (err) { next(err); }
};

exports.bulkRemove = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const deleted = await service.bulkRemove(ids, req.userId);
    res.json({ message: `${deleted} staff member(s) deleted` });
  } catch (err) { next(err); }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const logs = await service.getAttendance(req.params.id, req.userId);
    res.json(logs);
  } catch (err) { next(err); }
};

exports.setPin = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required' });
    await service.setPin(req.params.id, pin, req.userId);
    res.json({ success: true, message: 'Biometric PIN updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update PIN' }); }
};

exports.toggleAccess = async (req, res, next) => {
  try {
    const { access_granted } = req.body;
    await toggleStaffAccess(req.params.id, access_granted);
    res.json({ message: 'Staff access updated' });
  } catch (err) { next(err); }
};
