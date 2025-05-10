import express from 'express';
import axios from 'axios';

const router = express.Router();

// GET /api/seatgeek/events
function toStringOrUndefined(val: any): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

router.get('/events', async (req, res) => {
  try {
    const { lat, lon, range, type } = req.query;
    const params: Record<string, string | number | undefined> = {
      client_id: process.env.SEATGEEK_CLIENT_ID,
      // client_secret: process.env.SEATGEEK_CLIENT_SECRET, // if needed
      per_page: 20,
      sort: 'datetime_local.asc',
      ...(lat && lon ? {
        'lat': toStringOrUndefined(lat),
        'lon': toStringOrUndefined(lon),
        'range': toStringOrUndefined(range) || '30mi'
      } : {}),
      ...(type ? { 'taxonomies.name': toStringOrUndefined(type) } : {}),
      'datetime_utc.gte': new Date().toISOString(),
    };
    const response = await axios.get('https://api.seatgeek.com/2/events', { params });
    res.json(response.data.events);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch SeatGeek events' });
  }
});

export default router;
