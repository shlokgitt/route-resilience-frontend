// Tarjan's bridge-finding algorithm (DFS low-link). A "bridge" edge is one
// whose removal disconnects the graph — i.e. a road with no alternate
// route, exactly the single-point-of-failure roads Route Resilience flags.

import { buildAdjacency } from "./graphModel.js";

export function findBridges(graph, blockedEdgeIds = new Set()) {
  const adjacency = buildAdjacency(graph, blockedEdgeIds);

  const visited = new Set();
  const disc = new Map();
  const low = new Map();
  const bridges = [];
  let timer = 0;

  function dfs(u, parentEdgeId) {
    visited.add(u);
    disc.set(u, timer);
    low.set(u, timer);
    timer += 1;

    for (const { to: v, edgeId } of adjacency.get(u) || []) {
      if (edgeId === parentEdgeId) continue; // don't walk back along the edge we arrived on
      if (visited.has(v)) {
        low.set(u, Math.min(low.get(u), disc.get(v)));
      } else {
        dfs(v, edgeId);
        low.set(u, Math.min(low.get(u), low.get(v)));
        if (low.get(v) > disc.get(u)) {
          bridges.push(edgeId);
        }
      }
    }
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) dfs(node.id, null);
  }

  return bridges;
}
