import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../api/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, AlertTriangle, MapPin, ArrowRight } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const BUCKETS = ["early_morning","morning","afternoon","evening","night","midnight"];
const BUCKET_LABEL: Record<string,string> = {
  early_morning:"Early Morning",morning:"Morning",afternoon:"Afternoon",
  evening:"Evening",night:"Night",midnight:"Midnight",
};
const BAND_COLOR: Record<string,string> = {
  Critical:"#ef4444", High:"#f97316", Medium:"#f59e0b", Low:"#10b981",
};

const DARK_TIP = {
  contentStyle:{background:"#131c2e",border:"1px solid #1e2d47",borderRadius:8,color:"#f1f5f9",fontSize:12}
};

export default function Forecast() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedBucket, setSelectedBucket] = useState<string>("");
  const [namedOnly, setNamedOnly] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/forecast`, { params: { named_only: namedOnly, limit: 200 } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [namedOnly]);

  if (loading) return <div className="loading-wrapper"><div className="spinner"/></div>;
  if (!data) return <div className="page-body">Forecast not available.</div>;

  const meta = data.metadata || {};
  const weekly = data.weekly_view || {};
  const dayData = DAYS.map(d => {
    const slots = Object.values(weekly[d] || {}) as any[];
    const maxScore = slots.length ? Math.max(...slots.map((s:any)=>s.max_score||0)) : 0;
    const topBand = slots.find((s:any)=>s.max_score===maxScore)?.risk_level || "Low";
    return { day: d.slice(0,3), score: maxScore, band: topBand };
  });

  // Top 15 forecast items for selected day
  const allSlots: any[] = [];
  BUCKETS.forEach(b => {
    const slot = weekly[selectedDay]?.[b];
    if (slot?.top_corridors?.length) {
      slot.top_corridors.forEach((c:any) => allSlots.push({ ...c, bucket: b }));
    }
  });
  const topSlots = allSlots.sort((a,b) => b.forecast_score - a.forecast_score).slice(0,15);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            <TrendingUp size={24} style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} />
            Weekly Risk Forecast
          </div>
          <div className="page-subtitle" style={{color:"var(--warning)",fontWeight:600}}>
            7-day lookahead based on recurrence and recent trends — powered by IST-aligned buckets
          </div>
        </div>
        <div style={{textAlign:"right",fontSize:12,color:"var(--text-muted)"}}>
          Formula: 0.7 × Recurrence + 0.3 × Recent Trend<br/>
          MAE (held-out validation): <span style={{color:"var(--info)"}}>{meta.validation_mae ?? "—"}</span>
        </div>
      </div>

      <div className="page-body">
        {/* Disclaimer banner */}
        <div style={{
          background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.35)",
          borderRadius:10, padding:"12px 18px", marginBottom:20,
          display:"flex", gap:12, alignItems:"center", fontSize:13,
        }}>
          <AlertTriangle size={20} className="text-warning" />
          <div>
            <b style={{color:"var(--accent-yellow)"}}>Historical Pattern-Based Forecast</b>
            <span style={{color:"var(--text-secondary)",marginLeft:8}}>
              Based on {meta.total_slots} corridor-day-time patterns from Nov 2023–Apr 2024.
              Cannot predict one-off events, weather, or policy changes.
            </span>
          </div>
          <label style={{marginLeft:"auto", display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--text-muted)", cursor:"pointer"}}>
            <input type="checkbox" checked={namedOnly} onChange={e=>setNamedOnly(e.target.checked)} />
            Named corridors only
          </label>
        </div>

        {/* Day strip */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:10, marginBottom:24}}>
          {dayData.map(({day,score,band}) => (
            <div key={day}
              onClick={()=>setSelectedDay(DAYS.find(d=>d.startsWith(day))!)}
              className="card"
              style={{
                textAlign:"center", padding:"14px 8px", cursor:"pointer",
                borderColor: selectedDay.startsWith(day) ? BAND_COLOR[band] : "var(--border)",
                background: selectedDay.startsWith(day) ? `${BAND_COLOR[band]}18` : "var(--bg-card)",
                transition:"all 0.2s",
              }}
            >
              <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:700}}>{day}</div>
              <div style={{fontSize:26,fontWeight:800,color:BAND_COLOR[band],margin:"6px 0"}}>
                {(score*100).toFixed(0)}%
              </div>
              <span className={`risk-badge ${band}`}>{band}</span>
            </div>
          ))}
        </div>

        {/* Selected day detail */}
        <div className="grid-2" style={{marginBottom:20}}>
          <div className="card">
            <div className="section-title" style={{marginBottom:14}}>{selectedDay} — Top Risk Slots</div>
            {topSlots.length === 0
              ? <div style={{color:"var(--text-muted)",padding:"20px 0"}}>No data for this day.</div>
              : (
                <div style={{height:260}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSlots.slice(0,10)} layout="vertical" barSize={14}>
                      <XAxis type="number" domain={[0,1]} tickFormatter={v=>`${(v*100).toFixed(0)}%`}
                        tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="corridor" tick={{fill:"#94a3b8",fontSize:10}}
                        axisLine={false} tickLine={false} width={130}/>
                      <Tooltip {...DARK_TIP} formatter={(v:any)=>`${(v*100).toFixed(1)}%`}/>
                      <Bar dataKey="forecast_score" radius={[0,4,4,0]}>
                        {topSlots.slice(0,10).map((e,i)=>(
                          <Cell key={i} fill={BAND_COLOR[e.forecast_band]||"#3b82f6"}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </div>

          {/* Time bucket grid for selected day */}
          <div className="card">
            <div className="section-title" style={{marginBottom:14}}>Risk by Time Slot</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
              {BUCKETS.map(b => {
                const slot = weekly[selectedDay]?.[b];
                const score = slot?.max_score || 0;
                const band  = slot?.risk_level || "Low";
                const top   = slot?.top_corridors?.[0];
                return (
                  <div key={b}
                    onClick={()=>setSelectedBucket(selectedBucket===b?"":b)}
                    style={{
                      padding:"12px",borderRadius:8,cursor:"pointer",
                      background: selectedBucket===b ? `${BAND_COLOR[band]}18` : "var(--bg-secondary)",
                      border:`1px solid ${selectedBucket===b ? BAND_COLOR[band] : "var(--border)"}`,
                      transition:"all 0.15s",
                    }}
                  >
                    <div style={{fontSize:11,color:"var(--text-muted)",fontWeight:600,marginBottom:4}}>
                      {BUCKET_LABEL[b]}
                    </div>
                    <div style={{fontSize:22,fontWeight:800,color:BAND_COLOR[band]}}>
                      {(score*100).toFixed(0)}%
                    </div>
                    <span className={`risk-badge ${band}`} style={{fontSize:9}}>{band}</span>
                    {top && <div style={{fontSize:10,color:"var(--text-muted)",marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{top.corridor}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected bucket detail */}
        {selectedBucket && weekly[selectedDay]?.[selectedBucket]?.top_corridors?.length > 0 && (
          <div className="card" style={{marginBottom:20}}>
            <div className="section-title" style={{marginBottom:14}}>
              {selectedDay} · {BUCKET_LABEL[selectedBucket]} — Top Corridors
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="data-table">
                <thead>
                  <tr><th>Corridor</th><th>Forecast Score</th><th>Factors</th><th>SERI</th><th>Top Cause</th><th>Band</th></tr>
                </thead>
                <tbody>
                  {weekly[selectedDay][selectedBucket].top_corridors.map((c:any,i:number)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600, display: "flex", alignItems: "center", gap: 6}}>
                        <MapPin size={12} /> {c.corridor}
                      </td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:60,height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                            <div style={{width:`${c.forecast_score*100}%`,height:"100%",background:BAND_COLOR[c.forecast_band],borderRadius:3}}/>
                          </div>
                          <span style={{fontSize:12}}>{(c.forecast_score*100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                          Recurrence: {(c.recurrence_score * 100).toFixed(0)}% <ArrowRight size={10} /> 
                          Trend: {(c.recent_trend_score * 100).toFixed(0)}%
                        </div>
                      </td>
                      <td style={{fontWeight:700}}>{c.seri?.toFixed(1)}</td>
                      <td><span className={`tag cause-${c.top_cause}`}>{c.top_cause?.replace(/_/g," ")}</span></td>
                      <td><span className={`risk-badge ${c.forecast_band}`}>{c.forecast_band}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Validation box */}
        <div className="card">
          <div className="section-title" style={{marginBottom:12}}>Model Validation (Held-Out)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
            {[
              {label:"Validation MAE",value:(meta.validation_mae*100)?.toFixed(2)+"%" ,sub:"Mean absolute error on held-out weeks"},
              {label:"Covered Slots",value:meta.validation_covered_slots,sub:"Slots with actual incidents in holdout"},
              {label:"Holdout Weeks",value:meta.holdout_weeks?.join(", "),sub:"Weeks used as pseudo-actuals"},
              {label:"Training Weeks",value:"21 weeks",sub:"Used to compute recurrence + trend"},
            ].map(({label,value,sub})=>(
              <div key={label} style={{background:"var(--bg-secondary)",padding:"14px",borderRadius:8,border:"1px solid var(--border)"}}>
                <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{label}</div>
                <div style={{fontSize:18,fontWeight:800,color:"var(--accent-cyan)"}}>{value}</div>
                <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
