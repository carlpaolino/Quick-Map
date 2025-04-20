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
3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_uri
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   JWT_SECRET=your_jwt_secret
   ```
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