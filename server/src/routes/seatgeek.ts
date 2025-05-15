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
    
    // Log client ID to verify it's set (redact part of it for security)
    const clientId = process.env.SEATGEEK_CLIENT_ID;
    console.log('Using SeatGeek Client ID:', clientId ? 
      `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 
      'NOT SET - PLEASE CHECK YOUR .ENV FILE');
    
    if (!clientId) {
      return res.status(500).json({ 
        error: 'SeatGeek Client ID not configured. Please add SEATGEEK_CLIENT_ID to your .env file.' 
      });
    }
    
    console.log('SeatGeek request with coordinates:', { lat, lon, range });
    
    // FIX: Add direct test of client ID before proceeding
    try {
      // Test the SeatGeek API key with a simple request
      const testResponse = await axios.get('https://api.seatgeek.com/2/events', { 
        params: { client_id: clientId, per_page: 1 } 
      });
      console.log('SeatGeek API key verification successful');
    } catch (error: any) {
      // Handle API key authentication errors specifically
      if (error.response && error.response.status === 403) {
        console.error('SeatGeek API authentication failed - Invalid client_id:', error.response.data);
        return res.status(403).json({ 
          error: 'SeatGeek API authentication failed. Please check your client ID in the .env file.',
          details: error.response?.data || 'No details available'
        });
      }
      // Continue if the test request fails for other reasons
      console.warn('SeatGeek API test request failed, but continuing with main request', error.message);
    }
    
    const params: Record<string, string | number | undefined> = {
      client_id: clientId,
      per_page: 30, // Increase to get more events
      sort: 'datetime_local.asc',
      ...(lat && lon ? {
        'lat': toStringOrUndefined(lat),
        'lon': toStringOrUndefined(lon),
        'range': toStringOrUndefined(range) || '25mi'
      } : {}),
      ...(type ? { 'taxonomies.name': toStringOrUndefined(type) } : {}),
      'datetime_utc.gte': new Date().toISOString(),
    };
    
    // Use a larger range to increase chances of finding events
    if (!params.range || params.range === '25mi') {
      params.range = '200mi'; // Increase default range
    }
    
    console.log('SeatGeek API request URL:', 'https://api.seatgeek.com/2/events');
    console.log('SeatGeek API params:', params);
    
    const response = await axios.get('https://api.seatgeek.com/2/events', { params });
    
    console.log(`SeatGeek API returned ${response.data.events?.length || 0} events`);
    
    if (response.data.events?.length === 0) {
      console.log('No events found. Response meta:', JSON.stringify(response.data.meta || {}, null, 2));
      // Return empty array but with 200 status
      return res.json([]);
    } else {
      // Log the first few events to see what's coming back
      console.log('First few events:', response.data.events.slice(0, 3).map((e: any) => ({
        title: e.title,
        venue: e.venue?.name,
        date: e.datetime_local,
        has_location: !!(e.venue?.location?.lat && e.venue?.location?.lon)
      })));
    }
    
    // Process events to include location data in the correct format for mapping
    interface SeatGeekEvent {
      id: string;
      title: string;
      datetime_local: string;
      description?: string;
      url?: string;
      score?: number;
      type?: string;
      taxonomies?: Array<{ name: string }>;
      venue?: {
        name?: string;
        address?: string;
        city?: string;
        state?: string;
        location?: {
          lat: number;
          lon: number;
        }
      };
    }
    
    // Format events to include venue coordinates for mapping
    const processedEvents = (response.data.events as SeatGeekEvent[]).map(event => {
      // Create a standardized venue object with location data for frontend mapping
      const venue = event.venue ? {
        name: event.venue.name,
        address: event.venue.address,
        city: event.venue.city,
        state: event.venue.state,
        location: event.venue.location ? {
          lat: event.venue.location.lat,
          lng: event.venue.location.lon // Convert 'lon' to 'lng' for consistency
        } : undefined
      } : undefined;
      
      return {
        id: event.id,
        title: event.title,
        datetime_local: event.datetime_local,
        description: event.description,
        url: event.url,
        score: event.score,
        type: event.type || (event.taxonomies && event.taxonomies.length > 0 ? event.taxonomies[0].name : ''),
        venue
      };
    });
    
    console.log(`Processed ${processedEvents.length} SeatGeek events with venue data`);
    console.log(`Events with map coordinates: ${processedEvents.filter(e => e.venue?.location).length}`);
    
    res.json(processedEvents);
  } catch (error: unknown) {
    console.error('SeatGeek API error:', error);
    // Check if it's an axios error with a response
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number, data?: any } };
      if (axiosError.response?.status === 403) {
        return res.status(403).json({ 
          error: 'Access forbidden - SeatGeek API key is invalid or expired. Please check your SEATGEEK_CLIENT_ID.'
        });
      }
      return res.status(axiosError.response?.status || 500).json({ 
        error: 'SeatGeek API error', 
        details: axiosError.response?.data || 'Unknown error'
      });
    }
    
    // Generic error handling
    if (error && typeof error === 'object' && 'message' in error) {
      res.status(500).json({ error: (error as { message?: string }).message || 'Failed to fetch SeatGeek events' });
    } else {
      res.status(500).json({ error: 'Failed to fetch SeatGeek events' });
    }
  }
});

export default router;
