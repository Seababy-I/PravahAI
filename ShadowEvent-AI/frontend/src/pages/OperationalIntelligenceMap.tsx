import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../api/client";
import { MapContainer, CircleMarker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import HeatmapLayer from "../components/HeatmapLayer";
import { Radio } from "lucide-react";

const BAND_COLOR: Record<string, string> = {
  Critical: "#ef4444", High: "#f97316", Medium: "#f59e0b", Low: "#10b981",
};

export default function OperationalIntelligenceMap({ hideControls = false }: { hideControls?: boolean }) {
  const [shadowEvents, setShadowEvents] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [heatData, setHeatData] = useState<number[][]>([]);
  const [shadowHeatData, setShadowHeatData] = useState<number[][]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Layer toggles
  const [showIncidentHeatmap, setShowIncidentHeatmap] = useState(true);
  const [showShadowHeatmap, setShowShadowHeatmap] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showShadowEvents, setShowShadowEvents] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/forecast?limit=10&named_only=true`),
      axios.get(`${API_BASE}/shadow-events?limit=50&named_only=true`),
      axios.get(`${API_BASE}/hotspots?limit=25`),
      axios.get(`${API_BASE}/heatmap-data`, { params: { layer: "incidents" } }),
      axios.get(`${API_BASE}/heatmap-data`, { params: { layer: "shadow" } }),
    ]).then(([f, s, h, hd, shd]) => {
      setForecast(f.data.data || []);
      setShadowEvents(s.data.data || []);
      setHotspots(h.data.data || []);
      setHeatData(hd.data.points || []);
      setShadowHeatData(shd.data.points || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!hideControls && (
        <div className="page-header">
          <div>
            <div className="page-title">
              Operational Intel Map
            </div>
            <div className="page-subtitle">SERI-weighted shadow events &amp; hotspots on Bengaluru</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
              color: "#9D5FF5", display: "flex", alignItems: "center", gap: 6
            }}>
              <Radio size={14} /> Live Map
            </div>
          </div>
        </div>
      )}

      <div className="page-body" style={{ flex: 1, display: "flex", gap: 16, minHeight: 0, overflow: "hidden" }}>

        {/* Left Panel */}
        {!hideControls && (
          <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

          {/* Layer Toggles */}
          <div className="card" style={{ padding: "14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.05em" }}>MAP LAYERS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Incidents Heatmap", state: showIncidentHeatmap, set: setShowIncidentHeatmap, color: "#0ea5e9" },
                { label: "Shadow SERI Heatmap", state: showShadowHeatmap, set: setShowShadowHeatmap, color: "#ef4444" },
                { label: "Hotspot Markers", state: showHotspots, set: setShowHotspots, color: "#f97316" },
                { label: "Shadow Event Dots", state: showShadowEvents, set: setShowShadowEvents, color: "#8b5cf6" },
              ].map(({ label, state, set, color }) => (
                <label key={label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-primary)", cursor: "pointer" }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, border: `2px solid ${state ? color : "var(--border)"}`,
                    background: state ? `${color}30` : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", flexShrink: 0,
                  }}>
                    {state && <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />}
                  </div>
                  <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} style={{ display: "none" }} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Top Shadow Events */}
          <div className="card" style={{ padding: "14px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.05em" }}>TOP SHADOW EVENTS</div>
            {loading ? <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Loading...</div> :
              shadowEvents.slice(0, 8).map((e: any, i: number) => (
                <div key={i}
                  onClick={() => setSelectedLocation({ type: "shadow", data: e })}
                  style={{
                    padding: "8px 0", borderBottom: "1px solid var(--border)", cursor: "pointer",
                    borderLeft: selectedLocation?.data === e ? `3px solid ${BAND_COLOR[e.seri_band]}` : "3px solid transparent",
                    paddingLeft: 8, transition: "all 0.15s",
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.corridor}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.day_name} &middot; {e.time_bucket?.replace(/_/g, " ")}</div>
                  <div style={{ color: BAND_COLOR[e.seri_band], fontSize: 12, fontWeight: 700 }}>SERI: {e.seri?.toFixed(1)}</div>
                </div>
              ))
            }
          </div>

          {/* Top Hotspots */}
          <div className="card" style={{ padding: "14px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.05em" }}>TOP HOTSPOTS</div>
            {hotspots.slice(0, 5).map((h: any, i: number) => (
              <div key={i}
                onClick={() => setSelectedLocation({ type: "hotspot", data: h })}
                style={{
                  padding: "8px 0", borderBottom: "1px solid var(--border)", cursor: "pointer",
                  borderLeft: selectedLocation?.data === h ? `3px solid ${BAND_COLOR[h.risk_level]}` : "3px solid transparent",
                  paddingLeft: 8,
                }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.corridor}</div>
                <div style={{ color: BAND_COLOR[h.risk_level], fontSize: 12, fontWeight: 700 }}>Risk: {h.risk_level}</div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Map */}
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", position: "relative", minHeight: 400 }}>
          {loading ? (
            <div className="loading-wrapper"><div className="spinner" /></div>
          ) : (
            <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: "100%", width: "100%" }} preferCanvas>
              {/* CARTO Dark base map - always visible */}
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                subdomains="abcd"
                maxZoom={20}
              />

              {/* Heatmaps */}
              {showIncidentHeatmap && heatData.length > 0 && (
                <HeatmapLayer points={heatData} />
              )}
              {showShadowHeatmap && shadowHeatData.length > 0 && (
                <HeatmapLayer
                  points={shadowHeatData}
                  options={{ radius: 30, blur: 25, maxZoom: 15, gradient: { 0.3: "#8b5cf6", 0.6: "#ef4444", 1.0: "#fbbf24" } }}
                />
              )}

              {/* Hotspot markers */}
              {showHotspots && hotspots.filter((h: any) => h.lat && h.lon).map((h: any, i: number) => (
                <CircleMarker
                  key={`hs-${i}`}
                  center={[h.lat, h.lon]}
                  radius={12}
                  color={BAND_COLOR[h.risk_level] || "#f97316"}
                  fillColor={BAND_COLOR[h.risk_level] || "#f97316"}
                  fillOpacity={0.35}
                  weight={2}
                  eventHandlers={{ click: () => setSelectedLocation({ type: "hotspot", data: h }) }}
                >
                  <Popup>
                    <b>{h.corridor}</b><br />
                    Risk: {h.risk_level}<br />
                    Incidents: {h.total_incidents}<br />
                    Score: {h.hotspot_score?.toFixed(3)}
                  </Popup>
                </CircleMarker>
              ))}

              {/* Shadow event dots */}
              {showShadowEvents && shadowEvents.filter((e: any) => e.lat_centroid && e.lon_centroid).map((e: any, i: number) => (
                <CircleMarker
                  key={`se-${i}`}
                  center={[e.lat_centroid, e.lon_centroid]}
                  radius={5}
                  color={BAND_COLOR[e.seri_band] || "#8b5cf6"}
                  fillColor={BAND_COLOR[e.seri_band] || "#8b5cf6"}
                  fillOpacity={0.8}
                  weight={1}
                  eventHandlers={{ click: () => setSelectedLocation({ type: "shadow", data: e }) }}
                >
                  <Popup>
                    <b>{e.corridor}</b><br />
                    SERI: {e.seri?.toFixed(1)} ({e.seri_band})<br />
                    {e.day_name} &middot; {e.time_bucket?.replace(/_/g, " ")}<br />
                    Incidents: {e.incident_count} | Cause: {e.top_cause?.replace(/_/g, " ")}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Right Panel */}
        <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Selected location details */}
          <div className="card" style={{ padding: "14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.05em" }}>SELECTED LOCATION</div>
            {!selectedLocation ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Click a marker or list item to view details here.</div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{selectedLocation.data.corridor}</div>
                {selectedLocation.type === "shadow" && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div>Type: <b style={{ color: "var(--text-primary)" }}>Shadow Event</b></div>
                    <div>SERI: <b style={{ color: BAND_COLOR[selectedLocation.data.seri_band] }}>{selectedLocation.data.seri?.toFixed(2)} ({selectedLocation.data.seri_band})</b></div>
                    <div>Recurrence: <b style={{ color: "var(--accent-cyan)" }}>{(selectedLocation.data.recurrence_score * 100).toFixed(1)}%</b></div>
                    <div>Time: {selectedLocation.data.day_name} &middot; {selectedLocation.data.time_bucket?.replace(/_/g, " ")}</div>
                    <div>Incidents: {selectedLocation.data.incident_count}</div>
                    <div>Top Cause: {selectedLocation.data.top_cause?.replace(/_/g, " ")}</div>
                  </div>
                )}
                {selectedLocation.type === "hotspot" && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div>Type: <b style={{ color: "var(--text-primary)" }}>Hotspot</b></div>
                    <div>Risk: <b style={{ color: BAND_COLOR[selectedLocation.data.risk_level] }}>{selectedLocation.data.risk_level}</b></div>
                    <div>Total Incidents: <b>{selectedLocation.data.total_incidents}</b></div>
                    <div>Hotspot Score: {selectedLocation.data.hotspot_score?.toFixed(3)}</div>
                    <div>Top Cause: {selectedLocation.data.top_cause?.replace(/_/g, " ")}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Forecast */}
          <div className="card" style={{ padding: "14px", flex: 1, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, letterSpacing: "0.05em" }}>UPCOMING FORECAST</div>
            {forecast.slice(0, 8).map((f: any, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.corridor}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.day_name} &middot; {f.time_bucket?.replace(/_/g, " ")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${(f.forecast_score || 0) * 100}%`, height: "100%", background: BAND_COLOR[f.forecast_band] || "#10b981", borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: BAND_COLOR[f.forecast_band] }}>{f.forecast_band}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="card" style={{ padding: "12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.05em" }}>LEGEND</div>
            {Object.entries(BAND_COLOR).map(([band, color]) => (
              <div key={band} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{band}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
