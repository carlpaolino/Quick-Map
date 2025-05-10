import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Rating,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
} from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
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
  website?: string;
  phone?: string;
  hours?: Record<string, string>;
}

const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Activity[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  // Moved hooks to top-level to comply with React rules
  const mapContainerStyle = {
    width: '100%',
    height: '300px',
  };
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
  });
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/activities/${id}`);
        setActivity(response.data);
        // Fetch related activities after main activity loads
        if (response.data && response.data._id) {
          const relatedRes = await axios.get(`http://localhost:5000/api/activities/${response.data._id}/related`);
          setRelated(relatedRes.data);
        } else {
          setRelated([]);
        }
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!activity) {
    return (
      <Container>
        <Typography variant="h5" align="center" sx={{ mt: 4 }}>
          Activity not found
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Typography variant="h4" gutterBottom>
            {activity.name}
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Chip label={activity.category} color="primary" sx={{ mr: 1 }} />
            {activity.priceRange && (
              <Chip label={activity.priceRange} variant="outlined" />
            )}
          </Box>
          <Rating value={activity.rating} readOnly precision={0.5} sx={{ mb: 2 }} />
          <Typography variant="body1" paragraph>
            {activity.description}
          </Typography>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>
            Location
          </Typography>
          <Box sx={{ height: 300, mb: 3, position: 'relative' }}>
            {!isLoaded ? (
              <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
              </Box>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={{
                  lat: activity.location.coordinates[1],
                  lng: activity.location.coordinates[0],
                }}
                zoom={15}
              >
                {/* Main activity marker */}
                <Marker
                  position={{
                    lat: activity.location.coordinates[1],
                    lng: activity.location.coordinates[0],
                  }}
                  onClick={() => setInfoOpen(true)}
                  icon={highlightedId === activity._id ? undefined : undefined}
                />
                {/* Related activities markers */}
                {related.map((rel) => (
                  <Marker
                    key={rel._id}
                    position={{
                      lat: rel.location.coordinates[1],
                      lng: rel.location.coordinates[0],
                    }}
                    onMouseOver={() => setHighlightedId(rel._id)}
                    onMouseOut={() => setHighlightedId(null)}
                    onClick={() => setSelectedMarker(rel._id)}
                    icon={highlightedId === rel._id || selectedMarker === rel._id ? {
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: new window.google.maps.Size(40, 40),
                    } : undefined}
                  />
                ))}
                {/* InfoWindow for selected related marker */}
                {selectedMarker && related.find(r => r._id === selectedMarker) && (
                  <InfoWindow
                    position={{
                      lat: related.find(r => r._id === selectedMarker)!.location.coordinates[1],
                      lng: related.find(r => r._id === selectedMarker)!.location.coordinates[0],
                    }}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>{related.find(r => r._id === selectedMarker)!.name}</Typography>
                      <Typography variant="body2">{related.find(r => r._id === selectedMarker)!.address}</Typography>
                      <Typography variant="body2">{related.find(r => r._id === selectedMarker)!.description}</Typography>
                    </Box>
                  </InfoWindow>
                )}
                {/* InfoWindow for main activity */}
                {infoOpen && (
                  <InfoWindow
                    position={{
                      lat: activity.location.coordinates[1],
                      lng: activity.location.coordinates[0],
                    }}
                    onCloseClick={() => setInfoOpen(false)}
                  >
                    <Box>
                      <Typography variant="subtitle1" gutterBottom>{activity.name}</Typography>
                      <Typography variant="body2">{activity.address}</Typography>
                      <Typography variant="body2">{activity.description}</Typography>
                    </Box>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </Box>
          <Typography variant="body1" paragraph>
            {activity.address}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ mb: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Related Places & Events
            </Typography>
            {related.length === 0 ? (
              <Typography variant="body2">No related places found.</Typography>
            ) : (
              <List dense>
                {related.map((rel) => (
                  <ListItem
                    key={rel._id}
                    onMouseEnter={() => setHighlightedId(rel._id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    onClick={() => setSelectedMarker(rel._id)}
                    selected={highlightedId === rel._id || selectedMarker === rel._id}
                    sx={{ cursor: 'pointer', bgcolor: (highlightedId === rel._id || selectedMarker === rel._id) ? 'action.selected' : undefined }}
                  >
                    <ListItemAvatar>
                      <Avatar src={rel.images && rel.images[0]} alt={rel.name} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={rel.name}
                      secondary={rel.address}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              {activity.phone && (
                <Typography variant="body1" paragraph>
                  Phone: {activity.phone}
                </Typography>
              )}
              {activity.website && (
                <Typography variant="body1" paragraph>
                  Website:{' '}
                  <a href={activity.website} target="_blank" rel="noopener noreferrer">
                    {activity.website}
                  </a>
                </Typography>
              )}
              {activity.hours && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Hours
                  </Typography>
                  {Object.entries(activity.hours).map(([day, hours]) => (
                    <Typography key={day} variant="body2">
                      {day}: {hours}
                    </Typography>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ActivityDetail;