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

        const response = await axios.get(`http://localhost:5000/api/activities?${params}`);
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

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
  };

  const center = userLocation || { lat: 0, lng: 0 };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', minWidth: '800px', overflowX: 'auto' }}>
        {/* Map and other UI code here */}

        <Box mt={4}>
          {seatGeekEvents.length > 0 && (
            <Grid container spacing={2}>
              {seatGeekEvents.map((event: any) => (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">{event.title}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {event.venue && event.venue.name}
                      </Typography>
                      <Typography variant="body2">
                        {event.datetime_local && new Date(event.datetime_local).toLocaleString()}
                      </Typography>
                      <Box mt={1}>
                        <Button href={event.url} target="_blank" rel="noopener" size="small" variant="outlined">View Event</Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
        <Box sx={{ flex: '0 0 600px', minWidth: '600px', maxWidth: '600px', mr: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : (
            // ... other code ...
            !isLoaded ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
              </Box>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
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
            )
          )}
        </Box>
        {/* List section */}
        <Box sx={{ flex: '0 0 320px', minWidth: '320px', maxWidth: '320px', borderLeft: 1, borderColor: 'divider', pl: 3, maxHeight: '400px', overflow: 'auto' }}>
          {activities.map((activity) => (
            <Card
              key={activity._id}
              sx={{
                mb: 2,
                cursor: 'pointer',
                backgroundColor: selectedActivity?._id === activity._id ? 'action.selected' : 'background.paper',
              }}
              onClick={() => setSelectedActivity(activity)}
            >
              {(activity.images && activity.images.length > 0) || CATEGORY_IMAGES[activity.category] ? (
                <CardMedia
                  component="div"
                  sx={{
                    height: 140,
                    mb: 1,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: 1,
                    backgroundImage: `url(${
                      activity.images && activity.images.length > 0
                        ? activity.images[0]
                        : CATEGORY_IMAGES[activity.category] || CATEGORY_IMAGES['fun']
                    })`,
                  }}
                />
              ) : null}
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {activity.name}
                </Typography>
                <Chip
                  label={activity.category}
                  size="small"
                  sx={{ mb: 1 }}
                />
                {activity.priceRange && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Price: {activity.priceRange}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {activity.address}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {/* Section title changes based on category */}
          <Typography variant="subtitle1" gutterBottom>
            {category === 'entertainment' ? 'Events Nearby' : 'Related Places Nearby'}
          </Typography>
          {category === 'entertainment' ? (
            googlePlaces
              .filter((event): event is GooglePlace => Boolean(event && event.place_id && event.name && event.type && (event.type === 'concert' || event.type === 'sports')))
              .map((event) => (
                <Card key={event.place_id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {event.name}
                    </Typography>
                    {event.date ? (
                      <Typography variant="body2" color="text.secondary">
                        Date: {event.date}
                      </Typography>
                    ) : null}
                    {typeof event.type === 'string' && (
                      <Chip label={event.type.charAt(0).toUpperCase() + event.type.slice(1)} size="small" sx={{ mt: 1, mr: 1 }} />
                    )}
                    {event.vicinity && (
                      <Typography variant="body2" color="text.secondary">
                        Venue: {event.vicinity}
                      </Typography>
                    )}
                    {(event.description || event.vicinity) && (
                      <Typography variant="body2" color="text.secondary">
                        {event.description || event.vicinity}
                      </Typography>
                    )}
                    {typeof event.rating === 'number' ? (
                      <Typography variant="body2" color="text.secondary">
                        Rating: {event.rating}
                      </Typography>
                    ) : null}
                    {event.url ? (
                      <Typography variant="body2">
                        <a href={event.url} target="_blank" rel="noopener noreferrer">
                          View Event
                        </a>
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              ))
          ) : (
            googlePlaces.filter((place): place is GooglePlace => Boolean(place && place.place_id && place.name)).map((place) => (
              <Card key={place.place_id} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    {place.name}
                  </Typography>
                  {place.vicinity && (
                    <Typography variant="body2" color="text.secondary">
                      {place.vicinity}
                    </Typography>
                  )}
                  {typeof place.rating === 'number' ? (
                    <Typography variant="body2" color="text.secondary">
                      Rating: {place.rating}
                    </Typography>
                  ) : null}
                  {place.url ? (
                    <Typography variant="body2">
                      <a href={place.url} target="_blank" rel="noopener noreferrer">
                        View Place
                      </a>
                    </Typography>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default ActivityList;