import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../api/client";
import { Database, Settings, Eye, BarChart2, Calendar, Search, Flame, Brain, AlertTriangle } from "lucide-react";

const sections = [
  { id:"dataset",    icon:<Database size={16} />,   label:"Dataset" },
  { id:"pipeline",   icon:<Settings size={16} />,   label:"Pipeline" },
  { id:"shadow",     icon:<Eye size={16} />,         label:"Shadow Events" },
  { id:"seri",       icon:<BarChart2 size={16} />,  label:"SERI" },
  { id:"forecast",   icon:<Calendar size={16} />,  label:"Forecast" },
  { id:"similarity", icon:<Search size={16} />,     label:"Similarity" },
  { id:"hotspots",   icon:<Flame size={16} />,     label:"Hotspots" },
  { id:"learning",   icon:<Brain size={16} />,     label:"Learning" },
  { id:"limits",     icon:<AlertTriangle size={16} />, label:"Limitations" },
];

export default function Methodology() {
  const [meta, setMeta] = useState<any>(null);
  const [active, setActive] = useState("dataset");

  useEffect(() => {
    axios.get(`${API_BASE}/methodology`).then(r => setMeta(r.data)).catch(()=>{});
  }, []);

  const ds = meta?.dataset || {};

  const card = (content: React.ReactNode) => (
    <div className="card fade-in" style={{marginBottom:20}}>{content}</div>
  );

  const formula = (text: string) => (
    <div style={{
      fontFamily:"monospace",fontSize:13,background:"rgba(6,182,212,0.07)",
      border:"1px solid rgba(6,182,212,0.2)",borderRadius:8,padding:"14px 18px",
      color:"var(--accent-cyan)",margin:"12px 0",lineHeight:1.8,
    }}>{text}</div>
  );

  const tag = (text: string, color="#3b82f6") => (
    <span style={{
      padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,
      background:`${color}18`,border:`1px solid ${color}40`,color,marginRight:6,marginBottom:4,
      display:"inline-block",
    }}>{text}</span>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            How PravahAI Works
          </div>
          <div className="page-subtitle">Technical methodology, formulas, assumptions, and limitations</div>
        </div>
      </div>

      <div className="page-body" style={{display:"flex",gap:20,alignItems:"flex-start"}}>
        {/* Sticky sidebar nav */}
        <div style={{
          width:160,flexShrink:0,position:"sticky",top:80,
          background:"var(--bg-card)",border:"1px solid var(--border)",
          borderRadius:12,padding:"12px 0",
        }}>
          {sections.map(s=>(
            <div key={s.id}
              onClick={()=>{ setActive(s.id); document.getElementById(s.id)?.scrollIntoView({behavior:"smooth"});}}
              style={{
                padding:"10px 16px",cursor:"pointer",fontSize:13,display:"flex",gap:10,alignItems:"center",
                borderLeft: active===s.id ? "3px solid #9D5FF5" : "3px solid transparent",
                color: active===s.id ? "#9D5FF5" : "var(--text-secondary)",
                background: active===s.id ? "rgba(124,58,237,0.08)" : "transparent",
                transition:"all 0.15s",
              }}
            >
              <span>{s.icon}</span><span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{flex:1}}>
          {/* Dataset */}
          <div id="dataset">{card(<>
            <div className="section-title" style={{marginBottom:16}} data-id="dataset"><Database size={20} style={{display:"inline",verticalAlign:"middle",marginRight:8}} /> Dataset</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {[
                {label:"Source",   value:"ASTRAM Traffic Events"},
                {label:"Rows",     value:(ds.rows||8139).toLocaleString()},
                {label:"Columns",  value:`${ds.columns_raw || 46} raw → ${ds.columns_used || 20} used`},
                {label:"Span",     value:ds.span||"Nov 2023 – Apr 2024"},
                {label:"Weeks",    value:`${ds.weeks||23} distinct weeks`},
                {label:"City",     value:ds.city||"Bengaluru, India"},
              ].map(({label,value})=>(
                <div key={label} style={{background:"var(--bg-secondary)",padding:"12px",borderRadius:8,border:"1px solid var(--border)"}}>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:4}}>{label}</div>
                  <div style={{fontWeight:700,color:"var(--text-primary)",fontSize:14}}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7}}>
              <b style={{color:"var(--accent-yellow)"}}>Timestamp note:</b>{" "}
              {meta?.timestamp_note || "Timestamps are UTC. IST = UTC + 5:30. Peak at 2-3 AM IST reflects Bengaluru freight vehicle operation hours (trucks restricted from city daytime entry by BBMP rules)."}
            </div>
            <div style={{marginTop:12,fontSize:13,color:"var(--text-muted)"}}>
              Bounding box: Lat [{ds.bounding_box?.lat?.join(", ")}] &middot; Lon [{ds.bounding_box?.lon?.join(", ")}]
            </div>
          </>)}</div>

          {/* Pipeline */}
          <div id="pipeline">{card(<>
            <div className="section-title" style={{marginBottom:16}}><Settings size={20} style={{display:"inline",verticalAlign:"middle",marginRight:8}} /> Data Pipeline</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:0,alignItems:"center",marginBottom:16}}>
              {["Raw CSV\n8,173 rows","→","Cleaning\n34 dropped","→","Feature Eng.\n44 columns","→","Shadow Events\n666 slots","→","SERI Scores\n0–100","→","Forecast\n7-day view","→","SQLite DB\n+ KNN Index"].map((s,i)=>(
                <div key={i} style={{
                  padding:s==="→"?"0 6px":"12px 14px",
                  background:s==="→"?"transparent":"var(--bg-secondary)",
                  border:s==="→"?"none":"1px solid var(--border)",
                  borderRadius:8, color:s==="→"?"var(--accent-cyan)":"var(--text-secondary)",
                  fontSize:s==="→"?20:11, fontWeight:s==="→"?800:500,
                  whiteSpace:"pre", textAlign:"center", margin:"4px 2px",
                }}>{s}</div>
              ))}
            </div>
            <div style={{fontSize:13,color:"var(--text-muted)"}}>
              Steps: Data Cleaning (pipeline.py) → Feature Engineering with IST correction (features.py)
              → Shadow Event Discovery (shadow_events.py) → SERI computation → Hotspot Detection (DBSCAN)
              → Risk Calendar → Forecast Engine → Similarity Index (KNN BallTree) → API (FastAPI)
            </div>
          </>)}</div>

          {/* Shadow Events */}
          <div id="shadow">{card(<>
            <div className="section-title" style={{marginBottom:16}}><Eye size={20} style={{display:"inline",verticalAlign:"middle",marginRight:8}} /> Shadow Events</div>
            <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:12}}>
              A <b style={{color:"var(--accent-cyan)"}}>Shadow Event</b> is any
              <code style={{margin:"0 6px",padding:"2px 6px",background:"rgba(6,182,212,0.1)",borderRadius:4}}>(corridor, day_of_week, time_bucket_IST)</code>
              combination that appeared in at least 1 of 23 dataset weeks. These are recurring traffic
              patterns that operate "in the background" even when no single incident is prominent.
            </p>
            {formula("shadow_event = GROUP BY (corridor, day_name, time_bucket_ist)\nwhere time_bucket_ist uses IST hour (UTC + 5:30)\n\nTotal shadow events: 666\nCritical: 4 | High: 11 | Medium: 48 | Low: 603")}
            <div style={{fontSize:12,color:"var(--text-muted)"}}>
              <b>Non-corridor handling:</b> 38% of incidents (3,090) are labeled "Non-corridor" — a catch-all
              for incidents outside named corridors. These are included in the data but excluded from
              named-corridor rankings and forecasts by default via the <code>named_only=true</code> flag.
            </div>
          </>)}</div>

          {/* SERI */}
          <div id="seri">{card(<>
            <div className="section-title" style={{marginBottom:16}}><BarChart2 size={20} /> SERI — Shadow Event Risk Index</div>
            {formula(`SERI = ( 0.4 × recurrence_score
      + 0.4 × frequency_score
      + 0.2 × severity_score ) × 100

recurrence_score  = distinct_weeks_present / 23          ∈ [0, 1]
frequency_score   = incident_count / max(incident_count)  ∈ [0, 1]
severity_score    = Σ cause_weight / max(Σ cause_weight)  ∈ [0, 1]

SERI ∈ [0, 100]`)}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[
                {band:"Low",     range:"0–30",   color:"#10b981", fRange:"0–0.25"},
                {band:"Medium",  range:"31–60",  color:"#f59e0b", fRange:"0.26–0.50"},
                {band:"High",    range:"61–80",  color:"#f97316", fRange:"0.51–0.70"},
                {band:"Critical",range:"81–100", color:"#ef4444", fRange:">0.70"},
              ].map(({band,range,color,fRange})=>(
                <div key={band} style={{padding:"12px",textAlign:"center",borderRadius:8,background:`${color}12`,border:`1px solid ${color}30`}}>
                  <div style={{fontWeight:800,color,fontSize:16}}>{band}</div>
                  <div style={{fontSize:12,color:"var(--text-muted)",marginTop:4}}>SERI {range}</div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:2}}>Forecast {fRange}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:13,marginBottom:12}}><b style={{color:"var(--text-primary)"}}>Cause Severity Weights (heuristic):</b></div>
            <div>
              {Object.entries(meta?.seri?.cause_severity_weights || {accident:3,congestion:2,water_logging:1.5,construction:1.5,tree_fall:1.2,vehicle_breakdown:1}).map(([k,v])=>(
                tag(`${k.replace(/_/g," ")}: ${v}x`, v as number>=2?"#ef4444":v as number>=1.5?"#f59e0b":"#94a3b8")
              ))}
            </div>
            <div style={{marginTop:12,fontSize:12,color:"var(--text-muted)"}}>
              <b>Assumption:</b> Cause weights are domain heuristics set by subject-matter judgment, not empirically calibrated from outcome data.
            </div>
          </>)}</div>

          {/* Forecast */}
          <div id="forecast">{card(<>
            <div className="section-title" style={{marginBottom:16}}><Calendar size={20} /> Forecast Methodology</div>
            <div style={{marginBottom:12,padding:"10px 14px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:8,fontSize:12}}>
              <b style={{color:"var(--accent-yellow)"}}>Label:</b> Historical Pattern-Based Forecast — NOT real-time prediction
            </div>
            {formula(`forecast_score = 0.7 × recurrence_score
              + 0.3 × recent_trend_score

recurrence_score   = distinct_weeks_present / 23
recent_trend_score = incident_count_in_last_4_weeks / max_count_in_any_slot

"Recent" = last 4 complete training weeks (weeks 52/2023 + 5-7/2024)
Holdout  = last 2 weeks (8-9/2024) used for MAE validation

Validation MAE: ~13.75 percentage points on held-out weeks`)}
            <div style={{fontSize:12,color:"var(--text-muted)"}}>
              <b>Limitation:</b> Cannot predict one-off events, monsoon floods, election rallies,
              VIP convoys, or any event not captured in the 23-week training window.
            </div>
          </>)}</div>

          {/* Similarity */}
          <div id="similarity">{card(<>
            <div className="section-title" style={{marginBottom:16}}><Search size={20} style={{display:"inline",verticalAlign:"middle",marginRight:8}} /> KNN Similarity Engine</div>
            {formula(`Algorithm:   KNN BallTree with Euclidean distance
k:           10 nearest neighbours
Features:    [latitude, longitude, hour_ist, day_of_week, event_cause_id, corridor_id]
Normalization: StandardScaler (zero mean, unit variance)

similarity_score = 1 / (1 + euclidean_distance)    ∈ (0, 1]`)}
            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:12}}>
              <b>Limitation:</b> <code>event_cause_id</code> and <code>corridor_id</code> are label-encoded
              (ordinal integers), meaning KNN treats numeric distance between categories as meaningful.
              This is a known approximation — one-hot encoding would be more correct but increases dimensionality
              significantly for 20+ corridor categories.
            </div>
          </>)}</div>

          {/* Hotspots */}
          <div id="hotspots">{card(<>
            <div className="section-title" style={{marginBottom:16}}><Flame size={20} /> Hotspot Detection</div>
            {formula(`Method A — Corridor Ranking:
  hotspot_score = Σ risk_weight(i) / max(Σ risk_weight)   ∈ [0, 1]
  risk_weight   = 1.5× if High priority, 2.0× if accident

Method B — DBSCAN Spatial Clustering:
  eps         = 0.008° (~890m at Bengaluru latitude)
  min_samples = 10 incidents
  clusters    = 14 found   (270 noise points)`)}
            <div style={{fontSize:12,color:"var(--text-muted)"}}>
              <b>Non-corridor bias:</b> "Non-corridor" is excluded from named-corridor rankings
              by default (named_only=true). It covers 38% of incidents spread across all of Bengaluru
              and is NOT a geographic hotspot.
            </div>
          </>)}</div>

          {/* Learning */}
          <div id="learning">{card(<>
            <div className="section-title" style={{marginBottom:16}}><Brain size={20} /> Adaptive Learning Engine</div>
            <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.7,marginBottom:12}}>
              The learning engine is a <b>feedback audit loop</b> — not ML weight training.
              Analysts mark forecast outcomes as Accurate / Partial / Inaccurate. The system computes
              per-corridor error rates to surface systematic over/under-prediction bias.
            </p>
            {formula(`error_pct = |forecast_score - actual_score| / forecast_score × 100

actual_score source:
  - Simulated: last 2 weeks treated as pseudo-actuals (held-out validation)
  - Manual: analyst marks outcome in the Learning Engine UI

No model weights are updated. This is observational feedback logging.`)}
          </>)}</div>

          {/* Limitations */}
          <div id="limits">{card(<>
            <div className="section-title" style={{marginBottom:16}}><AlertTriangle size={20} style={{display:"inline",verticalAlign:"middle",marginRight:8}} /> Assumptions &amp; Limitations</div>
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:700,color:"var(--text-primary)",marginBottom:10}}>Documented Assumptions</div>
              {(meta?.assumptions || [
                "Patterns from Nov 2023–Apr 2024 are representative of typical Bengaluru traffic.",
                "risk_weight multipliers (1.5× High, 2× accident) are domain heuristics, not calibrated.",
                "SERI severity weights are domain heuristics.",
                "What-If attendance multipliers (1.0/1.3/1.7) are estimates, not empirically derived.",
                "Non-corridor label covers 38% of incidents — geographically dispersed, not a hotspot.",
              ]).map((a:string,i:number)=>(
                <div key={i} style={{
                  padding:"10px 14px",marginBottom:8,borderRadius:6,
                  background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",
                  fontSize:12,color:"var(--text-secondary)",
                }}>
                  <span style={{color:"var(--accent-yellow)",marginRight:8}}>A{i+1}</span>{a}
                </div>
              ))}
            </div>
            <div>
              <div style={{fontWeight:700,color:"var(--text-primary)",marginBottom:10}}>Known Limitations</div>
              {(meta?.limitations || [
                "Cannot account for one-off events, weather, or policy changes.",
                "end_datetime is 94% null — no incident duration analysis possible.",
                "Zone data is 27% unknown after imputation.",
                "Forecast does not incorporate real-time feeds.",
              ]).map((l:string,i:number)=>(
                <div key={i} style={{
                  padding:"10px 14px",marginBottom:8,borderRadius:6,
                  background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",
                  fontSize:12,color:"var(--text-secondary)",
                }}>
                  <span style={{color:"var(--accent-red)",marginRight:8}}>L{i+1}</span>{l}
                </div>
              ))}
            </div>
          </>)}</div>
        </div>
      </div>
    </div>
  );
}
