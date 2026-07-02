const express = require('express');
const router = express.Router();
const cameraController = require('../controllers/cameraController');

// Define camera CRUD routes
router.get('/', cameraController.getCameras);
router.post('/', cameraController.addCamera);
router.put('/:id', cameraController.updateCamera);
router.delete('/:id', cameraController.deleteCamera);

module.exports = router;
