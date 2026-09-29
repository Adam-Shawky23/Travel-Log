const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  createTrip,
  listTrips,
  getTrip,
  updateTrip,
  deleteTrip,
} = require('../controllers/trips.controller');

const router = express.Router();

router.use(requireAuth);

router.post('/', upload.array('photos', 5), createTrip);
router.get('/', listTrips);
router.get('/:id', getTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);

module.exports = router;
