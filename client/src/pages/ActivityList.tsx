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

// Remove hardcoded API URL since we're using the proxy setting in package.json
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
// console.log('Using API base URL:', API_BASE_URL);

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
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    location?: {
      lat: number;
      lng: number;
    }
  }; // Added venue object for SeatGeek events
}

// Interface for driving time responses
interface TravelTimeInfo {
  eventId: string;
  drivingTime?: string;
  loading: boolean;
  error?: string;
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
  const [travelTimes, setTravelTimes] = useState<Record<string, TravelTimeInfo>>({});

  // Fetch SeatGeek events from backend when userLocation is available
  useEffect(() => {
    const fetchSeatGeekEvents = async () => {
      if (!userLocation) return;
      try {
        const params = new URLSearchParams();
        params.append('lat', userLocation.lat.toString());
        params.append('lon', userLocation.lng.toString());
        params.append('range', '25mi');
        // No type filter: get all event types
        const response = await axios.get(`/api/seatgeek/events?${params}`);
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

        const response = await axios.get(`/api/activities?${params}`);
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
          ]
        };
        if (category === 'entertainment') {
          // Use the server-side endpoint for SeatGeek events
          try {
            const params = new URLSearchParams();
            params.append('lat', userLocation.lat.toString());
            params.append('lon', userLocation.lng.toString());
            params.append('range', '100mi');
            
            const response = await axios.get(`/api/seatgeek/events?${params}`);
            
            if (response.data.length === 0) {
              setGooglePlaces([]);
              setSeatGeekEvents([]);
            } else {
              // Format the events for display
              const events = response.data.map((event: any) => {
                const type = event.type || (event.taxonomies && event.taxonomies.length > 0 ? event.taxonomies[0].name : '');
                return {
                  place_id: event.id,
                  name: event.title,
                  vicinity: event.venue ? event.venue.name : '',
                  rating: event.score,
                  url: event.url,
                  date: event.datetime_local,
                  type: type,
                  description: event.description || '',
                  venue: event.venue, // Include the full venue object for mapping
                  score: event.score
                };
              });
              
              setGooglePlaces(events);
              setSeatGeekEvents(response.data);
            }
          } catch (e) {
            console.error("SeatGeek API error:", e);
            setGooglePlaces([]);
            setSeatGeekEvents([]);
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

  // Calculate driving times for events when venues and user location are available
  useEffect(() => {
    const calculateDrivingTimes = async () => {
      if (!userLocation || !googlePlaces || googlePlaces.length === 0 || category !== 'entertainment') {
        return;
      }

      // Get venues with location data
      const venuesWithLocation = googlePlaces.filter((event: GooglePlace) => {
        const eventWithVenue = event as GooglePlace & { venue?: { location?: { lat: number; lng: number } } };
        return eventWithVenue.venue && eventWithVenue.venue.location && 
               eventWithVenue.venue.location.lat && eventWithVenue.venue.location.lng;
      });

      if (venuesWithLocation.length === 0) return;

      // Prepare for batch processing to reduce API calls
      const batchSize = 10; // Maximum destinations per Distance Matrix API call
      for (let i = 0; i < venuesWithLocation.length; i += batchSize) {
        const batch = venuesWithLocation.slice(i, i + batchSize);
        
        // Mark these events as loading
        const loadingState = batch.reduce((acc: Record<string, TravelTimeInfo>, event: GooglePlace) => {
          acc[event.place_id] = { eventId: event.place_id, loading: true };
          return acc;
        }, {} as Record<string, TravelTimeInfo>);
        
        setTravelTimes(prev => ({ ...prev, ...loadingState }));
        
        const origins = [{ lat: userLocation.lat, lng: userLocation.lng }];
        const destinations = batch.map((event: GooglePlace) => {
          const eventWithVenue = event as GooglePlace & { venue: { location: { lat: number; lng: number } } };
          return { 
            lat: eventWithVenue.venue.location.lat, 
            lng: eventWithVenue.venue.location.lng 
          };
        });
        
        try {
          // Try to use the Distance Matrix API directly (if user has proper API key)
          // This will be protected by API key restrictions so it's safe to call client-side
          const service = new google.maps.DistanceMatrixService();
          const response = await service.getDistanceMatrix({
            origins,
            destinations,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.IMPERIAL
          });
          
          // Process results
          const newTravelTimes: Record<string, TravelTimeInfo> = {};
          
          if (response.rows[0] && response.rows[0].elements) {
            batch.forEach((event: GooglePlace, index: number) => {
              const element = response.rows[0].elements[index];
              if (element.status === 'OK') {
                newTravelTimes[event.place_id] = {
                  eventId: event.place_id,
                  drivingTime: element.duration.text,
                  loading: false
                };
              } else {
                newTravelTimes[event.place_id] = {
                  eventId: event.place_id,
                  loading: false,
                  error: 'Unable to calculate driving time'
                };
              }
            });
          }
          
          setTravelTimes(prev => ({ ...prev, ...newTravelTimes }));
        } catch (error) {
          // If direct API call fails, mark all as error
          const errorState = batch.reduce((acc: Record<string, TravelTimeInfo>, event: GooglePlace) => {
            acc[event.place_id] = { 
              eventId: event.place_id, 
              loading: false, 
              error: 'Could not calculate driving time' 
            };
            return acc;
          }, {} as Record<string, TravelTimeInfo>);
          
          setTravelTimes(prev => ({ ...prev, ...errorState }));
        }
      }
    };

    if (isLoaded) {
      calculateDrivingTimes();
    }
  }, [userLocation, googlePlaces, category, isLoaded]);

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
                
                {/* Add markers for SeatGeek events */}
                {category === 'entertainment' && googlePlaces.map((event: any) => 
                  event.venue && event.venue.location ? (
                    <Marker
                      key={`event-${event.place_id}`}
                      position={{
                        lat: event.venue.location.lat,
                        lng: event.venue.location.lng,
                      }}
                      clusterer={clusterer}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                        scaledSize: new window.google.maps.Size(40, 40),
                      }}
                      onClick={() => {
                        // Set up info window data for events
                        setInfoActivity({
                          _id: event.place_id,
                          name: event.name,
                          description: event.description || '',
                          category: 'entertainment',
                          location: {
                            coordinates: [event.venue.location.lng, event.venue.location.lat],
                          },
                          address: event.vicinity || '',
                          rating: event.rating || 0,
                        });
                        setInfoOpen(true);
                        setSelectedActivity(null);
                      }}
                    />
                  ) : null
                )}
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
              <Box sx={{ maxWidth: 250 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">{infoActivity.name}</Typography>
                {infoActivity.category === 'entertainment' && (
                  <>
                    {/* Find matching event details */}
                    {googlePlaces.find(p => p.place_id === infoActivity._id)?.date && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {new Date(googlePlaces.find(p => p.place_id === infoActivity._id)?.date || '').toLocaleDateString()}
                        {' '}
                        {new Date(googlePlaces.find(p => p.place_id === infoActivity._id)?.date || '').toLocaleTimeString(undefined, { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                    )}
                    {googlePlaces.find(p => p.place_id === infoActivity._id)?.vicinity && (
                      <Typography variant="body2" fontWeight="medium">
                        {googlePlaces.find(p => p.place_id === infoActivity._id)?.vicinity}
                      </Typography>
                    )}
                    {/* Show driving time in info window */}
                    {travelTimes[infoActivity._id]?.drivingTime && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box component="span" sx={{ mr: 1 }}>🚗</Box>
                        <Box>{travelTimes[infoActivity._id].drivingTime} drive</Box>
                      </Typography>
                    )}
                  </>
                )}
                {infoActivity.address && (
                  <Typography variant="body2" color="text.secondary">
                    {infoActivity.address}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {infoActivity.description}
                </Typography>
                {/* Show ticket link for SeatGeek events */}
                {infoActivity.category === 'entertainment' && (() => {
                  const url = googlePlaces.find(p => p.place_id === infoActivity._id)?.url;
                  return url ? (
                    <Button 
                      variant="contained" 
                      size="small" 
                      color="primary" 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 2, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                    >
                      Get Tickets
                    </Button>
                  ) : null;
                })()}
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
          placesLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : googlePlaces && googlePlaces.length > 0 ? (
            <>
              <Typography variant="body2" gutterBottom color="text.secondary">
                Found {googlePlaces.length} events nearby
              </Typography>
              
              {/* Event list rendering */}
              <Box sx={{ mt: 2 }}>
                {googlePlaces.slice(0, 30).map((event, index) => (
                  <Card key={`event-${index}`} sx={{ mb: 2, p: 2, boxShadow: 2, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{event.name || 'Unnamed Event'}</Typography>
                    {event.date && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <Box component="span" sx={{ mr: 1 }}>📅</Box>
                        {new Date(event.date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} • {new Date(event.date).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Typography>
                    )}
                    {event.vicinity && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Box component="span" sx={{ mr: 1 }}>📍</Box>
                        <Box>{event.vicinity}</Box>
                      </Typography>
                    )}
                    {/* Driving time */}
                    {travelTimes[event.place_id]?.loading ? (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box component="span" sx={{ mr: 1 }}>🚗</Box>
                        <Box>Calculating travel time...</Box>
                      </Typography>
                    ) : travelTimes[event.place_id]?.drivingTime ? (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Box component="span" sx={{ mr: 1 }}>🚗</Box>
                        <Box>{travelTimes[event.place_id].drivingTime} drive</Box>
                      </Typography>
                    ) : null}
                    {event.url && (
                      <Button 
                        variant="contained"
                        size="small"
                        color="primary"
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 2, textTransform: 'none', borderRadius: 1.5 }}
                      >
                        Get Tickets
                      </Button>
                    )}
                  </Card>
                ))}
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" gutterBottom>No upcoming events found.</Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your location or check back later for new events.
              </Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                Debug info: Client using API URL: http://localhost:5002
              </Typography>
            </Box>
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