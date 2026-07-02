const express = require('express');
const router = express.Router();
const leadsController = require('./leads.controller');

router.post('/book-visit', leadsController.bookVisit);

module.exports = router;
