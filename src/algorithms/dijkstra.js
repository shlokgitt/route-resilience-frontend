// Dijkstra's algorithm using a simple binary-heap-free priority approach
// (array scan). Fine for city-sized graphs (thousands of nodes); swap in a
// binary heap if the real OSM graph for a full city gets large.

import { buildAdjacency } from "./graphModel.js";

export function dijkstra(graph, startId, endId, blockedEdgeIds = new Set()) {
  const adjacency = buildAdjacency(graph, blockedEdgeIds);

  const dist = new Map();
  const prevNode = new Map();
  const prevEdge = new Map();
  const visited = new Set();

  for (const node of graph.nodes) dist.set(node.id, Infinity);
  dist.set(startId, 0);

  while (visited.size < graph.nodes.length) {
    let current = null;
    let currentDist = Infinity;
    for (const [nodeId, d] of dist) {
      if (!visited.has(nodeId) && d < currentDist) {
        current = nodeId;
        currentDist = d;
      }
    }
    if (current === null) break; // remaining nodes are unreachable
    visited.add(current);
    if (current === endId) break;

    const neighbors = adjacency.get(current) || [];
    for (const { to, weight, edgeId } of neighbors) {
      if (visited.has(to)) continue;
      const candidate = currentDist + weight;
      if (candidate < dist.get(to)) {
        dist.set(to, candidate);
        prevNode.set(to, current);
        prevEdge.set(to, edgeId);
      }
    }
  }

  if (dist.get(endId) === Infinity) {
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

  return { reachable: true, distance: dist.get(endId), path, edges };
}
