# Quick Map - Activity Explorer

A modern web application that helps couples, families, and friends discover and explore activities in their area. The application features location-based activity recommendations, categorized by type (fun, hikes, food, etc.), with detailed information about each activity.

## Features

- Real-time location-based activity discovery
- Activity categorization (fun, hikes, food, etc.)
- Detailed activity information
- Modern, responsive UI
- Future iOS app integration ready

## Tech Stack

- Frontend: React with TypeScript, Material-UI
- Backend: Node.js with Express
- Database: MongoDB
- Maps & Location: Google Maps API
- Authentication: JWT

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB
- Google Maps API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   
   **For the server:**
   ```bash
   cp server/.env.example server/.env
   ```
   Then edit `server/.env` with your actual values.
   
   **For the client:**
   ```bash
   cp client/.env.example client/.env
   ```
   Then edit `client/.env` with your actual values.
   
   **Required environment variables:**
   - `MONGODB_URI`: Your MongoDB connection string
   - `GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `JWT_SECRET`: A secure random string for JWT signing
   - `REACT_APP_GOOGLE_MAPS_API_KEY`: Same as above, for client-side usage
   
4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
quick-map/
├── client/           # React frontend
├── server/           # Node.js backend
├── shared/           # Shared types and utilities
└── docs/            # Documentation
```

## License

MIT