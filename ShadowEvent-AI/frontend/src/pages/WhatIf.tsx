import { useState } from "react";
import axios from "axios";
import API_BASE from "../api/client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import MapMyIndiaStaticOverlay from "../components/MapMyIndiaStaticOverlay";
import OperationalPanel from "../components/OperationalPanel";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const EVENT_TYPES = [
  { value:"public_event",  label:"Public Event (Rally, Concert, Fair)" },
  { value:"procession",    label:"Procession / Parade" },
  { value:"vip_movement",  label:"VIP Movement" },
  { value:"protest",       label:"Protest / Agitation" },
  { value:"construction",  label:"Road Construction" },
  { value:"other",         label:"Other" },
];
const ATTENDANCE = [
  { value:"small",  label:"Small  (< 1,000)" },
  { value:"medium", label:"Medium (1,000 - 10,000)" },
  { value:"large",  label:"Large  (> 10,000)" },
];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const BAND_COLOR: Record<string,string> = {
  Critical:"#ef4444", High:"#f97316", Medium:"#f59e0b", Low:"#10b981",
};

// Popular Bengaluru event venues with coordinates
const PRESETS = [
  { label:"Kanteerava Stadium",        lat:12.9716, lon:77.5832 },
  { label:"Palace Grounds",            lat:12.9974, lon:77.5812 },
  { label:"NIMHANS Convention Centre", lat:12.9438, lon:77.5980 },
  { label:"Silk Board Junction",       lat:12.9178, lon:77.6222 },
  { label:"Hebbal Flyover",            lat:13.0358, lon:77.5970 },
  { label:"Custom (enter below)",      lat:12.9716, lon:77.5946 },
];

export default function WhatIf() {
  const [form, setForm] = useState({
    event_name: "New Event",
    lat: 12.9716, lon: 77.5946,
    event_type: "public_event",
    attendance: "medium",
    day_of_week: 6,
    preset: 0,
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]  = useState("");
  const [mmiConfig, setMmiConfig] = useState<any>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/mmi-config`).then(res => setMmiConfig(res.data)).catch(() => {});
  }, []);

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setForm(f => ({ ...f, preset: -1, lat: parseFloat(e.latlng.lat.toFixed(4)), lon: parseFloat(e.latlng.lng.toFixed(4)) }));
      },
    });
    return null;
  }

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx];
    setForm(f => ({ ...f, preset: idx, lat: p.lat, lon: p.lon }));
  };

  const submit = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await axios.post(`${API_BASE}/what-if`, {
        event_name:  form.event_name,
        lat:         form.lat,
        lon:         form.lon,
        event_type:  form.event_type,
        attendance:  form.attendance,
        day_of_week: form.day_of_week,
      });
      setResult(r.data);
    } catch(e:any) {
      setError(e.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            Scenario Simulator
          </div>
          <div className="page-subtitle">Historical analog lookup — NOT a traffic simulation</div>
        </div>
      </div>

      <div className="page-body">
        {/* Methodology notice */}
        <div style={{
          background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.3)",
          borderRadius:10, padding:"12px 18px", marginBottom:20, fontSize:13,
        }}>
          <b style={{color:"var(--accent-cyan)"}}>How this works:</b>
          <span style={{color:"var(--text-secondary)",marginLeft:8}}>
            Finds historical incidents within <b>2 km</b> of the event location, matches incidents
            of the same type on the same day-of-week, and estimates affected corridor SERI using
            a documented attendance multiplier (Small ×1.0 / Medium ×1.3 / Large ×1.7).
            No vehicle counts or traffic flow are simulated.
          </span>
        </div>

        <div className="grid-2" style={{marginBottom:20}}>
          {/* Input form */}
          <div className="card">
            <div className="section-title" style={{marginBottom:16}}>Event Parameters</div>

            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Event Name</label>
              <input className="input-field" value={form.event_name}
                onChange={e=>setForm(f=>({...f,event_name:e.target.value}))} placeholder="Event name"/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Venue</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                {PRESETS.map((p,i)=>(
                  <button key={i} onClick={()=>applyPreset(i)}
                    style={{
                      padding:"6px 8px",fontSize:11,borderRadius:6,border:"1px solid",
                      cursor:"pointer",textAlign:"center",
                      borderColor: form.preset===i ? "var(--accent-cyan)" : "var(--border)",
                      background:  form.preset===i ? "rgba(6,182,212,0.1)" : "var(--bg-secondary)",
                      color: form.preset===i ? "var(--accent-cyan)" : "var(--text-secondary)",
                    }}
                  >{p.label}</button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <label style={{fontSize:11,color:"var(--text-muted)"}}>Latitude</label>
                  <input className="input-field" type="number" step="0.0001" value={form.lat}
                    onChange={e=>setForm(f=>({...f,lat:parseFloat(e.target.value)||f.lat}))}/>
                </div>
                <div>
                  <label style={{fontSize:11,color:"var(--text-muted)"}}>Longitude</label>
                  <input className="input-field" type="number" step="0.0001" value={form.lon}
                    onChange={e=>setForm(f=>({...f,lon:parseFloat(e.target.value)||f.lon}))}/>
                </div>
              </div>

              <div style={{ marginTop: 12, height: 200, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                <MapContainer center={[form.lat, form.lon]} zoom={12} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
                  <MapClickHandler />
                  <Marker position={[form.lat, form.lon]} />
                </MapContainer>
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Event Type</label>
              <select className="select-field" value={form.event_type}
                onChange={e=>setForm(f=>({...f,event_type:e.target.value}))}>
                {EVENT_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Expected Attendance</label>
                <select className="select-field" value={form.attendance}
                  onChange={e=>setForm(f=>({...f,attendance:e.target.value}))}>
                  {ATTENDANCE.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:12,color:"var(--text-muted)",marginBottom:6}}>Day of Week</label>
                <select className="select-field" value={form.day_of_week}
                  onChange={e=>setForm(f=>({...f,day_of_week:parseInt(e.target.value)}))}>
                  {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            </div>

            <button className="btn-primary" style={{width:"100%"}} onClick={submit} disabled={loading}>
              {loading ? "Analyzing..." : "Run What-If Analysis"}
            </button>
            {error && <div style={{color:"var(--accent-red)",fontSize:12,marginTop:8}}>{error}</div>}
          </div>

          {/* Affected corridors */}
          <div className="card">
            <div className="section-title" style={{marginBottom:14}}>
              Affected Corridors
              {result && <span style={{fontSize:12,color:"var(--text-muted)",marginLeft:8}}>
                Attendance multiplier: ×{result.methodology?.attendance_multiplier}
              </span>}
            </div>
            {!result && !loading && (
              <div style={{textAlign:"center",padding:"60px 0",color:"var(--text-muted)"}}>
                <div style={{fontSize:48,marginBottom:12}}>🗺️</div>
                Configure parameters and run the analysis
              </div>
            )}
            {loading && <div className="loading-wrapper"><div className="spinner"/></div>}
            {result && result.affected_corridors?.length === 0 && (
              <div style={{color:"var(--text-muted)",padding:"40px 0",textAlign:"center"}}>
                No named corridor incidents found within 2 km of this location.
              </div>
            )}
            {result && result.affected_corridors?.map((c:any,i:number)=>(
              <div key={i} style={{
                padding:"14px",marginBottom:10,borderRadius:8,
                background:`${BAND_COLOR[c.estimated_band]}10`,
                border:`1px solid ${BAND_COLOR[c.estimated_band]}40`,
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:700,color:"var(--text-primary)",marginBottom:4}}>{c.corridor}</div>
                    <div style={{fontSize:11,color:"var(--text-muted)"}}>
                      {c.nearby_incidents} nearby incidents · avg {c.avg_distance_km} km
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:22,fontWeight:800,color:BAND_COLOR[c.estimated_band]}}>
                      {c.estimated_seri}
                    </div>
                    <div style={{fontSize:10,color:"var(--text-muted)"}}>SERI</div>
                    <span className={`risk-badge ${c.estimated_band}`}>{c.estimated_band}</span>
                  </div>
                </div>
                <div style={{marginTop:8,fontSize:11,color:"var(--text-muted)"}}>
                  Base SERI: {c.base_seri} × {c.multiplier_used} ({c.multiplier_label}) = {c.estimated_seri}
                </div>
                {/* Operational Guidance inline */}
                <OperationalPanel seri={c.estimated_seri} corridor={c.corridor} compact={true} />
              </div>
            ))}
          </div>
        </div>

        {/* Full-width Operational Guidance — per corridor with diversion playbooks */}
        {result && result.affected_corridors?.length > 0 && (
          <div style={{marginBottom: 20}}>
            <div style={{
              display:"flex", alignItems:"center", gap:10, marginBottom:16,
              padding:"12px 16px", borderRadius:10,
              background:"rgba(99,102,241,0.07)", border:"1px solid rgba(99,102,241,0.18)",
            }}>
              <span style={{fontSize:20}}>🛡️</span>
              <div>
                <div style={{fontWeight:700, fontSize:14, color:"rgba(165,180,252,0.95)"}}>
                  SERI-Driven Operational Guidance
                </div>
                <div style={{fontSize:11, color:"var(--text-muted)", marginTop:2}}>
                  All recommendations are advisory guidance derived from historical SERI data.
                  No exact officer or barricade counts. Requires human approval before deployment.
                </div>
              </div>
            </div>
            {result.affected_corridors.map((c:any, i:number) => (
              <div key={i} style={{marginBottom:20}}>
                <div style={{
                  fontSize:13, fontWeight:700, color:"var(--text-primary)",
                  marginBottom:6, paddingLeft:4,
                  borderLeft:`3px solid ${BAND_COLOR[c.estimated_band] || "#64748b"}`,
                  paddingTop:2, paddingBottom:2,
                }}>
                  {c.corridor}
                  <span style={{marginLeft:8, fontSize:11, fontWeight:400, color:"var(--text-muted)"}}>
                    Estimated SERI: {c.estimated_seri}
                  </span>
                </div>
                <OperationalPanel seri={c.estimated_seri} corridor={c.corridor} compact={false} />
              </div>
            ))}
          </div>
        )}

        {/* Historical analogs */}
        {result && (
          <div className="grid-2">
            <div className="card">
              <div className="section-title" style={{marginBottom:12}}>
                Nearby Historical Incidents ({result.nearby_count} within 2 km)
              </div>
              {result.nearby_incidents?.length === 0
                ? <div style={{color:"var(--text-muted)"}}>No incidents found within 2 km radius.</div>
                : (
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {result.nearby_incidents.slice(0,10).map((inc:any,i:number)=>(
                      <div key={i} style={{
                        padding:"10px",marginBottom:8,borderRadius:6,
                        background:"var(--bg-secondary)",border:"1px solid var(--border)",
                      }}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontWeight:600,fontSize:12}}>{inc.event_cause?.replace(/_/g," ")}</span>
                          <span style={{fontSize:11,color:"var(--text-muted)"}}>{inc.distance_km} km</span>
                        </div>
                        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>
                          {inc.corridor} Â· {inc.day_name} Â· {inc.time_bucket_ist?.replace(/_/g," ")}
                        </div>
                        <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {inc.address}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            <div className="card">
              <div className="section-title" style={{marginBottom:12}}>
                Same-Type Historical Analogs (same event type Â· same day)
              </div>
              {result.cause_analogs?.length === 0
                ? <div style={{color:"var(--text-muted)"}}>No analogs found.</div>
                : (
                  <div style={{maxHeight:280,overflowY:"auto"}}>
                    {result.cause_analogs?.slice(0,8).map((inc:any,i:number)=>(
                      <div key={i} style={{
                        padding:"10px",marginBottom:8,borderRadius:6,
                        background:"var(--bg-secondary)",border:"1px solid var(--border)",
                      }}>
                        <div style={{fontWeight:600,fontSize:12}}>{inc.event_cause?.replace(/_/g," ")}</div>
                        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:3}}>
                          {inc.corridor} Â· {inc.day_name}
                        </div>
                        <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2}}>
                          Priority: <b>{inc.priority}</b> Â· {inc.time_bucket_ist?.replace(/_/g," ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }

              {/* methodology */}
              <div style={{
                marginTop:14,padding:"10px 12px",
                background:"var(--bg-secondary)",borderRadius:8,
                border:"1px solid var(--border)",fontSize:11,color:"var(--text-muted)",
              }}>
                <b>Methodology:</b> {result.methodology?.label}<br/>
                Radius: {result.methodology?.nearby_radius_km} km Â·
                Multiplier rationale: {result.methodology?.multiplier_rationale}<br/>
                <span style={{color:"var(--accent-red)"}}>
                  Limitation: {result.methodology?.limitation}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
