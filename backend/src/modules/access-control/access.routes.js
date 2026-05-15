const router = require('express').Router();
const controller = require('./access.controller');

router.put('/:tenant_id', controller.toggle);
router.put('/:tenant_id/schedule', controller.assignSchedule);
router.put('/:tenant_id/group', controller.assignGroup);

module.exports = router;
