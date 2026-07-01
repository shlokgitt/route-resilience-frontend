import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fetchGraph, fetchNearest, fetchCriticality, fetchRoute } from "./api";
import "./App.css";

const CITY_CENTER = [25.317, 82.973];

function criticalityColor(score) {
  if (score >= 75) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  if (score > 0) return "#10b981";
  return "#475569";
}

// Component that listens for map clicks to place start/end points
function MapClickHandler({ onMapClick, disableMapClicks }) {
  const map = useMapEvents({
    click(e) {
      if (!disableMapClicks) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function App() {
  const [graph, setGraph] = useState(null);
  const [criticality, setCriticality] = useState([]);
  const [blocked, setBlocked] = useState(new Set());
  const [blockReasons, setBlockReasons] = useState(new Map()); // edgeId -> reason
  const [route, setRoute] = useState(null);
  const [endpoints, setEndpoints] = useState({ from: null, to: null });
  const [fromNode, setFromNode] = useState(null);
  const [toNode, setToNode] = useState(null);
  const [algo, setAlgo] = useState("dijkstra");
  const [status, setStatus] = useState("Loading network...");
  const [toast, setToast] = useState(null);
  const [selectedBlockReason, setSelectedBlockReason] = useState("construction");
  const toastTimer = useRef(null);

  const blockReasonOptions = [
    { value: "construction", label: "🚧 Construction", color: "#f59e0b" },
    { value: "flood", label: "🌊 Flood/Rain", color: "#3b82f6" },
    { value: "accident", label: "🚗 Accident", color: "#ef4444" },
    { value: "landslide", label: "⛰️ Landslide", color: "#8b5cf6" },
    { value: "maintenance", label: "🔧 Maintenance", color: "#10b981" },
    { value: "disaster", label: "🔥 Disaster", color: "#dc2626" }
  ];

  function showToast(message, type = "info") {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetchGraph()
      .then((g) => {
        setGraph(g);
        setStatus("");
      })
      .catch(() => setStatus("Could not reach backend. Is the API running on :4000?"));
  }, []);

  const refreshCriticality = useCallback((blockedSet) => {
    fetchCriticality(blockedSet)
      .then((d) => setCriticality(d.ranked))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (graph) refreshCriticality(blocked);
  }, [graph]);

  const criticalityById = useMemo(() => {
    const map = new Map();
    for (const c of criticality) map.set(c.edgeId, c);
    return map;
  }, [criticality]);

  const nodeById = useMemo(() => {
    const map = new Map();
    if (graph) for (const n of graph.nodes) map.set(n.id, n);
    return map;
  }, [graph]);

  const edgeById = useMemo(() => {
    const map = new Map();
    if (graph) for (const e of graph.edges) map.set(e.id, e);
    return map;
  }, [graph]);

  const edgeIdsByWay = useMemo(() => {
    const map = new Map();
    if (!graph) return map;
    for (const e of graph.edges) {
      const key = e.wayId || e.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e.id);
    }
    return map;
  }, [graph]);

  function toggleBlock(edgeId) {
    const clicked = edgeById.get(edgeId);
    const wayKey = clicked?.wayId || edgeId;
    const wayEdgeIds = edgeIdsByWay.get(wayKey) || [edgeId];
    const allCurrentlyBlocked = wayEdgeIds.every((id) => blocked.has(id));

    const next = new Set(blocked);
    const nextReasons = new Map(blockReasons);
    
    for (const id of wayEdgeIds) {
      if (allCurrentlyBlocked) {
        next.delete(id);
        nextReasons.delete(id);
      } else {
        next.add(id);
        nextReasons.set(id, selectedBlockReason);
      }
    }
    setBlocked(next);
    setBlockReasons(nextReasons);
    refreshCriticality(next);

    const roadName = clicked?.roadName || wayKey;
    const reasonLabel = blockReasonOptions.find(r => r.value === selectedBlockReason)?.label || selectedBlockReason;
    
    if (allCurrentlyBlocked) {
      showToast(`Unblocked: ${roadName}`, "rerouted");
    } else {
      showToast(`Blocked: ${roadName} (${reasonLabel})`, "blocked");
    }

    // Auto-reroute if we have endpoints set
    if (endpoints.from && endpoints.to) {
      console.log("Auto-rerouting due to road block");
      runRoute(endpoints.from, endpoints.to, next);
    }
  }

  async function handleMapClick(lat, lng) {
    try {
      const { node } = await fetchNearest(lat, lng);
      if (!node) return;

      setEndpoints((prev) => {
        let next;
        if (!prev.from || (prev.from && prev.to)) {
          // First click or reset: set start
          next = { from: node.id, to: null };
          setFromNode(node);
          setToNode(null);
          setRoute(null);
          setStatus("");
          console.log("Set start point:", node.id);
        } else {
          // Second click: set end and compute route
          next = { from: prev.from, to: node.id };
          setToNode(node);
          console.log("Set end point:", node.id, "computing route from", prev.from);
          runRoute(prev.from, node.id, blocked);
        }
        return next;
      });
    } catch (err) {
      console.error("Error in handleMapClick:", err);
      showToast("Could not find nearest node", "blocked");
    }
  }

  function runRoute(from, to, blockedSet) {
    setStatus("Computing route...");
    console.log("Computing route from", from, "to", to, "with blocked edges:", [...blockedSet]);
    fetchRoute(from, to, algo, blockedSet)
      .then((r) => {
        console.log("Route result:", r);
        setRoute(r);
        if (r.reachable) {
          setStatus("");
          showToast(`Route found: ${r.distance.toFixed(2)} km`, "rerouted");
        } else {
          setStatus("No route available — blockage isolates this destination.");
          showToast("No alternative route available", "blocked");
        }
      })
      .catch((err) => {
        console.error("Route computation failed:", err);
        setStatus("Routing failed.");
        showToast("Failed to compute route", "blocked");
      });
  }

  function resetSimulation() {
    setBlocked(new Set());
    setBlockReasons(new Map());
    setRoute(null);
    setEndpoints({ from: null, to: null });
    setFromNode(null);
    setToNode(null);
    setStatus("");
    if (graph) refreshCriticality(new Set());
    showToast("Simulation reset", "rerouted");
  }

  if (!graph) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>{status || "Loading network…"}</p>
      </div>
    );
  }

  const routeEdgeSet = new Set(route?.edges || []);
const canBlockRoads = true; // Allow blocking roads anytime

  // Determine click hint text
  let hintText;
  if (!endpoints.from) {
    hintText = <><span className="hint-key">Click</span> anywhere on the map to set your start point</>;
  } else if (!endpoints.to) {
    hintText = <><span className="hint-key">Click</span> again to set your destination</>;
  } else {
    hintText = <><span className="hint-key">Click</span> a road to block it · <span className="hint-key">Click</span> the map to start a new route</>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">
          <h1>Route Resilience</h1>
          <p className="subtitle">Disaster-resilient navigation &amp; criticality analysis</p>
        </div>
        <div className="header-controls">
          <label>
            Algorithm
            <select value={algo} onChange={(e) => setAlgo(e.target.value)}>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
            </select>
          </label>
          <button className="btn-reset" onClick={resetSimulation}>Reset</button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <section className="sidebar-section">
            <h2>How to use</h2>
            <ol>
              <li>Select start and end points from dropdowns above (or click on map).</li>
              <li>Route auto-computes when both points are selected.</li>
              <li>Choose a blockage reason below, then click any road to block it.</li>
            </ol>
          </section>

          <section className="sidebar-section">
            <h2>Blockage Reason</h2>
            <select 
              value={selectedBlockReason}
              onChange={(e) => setSelectedBlockReason(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--border-subtle)', 
                background: 'var(--bg-primary)', 
                color: 'var(--text-primary)', 
                fontFamily: 'var(--sans)', 
                fontSize: '12px', 
                cursor: 'pointer' 
              }}
            >
              {blockReasonOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </section>

          <section className="sidebar-section">
            <h2>Select Route Points</h2>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '4px' }}>START POINT</label>
              <select 
                value={endpoints.from || ''} 
                onChange={(e) => {
                  const nodeId = e.target.value;
                  if (nodeId) {
                    setFromNode(nodeById.get(nodeId));
                    setEndpoints(prev => ({ ...prev, from: nodeId, to: prev.to }));
                    setRoute(null);
                    if (endpoints.to) {
                      runRoute(nodeId, endpoints.to, blocked);
                    }
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--sans)', fontSize: '12px', cursor: 'pointer' }}
              >
                <option value="">Select start node</option>
                {graph.nodes.map(node => (
                  <option key={node.id} value={node.id}>{node.name || node.id}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '4px' }}>END POINT</label>
              <select 
                value={endpoints.to || ''} 
                onChange={(e) => {
                  const nodeId = e.target.value;
                  if (nodeId) {
                    setToNode(nodeById.get(nodeId));
                    setEndpoints(prev => ({ ...prev, from: prev.from, to: nodeId }));
                    if (endpoints.from) {
                      runRoute(endpoints.from, nodeId, blocked);
                    }
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--sans)', fontSize: '12px', cursor: 'pointer' }}
              >
                <option value="">Select end node</option>
                {graph.nodes.map(node => (
                  <option key={node.id} value={node.id}>{node.name || node.id}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="sidebar-section">
            <h2>Route Status</h2>
            {endpoints.from && (
              <p className="status-line">
                <span className="status-label">From </span>
                <span className="status-value">{nodeById.get(endpoints.from)?.name || endpoints.from}</span>
              </p>
            )}
            {endpoints.to && (
              <p className="status-line">
                <span className="status-label">To </span>
                <span className="status-value">{nodeById.get(endpoints.to)?.name || endpoints.to}</span>
              </p>
            )}
            {!endpoints.from && <p className="muted">Select start and end points above or click the map</p>}

            {route && route.reachable && (
              <div className="distance-badge">
                <div>
                  <div className="dist-number">{route.distance.toFixed(2)}</div>
                  <div className="dist-unit">kilometers</div>
                </div>
                <div className="dist-detail">
                  via {route.path.length} nodes
                  {blocked.size > 0 && ` · ${[...new Set([...blocked].map((id) => edgeById.get(id)?.wayId || id))].length} road(s) blocked`}
                </div>
              </div>
            )}
            {route && !route.reachable && (
              <p className="status-warning">Unreachable — blockages isolate the destination. Try unblocking a road.</p>
            )}
            {status && <p className="status-warning">{status}</p>}
          </section>

          <section className="sidebar-section">
            <h2>Criticality Legend</h2>
            <div className="legend-row"><span className="dot" style={{ background: "#ef4444", color: "#ef4444" }} /> Critical (bridge / high traffic)</div>
            <div className="legend-row"><span className="dot" style={{ background: "#f59e0b", color: "#f59e0b" }} /> Moderate</div>
            <div className="legend-row"><span className="dot" style={{ background: "#10b981", color: "#10b981" }} /> Low</div>
            <div className="legend-row"><span className="dot" style={{ background: "#475569", color: "#475569" }} /> Negligible</div>
            <div className="legend-row"><span className="dot" style={{ background: "#8b5cf6", color: "#8b5cf6" }} /> Occluded (routable but penalized)</div>
          </section>

          <section className="sidebar-section">
            <h2>Top Critical Roads</h2>
            <ul className="critical-list">
              {criticality.slice(0, 5).map((c) => (
                <li key={c.edgeId}>
                  <span className="dot" style={{ background: criticalityColor(c.criticality), color: criticalityColor(c.criticality) }} />
                  {edgeById.get(c.edgeId)?.roadName || c.edgeId} — {c.criticality}
                  {c.isBridge ? " ⚠ bridge" : ""}
                </li>
              ))}
              {criticality.length === 0 && <li className="muted">Loading…</li>}
            </ul>
          </section>

          <section className="sidebar-section">
            <h2>Blocked Roads ({[...new Set([...blocked].map((id) => edgeById.get(id)?.wayId || id))].length})</h2>
            {blocked.size === 0 && <p className="muted">None — click any road to simulate a blockage.</p>}
            <ul className="critical-list">
              {[...new Set([...blocked].map((id) => edgeById.get(id)?.wayId || id))].map((wayId) => {
                const sampleEdgeId = edgeIdsByWay.get(wayId)?.[0];
                const name = edgeById.get(sampleEdgeId)?.roadName || wayId;
                const reason = blockReasons.get(sampleEdgeId);
                const reasonConfig = blockReasonOptions.find(r => r.value === reason);
                return (
                  <li key={wayId}>
                    <span className="dot" style={{ background: reasonConfig?.color || '#dc2626', color: reasonConfig?.color || '#dc2626' }} />
                    {name} {reasonConfig?.label ? `(${reasonConfig.label})` : ''}
                  </li>
                );
              })}
            </ul>
            
            {/* Manual block test button */}
            {route && route.reachable && route.edges.length > 0 && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                <button 
                  onClick={() => {
                    const firstRouteEdge = route.edges[0];
                    console.log("Manually blocking edge:", firstRouteEdge);
                    toggleBlock(firstRouteEdge);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--accent-red)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--accent-red)',
                    fontFamily: 'var(--sans)',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all var(--transition)'
                  }}
                >
                  Test: Block First Route Edge
                </button>
              </div>
            )}
          </section>
        </aside>

        <main className="map-wrap">
          <MapContainer center={CITY_CENTER} zoom={14} className="map">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} disableMapClicks={Boolean(endpoints.from && endpoints.to)} />

            {/* Render all edges */}
            {graph.edges.map((edge) => {
              const a = nodeById.get(edge.source);
              const b = nodeById.get(edge.target);
              if (!a || !b) return null;
              const isBlocked = blocked.has(edge.id);
              const isOnRoute = routeEdgeSet.has(edge.id);
              const c = criticalityById.get(edge.id);
              const blockReason = blockReasons.get(edge.id);
              const reasonConfig = blockReasonOptions.find(r => r.value === blockReason);

              const color = isBlocked
                ? (reasonConfig?.color || "#dc2626")
                : isOnRoute
                ? "#06b6d4"
                : edge.occluded
                ? "#8b5cf6"
                : criticalityColor(c?.criticality ?? 0);

              return (
                <Polyline
                  key={edge.id}
                  positions={[[a.lat, a.lng], [b.lat, b.lng]]}
                  interactive={true}
                  pathOptions={{
                    color,
                    weight: isOnRoute ? 6 : isBlocked ? 4 : 2,
                    dashArray: isBlocked ? "8 6" : edge.occluded ? "4 8" : null,
                    opacity: isBlocked ? 0.8 : isOnRoute ? 1 : 0.5,
                    className: isOnRoute ? "route-clickable" : ""
                  }}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent.stopPropagation();
                      e.originalEvent.preventDefault();
                      console.log("Clicked edge:", edge.id, "on route:", isOnRoute);
                      toggleBlock(edge.id);
                    },
                    mouseover: (e) => {
                      if (isOnRoute && !isBlocked) {
                        e.target.setStyle({ weight: 8, opacity: 1 });
                      }
                    },
                    mouseout: (e) => {
                      if (isOnRoute && !isBlocked) {
                        e.target.setStyle({ weight: 6, opacity: 1 });
                      }
                    }
                  }}
                >
                  <Tooltip sticky>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12 }}>
                      <strong>{edge.roadName || edge.id}</strong> · {edge.weight.toFixed(2)} km
                      {edge.occluded ? " · ⚠ occluded (1.3x cost)" : ""}
                      {c ? ` · criticality ${c.criticality}${c.isBridge ? " (bridge)" : ""}` : ""}
                      {isBlocked ? ` · 🚫 ${reasonConfig?.label || "BLOCKED"}` : " · click to block"}
                      {isOnRoute && !isBlocked ? " · 📍 ON YOUR ROUTE" : ""}
                    </span>
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* Animated route overlay — drawn on top with dashed flowing animation */}
            {/* Temporarily disabled to fix click issues */}
            {/* {route && route.reachable && route.edges.map((edgeId) => {
              const edge = edgeById.get(edgeId);
              if (!edge) return null;
              const a = nodeById.get(edge.source);
              const b = nodeById.get(edge.target);
              if (!a || !b) return null;
              return (
                <Polyline
                  key={`anim-${edgeId}`}
                  positions={[[a.lat, a.lng], [b.lat, b.lng]]}
                  pathOptions={{
                    color: "#38bdf8",
                    weight: 2,
                    dashArray: "12 12",
                    opacity: 0.4,
                    className: "route-animated"
                  }}
                  interactive={false}
                />
              );
            })} */}

            {/* Start marker */}
            {fromNode && (
              <>
                <CircleMarker
                  center={[fromNode.lat, fromNode.lng]}
                  radius={14}
                  pathOptions={{
                    color: "#10b981",
                    fillColor: "#10b981",
                    fillOpacity: 0.15,
                    weight: 2,
                  }}
                  interactive={false}
                />
                <CircleMarker
                  center={[fromNode.lat, fromNode.lng]}
                  radius={6}
                  pathOptions={{
                    color: "#fff",
                    fillColor: "#10b981",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                  interactive={false}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600 }}>START</span>
                  </Tooltip>
                </CircleMarker>
              </>
            )}

            {/* End marker */}
            {toNode && (
              <>
                <CircleMarker
                  center={[toNode.lat, toNode.lng]}
                  radius={14}
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.15,
                    weight: 2,
                  }}
                  interactive={false}
                />
                <CircleMarker
                  center={[toNode.lat, toNode.lng]}
                  radius={6}
                  pathOptions={{
                    color: "#fff",
                    fillColor: "#f59e0b",
                    fillOpacity: 1,
                    weight: 2,
                  }}
                  interactive={false}
                >
                  <Tooltip permanent direction="top" offset={[0, -10]}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600 }}>END</span>
                  </Tooltip>
                </CircleMarker>
              </>
            )}
          </MapContainer>

          {/* Bottom hint bar */}
          <div className="click-hint">{hintText}</div>

          {/* Toast notification */}
          {toast && (
            <div className={`toast toast-${toast.type}`}>
              {toast.message}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
