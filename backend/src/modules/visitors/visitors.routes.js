const express = require('express');
const router = express.Router();
const visitorsController = require('./visitors.controller');

// Visitor routes
router.get('/', visitorsController.getVisitors);
router.post('/', visitorsController.addVisitor);
router.put('/:id', visitorsController.updateVisitorStatus);

module.exports = router;
