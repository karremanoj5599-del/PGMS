const service = require('./beds.service');

exports.list = async (req, res, next) => {
  try { res.json(await service.getAll(req.userId)); } catch (err) { next(err); }
};

exports.listVacant = async (req, res, next) => {
  try { res.json(await service.getVacant(req.userId)); } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { room_id, bed_number } = req.body;
    if (!room_id) return res.status(400).json({ error: 'Room ID is required' });
    if (!bed_number) return res.status(400).json({ error: 'Bed number/label is required' });

    const results = await service.create(req.body, req.userId);
    if (results.length === 0) {
      return res.status(400).json({ error: 'Bed(s) already exist or room capacity reached' });
    }
    res.json(results.length === 1 ? results[0] : { message: `Added ${results.length} beds`, beds: results });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid Bed ID' });
    const bed = await service.update(id, req.body, req.userId);
    res.json(bed);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid Bed ID' });
    await service.remove(id, req.userId);
    res.json({ message: 'Bed deleted successfully' });
  } catch (err) { next(err); }
};
