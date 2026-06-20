const service = require('./notifications.service');

exports.list = async (req, res) => {
  try {
    const notifications = await service.getNotifications(req.userId);
    res.json(notifications);
  } catch (err) {
    console.error('[Notifications] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.sendReminder = async (req, res) => {
  try {
    const result = await service.sendReminder(req.userId, req.body);
    res.json(result);
  } catch (err) {
    console.error('[Notifications] Send Reminder Error:', err.message);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
};
