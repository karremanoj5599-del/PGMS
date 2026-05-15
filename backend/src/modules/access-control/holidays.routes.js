const router = require('express').Router();
const svc = require('./schedules.service');

router.get('/', async (req, res, next) => { try { res.json(await svc.getHolidays(req.userId)); } catch(e){next(e);} });
router.post('/', async (req, res, next) => { try { const id = await svc.createHoliday(req.body, req.userId); res.json({ id, message: 'Holiday created and synced' }); } catch(e){next(e);} });
router.delete('/:id', async (req, res, next) => { try { await svc.deleteHoliday(req.params.id, req.userId); res.json({ message: 'Holiday deleted' }); } catch(e){next(e);} });

module.exports = router;
