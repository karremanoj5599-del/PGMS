const backupService = require('./backup.service');

// POST /api/system/backup — Trigger a manual backup
exports.createBackup = async (req, res) => {
  try {
    const result = await backupService.performBackup();
    res.json({ success: true, backup: result });
  } catch (err) {
    console.error('[BACKUP] Manual backup failed:', err.message);
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
};

// GET /api/system/backups — List all backups
exports.listBackups = (req, res) => {
  try {
    const backups = backupService.listBackups();
    res.json(backups);
  } catch (err) {
    console.error('[BACKUP] List failed:', err.message);
    res.status(500).json({ error: 'Failed to list backups: ' + err.message });
  }
};

// GET /api/system/backups/:filename/download — Download a backup file
exports.downloadBackup = (req, res) => {
  try {
    const filepath = backupService.getBackupFilePath(req.params.filename);
    res.download(filepath, req.params.filename);
  } catch (err) {
    console.error('[BACKUP] Download failed:', err.message);
    res.status(404).json({ error: err.message });
  }
};



// POST /api/system/backups/:filename/restore — Restore from a backup
exports.restoreBackup = async (req, res) => {
  try {
    const result = await backupService.restoreBackup(req.params.filename);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[BACKUP] Restore failed:', err.message);
    res.status(400).json({ error: err.message });
  }
};

// GET /api/system/backup-stats — Get backup statistics
exports.getBackupStats = (req, res) => {
  try {
    const stats = backupService.getBackupStats();
    res.json(stats);
  } catch (err) {
    console.error('[BACKUP] Stats failed:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/system/backups/upload — Upload a backup file from local computer
exports.uploadBackup = (req, res) => {
  try {
    const { filename, data } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' });
    }

    // Decode base64 file content
    const fileBuffer = Buffer.from(data, 'base64');
    const result = backupService.uploadBackup(filename, fileBuffer);
    res.json({ success: true, backup: result });
  } catch (err) {
    console.error('[BACKUP] Upload failed:', err.message);
    res.status(400).json({ error: err.message });
  }
};
