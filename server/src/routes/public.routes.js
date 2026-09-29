const express = require('express');
const { getPublicTrip } = require('../controllers/public.controller');

const router = express.Router();

router.get('/trips/:id', getPublicTrip);

module.exports = router;
