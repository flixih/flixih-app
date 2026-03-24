import { createClientFromRequest } from '@base44/sdk';

export default async function handler(request) {
  const base44 = createClientFromRequest(request);
  
  let body = {};
  try { body = await request.json(); } catch(_) {}

  const ubicacion = body.ubicacion || 'Puerto Rico';
  const max_leads = parseInt(body.max_leads) || 20;
  const min_reviews = parseInt(body.min_reviews) || 5;
  const cats = Array.isArray(body.categorias)
    ? body.categorias
    : (body.categorias || 'restaurant,beauty_salon,dentist,car_repair').split(',').map(c => c.trim());

  const KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!KEY) throw new Error('Missing GOOGLE_PLACES_API_KEY');

  const seen = new Set();
  const stats = { total_encontrados:0, con_5_reviews:0, sin_website:0, website_roto:0, leads_guardados:0, alta_prioridad:0 };
  let saved = 0;

  for (const cat of cats) {
    if (saved >= max_leads) break;
    const qs = new URLSearchParams({ query: `${cat} en ${ubicacion}`, key: KEY, language: 'es' });
    const resp = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${qs}`);
    const data = await resp.json();
    if (data.status === 'REQUEST_DENIED') throw new Error('Google API key error: ' + data.error_message);

    for (const p of (data.results || [])) {
      if (saved >= max_leads) break;
      stats.total_encontrados++;
      if (seen.has(p.place_id)) continue;
      seen.add(p.place_id);
      if ((p.user_ratings_total || 0) < min_reviews) continue;
      stats.con_5_reviews++;
      if (p.business_status === 'CLOSED_PERMANENTLY') continue;

      const ws = p.website ? 'working_good' : 'no_website';
      if (ws === 'working_good') continue;
      stats.sin_website++;

      const pri = (p.user_ratings_total || 0) >= 20 ? 'alta prioridad' : 'media prioridad';
      if (pri === 'alta prioridad') stats.alta_prioridad++;

      await base44.entities.Lead.create({
        nombre_negocio: p.name || '',
        categoria: cat,
        direccion: p.formatted_address || '',
        telefono: '',
        rating: p.rating || 0,
        reviews: p.user_ratings_total || 0,
        website_url: '',
        website_status: ws,
        google_maps_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
        ubicacion_buscada: ubicacion,
        lead_priority: pri,
        outreach_status: 'pendiente',
        email: '',
        email_status: 'sin_email',
        email_asunto: `Preparé una idea de website para ${p.name}`,
        email_cuerpo: `Hola, mi nombre es Roy Lorenzo. Vi su negocio en Google y noté que no tienen página web. Preparé un preview de cómo podría verse. ¿Les interesa?\n\nGracias,\nRoy Lorenzo\nWebsites para PR`,
        notas: '',
      });
      saved++;
      stats.leads_guardados++;
    }
  }

  return { summary: stats };
}
