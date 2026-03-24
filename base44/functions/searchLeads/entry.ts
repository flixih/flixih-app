import { createClientFromRequest } from '@base44/sdk';

export default async function handler(request) {
  const base44 = createClientFromRequest(request);

  let body = {};
  try { body = await request.json(); } catch(_) {}

  const ubicacion   = body.ubicacion   || 'Puerto Rico';
  const max_leads   = parseInt(body.max_leads)   || 20;
  const min_reviews = parseInt(body.min_reviews) || 5;
  const cats = Array.isArray(body.categorias)
    ? body.categorias
    : (body.categorias || 'restaurant,beauty_salon,dentist,car_repair,bakery,electrician,plumber,gym')
        .split(',').map(c => c.trim()).filter(Boolean);

  const KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!KEY) throw new Error('Falta GOOGLE_PLACES_API_KEY en los secrets de la app');

  // Load existing to avoid duplicates
  let existingNames = new Set();
  try {
    const existing = await base44.entities.Lead.list();
    existingNames = new Set((existing || []).map(l => (l.nombre_negocio || '').toLowerCase().trim()));
  } catch(_) {}

  const seen = new Set();
  const stats = {
    total_encontrados: 0,
    con_5_reviews: 0,
    sin_website: 0,
    website_roto: 0,
    leads_guardados: 0,
    alta_prioridad: 0,
  };
  let saved = 0;

  for (const cat of cats) {
    if (saved >= max_leads) break;

    try {
      const qs = new URLSearchParams({
        query: `${cat} en ${ubicacion}`,
        key: KEY,
        language: 'es',
      });
      const resp = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${qs}`);
      const data = await resp.json();

      if (data.status === 'REQUEST_DENIED') {
        throw new Error('Google API key inválida: ' + (data.error_message || ''));
      }

      for (const p of (data.results || [])) {
        if (saved >= max_leads) break;
        stats.total_encontrados++;

        if (seen.has(p.place_id)) continue;
        seen.add(p.place_id);

        if ((p.user_ratings_total || 0) < min_reviews) continue;
        stats.con_5_reviews++;

        if (p.business_status === 'CLOSED_PERMANENTLY') continue;

        const nameLower = (p.name || '').toLowerCase().trim();
        if (existingNames.has(nameLower)) continue;

        // Simple website check from Places basic data
        const hasWebsite = !!(p.website);
        const ws = hasWebsite ? 'working_good' : 'no_website';
        if (ws === 'working_good') continue;

        stats.sin_website++;

        const reviews = p.user_ratings_total || 0;
        const rating = p.rating || 0;
        let score = 40; // no website bonus
        score += reviews >= 50 ? 20 : reviews >= 20 ? 12 : 6;
        score += rating >= 4.5 ? 15 : rating >= 4.0 ? 10 : 5;
        const pri = score >= 60 ? 'alta prioridad' : score >= 40 ? 'media prioridad' : 'baja prioridad';
        if (pri === 'alta prioridad') stats.alta_prioridad++;

        const nombre = p.name || '';

        try {
          await base44.entities.Lead.create({
            nombre_negocio:    nombre,
            categoria:         cat,
            direccion:         p.formatted_address || '',
            telefono:          '',
            rating:            rating,
            reviews:           reviews,
            website_url:       '',
            website_status:    ws,
            google_maps_url:   `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
            ubicacion_buscada: ubicacion,
            lead_priority:     pri,
            outreach_status:   'pendiente',
            email:             '',
            email_status:      'sin_email',
            email_asunto:      `Preparé una idea de website para ${nombre}`,
            email_cuerpo:      `Hola, espero que estén bien.\n\nMi nombre es Roy Lorenzo y me dedico a crear websites para negocios de la comunidad.\n\nVi su negocio "${nombre}" en Google y noté que no tienen página web. Preparé un preview de cómo podría verse una página moderna para su negocio.\n\nSi les interesa, con mucho gusto lo terminamos juntos sin compromiso.\n\nGracias,\nRoy Lorenzo\nWebsites para PR`,
            notas:             '',
            preview_html:      '',
          });
          existingNames.add(nameLower);
          saved++;
          stats.leads_guardados++;
        } catch(e) {
          console.error('Error guardando lead:', e.message);
        }
      }
    } catch(e) {
      console.error(`Error en categoría "${cat}":`, e.message);
    }
  }

  return { summary: stats };
}
