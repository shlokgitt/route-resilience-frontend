const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function fetchGraph() {
  const res = await fetch(`${BASE_URL}/graph`);
  if (!res.ok) throw new Error("Failed to fetch graph");
  return res.json();
}

export async function fetchNearest(lat, lng) {
  const res = await fetch(`${BASE_URL}/nearest?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Failed to fetch nearest node");
  return res.json();
}

export async function fetchRoute(from, to, algo, blockedEdgeIds) {
  const params = new URLSearchParams({ from, to, algo });
  if (blockedEdgeIds.size) params.set("blocked", [...blockedEdgeIds].join(","));
  const res = await fetch(`${BASE_URL}/route?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch route");
  return res.json();
}

export async function fetchCriticality(blockedEdgeIds) {
  const params = new URLSearchParams();
  if (blockedEdgeIds.size) params.set("blocked", [...blockedEdgeIds].join(","));
  const res = await fetch(`${BASE_URL}/criticality?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch criticality");
  return res.json();
}

export async function simulateBlockage(edgeIds) {
  const res = await fetch(`${BASE_URL}/simulate-blockage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edgeIds })
  });
  if (!res.ok) throw new Error("Failed to simulate blockage");
  return res.json();
}
