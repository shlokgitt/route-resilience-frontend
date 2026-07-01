// Edge betweenness centrality via Brandes' algorithm, adapted to score
// edges (roads) rather than nodes. A road's score = how often it lies on
// the shortest path between other pairs of intersections — high score
// means high traffic dependency, not just structural disconnection (that's
// what the bridge-finder is for; this complements it).

import { buildAdjacency } from "./graphModel.js";

export function edgeBetweenness(graph, blockedEdgeIds = new Set()) {
  const adjacency = buildAdjacency(graph, blockedEdgeIds);
  const nodeIds = graph.nodes.map((n) => n.id);
  const edgeScore = new Map();
  for (const edge of graph.edges) edgeScore.set(edge.id, 0);

  for (const source of nodeIds) {
    // BFS-based Brandes for unweighted shortest-path counting. Road weights
    // (distance) are a refinement; unweighted hop-count gives a solid first
    // pass on which roads carry the most through-traffic structurally.
    const stack = [];
    const predecessors = new Map(nodeIds.map((id) => [id, []]));
    const sigma = new Map(nodeIds.map((id) => [id, 0]));
    const dist = new Map(nodeIds.map((id) => [id, -1]));
    sigma.set(source, 1);
    dist.set(source, 0);

    const queue = [source];
    while (queue.length) {
      const v = queue.shift();
      stack.push(v);
      for (const { to: w, edgeId } of adjacency.get(v) || []) {
        if (dist.get(w) < 0) {
          dist.set(w, dist.get(v) + 1);
          queue.push(w);
        }
        if (dist.get(w) === dist.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          predecessors.get(w).push({ node: v, edgeId });
        }
      }
    }

    const delta = new Map(nodeIds.map((id) => [id, 0]));
    while (stack.length) {
      const w = stack.pop();
      for (const { node: v, edgeId } of predecessors.get(w)) {
        const contribution =
          (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + contribution);
        edgeScore.set(edgeId, (edgeScore.get(edgeId) || 0) + contribution);
      }
    }
  }

  // Undirected graph: each shortest path was counted from both endpoints'
  // BFS runs, so halve the totals.
  const ranked = [...edgeScore.entries()]
    .map(([edgeId, score]) => ({ edgeId, score: score / 2 }))
    .sort((a, b) => b.score - a.score);

  return ranked;
}
