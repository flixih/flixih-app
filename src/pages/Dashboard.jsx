import { useState, useEffect } from "react";
import { Lead } from "../api/entities";
import { searchLeads, generatePreview, sendOutreach } from "../api/backendFunctions";

const STATUS = {
  no_website:   { bg:"#FEF3C7", color:"#92400E", label:"Sin Website" },
  broken:       { bg:"#FEE2E2", color:"#991B1B", label:"Roto" },
  unreachable:  { bg:"#FEE2E2", color:"#991B1B", label:"No Carga" },
  working_bad:  { bg:"#FFF7ED", color:"#9A3412", label:"Malo" },
  working_good: { bg:"#D1FAE5", color:"#065F46", label:"Funciona" },
};

const PRIORITY = {
  "alta prioridad":  { bg:"#FEE2E2", color:"#991B1B", dot:"#DC2626", label:"🔥 Alta" },
  "media prioridad": { bg:"#FFF7ED", color:"#9A3412", dot:"#F97316", label:"⚡ Media" },
  "baja prioridad":  { bg:"#F0FDF4", color:"#166534", dot:"#22C55E", label:"📌 Baja" },
};

const OUTREACH = {
  pendiente:         { bg:"#EFF6FF", color:"#1D4ED8", label:"Pendiente" },
  enviado:           { bg:"#D1FAE5", color:"#065F46", label:"✅ Enviado" },
  sin_email:         { bg:"#F3F4F6", color:"#6B7280", label:"Sin Email" },
  descartado:        { bg:"#F3F4F6", color:"#6B7280", label:"Descartado" },
  requiere_revision: { bg:"#FEF3C7", color:"#92400E", label:"Revisar" },
};

function Pill({ val, map }) {
  const s = map[val] || { bg:"#F3F4F6", color:"#6B7280", label: val || "—" };
  return (
    <span style={{ background:s.bg, color:s.color, padding:"2px 10px",
      borderRadius:999, fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searching, setSearching]   = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab]               = useState("leads");
  const [expanded, setExpanded]     = useState(null);
  const [toast, setToast]           = useState(null);
  const [filter, setFilter]         = useState({ q:"", priority:"", status:"" });
  const [form, setForm]             = useState({
    ubicacion:"Añasco, Puerto Rico",
    categorias:"restaurant,beauty_salon,dentist,car_repair,bakery,electrician,plumber,gym",
    max_leads:20,
    min_reviews:5,
  });
  const [searchResult, setSearchResult] = useState(null);

  const toast$ = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await Lead.filter({}, { sort:"-created_date", limit:500 });
      setLeads(Array.isArray(data) ? data : []);
    } catch(e) {
      toast$("Error cargando leads: " + e.message, "err");
    }
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  const handleSearch = async () => {
    if (!form.ubicacion.trim()) { toast$("Escribe una ubicación", "err"); return; }
    setSearching(true);
    setSearchResult(null);
    try {
      const cats = form.categorias.split(",").map(c=>c.trim()).filter(Boolean);
      const res = await searchLeads({
        ubicacion:   form.ubicacion,
        categorias:  cats,
        max_leads:   parseInt(form.max_leads) || 20,
        min_reviews: parseInt(form.min_reviews) || 5,
      });
      const s = res?.summary || res || {};
      setSearchResult(s);
      await loadLeads();
      toast$(`✅ ${s.leads_guardados || 0} nuevos leads guardados`);
      setTab("leads");
    } catch(e) {
      toast$("Error en búsqueda: " + e.message, "err");
    }
    setSearching(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generatePreview({});
      await loadLeads();
      toast$(`✅ ${res?.previews_generados || 0} previews generados`);
    } catch(e) {
      toast$("Error generando previews: " + e.message, "err");
    }
    setGenerating(false);
  };

  const updateLead = async (id, data) => {
    try {
      await Lead.update(id, data);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    } catch(e) {
      toast$("Error actualizando: " + e.message, "err");
    }
  };

  const handleSendOutreach = async (lead) => {
    if (!lead.email) { toast$("Agrega un email primero", "err"); return; }
    try {
      await sendOutreach({ lead_id: lead.id });
      await updateLead(lead.id, { outreach_status:"enviado" });
      toast$(`✅ Email enviado a ${lead.email}`);
    } catch(e) {
      toast$("Error enviando email: " + e.message, "err");
    }
  };

  const filtered = leads.filter(l => {
    if (filter.priority && l.lead_priority !== filter.priority) return false;
    if (filter.status   && l.website_status !== filter.status)  return false;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      if (![l.nombre_negocio, l.categoria, l.ubicacion_buscada, l.direccion]
          .join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total:      leads.length,
    alta:       leads.filter(l => l.lead_priority === "alta prioridad").length,
    sinWeb:     leads.filter(l => l.website_status === "no_website").length,
    rotos:      leads.filter(l => ["broken","unreachable"].includes(l.website_status)).length,
    conEmail:   leads.filter(l => l.email).length,
    enviados:   leads.filter(l => l.outreach_status === "enviado").length,
  };

  const S = { minHeight:"100vh", background:"#F0F4F8", fontFamily:"'Segoe UI',system-ui,sans-serif" };

  return (
    <div style={S}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:9999,
          background: toast.type === "err" ? "#FEE2E2" : "#D1FAE5",
          color:       toast.type === "err" ? "#991B1B" : "#065F46",
          padding:"14px 22px", borderRadius:12,
          boxShadow:"0 8px 30px rgba(0,0,0,.15)",
          fontSize:14, fontWeight:600, maxWidth:380,
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0F2540,#1A5276)", color:"white", padding:"0 24px", boxShadow:"0 2px 16px rgba(0,0,0,.2)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 0" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800 }}>🌐 Flixih Lead System</div>
            <div style={{ fontSize:12, opacity:.6, marginTop:2 }}>Roy Lorenzo · Websites para PR</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleGenerate} disabled={generating} style={{
              background: generating ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.15)",
              color:"white", border:"1px solid rgba(255,255,255,.25)",
              padding:"8px 16px", borderRadius:8, cursor: generating ? "not-allowed" : "pointer",
              fontSize:13, fontWeight:600,
            }}>{generating ? "⏳ Generando..." : "⚡ Generar Previews"}</button>
            <button onClick={loadLeads} style={{
              background:"rgba(255,255,255,.1)", color:"white",
              border:"1px solid rgba(255,255,255,.2)", padding:"8px 14px",
              borderRadius:8, cursor:"pointer", fontSize:13,
            }}>↺</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", gap:2 }}>
          {[["leads","📋 Leads"],["buscar","🔍 Buscar"],["stats","📊 Stats"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: tab===k ? "white" : "transparent",
              color:       tab===k ? "#0F2540" : "rgba(255,255,255,.7)",
              border:"none", padding:"10px 22px", cursor:"pointer",
              borderRadius:"8px 8px 0 0", fontSize:13,
              fontWeight: tab===k ? 700 : 500,
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 20px" }}>

        {/* ─── STATS TAB ─── */}
        {tab === "stats" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:16 }}>
            {[
              ["📋","Total Leads",    stats.total,    "#0F2540"],
              ["🔥","Alta Prioridad", stats.alta,     "#DC2626"],
              ["🌐","Sin Website",    stats.sinWeb,   "#D97706"],
              ["💔","Rotos / No Carga",stats.rotos,  "#EF4444"],
              ["📧","Con Email",      stats.conEmail, "#059669"],
              ["✅","Enviados",       stats.enviados, "#7C3AED"],
            ].map(([icon,label,val,color]) => (
              <div key={label} style={{ background:"white", borderRadius:14, padding:"22px 16px",
                boxShadow:"0 2px 10px rgba(0,0,0,.07)", textAlign:"center", borderTop:`4px solid ${color}` }}>
                <div style={{ fontSize:28 }}>{icon}</div>
                <div style={{ fontSize:34, fontWeight:800, color, margin:"8px 0 4px" }}>{val}</div>
                <div style={{ fontSize:11, color:"#6B7280", fontWeight:600, textTransform:"uppercase", letterSpacing:".5px" }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ─── BUSCAR TAB ─── */}
        {tab === "buscar" && (
          <div style={{ background:"white", borderRadius:16, padding:28, boxShadow:"0 2px 10px rgba(0,0,0,.07)" }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#0F2540", marginBottom:6 }}>🔍 Buscar Nuevos Leads</h2>
            <p style={{ fontSize:14, color:"#6B7280", marginBottom:24 }}>Busca negocios en Google Maps sin website o con website roto</p>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:24 }}>
              {[
                ["📍 Ubicación","text","ubicacion","Añasco, Puerto Rico"],
                ["🔢 Máx. Leads","number","max_leads","20"],
                ["⭐ Mín. Reviews","number","min_reviews","5"],
              ].map(([lbl,type,key,ph]) => (
                <div key={key}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".5px" }}>{lbl}</label>
                  <input type={type} value={form[key]} placeholder={ph}
                    onChange={e => setForm({...form, [key]: e.target.value})}
                    style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #E5E7EB", borderRadius:10, fontSize:14 }}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:".5px" }}>🏷️ Categorías</label>
                <input value={form.categorias} onChange={e => setForm({...form, categorias:e.target.value})}
                  style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #E5E7EB", borderRadius:10, fontSize:14 }}/>
              </div>
            </div>

            <button onClick={handleSearch} disabled={searching} style={{
              background: searching ? "#94A3B8" : "linear-gradient(135deg,#0F2540,#1A5276)",
              color:"white", border:"none", padding:"13px 36px", borderRadius:12,
              fontSize:15, fontWeight:700, cursor: searching ? "not-allowed" : "pointer",
            }}>{searching ? "⏳ Buscando en Google Maps..." : "🚀 Iniciar Búsqueda"}</button>

            {searchResult && (
              <div style={{ marginTop:24, background:"#F0FDF4", border:"1.5px solid #BBF7D0", borderRadius:14, padding:22 }}>
                <div style={{ fontWeight:800, color:"#065F46", fontSize:15, marginBottom:16 }}>✅ Búsqueda Completada</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12 }}>
                  {[
                    ["Encontrados",     searchResult.total_encontrados],
                    ["Con 5+ Reviews",  searchResult.con_5_reviews],
                    ["Leads Guardados", searchResult.leads_guardados],
                    ["Sin Website",     searchResult.sin_website],
                    ["Alta Prioridad",  searchResult.alta_prioridad],
                  ].map(([k,v]) => (
                    <div key={k} style={{ background:"white", borderRadius:10, padding:"14px 10px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                      <div style={{ fontSize:26, fontWeight:800, color:"#0F2540" }}>{v ?? "—"}</div>
                      <div style={{ fontSize:11, color:"#6B7280", marginTop:4, fontWeight:600 }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── LEADS TAB ─── */}
        {tab === "leads" && (
          <div>
            {/* Filters */}
            <div style={{ background:"white", borderRadius:12, padding:"14px 18px", marginBottom:16,
              boxShadow:"0 1px 6px rgba(0,0,0,.06)", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              <input placeholder="🔎 Buscar negocio, categoría..."
                value={filter.q} onChange={e => setFilter({...filter, q:e.target.value})}
                style={{ flex:1, minWidth:180, padding:"8px 14px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:14 }}/>
              <select value={filter.priority} onChange={e => setFilter({...filter, priority:e.target.value})}
                style={{ padding:"8px 12px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:13 }}>
                <option value="">Todas las prioridades</option>
                <option value="alta prioridad">🔥 Alta</option>
                <option value="media prioridad">⚡ Media</option>
                <option value="baja prioridad">📌 Baja</option>
              </select>
              <select value={filter.status} onChange={e => setFilter({...filter, status:e.target.value})}
                style={{ padding:"8px 12px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:13 }}>
                <option value="">Todos los estados</option>
                <option value="no_website">Sin Website</option>
                <option value="broken">Roto</option>
                <option value="unreachable">No Carga</option>
                <option value="working_bad">Malo</option>
              </select>
              <span style={{ fontSize:13, color:"#9CA3AF", fontWeight:600 }}>{filtered.length} leads</span>
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:80, color:"#94A3B8" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
                <div style={{ fontWeight:600 }}>Cargando leads...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:80, color:"#94A3B8", background:"white", borderRadius:16, boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
                <div style={{ fontSize:52, marginBottom:16 }}>🔍</div>
                <div style={{ fontWeight:800, fontSize:18, color:"#374151" }}>No hay leads todavía</div>
                <div style={{ marginTop:8, fontSize:14 }}>Ve a Buscar para encontrar negocios</div>
                <button onClick={() => setTab("buscar")} style={{ marginTop:20, background:"#0F2540", color:"white",
                  border:"none", padding:"10px 24px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  🔍 Ir a Buscar
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filtered.map(lead => {
                  const open = expanded === lead.id;
                  const dot  = PRIORITY[lead.lead_priority]?.dot || "#CBD5E1";
                  return (
                    <div key={lead.id} style={{ background:"white", borderRadius:14, padding:"16px 20px",
                      boxShadow: open ? "0 4px 20px rgba(0,0,0,.1)" : "0 1px 6px rgba(0,0,0,.06)",
                      borderLeft:`4px solid ${dot}`, cursor:"pointer" }}
                      onClick={() => setExpanded(open ? null : lead.id)}>

                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:15, color:"#111827" }}>{lead.nombre_negocio || "—"}</div>
                          <div style={{ fontSize:12, color:"#6B7280", marginTop:3 }}>
                            {lead.categoria} {lead.ubicacion_buscada ? `· ${lead.ubicacion_buscada}` : ""}
                          </div>
                          {lead.direccion && <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>📍 {lead.direccion}</div>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                          <Pill val={lead.website_status} map={STATUS} />
                          <Pill val={lead.lead_priority}  map={PRIORITY} />
                          <Pill val={lead.outreach_status} map={OUTREACH} />
                          {lead.rating > 0 && (
                            <span style={{ fontSize:12, color:"#6B7280", background:"#FFFBEB", padding:"2px 8px", borderRadius:999, fontWeight:600 }}>
                              ⭐ {lead.rating} ({lead.reviews})
                            </span>
                          )}
                          <span style={{ fontSize:14, color:"#9CA3AF" }}>{open ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {open && (
                        <div style={{ marginTop:18, borderTop:"1.5px solid #F3F4F6", paddingTop:18 }}
                          onClick={e => e.stopPropagation()}>

                          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:16 }}>
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:4 }}>Teléfono</div>
                              <div style={{ fontSize:14 }}>{lead.telefono || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:4 }}>Email</div>
                              <input defaultValue={lead.email || ""} placeholder="email@negocio.com"
                                onBlur={async e => {
                                  const val = e.target.value.trim();
                                  if (val !== (lead.email || "")) {
                                    await updateLead(lead.id, {
                                      email: val,
                                      email_status: val ? "verificado" : "sin_email",
                                      outreach_status: val ? "pendiente" : "sin_email",
                                    });
                                    toast$("✓ Email guardado");
                                  }
                                }}
                                style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:13 }}/>
                            </div>
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:4 }}>Google Maps</div>
                              {lead.google_maps_url
                                ? <a href={lead.google_maps_url} target="_blank" rel="noopener" style={{ fontSize:13, color:"#2980B9", fontWeight:600 }}>🗺️ Ver en Maps</a>
                                : <span style={{ fontSize:13, color:"#9CA3AF" }}>—</span>}
                            </div>
                          </div>

                          {/* Email draft */}
                          {lead.email_asunto && (
                            <div style={{ background:"#F0F9FF", border:"1.5px solid #BAE6FD", borderRadius:12, padding:16, marginBottom:14 }}>
                              <div style={{ fontSize:11, fontWeight:800, color:"#0369A1", textTransform:"uppercase", marginBottom:8 }}>📧 Email de Outreach</div>
                              <div style={{ fontSize:13, fontWeight:700, color:"#1E3A5F", marginBottom:10 }}>Asunto: {lead.email_asunto}</div>
                              <pre style={{ fontSize:12, color:"#374151", whiteSpace:"pre-wrap", fontFamily:"inherit", lineHeight:1.75, margin:0 }}>{lead.email_cuerpo}</pre>
                            </div>
                          )}

                          {/* Preview */}
                          {lead.preview_html && (
                            <div style={{ marginBottom:14 }}>
                              <button onClick={() => { const w=window.open("","_blank"); w.document.write(lead.preview_html); w.document.close(); }}
                                style={{ background:"linear-gradient(135deg,#0F2540,#1A5276)", color:"white", border:"none",
                                  padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                                👁️ Ver Preview Website
                              </button>
                            </div>
                          )}

                          {/* Send email button */}
                          {lead.email && lead.outreach_status !== "enviado" && (
                            <div style={{ marginBottom:14 }}>
                              <button onClick={() => handleSendOutreach(lead)}
                                style={{ background:"#059669", color:"white", border:"none",
                                  padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                                📤 Enviar por Outlook
                              </button>
                            </div>
                          )}

                          {/* Outreach status buttons */}
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:8 }}>Estado Outreach</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              {Object.entries(OUTREACH).map(([s,c]) => (
                                <button key={s} onClick={() => updateLead(lead.id, { outreach_status:s })} style={{
                                  background: lead.outreach_status===s ? "#0F2540" : "#F3F4F6",
                                  color:       lead.outreach_status===s ? "white" : "#374151",
                                  border:"none", padding:"5px 12px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer",
                                }}>{c.label}</button>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", marginBottom:6 }}>Notas</div>
                            <textarea defaultValue={lead.notas || ""} placeholder="Notas internas..."
                              onBlur={async e => {
                                if (e.target.value !== (lead.notas || "")) {
                                  await updateLead(lead.id, { notas:e.target.value });
                                  toast$("✓ Nota guardada");
                                }
                              }}
                              style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #E5E7EB",
                                borderRadius:8, fontSize:13, minHeight:64, resize:"vertical", fontFamily:"inherit" }}/>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
