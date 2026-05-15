const service = require('./tickets.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.getAll(req.userId)); }
  catch (err) { res.status(500).json({ error: 'Failed to fetch tickets' }); }
};

exports.update = async (req, res, next) => {
  try {
    await service.update(req.params.id, req.body, req.userId);
    res.json({ success: true, message: 'Ticket updated' });
  } catch (err) { res.status(500).json({ error: 'Failed to update ticket' }); }
};
