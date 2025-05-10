import express from 'express';
import Activity from '../models/Activity';
import { Client } from '@googlemaps/google-maps-services-js';

const router = express.Router();
const client = new Client({});

// Get activities by category and location
router.get('/', async (req, res) => {
  try {
    const { category, lat, lng, radius = 5000 } = req.query;
    
    const query: any = {};
    if (category) {
      query.category = category;
    }

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
          },
          $maxDistance: parseInt(radius as string)
        }
      };
    }

    const activities = await Activity.find(query);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error });
  }
});

// Get activity details
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    if (!activity.location || !activity.location.coordinates) {
      return res.status(400).json({ message: 'Activity location is missing or invalid' });
    }
    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity', error });
  }
});

// Get related activities by category and proximity (excluding itself)
router.get('/:id/related', async (req, res) => {
  try {
    const { radius = 5000, limit = 8 } = req.query;
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    if (!activity.location || !activity.location.coordinates) {
      return res.status(400).json({ message: 'Activity location is missing or invalid' });
    }
    const related = await Activity.find({
      _id: { $ne: activity._id },
      category: activity.category,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: activity.location.coordinates,
          },
          $maxDistance: parseInt(radius as string),
        },
      },
    })
      .limit(parseInt(limit as string));
    res.json(related);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching related activities', error });
  }
});

// Create new activity
router.post('/', async (req, res) => {
  try {
    const { name, description, category, address } = req.body;

    // Geocode address to get coordinates
    const geocodeResponse = await client.geocode({
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY || '',
      },
    });

    if (!geocodeResponse.data.results.length) {
      return res.status(400).json({ message: 'Invalid address' });
    }

    const { lat, lng } = geocodeResponse.data.results[0].geometry.location;

    const activity = new Activity({
      ...req.body,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    });

    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Error creating activity', error });
  }
});

export default router; 