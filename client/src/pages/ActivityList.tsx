import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
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
}

const ActivityList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

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

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
  };

  const center = userLocation || { lat: 0, lng: 0 };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <CircularProgress />
            </Box>
          ) : (
            <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={12}
              >
                {activities.map((activity) => (
                  <Marker
                    key={activity._id}
                    position={{
                      lat: activity.location.coordinates[1],
                      lng: activity.location.coordinates[0],
                    }}
                    onClick={() => setSelectedActivity(activity)}
                  />
                ))}
              </GoogleMap>
            </LoadScript>
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
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
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ActivityList; 