import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerClusterer, LoadScript } from '@react-google-maps/api';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import axios from 'axios';

// Use environment variable for API URL if available, otherwise default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
console.log('Using API base URL:', API_BASE_URL);

interface Activity {
  _id: string;
  name: string;
  description: string;
  category: string;
  location: {
    coordinates: [number, number];
  };
  address: string;
  rating: number;
  priceRange?: string;
  images?: string[];
}

const CATEGORY_IMAGES: Record<string, string> = {
  fun: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
  hikes: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
  entertainment: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
  sports: 'https://images.unsplash.com/photo-1517649763962-0c623066013b',
  cultural: 'https://images.unsplash.com/photo-1464983953574-0892a716854b',
};

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  photos?: { photo_reference: string }[];
  date?: string;
  url?: string;
  type?: string; // Added type for SeatGeek events
  description?: string; // Added for SeatGeek events
}

const ActivityList: React.FC = () => {
  const [seatGeekEvents, setSeatGeekEvents] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [googlePlaces, setGooglePlaces] = useState<GooglePlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  // Fetch SeatGeek events from backend when userLocation is available
  useEffect(() => {
    const fetchSeatGeekEvents = async () => {
      if (!userLocation) return;
      try {
        const params = new URLSearchParams();
        params.append('lat', userLocation.lat.toString());
        params.append('lon', userLocation.lng.toString());
        params.append('range', '100mi');
        // No type filter: get all event types
        const response = await axios.get(`${API_BASE_URL}/api/seatgeek/events?${params}`);
        console.log("SeatGeek API response from server:", response.data);
        setSeatGeekEvents(response.data);
      } catch (error) {
        setSeatGeekEvents([]);
      }
    };
    fetchSeatGeekEvents();
  }, [userLocation]);

  useEffect(() => {
    // Get user's location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }, []);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const category = searchParams.get('category');
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (userLocation) {
          params.append('lat', userLocation.lat.toString());
          params.append('lng', userLocation.lng.toString());
        }

        const response = await axios.get(`${API_BASE_URL}/api/activities?${params}`);
        setActivities(response.data);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [searchParams, userLocation]);

  // Fetch Google Places for the current category
  useEffect(() => {
    const fetchGooglePlaces = async () => {
      const category = searchParams.get('category');
      if (!category || !userLocation) {
        setGooglePlaces([]);
        return;
      }
      setPlacesLoading(true);
      try {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        // For fun, hikes, food, entertainment: multi-keyword search; others: default
        const multiKeywordCategories: Record<string, string[]> = {
          fun: [
            'arcade',
            'bowling alley',
            'trampoline park',
            'escape room',
            'mini golf',
            'laser tag',
            'go kart',
            'amusement park'
          ],
          hikes: [
            'hiking trail',
            'nature trail',
            'park',
            'national park',
            'state park',
            'forest preserve',
            'nature reserve',
            'mountain',
            'scenic overlook'
          ],
          food: [
            'restaurant',
            'cafe',
            'bakery',
            'diner',
            'bar',
            'food court',
            'pizza',
            'steakhouse',
            'fast food',
            'breakfast',
            'brunch'
          ],
          entertainment: [
            'movie theater',
            'theater',
            'concert',
            'live music',
            'nightclub',
            'comedy club',
            'event venue',
            'performing arts'
          ]
        };
        if (category === 'entertainment') {
          // SeatGeek API for entertainment
          const seatgeekClientId = process.env.REACT_APP_SEATGEEK_CLIENT_ID;
          const lat = userLocation.lat;
          const lng = userLocation.lng;
          const url = `https://api.seatgeek.com/2/events?lat=${lat}&lon=${lng}&range=100mi&client_id=${seatgeekClientId}&per_page=20`;
          console.log("SeatGeek API URL:", url);
          try {
            const response = await axios.get(url);
            console.log("SeatGeek API response:", response.data);
            const events = response.data.events.map((event: any) => {
              const type = event.type || (event.taxonomies && event.taxonomies.length > 0 ? event.taxonomies[0].name : '');
              const description = event.description || (event.venue ? event.venue.name : '');
              console.log(`Event: ${event.title}, Type: ${type}`);
              return {
                place_id: event.id,
                name: event.title,
                vicinity: event.venue ? event.venue.name : '',
                rating: event.score,
                url: event.url,
                date: event.datetime_local,
                type: type,
                description: description,
              };
            });
            setGooglePlaces(events);
          } catch (e) {
            console.error("SeatGeek API error:", e);
            setGooglePlaces([]);
          } finally {
            setPlacesLoading(false);
          }
          return;
        }
        if (multiKeywordCategories[category]) {
          const keywords = multiKeywordCategories[category];
          let allResults: any[] = [];
          let seenPlaceIds = new Set<string>();
          for (const keyword of keywords) {
            let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.lat},${userLocation.lng}&radius=5000&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            try {
              const response = await axios.get(proxyUrl);
              const results = response.data.results || [];
              for (const place of results) {
                if (!seenPlaceIds.has(place.place_id)) {
                  seenPlaceIds.add(place.place_id);
                  allResults.push(place);
                }
              }
            } catch (e) {
              // Ignore errors for individual keywords
            }
          }
          setGooglePlaces(allResults);
        } else {
          const categoryParams: Record<string, {type?: string, keyword?: string}> = {
            sports: { type: 'gym' },
            cultural: { type: 'museum' },
          };
          const params = categoryParams[category] || { keyword: category };
          let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.lat},${userLocation.lng}&radius=5000`;
          if (params.type) url += `&type=${params.type}`;
          if (params.keyword) url += `&keyword=${params.keyword}`;
          url += `&key=${apiKey}`;
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          const response = await axios.get(proxyUrl);
          setGooglePlaces(response.data.results || []);
        }
      } catch (err) {
        setGooglePlaces([]);
      } finally {
        setPlacesLoading(false);
      }
    };
    fetchGooglePlaces();
  }, [searchParams, userLocation]);

  const { isLoaded } = useJsApiLoader({
    // process.env is valid in Create React App (CRA) because CRA polyfills it for the browser.
googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoActivity, setInfoActivity] = useState<Activity | null>(null);

  // Fullscreen map style for GoogleMap
  const fullscreenMapStyle = {
    width: '100vw',
    height: '100vh',
  };

  const floatingPanelStyle = {
    position: 'fixed' as const,
    top: 32,
    right: 32,
    width: 400,
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    zIndex: 2,
    background: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  };

  const center = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : { lat: 34.02, lng: -84.59 };

  return (
    <Box sx={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Fullscreen Google Map */}
      {!isLoaded || loading || !userLocation ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      ) : (
        <GoogleMap
          mapContainerStyle={fullscreenMapStyle}
          center={center}
          zoom={12}
        >
          <MarkerClusterer>
            {(clusterer) => (
              <>
                {activities.map((activity) => (
                  <Marker
                    key={activity._id}
                    position={{
                      lat: activity.location.coordinates[1],
                      lng: activity.location.coordinates[0],
                    }}
                    clusterer={clusterer}
                    onClick={() => {
                      setInfoActivity(activity);
                      setInfoOpen(true);
                      setSelectedActivity(activity);
                    }}
                  />
                ))}
              </>
            )}
          </MarkerClusterer>
          {infoOpen && infoActivity && (
            <InfoWindow
              position={{
                lat: infoActivity.location.coordinates[1],
                lng: infoActivity.location.coordinates[0],
              }}
              onCloseClick={() => setInfoOpen(false)}
            >
              <Box>
                <Typography variant="subtitle1" gutterBottom>{infoActivity.name}</Typography>
                <Typography variant="body2">{infoActivity.address}</Typography>
                <Typography variant="body2">{infoActivity.description}</Typography>
              </Box>
            </InfoWindow>
          )}
        </GoogleMap>
      )}
      {/* Floating panel for activities/events/places */}
      <Box sx={{
        ...floatingPanelStyle,
        p: 3,
        borderRadius: 4,
        boxShadow: 6,
        bgcolor: 'rgba(255,255,255,0.95)',
        maxHeight: '85vh',
        minWidth: 340,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}>
        <Typography variant="h5" gutterBottom>
          {category === 'entertainment' ? 'Events Nearby' : 'Related Places Nearby'}
        </Typography>
        {category === 'entertainment' ? (
          loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : seatGeekEvents.length > 0 ? (
            seatGeekEvents.map((event: any) => (
              <Card key={event.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {event.title}
                  </Typography>
                  {event.datetime_local && (
                    <Typography variant="body2" color="text.secondary">
                      Date: {new Date(event.datetime_local).toLocaleString()}
                    </Typography>
                  )}
                  {event.type && (
                    <Chip label={event.type.charAt(0).toUpperCase() + event.type.slice(1)} size="small" sx={{ mt: 1, mr: 1 }} />
                  )}
                  {event.venue && event.venue.name && (
                    <Typography variant="body2" color="text.secondary">
                      Venue: {event.venue.name}
                    </Typography>
                  )}
                  {event.description && (
                    <Typography variant="body2" color="text.secondary">
                      {event.description}
                    </Typography>
                  )}
                  {event.url && (
                    <Typography variant="body2">
                      <a href={event.url} target="_blank" rel="noopener noreferrer">
                        View Event
                      </a>
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography variant="body2">No upcoming events found.</Typography>
          )
        ) : (
          placesLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : googlePlaces && googlePlaces.length > 0 ? (
            googlePlaces.filter((place): place is GooglePlace => Boolean(place && place.place_id && place.name)).map((place) => (
              <Card key={place.place_id} sx={{ mb: 3, display: 'flex', alignItems: 'center', p: 2, boxShadow: 3, borderRadius: 3, minHeight: 110 }}>
                {place.photos && place.photos.length > 0 ? (
                  <CardMedia
                    component="img"
                    image={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=120&photoreference=${place.photos[0].photo_reference}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`}
                    alt={place.name}
                    sx={{ width: 120, height: 90, borderRadius: 2, mr: 3, objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{ width: 120, height: 90, borderRadius: 2, bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 3 }}>
                    <span role="img" aria-label="Place" style={{ fontSize: 36 }}>📍</span>
                  </Box>
                )}
                <CardContent sx={{ flex: 1, p: 0, pl: 1 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
                    {place.name}
                  </Typography>
                  {place.vicinity && (
                    <Typography variant="body2" color="text.secondary">
                      {place.vicinity}
                    </Typography>
                  )}
                  {typeof place.rating === 'number' && (
                    <Typography variant="body2" color="text.secondary">
                      Rating: {place.rating} ⭐
                    </Typography>
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.vicinity || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in Maps
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography variant="body2">No places found.</Typography>
          )
        )}
      </Box>
    </Box>
  );
};

export default ActivityList;