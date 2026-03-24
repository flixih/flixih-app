import { createClientFromRequest } from '@base44/sdk';

// ── Color palettes by industry ────────────────────────────────────────────────

const PALETTES = {
  restaurant:    { primary: '#C0392B', secondary: '#E74C3C', accent: '#F39C12', bg: '#FDF6F0' },
  beauty_salon:  { primary: '#8E44AD', secondary: '#9B59B6', accent: '#F1948A', bg: '#FDF2F8' },
  dentist:       { primary: '#2980B9', secondary: '#3498DB', accent: '#1ABC9C', bg: '#EBF5FB' },
  car_repair:    { primary: '#1A252F', secondary: '#2C3E50', accent: '#E67E22', bg: '#F2F3F4' },
  bakery:        { primary: '#A04000', secondary: '#CA6F1E', accent: '#F0B27A', bg: '#FEF9E7' },
  electrician:   { primary: '#1F618D', secondary: '#2874A6', accent: '#F4D03F', bg: '#EBF5FB' },
  plumber:       { primary: '#1A5276', secondary: '#21618C', accent: '#17A589', bg: '#EAF2FF' },
  gym:           { primary: '#17202A', secondary: '#212F3D', accent: '#E74C3C', bg: '#F2F3F4' },
  default:       { primary: '#1A3A5C', secondary: '#2E86C1', accent: '#F39C12', bg: '#F4F6F9' },
};

function getPalette(categoria) {
  const key = Object.keys(PALETTES).find(k => categoria?.toLowerCase().includes(k));
  return PALETTES[key] || PALETTES.default;
}

// ── Copy generators ───────────────────────────────────────────────────────────

function getHeroSubtitle(categoria, nombre) {
  const map = {
    restaurant:   `Sabores auténticos en el corazón de la comunidad`,
    beauty_salon: `Tu belleza es nuestra pasión — resultados que hablan por sí solos`,
    dentist:      `Cuida tu sonrisa con el cuidado que merece`,
    car_repair:   `Tu vehículo en manos de expertos de confianza`,
    bakery:       `Pan fresco y repostería artesanal hecha con amor`,
    electrician:  `Soluciones eléctricas seguras y profesionales`,
    plumber:      `Reparaciones rápidas y de calidad para tu hogar`,
    gym:          `Transforma tu cuerpo y tu vida — empieza hoy`,
  };
  const key = Object.keys(map).find(k => categoria?.toLowerCase().includes(k));
  return map[key] || `Servicio profesional y de confianza para tu comunidad`;
}

function getServices(categoria) {
  const map = {
    restaurant:   ['Almuerzo & Cena', 'Para Llevar', 'Catering', 'Reservaciones'],
    beauty_salon: ['Corte & Estilo', 'Coloración', 'Tratamientos', 'Manicure & Pedicure'],
    dentist:      ['Limpieza Dental', 'Blanqueamiento', 'Ortodoncia', 'Emergencias'],
    car_repair:   ['Diagnóstico', 'Mecánica General', 'Cambio de Aceite', 'Frenos & Suspensión'],
    bakery:       ['Pan Artesanal', 'Pasteles', 'Bizcochos', 'Pedidos Especiales'],
    electrician:  ['Instalaciones', 'Reparaciones', 'Panel Eléctrico', 'Emergencias 24/7'],
    plumber:      ['Tuberías', 'Destapes', 'Calentadores', 'Remodelaciones'],
    gym:          ['Clases Grupales', 'Entrenamiento Personal', 'Cardio', 'Pesas'],
  };
  const key = Object.keys(map).find(k => categoria?.toLowerCase().includes(k));
  return map[key] || ['Consulta', 'Servicio Personalizado', 'Asesoría', 'Atención al Cliente'];
}

function getCTA(categoria) {
  const map = {
    restaurant:   '🍽️ Ver Menú',
    beauty_salon: '💅 Reservar Cita',
    dentist:      '🦷 Agendar Consulta',
    car_repair:   '🔧 Solicitar Diagnóstico',
    bakery:       '🥖 Ver Productos',
    electrician:  '⚡ Solicitar Servicio',
    plumber:      '🚿 Solicitar Servicio',
    gym:          '💪 Empezar Gratis',
  };
  const key = Object.keys(map).find(k => categoria?.toLowerCase().includes(k));
  return map[key] || '📞 Contáctanos';
}

// ── HTML generator ────────────────────────────────────────────────────────────

function generateHTML(lead) {
  const p = getPalette(lead.categoria);
  const subtitle = getHeroSubtitle(lead.categoria, lead.nombre_negocio);
  const services = getServices(lead.categoria);
  const cta = getCTA(lead.categoria);
  const nombre = lead.nombre_negocio || 'Nuestro Negocio';
  const ubicacion = lead.direccion || lead.ubicacion_buscada || 'Puerto Rico';
  const telefono = lead.telefono || '';
  const rating = lead.rating ? `⭐ ${lead.rating} (${lead.reviews} reseñas en Google)` : '';

  const servicesHTML = services.map(s => `
    <div style="background:white;border-radius:12px;padding:24px 20px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.08);border-top:4px solid ${p.accent}">
      <div style="font-size:28px;margin-bottom:10px">✦</div>
      <div style="font-weight:700;color:${p.primary};font-size:15px">${s}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${nombre} — Preview</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;color:#222;background:${p.bg}}
  a{color:inherit;text-decoration:none}
  .btn{display:inline-block;background:${p.accent};color:white;padding:14px 36px;border-radius:50px;font-weight:700;font-size:16px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:transform .2s}
  .btn:hover{transform:translateY(-2px)}
  section{padding:70px 20px}
  .container{max-width:1000px;margin:0 auto}
  h2{font-size:30px;font-weight:800;color:${p.primary};margin-bottom:14px;text-align:center}
  .subtitle{text-align:center;color:#666;font-size:16px;margin-bottom:48px}
</style>
</head>
<body>

<!-- HERO -->
<section style="background:linear-gradient(135deg,${p.primary} 0%,${p.secondary} 100%);color:white;text-align:center;padding:100px 20px 80px">
  <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:6px 18px;border-radius:50px;font-size:13px;font-weight:600;margin-bottom:20px;letter-spacing:1px;text-transform:uppercase">${lead.categoria || 'Negocio Local'}</div>
  <h1 style="font-size:clamp(32px,6vw,56px);font-weight:900;margin-bottom:16px;line-height:1.1">${nombre}</h1>
  <p style="font-size:clamp(16px,2.5vw,20px);opacity:.85;max-width:560px;margin:0 auto 36px;line-height:1.6">${subtitle}</p>
  ${rating ? `<p style="opacity:.7;font-size:14px;margin-bottom:24px">${rating}</p>` : ''}
  <a class="btn" href="tel:${telefono}">${cta}</a>
  <p style="margin-top:20px;opacity:.6;font-size:13px">📍 ${ubicacion}</p>
</section>

<!-- SERVICES -->
<section style="background:${p.bg}">
  <div class="container">
    <h2>Nuestros Servicios</h2>
    <p class="subtitle">Todo lo que necesitas, en un solo lugar</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px">
      ${servicesHTML}
    </div>
  </div>
</section>

<!-- ABOUT -->
<section style="background:white">
  <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center">
    <div>
      <h2 style="text-align:left">Sobre Nosotros</h2>
      <p style="color:#555;line-height:1.9;font-size:16px;margin-bottom:20px">
        Somos un negocio local comprometido con nuestra comunidad. Llevamos años brindando servicios de calidad con atención personalizada y el trato cercano que caracteriza a Puerto Rico.
      </p>
      <p style="color:#555;line-height:1.9;font-size:16px">
        Cada cliente es especial para nosotros. Nuestro equipo está aquí para ayudarte con profesionalismo, honestidad y dedicación.
      </p>
    </div>
    <div style="background:linear-gradient(135deg,${p.primary},${p.secondary});border-radius:20px;height:280px;display:flex;align-items:center;justify-content:center;color:white;font-size:64px">
      🏆
    </div>
  </div>
</section>

<!-- REVIEWS -->
${rating ? `<section style="background:${p.bg}">
  <div class="container">
    <h2>Lo que dicen nuestros clientes</h2>
    <p class="subtitle">${rating} en Google Maps</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px">
      ${[
        ['⭐⭐⭐⭐⭐', 'Excelente servicio y muy profesionales. Los recomiendo al 100%.', 'Cliente satisfecho'],
        ['⭐⭐⭐⭐⭐', 'Siempre recibo una atención de primera. Volvería sin duda.', 'Cliente fiel'],
        ['⭐⭐⭐⭐⭐', 'Lo mejor del área. Calidad y precio justo.', 'Vecino de la comunidad'],
      ].map(([stars, text, author]) => `
      <div style="background:white;border-radius:14px;padding:24px;box-shadow:0 2px 10px rgba(0,0,0,0.07)">
        <div style="font-size:18px;margin-bottom:10px">${stars}</div>
        <p style="color:#444;font-size:14px;line-height:1.7;font-style:italic">"${text}"</p>
        <p style="color:${p.primary};font-weight:700;font-size:13px;margin-top:12px">— ${author}</p>
      </div>`).join('')}
    </div>
  </div>
</section>` : ''}

<!-- CONTACT -->
<section style="background:white">
  <div class="container" style="text-align:center">
    <h2>¿Listo para contactarnos?</h2>
    <p class="subtitle">Estamos aquí para ayudarte</p>
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;margin-bottom:40px">
      ${telefono ? `<div style="background:${p.bg};border-radius:12px;padding:20px 28px;min-width:180px">
        <div style="font-size:28px;margin-bottom:8px">📞</div>
        <div style="font-weight:700;color:${p.primary}">${telefono}</div>
        <div style="font-size:12px;color:#888;margin-top:4px">Llámanos</div>
      </div>` : ''}
      <div style="background:${p.bg};border-radius:12px;padding:20px 28px;min-width:180px">
        <div style="font-size:28px;margin-bottom:8px">📍</div>
        <div style="font-weight:700;color:${p.primary};font-size:13px">${ubicacion}</div>
        <div style="font-size:12px;color:#888;margin-top:4px">Encuéntranos</div>
      </div>
    </div>
    <a class="btn" href="tel:${telefono}" style="background:${p.primary}">${cta}</a>
  </div>
</section>

<!-- FOOTER -->
<footer style="background:${p.primary};color:rgba(255,255,255,0.8);text-align:center;padding:30px 20px">
  <p style="font-weight:700;color:white;font-size:18px;margin-bottom:8px">${nombre}</p>
  <p style="font-size:13px">📍 ${ubicacion}${telefono ? `  •  📞 ${telefono}` : ''}</p>
  <p style="font-size:11px;margin-top:16px;opacity:.5">Preview creado por Roy Lorenzo — Websites para PR</p>
</footer>

</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(request) {
  const base44 = createClientFromRequest(request);

  // Get all leads that don't have a preview yet
  const leads = await base44.entities.Lead.list();
  const pending = (leads || []).filter(l => !l.preview_html);

  let previews_generados = 0;

  for (const lead of pending) {
    const preview_html = generateHTML(lead);
    await base44.entities.Lead.update(lead.id, { preview_html });
    previews_generados++;
  }

  return { previews_generados, total_leads: leads?.length || 0 };
}
// updated Tue Mar 24 06:35:44 UTC 2026
