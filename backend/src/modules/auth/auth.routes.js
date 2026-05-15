const router = require('express').Router();
const controller = require('./auth.controller');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/activate', controller.activate);
router.post('/validate', controller.validate);
router.post('/claim-license', controller.claimLicense);

module.exports = router;
