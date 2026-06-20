const router = require('express').Router();
const controller = require('./payments.controller');

router.get('/', controller.list);
router.get('/status', controller.status);
router.get('/:id/receipt', controller.receipt);
router.post('/', controller.create);

module.exports = router;
