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

module.exports = { createTrip };
