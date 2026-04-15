# CommutePulse

A real-time Mumbai commute risk dashboard. Scores three city routes using congestion, incident recency, and time-of-day data, then displays a live gauge, alert card, and countdown to departure.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later (bundled with Node.js)

## Getting started

### 1. Install dependencies

```bash
cd commute-pulse
npm install
```

### 2. Start the development server

```bash
npm run dev
```

Vite will print a local URL (typically `http://localhost:5173`). Open it in your browser. The page hot-reloads on every file save.

> The browser console will show scorer smoke-test output on first load — this is expected in dev mode and confirms the risk engine is working correctly.

### 3. Build for production

```bash
npm run build
```

Output is written to `dist/`. To preview the production build locally:

```bash
npm run preview
```

## Project structure

```
src/
  data/
    routes.js          # Mock Mumbai route data (segments, incidents, congestion)
  logic/
    scorer.js          # Risk scoring engine (pure functions)
  components/
    RiskGauge.jsx      # Animated SVG ring gauge
    AlertCard.jsx      # Severity-coded incident alert
    CountdownBar.jsx   # Live countdown to recommended departure
    RouteSelector.jsx  # Route pill-button selector
  App.jsx              # Root component — state, simulation, layout
  main.jsx             # React entry point
```

## Using the dashboard

| Control | What it does |
|---|---|
| Route pills | Switch between Andheri → BKC, Borivali → Churchgate, and Thane → Powai |
| Simulate update | Nudges the selected route's congestion and ages all incidents by 3 min |
| How does scoring work? | Prints the scoring formula to the browser console |
| Auto-tick | Runs automatically every 30 seconds |

## Scoring formula

```
risk score = (congestion_index × 0.40)
           + (incident score   × 0.35)
           + (time multiplier  × 25  )
```

- **Incident score** — each incident contributes `severity × recency × 33`, where recency decays linearly from 1 (just reported) to 0 (60+ minutes ago). Clamped to 100.
- **Time multiplier** — looked up from each route's `time_risk_table` by current hour.
- Final score is clamped to 0–100 and mapped to Low (≤ 40) / Medium (41–65) / High (≥ 66).
