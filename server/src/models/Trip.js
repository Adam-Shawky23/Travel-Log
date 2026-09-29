const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    location: {
      name: { type: String, default: '' },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    photos: { type: [String], default: [] },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);
