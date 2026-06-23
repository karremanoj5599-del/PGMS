const { performBackup } = require('../modules/backup/backup.service');

// Default: backup every 24 hours (configurable via BACKUP_INTERVAL_HOURS env var)
const INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10);
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

const runBackup = async () => {
  try {
    console.log('[JOB] Running scheduled database backup...');
    // Pass user ID 1 (Admin) to perform a full system backup
    const result = await performBackup(1);
    console.log(`[JOB] ✅ Scheduled backup completed: ${result.filename}`);
  } catch (err) {
    console.error('[JOB] ❌ Scheduled backup failed:', err.message);
  }
};

const start = () => {
  const unit = INTERVAL_HOURS >= 24 ? `${INTERVAL_HOURS / 24}d` : `${INTERVAL_HOURS}h`;
  console.log(`[JOB] Database backup scheduler started (interval: ${unit})`);

  // Run first backup after a short delay (30 seconds after server start)
  setTimeout(() => {
    runBackup();
  }, 30 * 1000);

  // Then run at the configured interval
  setInterval(runBackup, INTERVAL_MS);
};

module.exports = { runBackup, start };
