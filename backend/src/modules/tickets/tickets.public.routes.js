const router = require('express').Router();
const controller = require('./tickets.controller');

router.post('/', controller.createPublic);

module.exports = router;
