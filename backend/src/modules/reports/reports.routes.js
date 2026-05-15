const router = require('express').Router();
const controller = require('./reports.controller');

router.get('/stats', controller.stats);
router.get('/tenant-wise', controller.tenantWise);
router.get('/tenant-attendance', controller.tenantAttendance);
router.get('/transactions', controller.transactions);

module.exports = router;
