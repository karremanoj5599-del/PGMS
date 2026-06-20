const router = require('express').Router();
const controller = require('./communication.controller');

// Global settings
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

// Per-tenant preferences
router.get('/tenant/:tenantId/preferences', controller.getTenantPreferences);
router.put('/tenant/:tenantId/preferences', controller.updateTenantPreferences);

// Communication queue
router.get('/queue', controller.getQueue);
router.post('/queue/send', controller.processQueue);
router.post('/queue/generate', controller.generateQueue);

module.exports = router;
