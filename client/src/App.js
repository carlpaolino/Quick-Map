import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import Navbar from './components/Navbar.tsx';
import Home from './pages/Home.tsx';
import ActivityList from './pages/ActivityList.tsx';
import ActivityDetail from './pages/ActivityDetail.tsx';
import { LoadScript } from '@react-google-maps/api';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY} libraries={['places']}> 
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/activities" element={<ActivityList />} />
            <Route path="/activities/:id" element={<ActivityDetail />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </LoadScript>
  );
}

export default App;
