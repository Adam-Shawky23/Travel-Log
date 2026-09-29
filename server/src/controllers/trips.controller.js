const Trip = require('../models/Trip');
const { AppError } = require('../middleware/errorHandler');

function toPhotoPaths(files, userId) {
  if (!files) return [];
  return files.map((f) => `/uploads/${userId}/${f.filename}`);
}

async function createTrip(req, res, next) {
  try {
    const { title, description, startDate, endDate, locationName, lat, lng } = req.body;
    if (!title || lat === undefined || lng === undefined) {
      throw new AppError('title, lat, and lng are required', 400);
    }

    const trip = await Trip.create({
      owner: req.userId,
      title,
      description,
      startDate,
      endDate,
      location: { name: locationName || '', lat: Number(lat), lng: Number(lng) },
      photos: toPhotoPaths(req.files, req.userId),
    });

    res.status(201).json(trip);
  } catch (err) {
    next(err);
  }
}

function assertOwner(trip, userId) {
  if (trip.owner.toString() !== userId) {
    throw new AppError('You do not have access to this trip', 403);
  }
}

async function listTrips(req, res, next) {
  try {
    const trips = await Trip.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

async function getTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertOwner(trip, req.userId);
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

async function updateTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertOwner(trip, req.userId);

    const { title, description, startDate, endDate, locationName, lat, lng, isPublic } = req.body;
    if (title !== undefined) trip.title = title;
    if (description !== undefined) trip.description = description;
    if (startDate !== undefined) trip.startDate = startDate;
    if (endDate !== undefined) trip.endDate = endDate;
    if (locationName !== undefined) trip.location.name = locationName;
    if (lat !== undefined) trip.location.lat = Number(lat);
    if (lng !== undefined) trip.location.lng = Number(lng);
    if (isPublic !== undefined) trip.isPublic = isPublic === 'true' || isPublic === true;

    await trip.save();
    res.json(trip);
  } catch (err) {
    next(err);
  }
}

async function deleteTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      throw new AppError('Trip not found', 404);
    }
    assertOwner(trip, req.userId);
    await trip.deleteOne();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { createTrip, listTrips, getTrip, updateTrip, deleteTrip, assertOwner };
