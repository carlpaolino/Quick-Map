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

// Remove hardcoded API URL since we're using the proxy setting in package.json
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

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
        const response = await axios.get(`/api/activities/${id}`);
        setActivity(response.data);
        // Fetch related activities after main activity loads
        if (response.data && response.data._id) {
          const relatedRes = await axios.get(`/api/activities/${response.data._id}/related`);
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography variant="h5" align="center">
          Activity not found
        </Typography>
      </Box>
    );
  }

  // Fullscreen map style for GoogleMap
  const fullscreenMapStyle = {
    width: '100vw',
    height: '100vh',
  };
  // Note: No position/top/left/zIndex here; GoogleMap handles the layout.


  // Floating panel style
  const floatingPanelStyle = {
    position: 'fixed' as const,
    top: 32,
    right: 32,
    width: 360,
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

  return (
    <Box sx={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Fullscreen Google Map */}
      {!isLoaded ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      ) : (
        <GoogleMap
          mapContainerStyle={fullscreenMapStyle}
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
      {/* Floating panel for related places & contact info */}
      <Box sx={floatingPanelStyle}>
        <Typography variant="h5" gutterBottom>
          {activity.name}
        </Typography>
        <Box sx={{ mb: 1 }}>
          <Chip label={activity.category} color="primary" sx={{ mr: 1 }} />
          {activity.priceRange && (
            <Chip label={activity.priceRange} variant="outlined" />
          )}
        </Box>
        <Rating value={activity.rating} readOnly precision={0.5} sx={{ mb: 1 }} />
        <Typography variant="body2" paragraph>
          {activity.description}
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
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
        <Divider sx={{ my: 2 }} />
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {activity.address}
        </Typography>
      </Box>
    </Box>
  );
};

export default ActivityDetail;