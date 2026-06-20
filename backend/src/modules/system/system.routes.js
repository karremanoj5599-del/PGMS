const router = require('express').Router();
const controller = require('./system.controller');

router.get('/access-options', controller.getOptions);
router.put('/access-options', controller.updateOptions);
router.get('/migrate', controller.runMigrations);

// Activity Logs and SSE
router.get('/activity', controller.getLogs);
router.get('/sse', controller.sseStream);

module.exports = router;
