interface ProcessEnv {
  REACT_APP_GOOGLE_MAPS_API_KEY: string;
  REACT_APP_SEATGEEK_CLIENT_ID: string;
}

// Extend GooglePlace type for both Google and SeatGeek events
export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  rating?: number;
  url?: string;
  date?: string;
}


interface Process {
  env: ProcessEnv;
}

declare var process: Process;
