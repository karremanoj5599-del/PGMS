const service = require('./communication.service');

exports.getSettings = async (req, res) => {
  try {
    const settings = await service.getSettings(req.userId);
    res.json(settings);
  } catch (err) {
    console.error('[Communication] Get settings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch communication settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await service.updateSettings(req.userId, req.body);
    res.json({ message: 'Communication settings updated successfully', settings });
  } catch (err) {
    console.error('[Communication] Update settings error:', err.message);
    res.status(500).json({ error: 'Failed to update communication settings' });
  }
};

exports.getTenantPreferences = async (req, res) => {
  try {
    const prefs = await service.getTenantPreferences(req.userId, req.params.tenantId);
    res.json(prefs);
  } catch (err) {
    console.error('[Communication] Get tenant prefs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tenant preferences' });
  }
};

exports.updateTenantPreferences = async (req, res) => {
  try {
    const prefs = await service.updateTenantPreferences(req.userId, req.params.tenantId, req.body);
    res.json({ message: 'Tenant preferences updated', prefs });
  } catch (err) {
    console.error('[Communication] Update tenant prefs error:', err.message);
    res.status(500).json({ error: 'Failed to update tenant preferences' });
  }
};

exports.getQueue = async (req, res) => {
  try {
    const { status, channel, limit } = req.query;
    const queue = await service.getQueue(req.userId, { status, channel, limit: limit ? parseInt(limit) : 100 });
    res.json(queue);
  } catch (err) {
    console.error('[Communication] Get queue error:', err.message);
    res.status(500).json({ error: 'Failed to fetch communication queue' });
  }
};

exports.processQueue = async (req, res) => {
  try {
    const { queue_ids } = req.body;
    if (!Array.isArray(queue_ids) || queue_ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of queue_ids' });
    }
    const results = await service.processQueue(req.userId, queue_ids);
    res.json({ message: `Processed ${results.length} items`, results });
  } catch (err) {
    console.error('[Communication] Process queue error:', err.message);
    res.status(500).json({ error: 'Failed to process communication queue' });
  }
};

exports.generateQueue = async (req, res) => {
  try {
    const result = await service.generateRentReminders(req.userId);
    res.json(result);
  } catch (err) {
    console.error('[Communication] Generate queue error:', err.message);
    res.status(500).json({ error: 'Failed to generate communication queue' });
  }
};
