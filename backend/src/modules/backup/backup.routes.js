const router = require('express').Router();
const controller = require('./backup.controller');

// Manual backup trigger
router.post('/backup', controller.createBackup);

// List all backups
router.get('/backups', controller.listBackups);

// Backup statistics
router.get('/backup-stats', controller.getBackupStats);

// Upload a backup file from local computer
router.post('/backups/upload', controller.uploadBackup);

// Download a specific backup
router.get('/backups/:filename/download', controller.downloadBackup);

// Restore from a specific backup
router.post('/backups/:filename/restore', controller.restoreBackup);



module.exports = router;
