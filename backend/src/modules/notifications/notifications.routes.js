const router = require('express').Router();
const controller = require('./notifications.controller');

router.get('/', controller.list);
router.post('/send-reminder', controller.sendReminder);

module.exports = router;
