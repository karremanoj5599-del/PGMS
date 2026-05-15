const router = require('express').Router();
const controller = require('./tenants.controller');

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/bulk-delete', controller.bulkDelete);
router.put('/:id/revoke', controller.revoke);
router.post('/:id/set-pin', controller.setPin);

module.exports = router;
