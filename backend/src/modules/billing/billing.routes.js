const router = require('express').Router();
const billingService = require('./billing.service');

router.post('/generate-billing', async (req, res, next) => {
  try {
    const count = await billingService.generateMonthlyBills(req.userId);
    res.json({ success: true, message: `Generated ${count} billing records.` });
  } catch (err) { res.status(500).json({ error: 'Failed to generate bills' }); }
});

module.exports = router;
