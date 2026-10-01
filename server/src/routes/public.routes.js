const express = require('express');
const { listPublicTrips, getPublicTrip } = require('../controllers/public.controller');

const router = express.Router();

router.get('/trips', listPublicTrips);
router.get('/trips/:id', getPublicTrip);

module.exports = router;
