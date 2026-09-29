const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { createTrip } = require('../controllers/trips.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', upload.array('photos', 5), createTrip);

module.exports = router;
