// Lightweight graph model shared by every algorithm in this engine.
// Takes the { nodes, edges } shape produced by the data layer (sample data
// today, OSM/Overpass fusion output later) and builds an adjacency list.
//
// `blockedEdgeIds` lets the simulator "remove" roads without mutating the
// underlying graph data — this is what powers click-to-block rerouting.

export function buildAdjacency(graph, blockedEdgeIds = new Set()) {
  const adjacency = new Map();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (blockedEdgeIds.has(edge.id)) continue;

    const { source, target, weight, id } = edge;
    if (!adjacency.has(source) || !adjacency.has(target)) continue;

    // Occluded roads are routable but penalized (1.3× weight) to prefer confirmed roads
    const effectiveWeight = edge.occluded ? weight * 1.3 : weight;

    adjacency.get(source).push({ to: target, weight: effectiveWeight, edgeId: id });
    // Treat the road network as undirected unless a `directed: true` flag
    // is added to an edge in future (one-way streets).
    if (!edge.directed) {
      adjacency.get(target).push({ to: source, weight: effectiveWeight, edgeId: id });
    }
  }

  return adjacency;
}

export function nodeIndex(graph) {
  const index = new Map();
  for (const node of graph.nodes) index.set(node.id, node);
  return index;
}

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
