import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import activityRoutes from './routes/activities';
import authRoutes from './routes/auth';
import seatgeekRoutes from './routes/seatgeek';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5002'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/activities', activityRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/seatgeek', seatgeekRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickmap')
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    // Continue even if MongoDB connection fails
    console.error('MongoDB connection error:', error);
    console.log('Continuing without MongoDB connection. SeatGeek API will still work.');
  });

// Add a test endpoint to verify server is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running correctly!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`SeatGeek API endpoint: http://localhost:${PORT}/api/seatgeek/events`);
}); 