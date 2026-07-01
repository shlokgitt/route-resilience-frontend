import { Router } from "express";
import { sampleGraph } from "../data/sampleGraph.js";
import { dijkstra } from "../algorithms/dijkstra.js";
import { aStar } from "../algorithms/astar.js";
import { computeCriticality } from "../algorithms/criticality.js";
import { haversineKm } from "../algorithms/graphModel.js";

// Use sampleGraph by default for faster loading. 
// To use real OSM data, change USE_REAL_GRAPH to true
const USE_REAL_GRAPH = false;

let activeGraph = sampleGraph;
if (USE_REAL_GRAPH) {
  try {
    const { realGraph } = await import("../data/realGraph.js");
    activeGraph = realGraph;
    console.log(`Using real OSM graph: ${realGraph.nodes.length} nodes, ${realGraph.edges.length} edges`);
  } catch {
    console.log("No real graph found — using sample data. See scripts/fetchRealGraph.js to pull real OSM data.");
  }
} else {
  console.log("Using sample graph for faster development. Set USE_REAL_GRAPH=true in graph.js to use real data.");
}

export const graphRouter = Router();

// GET /api/nearest?lat=...&lng=... - find the closest graph node to an arbitrary point
graphRouter.get("/nearest", (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "Query params 'lat' and 'lng' are required (numbers)" });
  }

  let bestNode = null;
  let bestDist = Infinity;
  for (const node of activeGraph.nodes) {
    const d = haversineKm({ lat, lng }, node);
    if (d < bestDist) {
      bestDist = d;
      bestNode = node;
    }
  }

  if (!bestNode) {
    return res.status(404).json({ error: "No nodes in graph" });
  }

  res.json({ node: bestNode, distanceKm: Number(bestDist.toFixed(4)) });
});

// Parses ?blocked=E4,E10 query param into a Set, used by every endpoint so
// the frontend can simulate blockages without mutating server state.
function parseBlocked(req) {
  const raw = req.query.blocked;
  if (!raw) return new Set();
  return new Set(String(raw).split(",").filter(Boolean));
}

// GET /api/graph - full network (nodes + edges) for rendering on the map
graphRouter.get("/graph", (req, res) => {
  res.json(activeGraph);
});

// GET /api/route?from=N1&to=N9&algo=astar&blocked=E4,E10
graphRouter.get("/route", (req, res) => {
  const { from, to, algo = "dijkstra" } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: "Query params 'from' and 'to' are required" });
  }
  const blocked = parseBlocked(req);
  const result =
    algo === "astar"
      ? aStar(activeGraph, from, to, blocked)
      : dijkstra(activeGraph, from, to, blocked);

  res.json({ algorithm: algo, blocked: [...blocked], ...result });
});

// GET /api/criticality?blocked=E4,E10 - ranked roads by criticality score
graphRouter.get("/criticality", (req, res) => {
  const blocked = parseBlocked(req);
  const ranked = computeCriticality(activeGraph, blocked);
  res.json({ blocked: [...blocked], ranked });
});

// POST /api/simulate-blockage  { edgeIds: ["E4", "E10"] }
// Returns updated criticality + which previously-reachable node pairs
// become unreachable, used for the "click a road to block it" simulator.
graphRouter.post("/simulate-blockage", (req, res) => {
  const { edgeIds = [] } = req.body || {};
  const blocked = new Set(edgeIds);
  const ranked = computeCriticality(activeGraph, blocked);

  const unreachablePairs = [];
  const nodeIds = activeGraph.nodes.map((n) => n.id);
  for (let i = 0; i < nodeIds.length; i += 1) {
    for (let j = i + 1; j < nodeIds.length; j += 1) {
      const beforeBlock = dijkstra(activeGraph, nodeIds[i], nodeIds[j], new Set());
      const afterBlock = dijkstra(activeGraph, nodeIds[i], nodeIds[j], blocked);
      if (beforeBlock.reachable && !afterBlock.reachable) {
        unreachablePairs.push([nodeIds[i], nodeIds[j]]);
      }
    }
  }

  res.json({ blocked: edgeIds, ranked, unreachablePairs });
});
