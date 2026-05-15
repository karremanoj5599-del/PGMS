const service = require('./rooms.service');

exports.list = async (req, res, next) => {
  try {
    const rooms = await service.getAll(req.userId);
    res.json(rooms);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { floor_id, room_number, sharing_capacity } = req.body;
    if (!room_number) return res.status(400).json({ error: 'Room number is required' });

    const results = await service.create(floor_id, room_number, sharing_capacity, req.userId);
    if (results.length === 0) {
      return res.status(400).json({ error: 'Room(s) already exist or invalid input' });
    }
    res.json(results.length === 1 ? results[0] : { message: `Added ${results.length} rooms`, rooms: results });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid Room ID' });
    const room = await service.update(id, req.body, req.userId);
    res.json(room);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid Room ID' });
    await service.remove(id, req.userId);
    res.json({ message: 'Room deleted successfully' });
  } catch (err) { next(err); }
};
