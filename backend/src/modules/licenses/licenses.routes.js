const router = require('express').Router();
const { isAdmin } = require('../../middleware/adminAuth');
const controller = require('./licenses.controller');

router.get('/', isAdmin, controller.list);
router.post('/', isAdmin, controller.create);

module.exports = router;
