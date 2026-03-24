import { createClientFromRequest } from '@base44/sdk';

// base44 exposes secrets via process.env
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.google_places_api_key;

async function checkWebsite(url: string): Promise<string> {
  if (!url) return 'no_website';
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(normalized, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (res.status >= 400) return 'broken';
    const text = await res.text();
    const lower = text.toLowerCase();
    const badSignals = ['domain for sale','godaddy parking','namecheap','buy this domain',
      'coming soon','under construction','account suspended','website coming'];
    if (badSignals.some(s => lower.includes(s))) return 'broken';
    if (text.replace(/<[^>]*>/g,'').trim().length < 200) return 'working_bad';
    return 'working_good';
  } catch (e: any) {
    if (e?.name === 'AbortError') return 'unreachable';
    return 'broken';
  }
}

async function searchPlaces(query: string, pagetoken?: string): Promise<any> {
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_PLACES_API_KEY secret not set');
  const params: Record<string,string> = { query, key: GOOGLE_API_KEY, language: 'es' };
  if (pagetoken) params.pagetoken = pagetoken;
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${qs}`);
  const data = await res.json();
  if (data.status === 'REQUEST_DENIED') throw new Error(`Google API denied: ${data.error_message}`);
  return data;
}

async function getPlaceDetails(placeId: string): Promise<any> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,url,business_status',
    key: GOOGLE_API_KEY!,
    language: 'es',
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
  const data = await res.json();
  return data.result || {};
}

function scoreLead(details: any, websiteStatus: string): string {
  let score = 0;
  if (websiteStatus === 'no_website')  score += 40;
  if (websiteStatus === 'broken')      score += 30;
  if (websiteStatus === 'unreachable') score += 25;
  if (websiteStatus === 'working_bad') score += 15;
  const reviews = details.user_ratings_total || 0;
  if (reviews >= 50) score += 20;
  else if (reviews >= 20) score += 12;
  else if (reviews >= 5)  score += 6;
  const rating = details.rating || 0;
  if (rating >= 4.5) score += 15;
  else if (rating >= 4.0) score += 10;
  else if (rating >= 3.5) score += 5;
  if (details.formatted_phone_number) score += 5;
  if (score >= 55) return 'alta prioridad';
  if (score >= 30) return 'media prioridad';
  return 'baja prioridad';
}

function buildEmailDraft(nombre: string, categoria: string) {
  return {
    asunto: `Preparé una idea de website para ${nombre}`,
    cuerpo: `Hola, espero que estén bien.

Mi nombre es Roy Lorenzo y me dedico a crear websites para personas y negocios de la comunidad.

Vi su negocio de ${categoria} en Google y noté que ahora mismo no tienen página web, o que la que aparece no está funcionando bien. Preparé un preview de cómo podría verse una página moderna para ${nombre}.

Si les interesa, con mucho gusto se la puedo terminar y adaptar a su negocio.

Gracias,
Roy Lorenzo
Websites para PR`,
  };
}

export default async function handler(request: Request) {
  try {
    const base44 = createClientFromRequest(request);
    const body = await request.json();

    const ubicacion   = body.ubicacion   || 'Puerto Rico';
    const max_leads   = parseInt(body.max_leads)   || 20;
    const min_reviews = parseInt(body.min_reviews) || 5;
    const cats: string[] = Array.isArray(body.categorias)
      ? body.categorias
      : (body.categorias || 'restaurant,beauty_salon,dentist,car_repair,bakery,electrician,plumber,gym')
          .split(',').map((c: string) => c.trim()).filter(Boolean);

    const seen = new Set<string>();
    let existingNames = new Set<string>();

    try {
      const existing = await base44.entities.Lead.list();
      existingNames = new Set((existing || []).map((l: any) => l.nombre_negocio?.toLowerCase()));
    } catch (_) {}

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

      try {
        const data = await searchPlaces(query);

        for (const place of (data.results || [])) {
          if (saved >= max_leads) break;
          results.total_encontrados++;

          if (seen.has(place.place_id)) continue;
          seen.add(place.place_id);

          const reviews = place.user_ratings_total || 0;
          if (reviews < min_reviews) continue;
          results.con_5_reviews++;

          if (place.business_status === 'CLOSED_PERMANENTLY') continue;
          if (existingNames.has(place.name?.toLowerCase())) continue;

          let details: any = {};
          try { details = await getPlaceDetails(place.place_id); } catch (_) {}

          const websiteStatus = await checkWebsite(details.website);
          if (websiteStatus === 'working_good') continue;

          if (websiteStatus === 'no_website') results.sin_website++;
          else results.website_roto++;

          const priority = scoreLead(details, websiteStatus);
          if (priority === 'alta prioridad') results.alta_prioridad++;

          const { asunto, cuerpo } = buildEmailDraft(details.name || place.name, cat);

          const lead = {
            nombre_negocio:    details.name || place.name || '',
            categoria:         cat,
            direccion:         details.formatted_address || place.formatted_address || '',
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
          };

          try {
            await base44.entities.Lead.create(lead);
            existingNames.add(lead.nombre_negocio.toLowerCase());
            saved++;
            results.leads_guardados++;
          } catch (e: any) {
            console.error('Error saving lead:', e?.message);
          }
        }
      } catch (e: any) {
        console.error(`Error searching category ${cat}:`, e?.message);
      }
    }

    return { summary: results };

  } catch (e: any) {
    throw new Error(e?.message || 'Unknown error in searchLeads');
  }
}
