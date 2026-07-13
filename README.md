# Route Resilience

A disaster-resilient road network analysis platform built for **ISRO Bhartiya Antariksh Hackathon (BAH) 2026** by team **3rookie**.

Route Resilience analyzes the road network of Varanasi to identify critical routes, weak points, and alternate paths that stay usable during disasters — helping planners and emergency responders understand which roads matter most when the network is under stress.

## Live Demo
https://route-resilience-frontend-app.vercel.app/

## The Problem

During floods, landslides, or other disasters, road networks can fail in ways that aren't obvious from a simple map. Some roads look minor but are actually critical connectors — lose them, and entire neighborhoods get cut off. Route Resilience identifies these vulnerabilities before disaster strikes, using real graph theory on real map data.

## Features

- **Shortest path routing** between any two points using Dijkstra's and A* algorithms
- **Critical road detection** using Tarjan's algorithm to find bridges and articulation points in the network
- **Betweenness centrality analysis** to rank roads by how essential they are to overall connectivity
- **Real OSM road network data** — 7,731 nodes and 8,139 edges ingested from OpenStreetMap for Varanasi
- **Live weather overlay** via the Open-Meteo API, to correlate weather conditions with route risk
- **Click-to-route UX** — click anywhere on the map and the app snaps to the nearest network node to start routing
- **Interactive map** built with Leaflet for exploring the road network visually

## Tech Stack

**Frontend**
- React
- Vite
- Leaflet (interactive maps)

**Backend**
- Node.js
- Express

**Algorithms**
- Dijkstra's algorithm (shortest path)
- A* search (heuristic-based pathfinding)
- Tarjan's algorithm (bridges / articulation points)
- Betweenness centrality (network criticality ranking)

**Data & APIs**
- OpenStreetMap (road network data)
- Open-Meteo API (weather data)

**Deployment**
- Vercel (frontend + backend)

## How It Works

1. Road network data for Varanasi is ingested from OpenStreetMap and converted into a graph of nodes (intersections) and edges (road segments).
2. The backend runs graph algorithms on this network — Dijkstra and A* for routing, Tarjan's algorithm and betweenness centrality for identifying which roads are most critical to connectivity.
3. The frontend renders this network on an interactive Leaflet map. Clicking anywhere snaps to the nearest real intersection, so users don't need exact coordinates.
4. A live weather layer adds context — helping users see how current conditions might interact with road vulnerability.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Setup

```bash
# Clone the repo
git clone https://github.com/<your-username>/route-resilience.git
cd route-resilience

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:4000
```

### Running Locally

```bash
# Start the backend
cd backend
npm run dev

# In a separate terminal, start the frontend
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.



## Acknowledgments

- OpenStreetMap contributors for road network data
- Open-Meteo for free weather API access
