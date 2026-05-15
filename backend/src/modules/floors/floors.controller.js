const service = require('./floors.service');

exports.list = async (req, res, next) => {
  try {
    const floors = await service.getAll(req.userId);
    res.json(floors);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { floor_name } = req.body;
    if (!floor_name) return res.status(400).json({ error: 'Floor name is required' });

    const floorNames = floor_name.split(',').map(n => n.trim()).filter(n => n);
    const results = await service.create(floorNames, req.userId);

    if (results.length === 0) {
      return res.status(400).json({ error: 'Floor(s) already exist or no valid names provided' });
    }
    res.json(results.length === 1 ? results[0] : { message: `Added ${results.length} floors`, floors: results });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const floor = await service.update(req.params.id, req.body.floor_name, req.userId);
    res.json(floor);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid Floor ID' });
    await service.remove(id, req.userId);
    res.json({ message: 'Floor deleted successfully' });
  } catch (err) { next(err); }
};
