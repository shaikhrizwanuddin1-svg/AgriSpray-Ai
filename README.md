# AgriSpray AI

AgriSpray AI is a smart pesticide spraying system interface built for precision agriculture. It helps users capture live leaf images, analyze visible symptoms, review scan analytics, and combine AI prediction with local weather guidance through a modern web dashboard.

The project focuses on reducing unnecessary pesticide usage by supporting targeted decisions instead of blanket spraying.

## Overview

This application provides:

- live camera-based leaf capture
- on-device visual symptom screening
- geolocation-based live weather checks
- weekly reporting and disease distribution charts from real scan history
- English, Hindi, and Marathi language support
- responsive UI with light and dark mode

## Key Features

- Live Detection: Opens the device camera, captures a leaf frame, validates image quality, and checks for visible symptoms.
- Weather-Aware Recommendation: Uses browser geolocation and OpenWeather data to decide if rain conditions should block spraying.
- Real-Time Analytics: Stores valid scans locally or through the PostgreSQL API and updates dashboard numbers and charts from real recorded data.
- Multi-Language UI: Switches app text and recommendation output across English, Hindi, and Marathi.
- Theme Support: Users can switch between light and dark mode.

## System Flow

The intended workflow is:

1. Capture a plant leaf image using the live camera.
2. Validate the image quality and confirm that a leaf is clearly visible.
3. Analyze visible color and stress cues from the captured frame.
4. Fetch the user location and real-time weather from the backend.
5. Persist the valid scan to PostgreSQL or browser scan history.
6. Combine AI result and weather status into the final spray recommendation.
7. Refresh the dashboard charts and history.

## Tech Stack

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Recharts
- React Router
- next-themes

Backend / Storage:

- Node.js + Express
- PostgreSQL
- OpenWeather API

Project / Tooling:

- ESLint
- Vitest
- Playwright

Conceptual / Extended Stack Referenced in UI:

- TensorFlow / Keras
- OpenCV
- Arduino integration for spray hardware

## Project Structure

```text
src/
  assets/            Frontend hero and image assets
  components/        Reusable UI and feature components
  hooks/             Custom hooks
  i18n/              Language dictionaries
  lib/               Shared utilities and storage logic
backend/
  src/               Express API and PostgreSQL integration
  sql/               Database schema
public/              Static assets
```

## Local Development

### Requirements

- Node.js 18+ recommended
- npm
- PostgreSQL 14+ for backend mode
- OpenWeather API key for live weather mode

### Frontend install

```bash
npm install
```

### Run the frontend

```bash
npm run dev
```

### Backend setup

```bash
cd backend
npm install
copy .env.example .env
```

Create the PostgreSQL database, then run:

```bash
psql -d agrispray -f sql/schema.sql
```

Set these values in `backend/.env`:

```bash
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agrispray
CORS_ORIGIN=http://127.0.0.1:8081
OPENWEATHER_API_KEY=your_openweather_api_key
```

Start the backend:

```bash
npm run dev
```

Back in the frontend project root, set:

```bash
VITE_API_BASE_URL=http://127.0.0.1:4000
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## Notes About Detection

The current detector uses front-end visual heuristics, not a trained medical-grade model. It improves user experience by:

- confirming that a leaf is actually present
- checking blur, glare, and darkness
- avoiding false result cards on invalid captures

For production-grade disease classification, the next step would be integrating a trained ML model through the backend API.

## Future Improvements

- backend model inference with TensorFlow and a richer prediction API
- real disease dataset integration
- hardware-linked spray controller workflow
- authentication and multi-user dashboards
- cloud storage for scan history and reports
- exportable scan logs and reports

## Contributors

- Shaikh Rizwanuddin
