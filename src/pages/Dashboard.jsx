import { useState, useEffect } from "react";
import { Lead } from "../api/entities";
import { searchLeads, generatePreview, sendOutreach } from "../api/backendFunctions";

const STATUS_COLORS = {
  no_website: { bg: "#FEF3C7", text: "#92400E", label: "Sin Website" },
  broken: { bg: "#FEE2E2", text: "#991B1B", label: "Roto" },
  unreachable: { bg: "#FEE2E2", text: "#991B1B", label: "No Carga" },
  working_bad: { bg: "#FFF7ED", text: "#9A3412", label: "Malo" },
  working_good: { bg: "#D1FAE5", text: "#065F46", label: "Funciona" },
};

const PRIORITY_COLORS = {
  "alta prioridad": { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  "media prioridad": { bg: "#FFF7ED", text: "#9A3412", dot: "#F97316" },
  "baja prioridad": { bg: "#F0FDF4", text: "#166534", dot: "#22C55E" },
};

const OUTREACH_COLORS = {
  pendiente: { bg: "#EFF6FF", text: "#1D4ED8", label: "Pendiente" },
  enviado: { bg: "#D1FAE5", text: "#065F46", label: "Enviado" },
  sin_email: { bg: "#F3F4F6", text: "#6B7280", label: "Sin Email" },
  descartado: { bg: "#F3F4F6", text: "#6B7280", label: "Descartado" },
  requiere_revision: { bg: "#FEF3C7", text: "#92400E", label: "Revisar" },
};

function Badge({ status, map }) {
  const s = map[status] || { bg: "#F3F4F6", text: "#6B7280", label: status };
  return (
    <span style={{
      background: s.bg, color: s.text,
      padding: "2px 10px", borderRadius: "999px",
      fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap"
    }}>{s.label || status}</span>
  );
}

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState("leads");
  const [selectedLead, setSelectedLead] = useState(null);
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
    setTimeout(() => setToast(null), 3500);
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await Lead.list({ sort: "-created_date", limit: 200 });
      setLeads(data);
    } catch (e) {
      showToast("Error cargando leads", "error");
    }
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  const handleSearch = async () => {
    setSearching(true);
    setSearchResult(null);
    try {
      const cats = searchForm.categorias.split(",").map(c => c.trim()).filter(Boolean);
      const res = await searchLeads({
        ubicacion: searchForm.ubicacion,
        categorias: cats,
        max_leads: parseInt(searchForm.max_leads),
        min_reviews: parseInt(searchForm.min_reviews),
      });
      setSearchResult(res.summary);
      await loadLeads();
      showToast(`¡Búsqueda completada! ${res.summary?.leads_guardados || 0} leads nuevos encontrados.`);
    } catch (e) {
      showToast("Error en la búsqueda: " + e.message, "error");
    }
    setSearching(false);
  };

  const handleGeneratePreviews = async () => {
    setGenerating(true);
    try {
      const res = await generatePreview({});
      await loadLeads();
      showToast(`${res.previews_generados} previews generados correctamente.`);
    } catch (e) {
      showToast("Error generando previews: " + e.message, "error");
    }
    setGenerating(false);
  };

  const handleUpdateLead = async (id, data) => {
    await Lead.update(id, data);
    await loadLeads();
  };

  const filteredLeads = leads.filter(l => {
    if (filter.priority && l.lead_priority !== filter.priority) return false;
    if (filter.status && l.website_status !== filter.status) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!l.nombre_negocio?.toLowerCase().includes(q) && !l.categoria?.toLowerCase().includes(q) && !l.ubicacion_buscada?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: leads.length,
    alta: leads.filter(l => l.lead_priority === "alta prioridad").length,
    sinWebsite: leads.filter(l => l.website_status === "no_website").length,
    rotos: leads.filter(l => ["broken", "unreachable"].includes(l.website_status)).length,
    enviados: leads.filter(l => l.outreach_status === "enviado").length,
    conEmail: leads.filter(l => l.email).length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.type === "error" ? "#FEE2E2" : "#D1FAE5",
          color: toast.type === "error" ? "#991B1B" : "#065F46",
          padding: "12px 20px", borderRadius: "10px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          fontSize: "14px", fontWeight: 600, maxWidth: 360
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1A3A5C 0%, #2980B9 100%)", color: "white", padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>🌐 Flixih Lead System</div>
            <div style={{ fontSize: 13, opacity: 0.75 }}>Generación de leads · Roy Lorenzo · PR</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleGeneratePreviews}
              disabled={generating}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >{generating ? "Generando..." : "⚡ Generar Previews"}</button>
            <button
              onClick={loadLeads}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
            >↺ Actualizar</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 4, paddingBottom: 0 }}>
          {["leads", "buscar", "stats"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "white" : "transparent",
              color: tab === t ? "#1A3A5C" : "rgba(255,255,255,0.75)",
              border: "none", padding: "10px 20px", cursor: "pointer",
              borderRadius: "8px 8px 0 0", fontSize: 14, fontWeight: tab === t ? 700 : 500,
              textTransform: "capitalize"
            }}>{t === "leads" ? "📋 Leads" : t === "buscar" ? "🔍 Buscar" : "📊 Stats"}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* STATS TAB */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Leads", value: stats.total, color: "#1A3A5C", icon: "📋" },
                { label: "Alta Prioridad", value: stats.alta, color: "#DC2626", icon: "🔥" },
                { label: "Sin Website", value: stats.sinWebsite, color: "#D97706", icon: "🌐" },
                { label: "Roto / No Carga", value: stats.rotos, color: "#EF4444", icon: "💔" },
                { label: "Con Email", value: stats.conEmail, color: "#059669", icon: "📧" },
                { label: "Emails Enviados", value: stats.enviados, color: "#7C3AED", icon: "✅" },
              ].map(s => (
                <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "20px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", textAlign: "center", borderTop: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: s.color, margin: "6px 0" }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH TAB */}
        {tab === "buscar" && (
          <div style={{ background: "white", borderRadius: 16, padding: 28, boxShadow: "0 1px 8px rgba(0,0,0,0.07)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1A3A5C", marginBottom: 20 }}>🔍 Buscar Nuevos Leads</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Ubicación Objetivo</label>
                <input
                  value={searchForm.ubicacion}
                  onChange={e => setSearchForm({ ...searchForm, ubicacion: e.target.value })}
                  placeholder="Ej: Añasco, Puerto Rico"
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Máximo de Leads</label>
                <input
                  type="number"
                  value={searchForm.max_leads}
                  onChange={e => setSearchForm({ ...searchForm, max_leads: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Mínimo de Reviews</label>
                <input
                  type="number"
                  value={searchForm.min_reviews}
                  onChange={e => setSearchForm({ ...searchForm, min_reviews: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Categorías (separadas por coma)</label>
                <input
                  value={searchForm.categorias}
                  onChange={e => setSearchForm({ ...searchForm, categorias: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
                />
              </div>
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                background: "linear-gradient(135deg, #1A3A5C, #2980B9)",
                color: "white", border: "none",
                padding: "12px 32px", borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: searching ? "not-allowed" : "pointer", opacity: searching ? 0.7 : 1
              }}
            >{searching ? "⏳ Buscando negocios..." : "🚀 Iniciar Búsqueda"}</button>

            {searchResult && (
              <div style={{ marginTop: 24, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, color: "#065F46", fontSize: 16, marginBottom: 12 }}>✅ Búsqueda Completada</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  {Object.entries({
                    "Encontrados": searchResult.total_encontrados,
                    "Con 5+ Reviews": searchResult.con_5_reviews,
                    "Leads Guardados": searchResult.leads_guardados,
                    "Sin Website": searchResult.sin_website,
                    "Website Roto": searchResult.website_roto,
                    "Alta Prioridad": searchResult.alta_prioridad,
                  }).map(([k, v]) => (
                    <div key={k} style={{ background: "white", borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#1A3A5C" }}>{v}</div>
                      <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEADS TAB */}
        {tab === "leads" && (
          <div>
            {/* Filters */}
            <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", marginBottom: 16, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="🔎 Buscar negocio, categoría..."
                value={filter.search}
                onChange={e => setFilter({ ...filter, search: e.target.value })}
                style={{ flex: 1, minWidth: 200, padding: "8px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}
              />
              <select value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })}
                style={{ padding: "8px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}>
                <option value="">Todas las prioridades</option>
                <option value="alta prioridad">🔥 Alta</option>
                <option value="media prioridad">⚡ Media</option>
                <option value="baja prioridad">📌 Baja</option>
              </select>
              <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
                style={{ padding: "8px 14px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14 }}>
                <option value="">Todos los estados</option>
                <option value="no_website">Sin Website</option>
                <option value="broken">Roto</option>
                <option value="unreachable">No Carga</option>
                <option value="working_bad">Malo</option>
              </select>
              <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 600 }}>{filteredLeads.length} leads</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>⏳ Cargando leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>No hay leads todavía</div>
                <div style={{ marginTop: 8 }}>Ve a "Buscar" para encontrar negocios en Puerto Rico</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredLeads.map(lead => (
                  <div key={lead.id} style={{
                    background: "white", borderRadius: 12, padding: "16px 20px",
                    boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
                    borderLeft: `4px solid ${PRIORITY_COLORS[lead.lead_priority]?.dot || "#CBD5E1"}`,
                    cursor: "pointer"
                  }} onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>{lead.nombre_negocio}</div>
                        <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{lead.categoria} · {lead.ubicacion_buscada}</div>
                        {lead.direccion && <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>📍 {lead.direccion}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <Badge status={lead.website_status} map={STATUS_COLORS} />
                        <Badge status={lead.lead_priority} map={PRIORITY_COLORS} />
                        <Badge status={lead.outreach_status} map={OUTREACH_COLORS} />
                        {lead.rating > 0 && <span style={{ fontSize: 13, color: "#6B7280" }}>⭐ {lead.rating} ({lead.reviews})</span>}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {selectedLead?.id === lead.id && (
                      <div style={{ marginTop: 16, borderTop: "1px solid #F3F4F6", paddingTop: 16 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Teléfono</div>
                            <div style={{ fontSize: 14, color: "#374151" }}>{lead.telefono || "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Email</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                defaultValue={lead.email || ""}
                                placeholder="email@negocio.com"
                                onBlur={async (e) => {
                                  if (e.target.value !== lead.email) {
                                    await handleUpdateLead(lead.id, {
                                      email: e.target.value,
                                      email_status: e.target.value ? "verificado" : "sin_email"
                                    });
                                    showToast("Email actualizado ✓");
                                  }
                                }}
                                style={{ flex: 1, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13 }}
                                onClick={e => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Website</div>
                            <div style={{ fontSize: 13, color: "#374151" }}>
                              {lead.website_url ? <a href={lead.website_url} target="_blank" style={{ color: "#2980B9" }}>{lead.website_url.substring(0, 40)}...</a> : "Sin website"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", marginBottom: 4 }}>Google Maps</div>
                            {lead.google_maps_url && <a href={lead.google_maps_url} target="_blank" style={{ fontSize: 13, color: "#2980B9" }}>Ver en Maps 🗺️</a>}
                          </div>
                        </div>

                        {lead.email_asunto && (
                          <div style={{ marginTop: 16, background: "#F0F9FF", borderRadius: 10, padding: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0369A1", marginBottom: 8 }}>📧 EMAIL DE OUTREACH</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 6 }}>Asunto: {lead.email_asunto}</div>
                            <pre style={{ fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7 }}>{lead.email_cuerpo}</pre>
                          </div>
                        )}

                        {lead.preview_html && (
                          <div style={{ marginTop: 12 }}>
                            <button
                              onClick={() => {
                                const w = window.open('', '_blank');
                                w.document.write(lead.preview_html);
                                w.document.close();
                              }}
                              style={{ background: "#1A3A5C", color: "white", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                            >👁️ Ver Preview Website</button>
                          </div>
                        )}

                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {["pendiente", "enviado", "sin_email", "descartado", "requiere_revision"].map(s => (
                            <button key={s} onClick={async () => {
                              await handleUpdateLead(lead.id, { outreach_status: s });
                              showToast(`Estado actualizado: ${s}`);
                            }} style={{
                              background: lead.outreach_status === s ? "#1A3A5C" : "#F3F4F6",
                              color: lead.outreach_status === s ? "white" : "#374151",
                              border: "none", padding: "5px 12px", borderRadius: 6,
                              fontSize: 12, fontWeight: 600, cursor: "pointer"
                            }}>{OUTREACH_COLORS[s]?.label || s}</button>
                          ))}
                        </div>

                        {lead.notas !== undefined && (
                          <div style={{ marginTop: 12 }}>
                            <textarea
                              defaultValue={lead.notas || ""}
                              placeholder="Notas internas..."
                              onBlur={async (e) => {
                                if (e.target.value !== lead.notas) {
                                  await handleUpdateLead(lead.id, { notas: e.target.value });
                                  showToast("Nota guardada ✓");
                                }
                              }}
                              style={{ width: "100%", padding: "8px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13, minHeight: 60, resize: "vertical" }}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
