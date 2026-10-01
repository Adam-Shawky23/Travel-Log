const Trip = require('../models/Trip');
const { AppError } = require('../middleware/errorHandler');

async function listPublicTrips(req, res, next) {
  try {
    const trips = await Trip.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .populate('owner', 'name');
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

async function getPublicTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip || !trip.isPublic) {
      throw new AppError('Trip not found', 404);
    }
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

module.exports = { listPublicTrips, getPublicTrip };
