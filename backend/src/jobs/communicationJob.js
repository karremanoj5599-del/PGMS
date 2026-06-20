const db = require('../config/database');
const { generateRentReminders } = require('../modules/communication/communication.service');

const INTERVAL = 24 * 60 * 60 * 1000; // Run once per day

const runCommunicationJob = async () => {
  console.log('[JOB] Starting automated communication queue generation...');
  try {
    // Get all distinct user_ids that have at least one communication setting enabled
    const users = await db('communication_settings')
      .where('enabled', true)
      .distinct('user_id');

    if (users.length === 0) {
      console.log('[JOB] No users have communication enabled. Skipping.');
      return;
    }

    for (const { user_id } of users) {
      try {
        const result = await generateRentReminders(user_id);
        console.log(`[JOB] User ${user_id}: ${result.message}`);
      } catch (err) {
        console.error(`[JOB] Error generating queue for user ${user_id}:`, err.message);
      }
    }

    console.log('[JOB] Communication queue generation complete.');
  } catch (err) {
    console.error('[JOB] Communication job error:', err.message);
  }
};

const start = () => {
  console.log('[JOB] Communication queue generator scheduled (interval: 24h)');
  // Run once on startup (after a small delay so DB is ready), then every 24h
  setTimeout(runCommunicationJob, 10000);
  setInterval(runCommunicationJob, INTERVAL);
};

module.exports = { start, runCommunicationJob };
