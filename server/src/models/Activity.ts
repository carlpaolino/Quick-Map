import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['fun', 'hikes', 'food', 'entertainment', 'sports', 'cultural'],
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  address: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  priceRange: {
    type: String,
    enum: ['$', '$$', '$$$', '$$$$'],
  },
  images: [String],
  website: String,
  phone: String,
  hours: {
    type: Map,
    of: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create geospatial index for location-based queries
activitySchema.index({ location: '2dsphere' });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity; 