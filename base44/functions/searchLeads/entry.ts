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

  const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_API_KEY) throw new Error('Missing GOOGLE_PLACES_API_KEY in secrets');

  async function checkWebsite(url) {
    if (!url) return 'no_website';
    try {
      const normalized = url.startsWith('http') ? url : `https://${url}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(normalized, { signal: controller.signal, redirect: 'follow' });
      clearTimeout(t);
      if (res.status >= 400) return 'broken';
      const text = await res.text();
      const lower = text.toLowerCase();
      if (['domain for sale','godaddy','buy this domain','coming soon','under construction','account suspended']
          .some(s => lower.includes(s))) return 'broken';
      if (text.replace(/<[^>]*>/g,'').trim().length < 200) return 'working_bad';
      return 'working_good';
    } catch(e) {
      return e.name === 'AbortError' ? 'unreachable' : 'broken';
    }
  }

  async function googleSearch(query) {
    const qs = new URLSearchParams({ query, key: GOOGLE_API_KEY, language: 'es' }).toString();
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${qs}`);
    const data = await res.json();
    if (data.status === 'REQUEST_DENIED') throw new Error('Google API key invalid: ' + data.error_message);
    return data.results || [];
  }

  async function getDetails(placeId) {
    const qs = new URLSearchParams({
      place_id: placeId,
      fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,business_status',
      key: GOOGLE_API_KEY,
    }).toString();
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${qs}`);
    const data = await res.json();
    return data.result || {};
  }

  function priority(details, ws) {
    let s = 0;
    if (ws === 'no_website') s += 40;
    else if (ws === 'broken') s += 30;
    else if (ws === 'unreachable') s += 25;
    else if (ws === 'working_bad') s += 15;
    const r = details.user_ratings_total || 0;
    s += r >= 50 ? 20 : r >= 20 ? 12 : r >= 5 ? 6 : 0;
    const rt = details.rating || 0;
    s += rt >= 4.5 ? 15 : rt >= 4.0 ? 10 : rt >= 3.5 ? 5 : 0;
    if (details.formatted_phone_number) s += 5;
    return s >= 55 ? 'alta prioridad' : s >= 30 ? 'media prioridad' : 'baja prioridad';
  }

  function emailDraft(nombre, cat) {
    return {
      asunto: `Preparé una idea de website para ${nombre}`,
      cuerpo: `Hola, espero que estén bien.\n\nMi nombre es Roy Lorenzo y me dedico a crear websites para negocios de la comunidad.\n\nVi su negocio de ${cat} en Google y noté que no tienen página web o la que aparece no está funcionando bien. Preparé un preview de cómo podría verse.\n\nSi les interesa, con gusto lo terminamos juntos.\n\nGracias,\nRoy Lorenzo\nWebsites para PR`,
    };
  }

  let existingNames = new Set();
  try {
    const existing = await base44.entities.Lead.list();
    existingNames = new Set((existing || []).map(l => (l.nombre_negocio || '').toLowerCase()));
  } catch(_) {}

  const seen = new Set();
  const stats = { total_encontrados:0, con_5_reviews:0, sin_website:0, website_roto:0, leads_guardados:0, alta_prioridad:0 };
  let saved = 0;

  for (const cat of cats) {
    if (saved >= max_leads) break;
    try {
      const places = await googleSearch(`${cat} en ${ubicacion}`);
      for (const p of places) {
        if (saved >= max_leads) break;
        stats.total_encontrados++;
        if (seen.has(p.place_id)) continue;
        seen.add(p.place_id);
        if ((p.user_ratings_total || 0) < min_reviews) continue;
        stats.con_5_reviews++;
        if (p.business_status === 'CLOSED_PERMANENTLY') continue;
        const nameLower = (p.name || '').toLowerCase();
        if (existingNames.has(nameLower)) continue;

        let details = {};
        try { details = await getDetails(p.place_id); } catch(_) {}

        const ws = await checkWebsite(details.website);
        if (ws === 'working_good') continue;

        if (ws === 'no_website') stats.sin_website++;
        else stats.website_roto++;

        const pri = priority(details, ws);
        if (pri === 'alta prioridad') stats.alta_prioridad++;

        const { asunto, cuerpo } = emailDraft(details.name || p.name, cat);

        try {
          await base44.entities.Lead.create({
            nombre_negocio:    details.name || p.name || '',
            categoria:         cat,
            direccion:         details.formatted_address || p.formatted_address || '',
            telefono:          details.formatted_phone_number || '',
            rating:            details.rating || p.rating || 0,
            reviews:           details.user_ratings_total || p.user_ratings_total || 0,
            website_url:       details.website || '',
            website_status:    ws,
            google_maps_url:   details.url || '',
            ubicacion_buscada: ubicacion,
            lead_priority:     pri,
            outreach_status:   'pendiente',
            email:             '',
            email_status:      'sin_email',
            email_asunto:      asunto,
            email_cuerpo:      cuerpo,
            notas:             '',
          });
          existingNames.add(nameLower);
          saved++;
          stats.leads_guardados++;
        } catch(e) {
          console.error('Lead save error:', e.message);
        }
      }
    } catch(e) {
      console.error(`Category ${cat} error:`, e.message);
    }
  }

  return { summary: stats };
}
// updated Tue Mar 24 06:35:44 UTC 2026
