const router = require('express').Router();
const svc = require('./schedules.service');

router.get('/', async (req, res, next) => { try { res.json(await svc.getSchedules(req.userId)); } catch(e){next(e);} });
router.post('/', async (req, res, next) => { try { const r = await svc.createSchedule(req.body, req.userId); res.json({ id: r.id, message: 'Schedule created and synced to devices' }); } catch(e){next(e);} });
router.delete('/:id', async (req, res, next) => { try { await svc.deleteSchedule(req.params.id, req.userId); res.json({ message: 'Sync command queued' }); } catch(e){next(e);} });
router.post('/resync-all', async (req, res, next) => { try { await svc.resyncAll(req.userId); res.json({ message: 'Successfully queued re-sync commands for all devices.' }); } catch(e){next(e);} });

module.exports = router;
