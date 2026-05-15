const router = require('express').Router();
const service = require('./biometrics.service');

router.get('/:tenant_id', async (req, res, next) => {
  try { res.json(await service.getTemplates(req.params.tenant_id)); } catch(e){next(e);}
});

router.post('/:tenant_id/broadcast', async (req, res, next) => {
  try { res.json(await service.broadcast(req.params.tenant_id, req.userId)); } catch(e){next(e);}
});

router.post('/:tenant_id/resync', async (req, res, next) => {
  try { res.json(await service.resync(req.params.tenant_id, req.userId)); } catch(e){next(e);}
});

module.exports = router;
