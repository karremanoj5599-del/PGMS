const router = require('express').Router();
const controller = require('./tenants.controller');
const docsController = require('./documents.controller');

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/bulk-delete', controller.bulkDelete);
router.put('/:id/revoke', controller.revoke);
router.post('/:id/set-pin', controller.setPin);
router.post('/:id/convert-to-staff', controller.convertToStaff);
router.post('/:id/resync-biometrics', controller.resyncBiometrics);

// Documents endpoints
router.get('/:id/documents', docsController.getDocuments);
router.post('/:id/documents', docsController.addDocument);
router.delete('/:id/documents/:docId', docsController.deleteDocument);

module.exports = router;
