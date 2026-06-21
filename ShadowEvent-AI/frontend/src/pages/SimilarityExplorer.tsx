import { useEffect, useState } from "react";
import { searchIncidents, getSimilarEvents } from "../api/endpoints";
import { Search, MapPin, Calendar, Clock, ClipboardList } from "lucide-react";

export default function SimilarityExplorer() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [selectedId, setSelectedId] = useState<string>("");
  const [similarData, setSimilarData] = useState<any>(null);
  const [searchQ, setSearchQ] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Initial load
  useEffect(() => {
    setLoadingSearch(true);
    searchIncidents({ limit: 50, offset: 0 })
      .then(r => { setIncidents(r.data); setTotalIncidents(r.total); })
      .finally(() => setLoadingSearch(false));
  }, []);

  const handleSearch = () => {
    setLoadingSearch(true);
    searchIncidents({ q: searchQ, limit: 50 })
      .then(r => { setIncidents(r.data); setTotalIncidents(r.total); })
      .finally(() => setLoadingSearch(false));
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setLoadingSimilar(true);
    getSimilarEvents(id, 10)
      .then(setSimilarData)
      .finally(() => setLoadingSimilar(false));
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return "#10b981";
    if (score >= 0.6) return "#3b82f6";
    if (score >= 0.4) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            Pattern Match Explorer
          </div>
          <div className="page-subtitle">Select an incident — find the top 10 most similar historical events via KNN</div>
        </div>
      </div>

      <div className="page-body">
        <div className="grid-2" style={{ alignItems: "start" }}>
          {/* Left: Incident Selector */}
          <div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="section-header">
                <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}><ClipboardList size={18} /> Select an Incident</div>
                <span className="section-count">{totalIncidents.toLocaleString()} total</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  className="filter-input"
                  style={{ flex: 1 }}
                  placeholder="Search by address, corridor, cause..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
                <button className="btn btn-primary" onClick={handleSearch}>Search</button>
              </div>

              {loadingSearch ? (
                <div className="loading-wrapper"><div className="spinner" /></div>
              ) : (
                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {incidents.map((inc: any) => (
                    <div
                      key={inc.id}
                      onClick={() => handleSelect(inc.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        marginBottom: 6,
                        cursor: "pointer",
                        background: selectedId === inc.id ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${selectedId === inc.id ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.05)"}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{inc.id}</span>
                        <span className={`risk-badge ${inc.priority === "High" ? "High" : "Low"}`}>{inc.priority}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
                        {inc.event_cause?.replace(/_/g, " ")} · {inc.corridor}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {inc.day_name} · {inc.time_bucket?.replace(/_/g, " ")} · {inc.address?.slice(0, 60)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Similar Events */}
          <div>
            {!selectedId && (
              <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ marginBottom: 16 }}><Search size={48} color="var(--text-muted)" /></div>
                <div style={{ color: "var(--text-secondary)", fontSize: 16 }}>Select an incident on the left to find similar historical events</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>Powered by KNN with Euclidean distance on lat, lon, hour, day, cause, corridor</div>
              </div>
            )}

            {selectedId && loadingSimilar && (
              <div className="loading-wrapper"><div className="spinner" /></div>
            )}

            {selectedId && !loadingSimilar && similarData && (
              <>
                {/* Query incident */}
                <div className="card" style={{ marginBottom: 16, borderColor: "rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.06)" }}>
                  <div style={{ fontSize: 11, color: "var(--accent-blue)", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> Selected Incident</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                    {similarData.query_incident?.event_cause?.replace(/_/g, " ")} · {similarData.query_incident?.corridor}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8 }}>
                    <span style={{ marginRight: 16, display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={14} /> {similarData.query_incident?.day_name}</span>
                    <span style={{ marginRight: 16, display: "inline-flex", alignItems: "center", gap: 4 }}><Clock size={14} /> {similarData.query_incident?.start_datetime_ist || `${similarData.query_incident?.hour}:00`}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={14} /> {similarData.query_incident?.address?.slice(0, 70)}</span>
                  </div>
                </div>

                {/* Similar events */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {similarData.similar_events?.map((e: any) => (
                    <div key={e.id} className="similarity-card">
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-muted)", minWidth: 24 }}>#{e.rank}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {e.event_cause?.replace(/_/g, " ")} Â· {e.corridor}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                          {e.day_name} Â· {e.time_bucket?.replace(/_/g, " ")} Â· {e.start_datetime_ist || `${e.hour}:00`}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.address?.slice(0, 60)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: getSimilarityColor(e.similarity_score) }}>
                          {(e.similarity_score * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>similarity</div>
                        <span className={`risk-badge ${e.priority === "High" ? "High" : "Low"}`} style={{ marginTop: 4, display: "inline-block" }}>{e.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
