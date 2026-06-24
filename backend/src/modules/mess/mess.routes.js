const express = require('express');
const router = express.Router();
const messController = require('./mess.controller');

// All routes here will be protected by authMiddleware in server.js

// Menu routes
router.get('/menu', messController.getMenu);
router.put('/menu', messController.updateMenu);

// Opt-out reports
router.get('/opt-outs', messController.getOptOuts);

module.exports = router;
