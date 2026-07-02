const express = require('express');
const router = express.Router();
const faceController = require('../controllers/faceController');

// Routes for AI service to push events
router.post('/recognized', faceController.handleRecognizedFace);
router.post('/unknown', faceController.handleUnknownFace);

// Routes for frontend dashboard
router.get('/stats', faceController.getStats);
router.get('/events', faceController.getEvents);
router.get('/unknown', faceController.getUnknown);

// Routes for face embeddings
router.get('/embeddings', faceController.getEmbeddings);
router.post('/assign-unknown', faceController.assignUnknown);

module.exports = router;
