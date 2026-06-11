const { enforceExpiryRules } = require('../../backend/src/modules/access-control/access.service');

module.exports = async (req, res) => {
  // Verify the request is from Vercel Cron (or has the secret)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Force the throttle to skip by resetting timestamp
    await enforceExpiryRules();
    res.status(200).json({ ok: true, message: 'Enforcement completed', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[CRON] Enforcement error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
