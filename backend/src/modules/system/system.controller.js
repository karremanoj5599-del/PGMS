const service = require('./system.service');
const activityService = require('./activity.service');

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

exports.getLogs = async (req, res, next) => {
  try {
    const logs = await activityService.getLogs(req.userId, req.query);
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.sseStream = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
  
  activityService.addClient(req.userId, res);
};
