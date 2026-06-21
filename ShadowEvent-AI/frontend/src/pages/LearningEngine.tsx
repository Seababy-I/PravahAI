import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "../api/client";
import { Brain, ArrowRight } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
const DARK_TIP = {
  contentStyle:{background:"#131c2e",border:"1px solid #1e2d47",borderRadius:8,color:"#f1f5f9",fontSize:12}
};
const RATING_COLORS: Record<string,string> = {
  Accurate:"#10b981", Partial:"#f59e0b", Inaccurate:"#ef4444",
};

export default function LearningEngine() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ id:"", rating:"Accurate", actual:"0.5", notes:"" });
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const load = () => {
    axios.get(`${API_BASE}/learning-history`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!feedbackForm.id) return;
    setSubmitting(true); setFeedbackMsg("");
    try {
      await axios.post(`${API_BASE}/feedback`, {
        forecast_log_id: parseInt(feedbackForm.id),
        user_rating: feedbackForm.rating,
        actual_score: parseFloat(feedbackForm.actual) || 0,
        notes: feedbackForm.notes,
      });
      setFeedbackMsg("Feedback submitted. Reloading...");
      setTimeout(() => { load(); setFeedbackMsg(""); }, 1000);
    } catch(e:any) {
      setFeedbackMsg(e.response?.data?.detail || "Error submitting feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const acc = data?.accuracy || {};
  const breakdown = acc.breakdown || {};
  const total = acc.total_feedback || 0;

  // Build chart data from history
  const history = data?.history || [];
  const errorsByCorr: Record<string,number[]> = {};
  history.forEach((h:any) => {
    if (!errorsByCorr[h.corridor]) errorsByCorr[h.corridor] = [];
    errorsByCorr[h.corridor].push(h.error_pct);
  });
  const corrStats = Object.entries(errorsByCorr).map(([corridor, errors]) => ({
    corridor: corridor.length > 20 ? corridor.slice(0,20)+"..." : corridor,
    avg_error: parseFloat((errors.reduce((a,b)=>a+b,0)/errors.length).toFixed(1)),
    count: errors.length,
  })).sort((a,b)=>b.avg_error-a.avg_error);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">
            <Brain size={24} style={{ marginRight: 8, display: "inline-block", verticalAlign: "middle" }} />
            Adaptive Learning Engine
          </div>
          <div className="page-subtitle">Ground truth feedback loop for continuous accuracy improvement</div>
        </div>
      </div>

      <div className="page-body">
        {/* Architecture explainer */}
        <div className="card" style={{marginBottom:20}}>
          <div className="section-title" style={{marginBottom:14}}>How the Learning Loop Works</div>
          <div style={{display:"flex",alignItems:"center",gap:0,flexWrap:"wrap"}}>
            {["Forecast Generated","→","Actual Event Observed","→","User Marks Accuracy","→","Error Computed & Stored","→","Corridor Bias Identified"].map((s,i)=>(
              <div key={i} style={{
                padding: s==="→" ? "0 8px" : "10px 16px",
                background: s==="→" ? "transparent" : "var(--bg-secondary)",
                border: s==="→" ? "none" : "1px solid var(--border)",
                borderRadius: 8,
                color: s==="→" ? "var(--accent-cyan)" : "var(--text-secondary)",
                fontSize: s==="→" ? 20 : 12,
                fontWeight: s==="→" ? 700 : 500,
                margin: "4px 2px",
              }}>{s}</div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:12,color:"var(--text-muted)"}}>
            <b>Important:</b> This is NOT reinforcement learning or model weight updates.
            It is a feedback audit loop that surfaces corridor-level forecast bias so analysts
            can adjust priorities. Held-out MAE: <span style={{color:"var(--accent-cyan)"}}>
              {acc.held_out_mae !== undefined ? `${(acc.held_out_mae*100).toFixed(2)}%` : "—"}
            </span>
            &nbsp;across {acc.held_out_slots || 0} slots (last 2 weeks of dataset as pseudo-actuals).
          </div>
        </div>

        {/* KPI row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20}}>
          {[
            {label:"Total Feedback", value:total, color:"var(--accent-cyan)"},
            {label:"Accurate Marks",  value:(breakdown.Accurate?.count||0), color:"#10b981"},
            {label:"Partial Marks",   value:(breakdown.Partial?.count||0),  color:"#f59e0b"},
            {label:"Inaccurate Marks",value:(breakdown.Inaccurate?.count||0),color:"#ef4444"},
          ].map(({label,value,color})=>(
            <div key={label} className="card" style={{textAlign:"center",padding:"16px"}}>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:6}}>{label}</div>
              <div style={{fontSize:28,fontWeight:800,color}}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{marginBottom:20}}>
          {/* Error by corridor */}
          <div className="card">
            <div className="section-title" style={{marginBottom:14}}>Avg Forecast Error by Corridor</div>
            {corrStats.length === 0
              ? <div style={{textAlign:"center",padding:"40px 0",color:"var(--text-muted)"}}>
                  No feedback data yet. Submit forecasts below to populate.
                </div>
              : (
                <div style={{height:240}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={corrStats.slice(0,8)} layout="vertical" barSize={12}>
                      <XAxis type="number" tickFormatter={v=>`${v}%`} tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="corridor" tick={{fill:"#94a3b8",fontSize:10}} axisLine={false} tickLine={false} width={130}/>
                      <Tooltip {...DARK_TIP} formatter={(v:any)=>`${v}% avg error`}/>
                      <Bar dataKey="avg_error" radius={[0,4,4,0]}>
                        {corrStats.slice(0,8).map((_,i)=>(
                          <Cell key={i} fill={i<2?"#ef4444":i<4?"#f97316":"#3b82f6"}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </div>

          {/* Submit feedback form */}
          <div className="card">
            <div className="section-title" style={{marginBottom:14}}>Submit Forecast Feedback</div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:6}}>Forecast Log ID</label>
              <input className="input-field" placeholder="e.g. 42" value={feedbackForm.id}
                onChange={e=>setFeedbackForm(f=>({...f,id:e.target.value}))}/>
              <div style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>
                (Find IDs in the forecast table below)
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:6}}>Accuracy Rating</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {["Accurate","Partial","Inaccurate"].map(r=>(
                  <button key={r} onClick={()=>setFeedbackForm(f=>({...f,rating:r}))}
                    style={{
                      padding:"10px 6px",borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:12,fontWeight:600,
                      borderColor: feedbackForm.rating===r ? RATING_COLORS[r] : "var(--border)",
                      background:  feedbackForm.rating===r ? `${RATING_COLORS[r]}18` : "var(--bg-secondary)",
                      color:       feedbackForm.rating===r ? RATING_COLORS[r] : "var(--text-muted)",
                    }}
                  >{r}</button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:6}}>
                Actual Observed Score (0.0–1.0)
              </label>
              <input className="input-field" type="number" min="0" max="1" step="0.1"
                value={feedbackForm.actual}
                onChange={e=>setFeedbackForm(f=>({...f,actual:e.target.value}))}/>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:"var(--text-muted)",display:"block",marginBottom:6}}>Notes</label>
              <textarea className="input-field" rows={2} value={feedbackForm.notes}
                onChange={e=>setFeedbackForm(f=>({...f,notes:e.target.value}))}
                placeholder="Optional analyst notes..." style={{resize:"vertical"}}/>
            </div>
            <button className="btn-primary" style={{width:"100%"}} onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
            {feedbackMsg && <div style={{marginTop:8,fontSize:12,color:feedbackMsg.startsWith("Error")?"var(--accent-red)":"var(--accent-green)"}}>{feedbackMsg}</div>}
          </div>
        </div>

        {/* History table */}
        {loading
          ? <div className="loading-wrapper"><div className="spinner"/></div>
          : history.length > 0 && (
            <div className="card">
              <div className="section-title" style={{marginBottom:14}}>Feedback History (last {history.length})</div>
              <div style={{overflowX:"auto"}}>
                <table className="data-table">
                  <thead>
                    <tr><th>ID</th><th>Corridor</th><th>Day</th><th>Bucket</th><th>Forecast</th><th>Rating</th><th>Error %</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {history.slice(0,20).map((h:any)=>(
                      <tr key={h.id}>
                        <td style={{color:"var(--text-muted)"}}>{h.forecast_log_id}</td>
                        <td style={{fontWeight:600}}>{h.corridor}</td>
                        <td>{h.day_name}</td>
                        <td>{h.time_bucket?.replace(/_/g," ")}</td>
                        <td>
                          <div style={{color:"var(--text-muted)",fontSize:12}}>Forecast: {h.forecast_score.toFixed(1)} <ArrowRight size={10} style={{verticalAlign:"middle"}} /> Actual: {h.actual_score.toFixed(1)}</div>
                        </td>
                        <td><span style={{color:RATING_COLORS[h.user_rating],fontWeight:700}}>{h.user_rating}</span></td>
                        <td style={{color:h.error_pct>30?"#ef4444":h.error_pct>15?"#f59e0b":"#10b981"}}>
                          {h.error_pct?.toFixed(1)}%
                        </td>
                        <td style={{fontSize:11,color:"var(--text-muted)"}}>{h.feedback_at?.slice(0,16)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
