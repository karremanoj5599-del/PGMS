const router = require('express').Router();
const service = require('./expenses.service');

router.get('/', async (req, res, next) => {
  try { res.json(await service.getAll(req.userId, req.query)); }
  catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
  try { res.json(await service.getSummary(req.userId, req.query.startDate, req.query.endDate)); }
  catch (err) { next(err); }
});

router.get('/trend', async (req, res, next) => {
  try { res.json(await service.getMonthlyTrend(req.userId)); }
  catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try { res.json(await service.create(req.body, req.userId)); }
  catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try { res.json(await service.update(req.params.id, req.body, req.userId)); }
  catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try { await service.remove(req.params.id, req.userId); res.json({ success: true }); }
  catch (err) { next(err); }
});

module.exports = router;
