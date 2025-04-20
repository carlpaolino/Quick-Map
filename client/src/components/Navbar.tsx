import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const Navbar: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <LocationOnIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Quick Map
        </Typography>
        <Box>
          <Button color="inherit" component={RouterLink} to="/">
            Home
          </Button>
          <Button color="inherit" component={RouterLink} to="/activities">
            Activities
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar; 