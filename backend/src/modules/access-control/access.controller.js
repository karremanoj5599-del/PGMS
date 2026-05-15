const service = require('./access.service');

exports.toggle = async (req, res, next) => {
  try {
    const { tenant_id } = req.params;
    const { access_granted } = req.body;
    await service.toggleAccess(tenant_id, access_granted);
    res.json({ message: 'Access updated manually and synced to hardware' });
  } catch (err) { next(err); }
};

exports.assignSchedule = async (req, res, next) => {
  try {
    const tid = Number(req.params.tenant_id);
    const sid = Number(req.body.schedule_id);
    if (isNaN(tid) || isNaN(sid)) return res.status(400).json({ error: 'Invalid Tenant or Schedule ID' });
    await service.assignSchedule(tid, sid);
    res.json({ message: 'Schedule assigned and synced to device' });
  } catch (err) { next(err); }
};

exports.assignGroup = async (req, res, next) => {
  try {
    const tid = Number(req.params.tenant_id);
    if (isNaN(tid)) return res.status(400).json({ error: 'Invalid Tenant ID' });
    await service.assignGroup(tid, req.body.access_group_id);
    res.json({ message: 'Access Group assigned and synced' });
  } catch (err) { next(err); }
};
