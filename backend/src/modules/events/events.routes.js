const router = require('express').Router();
const controller = require('./events.controller');

// GET /api/events -> SSE Stream
router.get('/', controller.stream);

module.exports = router;
