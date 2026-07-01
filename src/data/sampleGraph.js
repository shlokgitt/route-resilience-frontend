// Sample road network: a small grid-like city graph with lat/lng coordinates.
// Replace this with the real OSM/Overpass-derived graph at integration time.
// Structure: nodes = intersections, edges = road segments.

export const sampleGraph = {
  nodes: [
    { id: "N1", lat: 25.3176, lng: 82.9739, name: "Cantonment Junction" },
    { id: "N2", lat: 25.3210, lng: 82.9755, name: "Lanka Crossing" },
    { id: "N3", lat: 25.3150, lng: 82.9700, name: "Maidagin Square" },
    { id: "N4", lat: 25.3230, lng: 82.9690, name: "Sigra Junction" },
    { id: "N5", lat: 25.3260, lng: 82.9740, name: "Sundarpur Node" },
    { id: "N6", lat: 25.3100, lng: 82.9650, name: "Godowlia Chowk" },
    { id: "N7", lat: 25.3290, lng: 82.9670, name: "Bhelupur Crossing" },
    { id: "N8", lat: 25.3060, lng: 82.9720, name: "Assi Ghat Approach" },
    { id: "N9", lat: 25.3330, lng: 82.9760, name: "Mahmoorganj Node" },
    { id: "N10", lat: 25.3190, lng: 82.9610, name: "Rathyatra Junction" }
  ],
  // Each edge carries a base weight (distance in km, approx) used by routing
  // algorithms, a roadName/wayId pair (real OSM data groups many tiny edges
  // under one wayId so a whole street can be blocked in one click — this
  // sample graph has one edge per road since it's a small hand-built demo),
  // plus an "occluded" flag that flows from the satellite/OSM fusion step
  // (true = road hidden/uncertain in imagery, lower confidence).
  edges: [
    { id: "E1", wayId: "W1", roadName: "Cantonment-Lanka Road", source: "N1", target: "N2", weight: 1.2, occluded: false },
    { id: "E2", wayId: "W2", roadName: "Cantonment-Maidagin Road", source: "N1", target: "N3", weight: 0.9, occluded: false },
    { id: "E3", wayId: "W3", roadName: "Lanka-Sundarpur Road", source: "N2", target: "N5", weight: 1.0, occluded: false },
    { id: "E4", wayId: "W4", roadName: "Maidagin-Sigra Road", source: "N3", target: "N4", weight: 1.4, occluded: true },
    { id: "E5", wayId: "W5", roadName: "Maidagin-Godowlia Road", source: "N3", target: "N6", weight: 1.1, occluded: false },
    { id: "E6", wayId: "W6", roadName: "Sigra-Sundarpur Road", source: "N4", target: "N5", weight: 0.8, occluded: false },
    { id: "E7", wayId: "W7", roadName: "Sigra-Bhelupur Road", source: "N4", target: "N7", weight: 1.3, occluded: false },
    { id: "E8", wayId: "W8", roadName: "Sundarpur-Mahmoorganj Road", source: "N5", target: "N9", weight: 1.1, occluded: false },
    { id: "E9", wayId: "W9", roadName: "Godowlia-Assi Road", source: "N6", target: "N8", weight: 1.0, occluded: false },
    { id: "E10", wayId: "W10", roadName: "Godowlia-Rathyatra Road", source: "N6", target: "N10", weight: 1.6, occluded: true },
    { id: "E11", wayId: "W11", roadName: "Bhelupur-Mahmoorganj Road", source: "N7", target: "N9", weight: 1.0, occluded: false },
    { id: "E12", wayId: "W12", roadName: "Bhelupur-Rathyatra Road", source: "N7", target: "N10", weight: 1.9, occluded: false },
    // E13 is the single link between the N8/N6 cluster and the rest of the
    // graph via N3 — removing it (or E5) creates a real articulation point,
    // useful for demoing the bridge-finding criticality engine.
    { id: "E13", wayId: "W13", roadName: "Assi-Cantonment Road", source: "N8", target: "N1", weight: 2.0, occluded: false }
  ]
};