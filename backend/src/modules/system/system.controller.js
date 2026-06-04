const service = require('./system.service');

exports.getOptions = async (req, res, next) => {
  try {
    const options = await service.getOptions(req.userId);
    res.json(options);
  } catch (err) {
    next(err);
  }
};

exports.updateOptions = async (req, res, next) => {
  try {
    const updated = await service.updateOptions(req.body, req.userId);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.runMigrations = async (req, res, next) => {
  try {
    const db = require('../../config/database');
    await db.migrate.latest();
    res.json({ success: true, message: 'Database migrations completed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
};
