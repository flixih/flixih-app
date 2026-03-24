import { createClientFromRequest } from '@base44/sdk';

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── Website verification ─────────────────────────────────────────────────────

async function checkWebsite(url) {
  if (!url) return 'no_website';
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const text = await res.text();
    const lower = text.toLowerCase();

    if (res.status >= 400) return 'broken';

    const badSignals = [
      'domain for sale', 'this domain', 'godaddy', 'namecheap', 'parking',
      'coming soon', 'under construction', 'buy this domain', 'website coming',
      'index of /', 'forbidden', 'account suspended', 'this site can\'t be reached',
    ];
    if (badSignals.some(s => lower.includes(s))) return 'broken';

    // Very thin page — likely empty or placeholder
    if (text.replace(/<[^>]*>/g, '').trim().length < 200) return 'working_bad';

    return 'working_good';
  } catch (e) {
    if (e.name === 'AbortError') return 'unreachable';
    return 'broken';
  }
}

// ── Google Places helpers ────────────────────────────────────────────────────

async function searchPlaces(query, pagetoken = null) {
  const params = new URLSearchParams({
    query,
    key: GOOGLE_API_KEY,
    language: 'es',
  });
  if (pagetoken) params.set('pagetoken', pagetoken);

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
  );
  return res.json();
}

async function getPlaceDetails(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,permanently_closed,business_status',
    key: GOOGLE_API_KEY,
    language: 'es',
  });
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );
  const data = await res.json();
  return data.result || {};
}

// ── Lead scoring ─────────────────────────────────────────────────────────────

function scoreLead(details, websiteStatus) {
  let score = 0;

  // No website = prime target
  if (websiteStatus === 'no_website')  score += 40;
  if (websiteStatus === 'broken')      score += 30;
  if (websiteStatus === 'unreachable') score += 25;
  if (websiteStatus === 'working_bad') score += 15;

  // Reviews volume
  const reviews = details.user_ratings_total || 0;
  if (reviews >= 50)  score += 20;
  else if (reviews >= 20) score += 12;
  else if (reviews >= 5)  score += 6;

  // Rating quality
  const rating = details.rating || 0;
  if (rating >= 4.5) score += 15;
  else if (rating >= 4.0) score += 10;
  else if (rating >= 3.5) score += 5;

  // Has phone (easier to follow up)
  if (details.formatted_phone_number) score += 5;

  if (score >= 55) return 'alta prioridad';
  if (score >= 30) return 'media prioridad';
  return 'baja prioridad';
}

// ── Email template ────────────────────────────────────────────────────────────

function buildEmailDraft(nombre, categoria) {
  const catLine = categoria
    ? `Vi que tienen un negocio de ${categoria} en Google`
    : 'Vi su negocio en Google';

  return {
    asunto: `Preparé una idea de website para ${nombre}`,
    cuerpo: `Hola, espero que estén bien.

Mi nombre es Roy Lorenzo y me dedico a crear websites para personas y negocios de la comunidad.

${catLine} y noté que ahora mismo no tienen página web, o que la que aparece no está funcionando bien. Como referencia, preparé un preview de cómo podría verse una página moderna para ${nombre}.

La idea es que puedan tener una presencia más profesional online, enseñar sus servicios, horarios, ubicación y facilitar que más clientes los contacten.

Si les interesa, con mucho gusto se la puedo terminar y adaptar completa a su negocio.

Si quieren, me pueden responder por aquí y se las enseño mejor.

Gracias,
Roy Lorenzo
Websites para PR`,
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(request) {
  const base44 = createClientFromRequest(request);
  const {
    ubicacion   = 'Puerto Rico',
    categorias  = ['restaurant', 'beauty_salon', 'dentist', 'car_repair', 'bakery', 'electrician', 'plumber', 'gym'],
    max_leads   = 20,
    min_reviews = 5,
  } = await request.json();

  const cats = Array.isArray(categorias) ? categorias : categorias.split(',').map(c => c.trim());
  const seen = new Set(); // deduplicate by place_id

  // Pull existing leads to avoid re-processing
  const existing = await base44.entities.Lead.list();
  const existingNames = new Set((existing || []).map(l => l.nombre_negocio?.toLowerCase()));

  const results = {
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

    const query = `${cat} en ${ubicacion}`;
    let pagetoken = null;
    let pages = 0;

    do {
      if (pages > 0) await new Promise(r => setTimeout(r, 2000)); // respect rate limit
      const data = await searchPlaces(query, pagetoken);
      pages++;

      for (const place of (data.results || [])) {
        if (saved >= max_leads) break;

        results.total_encontrados++;

        // Skip if already seen or already in CRM
        if (seen.has(place.place_id)) continue;
        seen.add(place.place_id);

        // Minimum reviews filter
        const reviews = place.user_ratings_total || 0;
        if (reviews < min_reviews) continue;
        results.con_5_reviews++;

        // Skip permanently closed
        if (place.business_status === 'CLOSED_PERMANENTLY') continue;
        if (existingNames.has(place.name?.toLowerCase())) continue;

        // Get full details
        const details = await getPlaceDetails(place.place_id);

        // Check website
        const websiteStatus = await checkWebsite(details.website);
        if (['working_good'].includes(websiteStatus)) continue; // only bad/missing

        if (websiteStatus === 'no_website') results.sin_website++;
        else results.website_roto++;

        const priority = scoreLead(details, websiteStatus);
        if (priority === 'alta prioridad') results.alta_prioridad++;

        const { asunto, cuerpo } = buildEmailDraft(details.name || place.name, cat);

        const lead = {
          nombre_negocio:    details.name || place.name,
          categoria:         cat,
          direccion:         details.formatted_address || place.formatted_address,
          telefono:          details.formatted_phone_number || '',
          rating:            details.rating || place.rating || 0,
          reviews:           details.user_ratings_total || place.user_ratings_total || 0,
          website_url:       details.website || '',
          website_status:    websiteStatus,
          google_maps_url:   details.url || '',
          ubicacion_buscada: ubicacion,
          lead_priority:     priority,
          outreach_status:   'pendiente',
          email:             '',
          email_status:      'sin_email',
          email_asunto:      asunto,
          email_cuerpo:      cuerpo,
          notas:             '',
          created_date:      new Date().toISOString(),
        };

        await base44.entities.Lead.create(lead);
        existingNames.add(lead.nombre_negocio.toLowerCase());
        saved++;
        results.leads_guardados++;
      }

      pagetoken = data.next_page_token || null;
    } while (pagetoken && pages < 3 && saved < max_leads);
  }

  return { summary: results };
}
