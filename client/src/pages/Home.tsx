import React from 'react';
import { Container, Typography, Grid, Card, CardContent, CardMedia, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const categories = [
  { name: 'Fun', image: '/images/fun.jpg', description: 'Discover exciting activities for everyone' },
  { name: 'Hikes', image: '/images/hikes.jpg', description: 'Explore beautiful trails and nature' },
  { name: 'Food', image: '/images/food.jpg', description: 'Find the best places to eat' },
  { name: 'Entertainment', image: '/images/entertainment.jpg', description: 'Enjoy shows and events' },
];

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          bgcolor: 'background.paper',
          pt: 8,
          pb: 6,
          textAlign: 'center',
        }}
      >
        <Typography
          component="h1"
          variant="h2"
          color="text.primary"
          gutterBottom
        >
          Discover Activities Near You
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Find the perfect activity for couples, families, and friends. Explore your city with Quick Map.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/activities')}
          sx={{ mt: 4 }}
        >
          Explore Activities
        </Button>
      </Box>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        {categories.map((category) => (
          <Grid item key={category.name} xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.2s',
                },
              }}
              onClick={() => navigate(`/activities?category=${category.name.toLowerCase()}`)}
            >
              <CardMedia
                component="img"
                height="140"
                image={category.image}
                alt={category.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {category.name}
                </Typography>
                <Typography>
                  {category.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Home; 