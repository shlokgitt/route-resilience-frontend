// Combines structural (bridges) and traffic-flow (betweenness) signals into
// a single criticality score per road, 0-100. Bridges are weighted heavily
// since losing one disconnects part of the city outright.

import { findBridges } from "./tarjanBridges.js";
import { edgeBetweenness } from "./betweenness.js";

export function computeCriticality(graph, blockedEdgeIds = new Set()) {
  const bridges = new Set(findBridges(graph, blockedEdgeIds));
  const betweenness = edgeBetweenness(graph, blockedEdgeIds);

  const maxScore = Math.max(...betweenness.map((b) => b.score), 1);

  const results = betweenness.map(({ edgeId, score }) => {
    const normalized = (score / maxScore) * 70; // betweenness contributes up to 70 points
    const bridgeBonus = bridges.has(edgeId) ? 30 : 0; // being a bridge adds 30 points
    return {
      edgeId,
      isBridge: bridges.has(edgeId),
      betweennessScore: Number(score.toFixed(2)),
      criticality: Math.round(normalized + bridgeBonus)
    };
  });

  return results.sort((a, b) => b.criticality - a.criticality);
}
