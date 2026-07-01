// A* search using straight-line (haversine) distance as the heuristic —
// admissible since real road distance is always >= straight-line distance.

import { buildAdjacency, nodeIndex, haversineKm } from "./graphModel.js";

export function aStar(graph, startId, endId, blockedEdgeIds = new Set()) {
  const adjacency = buildAdjacency(graph, blockedEdgeIds);
  const nodes = nodeIndex(graph);
  const target = nodes.get(endId);

  const heuristic = (id) => haversineKm(nodes.get(id), target);

  const gScore = new Map();
  const fScore = new Map();
  const prevNode = new Map();
  const prevEdge = new Map();
  const open = new Set([startId]);
  const closed = new Set();

  for (const node of graph.nodes) {
    gScore.set(node.id, Infinity);
    fScore.set(node.id, Infinity);
  }
  gScore.set(startId, 0);
  fScore.set(startId, heuristic(startId));

  while (open.size > 0) {
    let current = null;
    let bestF = Infinity;
    for (const id of open) {
      if (fScore.get(id) < bestF) {
        bestF = fScore.get(id);
        current = id;
      }
    }

    if (current === endId) break;
    open.delete(current);
    closed.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const { to, weight, edgeId } of neighbors) {
      if (closed.has(to)) continue;
      const tentativeG = gScore.get(current) + weight;
      if (tentativeG < gScore.get(to)) {
        prevNode.set(to, current);
        prevEdge.set(to, edgeId);
        gScore.set(to, tentativeG);
        fScore.set(to, tentativeG + heuristic(to));
        open.add(to);
      }
    }
  }

  if (gScore.get(endId) === Infinity) {
    return { reachable: false, distance: Infinity, path: [], edges: [] };
  }

  const path = [];
  const edges = [];
  let cursor = endId;
  while (cursor !== undefined) {
    path.unshift(cursor);
    const e = prevEdge.get(cursor);
    if (e) edges.unshift(e);
    cursor = prevNode.get(cursor);
  }

  return { reachable: true, distance: gScore.get(endId), path, edges };
}
