const router = require('express').Router();
const controller = require('./staff.controller');

router.get('/', controller.list);
router.get('/summary/today', controller.getSummary);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/:id/attendance', controller.getAttendance);
router.post('/:id/set-pin', controller.setPin);
router.put('/:id/access', controller.toggleAccess);

module.exports = router;
