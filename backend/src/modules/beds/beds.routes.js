const router = require('express').Router();
const controller = require('./beds.controller');

router.get('/', controller.list);
router.get('/vacant', controller.listVacant);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
