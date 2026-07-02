const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
// const { requireAuth } = require('../middleware/auth'); // Add auth middleware for production

// Secure image serving routes (ideally protected by JWT auth)
// router.use(requireAuth); 

router.get('/:id/face', imageController.getFaceImage);
router.get('/:id/frame', imageController.getFrameImage);

module.exports = router;
