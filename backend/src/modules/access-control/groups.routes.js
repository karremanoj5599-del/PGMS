const router = require('express').Router();
const svc = require('./schedules.service');

router.get('/', async (req, res, next) => { try { res.json(await svc.getGroups(req.userId)); } catch(e){next(e);} });
router.post('/', async (req, res, next) => { try { const id = await svc.createGroup(req.body, req.userId); res.json({ id, message: 'Access Group created' }); } catch(e){next(e);} });
router.delete('/:id', async (req, res, next) => { try { await svc.deleteGroup(req.params.id, req.userId); res.json({ message: 'Access Group deleted' }); } catch(e){next(e);} });

module.exports = router;
