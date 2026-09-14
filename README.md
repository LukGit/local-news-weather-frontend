# Real-Time Global Natural Disaster Tracker

An interactive geospatial telemetry dashboard built to visualize real-time global natural hazards for environmental science education, spatial analysis, and emergency tracking.

![Natural Disaster Tracker Dashboard](https://user-images.githubusercontent.com/60716393/110196818-aea9c100-7e0c-11eb-8ae6-0d4e19d26cc6.png)

## Overview

The Natural Disaster Tracker ingests live scientific feeds across five specialized environmental domain tabs. The application processes complex spatial datasets (GeoJSON, vector paths, active warning perimeters) into interactive Google Maps layers with custom scaling, temporal opacity decay, and automated viewport management.

### Key Features & Modules

* **Earthquake Monitor:** Ingests live USGS GeoJSON feeds (M4.0+ past 72 hours). Features magnitude-proportional marker scaling, time-based visual decay, interactive Richter threshold filtering, and sequential chronological timeline playback.
* **Tropical Cyclones & Track Analysis:** Ingests dual advisories from NOAA NHC and the Hong Kong Observatory (HKO). Visualizes active storms, historical track vectors, red forecast trajectories, and 3-to-5 day 67% probability uncertainty cones.
* **Tornado & Severe Weather:** Visualizes active NWS touchdowns and warning shapes (past 24 hours) with progressive opacity fading and detailed localized telemetry popups.
* **Wildfires & Thermal Anomalies:** Ingests NASA FIRMS and NIFC satellite feeds for US wildfires (>500 acres). Features active containment decay, peak financial cost indicators, live local wind vector overlays, and active-only multi-polygon burn perimeters on close zoom.
* **Global Floods & NWS Warnings:** Integrates GDACS global flood alert levels alongside live US National Weather Service (NWS) flood and flash flood warning polygons with dynamic auto-zoom functionality.
* **Local Weather & Geolocation:** Geolocation-aware centering with fallback logic, providing live local conditions, hourly trends, and multi-day weather forecasts via WeatherAPI.

---

## Technical Architecture

* **Frontend:** React (Class Components with robust lifecycle unmount guards), Redux (standardized multi-key state structure), Semantic UI React.
* **Geospatial & Mapping:** Google Maps API (`google-maps-react`) with custom Polygon, Polyline, and Marker rendering layers.
* **Backend / API Services:** Express/Node.js API proxy layers handling external CORS headers, payload normalization, and cache management.
* **Deployment:** Vercel serverless platform.

---

## Technical Setup & Installation

### Prerequisites

* Node.js (v14+ recommended)
* A Google Maps JavaScript API Key (with Geocoding API enabled)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/natural-disaster-tracker.git](https://github.com/your-username/natural-disaster-tracker.git)
   cd natural-disaster-tracker

2. **Install dependencies:**
    Bash
    npm install

3. **Configure Environment Variables:**
    Create a .env file in the root directory and add your API keys:
    Code snippet
    REACT_APP_GOOGLE_API_KEY=your_google_maps_api_key
    REACT_APP_WEATHER_API_KEY=your_weather_api_key

4. **Start the local Vercel development environment::**
    npm vercel dev
    Open http://localhost:3000 to view the application in your browser.
    Note: Using npx vercel dev instead of npm start is required locally to execute Vercel serverless API routes, which proxy live data payloads and eliminate browser CORS errors.

### Data Sources & Scientific Attribution

* Seismic Telemetry: United States Geological Survey (USGS) GeoJSON API
* Tropical Advisories: NOAA National Hurricane Center (NHC) & Hong Kong Observatory (HKO)
* Severe Weather & Flood Warnings: National Weather Service (NWS) / NOAA CAP Feeds
* Global Flood Tracking: Global Disaster Alert and Coordination System (GDACS)
* Thermal Anomalies & Wildfires: NASA FIRMS & National Interagency Fire Center (NIFC)
* Meteorological Forecasts: WeatherAPI

### Authorship & Acknowledgments

  Author: Ivan Luk — Full-Stack Software Engineer
  Tooling & Assistance: Built and refactored with assistance from Google Gemini as an AI technical collaborator for code optimization, spatial data integration, and state management debugging.