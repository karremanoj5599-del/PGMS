const router = require('express').Router();
const controller = require('./system.controller');

router.get('/access-options', controller.getOptions);
router.put('/access-options', controller.updateOptions);

module.exports = router;
