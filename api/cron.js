const app = require('../backend/index');

export default async (req, res) => {
  // CRITICAL: Protect this endpoint with a secret key or Vercel Cron header
  // if (req.headers['x-vercel-cron'] !== '1') {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log('[CRON] Starting background tasks...');
  
  try {
    // 1. Check payment status and enforce access
    if (app.checkPaymentStatusAndEnforceAccess) {
      await app.checkPaymentStatusAndEnforceAccess();
      console.log('[CRON] Payment status check completed.');
    }

    // 2. Enforce inactivity rules
    if (app.enforceInactivityRules) {
      await app.enforceInactivityRules();
      console.log('[CRON] Inactivity rules check completed.');
    }

    res.status(200).json({ success: true, message: 'Cron tasks completed successfully.' });
  } catch (err) {
    console.error('[CRON] Tasks failed:', err.message);
    res.status(500).json({ error: 'Cron tasks failed: ' + err.message });
  }
};
