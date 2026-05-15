const router = require('express').Router();
const controller = require('./tickets.controller');

router.get('/tickets', controller.list);
router.put('/tickets/:id', controller.update);

module.exports = router;
