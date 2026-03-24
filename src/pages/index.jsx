import { useState, useEffect } from "react";
import { Lead } from "../api/entities";
import { searchLeads, generatePreview } from "../api/backendFunctions";

const STATUS_COLORS = {
  no_website: { bg: "#FEF3C7", text: "#92400E", label: "Sin Website" },
  broken: { bg: "#FEE2E2", text: "#991B1B", label: "Roto" },
  unreachable: { bg: "#FEE2E2", text: "#991B1B", label: "No Carga" },
  working_bad: { bg: "#FFF7ED", text: "#9A3412", label: "Malo" },
  working_good: { bg: "#D1FAE5", text: "#065F46", label: "Funciona" },
};

const PRIORITY_COLORS = {
  "alta prioridad": { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626", label: "🔥 Alta" },
  "media prioridad": { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316", label: "⚡ Media" },
  "baja prioridad": { bg: "#F0FDF4", text: "#166534", dot: "#22C55E", label: "📌 Baja" },
};

const OUTREACH_COLORS = {
  pendiente: { bg: "#EFF6FF", text: "#1D4ED8", label: "Pendiente" },
  enviado: { bg: "#D1FAE5", text: "#065F46", label: "Enviado" },
  sin_email: { bg: "#F3F4F6", text: "#6B7280", label: "Sin Email" },
  descartado: { bg: "#F3F4F6", text: "#6B7280", label: "Descartado" },
  requiere_revision: { bg: "#FEF3C7", text: "#92400E", label: "Revisar" },
};

function Badge({ status, map }) {
  const s = map[status] || { bg: "#F3F4F6", text: "#6B7280", label: status || "—" };
  return (
    <span style={{ background: s.bg, color: s.text, padding: "2px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("leads");
  const [selectedId, setSelectedId] = useState(null);
  const [searchForm, setSearchForm] = useState({
    ubicacion: "Añasco, Puerto Rico",
    categorias: "restaurant,beauty_salon,dentist,car_repair,bakery,electrician,plumber,gym",
    max_leads: 20,
    min_reviews: 5,
  });
  const [searchResult, setSearchResult] = useState(null);
  const [filter, setFilter] = useState({ priority: "", status: "", search: "" });
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await Lead.list();
      setLeads(Array.isArray(data) ? data.reverse() : []);
    } catch (e) {
      showToast("Error: " + e.message, "error");
    }
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  const handleSearch = async () => {
    if (!searchForm.ubicacion.trim()) { showToast("Escribe una ubicación", "error"); return; }
    setSearching(true);
    setSearchResult(null);
    try {
      const cats = searchForm.categorias.split(",").map(c => c.trim()).filter(Boolean);
      const res = await searchLeads({
        ubicacion: searchForm.ubicacion,
        categorias: cats,
        max_leads: parseInt(searchForm.max_leads) || 20,
        min_reviews: parseInt(searchForm.min_reviews) || 5,
      });
      setSearchResult(res.summary || {});
      await loadLeads();
      showToast("✅ " + (res.summary?.leads_guardados || 0) + " leads encontrados!");
      setTab("leads");
    } catch (e) {
      showToast("Error: " + e.message, "error");
    }
    setSearching(false);
  };

  const handleGeneratePreviews = async () => {
    setGenerating(true);
    try {
      const res = await generatePreview({});
      await loadLeads();
      showToast("✅ " + (res.previews_generados || 0) + " previews generados!");
    } catch (e) {
      showToast("Error: " + e.message, "error");
    }
    setGenerating(false);
  };

  const handleUpdateLead = async (id, data) => {
    try {
      await Lead.update(id, data);
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    } catch (e) {
      showToast("Error: " + e.message, "error");
    }
  };

  const filteredLeads = leads.filter(l => {
    if (filter.priority && l.lead_priority !== filter.priority) return false;
    if (filter.status && l.website_status !== filter.status) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (![l.nombre_negocio, l.categoria, l.ubicacion_buscada].join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: leads.length,
    alta: leads.filter(l => l.lead_priority === "alta prioridad").length,
    sinWebsite: leads.filter(l => l.website_status === "no_website").length,
    rotos: leads.filter(l => ["broken","unreachable"].includes(l.website_status)).length,
    conEmail: leads.filter(l => l.email).length,
    enviados: leads.filter(l => l.outreach_status === "enviado").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F8", fontFamily: "system-ui, sans-serif" }}>

      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.type === "error" ? "#FEE2E2" : "#D1FAE5", color: toast.type === "error" ? "#991B1B" : "#065F46", padding: "13px 20px", borderRadius: "12px", boxShadow: "0 6px 24px rgba(0,0,0,0.15)", fontSize: "14px", fontWeight: 600, maxWidth: 360 }}>
          {toast.msg}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg, #0F2540 0%, #1A5276 100%)", color: "white", padding: "0 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>🌐 Flixih Lead System</div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Roy Lorenzo · Websites para PR</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleGeneratePreviews} disabled={generating} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.25)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {generating ? "⏳ Generando..." : "⚡ Generar Previews"}
            </button>
            <button onClick={loadLeads} style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>↺</button>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 2 }}>
          {[["leads","📋 Leads"],["buscar","🔍 Buscar"],["stats","📊 Stats"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ background: tab === key ? "white" : "transparent", color: tab === key ? "#0F2540" : "rgba(255,255,255,0.7)", border: "none", padding: "10px 20px", cursor: "pointer", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: tab === key ? 700 : 500 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* STATS */}
        {tab === "stats" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            {[
              ["📋","Total Leads", stats.total, "#0F2540"],
              ["🔥","Alta Prioridad", stats.alta, "#DC2626"],
              ["🌐","Sin Website", stats.sinWebsite, "#D97706"],
              ["💔","Rotos", stats.rotos, "#EF4444"],
              ["📧","Con Email", stats.conEmail, "#059669"],
              ["✅","Enviados", stats.enviados, "#7C3AED"],
            ].map(([icon, label, val, color]) => (
              <div key={label} style={{ background: "white", borderRadius: 14, padding: "20px 14px", textAlign: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", borderTop: `4px solid ${color}` }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color, margin: "6px 0 4px" }}>{val}</div>
                <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* BUSCAR */}
        {tab === "buscar" && (
          <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 2px 10px rgba(0,0,0,0.07)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F2540", marginBottom: 20 }}>🔍 Buscar Nuevos Leads</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 22 }}>
              {[
                ["📍 Ubicación", "ubicacion", "text", "Ej: Añasco, Puerto Rico"],
                ["🔢 Máx. Leads", "max_leads", "number", "20"],
                ["⭐ Mín. Reviews", "min_reviews", "number", "5"],
                ["🏷️ Categorías", "categorias", "text", "restaurant,beauty_salon..."],
              ].map(([lbl, key, type, ph]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>{lbl}</label>
                  <input type={type} value={searchForm[key]} onChange={e => setSearchForm({ ...searchForm, [key]: e.target.value })} placeholder={ph}
                    style={{ width: "100%", padding: "11px 13px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
            <button onClick={handleSearch} disabled={searching} style={{ background: searching ? "#94A3B8" : "linear-gradient(135deg,#0F2540,#1A5276)", color: "white", border: "none", padding: "13px 34px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: searching ? "not-allowed" : "pointer" }}>
              {searching ? "⏳ Buscando en Google Maps..." : "🚀 Iniciar Búsqueda"}
            </button>

            {searchResult && (
              <div style={{ marginTop: 22, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: 20 }}>
                <div style={{ fontWeight: 800, color: "#065F46", marginBottom: 14 }}>✅ Búsqueda Completada</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10 }}>
                  {[["Encontrados",searchResult.total_encontrados],["Con 5+ Reviews",searchResult.con_5_reviews],["Guardados",searchResult.leads_guardados],["Sin Website",searchResult.sin_website],["Roto",searchResult.website_roto],["Alta Prior.",searchResult.alta_prioridad]].map(([k,v])=>(
                    <div key={k} style={{ background: "white", borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#0F2540" }}>{v ?? 0}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 3 }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEADS */}
        {tab === "leads" && (
          <div>
            <div style={{ background: "white", borderRadius: 12, padding: "12px 16px", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="🔎 Buscar..." value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
                style={{ flex: 1, minWidth: 160, padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14 }} />
              <select value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })}
                style={{ padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13 }}>
                <option value="">Todas las prioridades</option>
                <option value="alta prioridad">🔥 Alta</option>
                <option value="media prioridad">⚡ Media</option>
                <option value="baja prioridad">📌 Baja</option>
              </select>
              <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
                style={{ padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13 }}>
                <option value="">Todo</option>
                <option value="no_website">Sin Website</option>
                <option value="broken">Roto</option>
                <option value="unreachable">No Carga</option>
                <option value="working_bad">Malo</option>
              </select>
              <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 600 }}>{filteredLeads.length} leads</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 80, color: "#94A3B8" }}>⏳ Cargando...</div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, background: "white", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 48 }}>🔍</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#374151", marginTop: 12 }}>No hay leads todavía</div>
                <div style={{ fontSize: 14, color: "#6B7280", marginTop: 6 }}>Ve a "Buscar" para encontrar negocios en PR</div>
                <button onClick={() => setTab("buscar")} style={{ marginTop: 18, background: "#0F2540", color: "white", border: "none", padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>🔍 Buscar Ahora</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredLeads.map(lead => {
                  const isOpen = selectedId === lead.id;
                  return (
                    <div key={lead.id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", boxShadow: isOpen ? "0 4px 20px rgba(0,0,0,0.1)" : "0 1px 6px rgba(0,0,0,0.06)", borderLeft: `4px solid ${PRIORITY_COLORS[lead.lead_priority]?.dot || "#CBD5E1"}`, cursor: "pointer" }}
                      onClick={() => setSelectedId(isOpen ? null : lead.id)}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>{lead.nombre_negocio || "—"}</div>
                          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{lead.categoria} · {lead.ubicacion_buscada}</div>
                          {lead.direccion && <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>📍 {lead.direccion}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          <Badge status={lead.website_status} map={STATUS_COLORS} />
                          <Badge status={lead.lead_priority} map={PRIORITY_COLORS} />
                          <Badge status={lead.outreach_status} map={OUTREACH_COLORS} />
                          {lead.rating > 0 && <span style={{ fontSize: 12, color: "#6B7280" }}>⭐ {lead.rating} ({lead.reviews})</span>}
                          <span style={{ fontSize: 13, color: "#9CA3AF" }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 16, borderTop: "1px solid #F3F4F6", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Teléfono</div>
                              <div style={{ fontSize: 14 }}>{lead.telefono || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Email</div>
                              <input defaultValue={lead.email || ""} placeholder="email@negocio.com"
                                onBlur={async e => {
                                  const val = e.target.value.trim();
                                  if (val !== (lead.email || "")) {
                                    await handleUpdateLead(lead.id, { email: val, email_status: val ? "verificado" : "sin_email", outreach_status: val ? "pendiente" : "sin_email" });
                                    showToast("✓ Email guardado");
                                  }
                                }}
                                style={{ width: "100%", padding: "7px 10px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Website</div>
                              {lead.website_url ? <a href={lead.website_url} target="_blank" style={{ color: "#2980B9", fontSize: 13, wordBreak: "break-all" }}>{lead.website_url.substring(0,40)}...</a> : <span style={{ color: "#9CA3AF", fontSize: 13 }}>Sin website</span>}
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Maps</div>
                              {lead.google_maps_url ? <a href={lead.google_maps_url} target="_blank" style={{ color: "#2980B9", fontSize: 13, fontWeight: 600 }}>🗺️ Ver en Maps</a> : "—"}
                            </div>
                          </div>

                          {lead.email_asunto && (
                            <div style={{ background: "#F0F9FF", border: "1.5px solid #BAE6FD", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#0369A1", textTransform: "uppercase", marginBottom: 6 }}>📧 Email de Outreach</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 8 }}>Asunto: {lead.email_asunto}</div>
                              <pre style={{ fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{lead.email_cuerpo}</pre>
                            </div>
                          )}

                          {lead.preview_html && (
                            <button onClick={() => { const w = window.open("","_blank"); if(w){w.document.write(lead.preview_html);w.document.close();} }}
                              style={{ background: "#0F2540", color: "white", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                              👁️ Ver Preview Website
                            </button>
                          )}

                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 6 }}>Estado Outreach</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {Object.entries(OUTREACH_COLORS).map(([s, c]) => (
                                <button key={s} onClick={() => handleUpdateLead(lead.id, { outreach_status: s })}
                                  style={{ background: lead.outreach_status === s ? "#0F2540" : "#F3F4F6", color: lead.outreach_status === s ? "white" : "#374151", border: "none", padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <textarea defaultValue={lead.notas || ""} placeholder="Notas internas..."
                            onBlur={async e => {
                              if (e.target.value !== (lead.notas || "")) {
                                await handleUpdateLead(lead.id, { notas: e.target.value });
                                showToast("✓ Nota guardada");
                              }
                            }}
                            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, minHeight: 60, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
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
