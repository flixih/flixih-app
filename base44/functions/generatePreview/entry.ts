import { createClientFromRequest } from '@base44/sdk';

function buildHTML(lead) {
  const colors = {
    restaurant:   ['#C0392B','#E74C3C','#F39C12'],
    beauty_salon: ['#8E44AD','#9B59B6','#F1948A'],
    dentist:      ['#2980B9','#3498DB','#1ABC9C'],
    car_repair:   ['#1A252F','#2C3E50','#E67E22'],
    bakery:       ['#A04000','#CA6F1E','#F0B27A'],
    electrician:  ['#1F618D','#2874A6','#F4D03F'],
    plumber:      ['#1A5276','#21618C','#17A589'],
    gym:          ['#17202A','#212F3D','#E74C3C'],
  };
  const cat = (lead.categoria || '').toLowerCase();
  const key = Object.keys(colors).find(k => cat.includes(k));
  const [primary, secondary, accent] = colors[key] || ['#1A3A5C','#2E86C1','#F39C12'];

  const services = {
    restaurant:   ['Almuerzo & Cena','Para Llevar','Catering','Reservaciones'],
    beauty_salon: ['Corte & Estilo','Coloración','Tratamientos','Manicure & Pedicure'],
    dentist:      ['Limpieza Dental','Blanqueamiento','Ortodoncia','Emergencias'],
    car_repair:   ['Diagnóstico','Mecánica General','Cambio de Aceite','Frenos'],
    bakery:       ['Pan Artesanal','Pasteles','Bizcochos','Pedidos Especiales'],
    electrician:  ['Instalaciones','Reparaciones','Panel Eléctrico','Emergencias 24/7'],
    plumber:      ['Tuberías','Destapes','Calentadores','Remodelaciones'],
    gym:          ['Clases Grupales','Entrenamiento Personal','Cardio','Pesas'],
  };
  const svcs = services[key] || ['Consulta','Servicio Personalizado','Asesoría','Atención al Cliente'];

  const nombre = lead.nombre_negocio || 'Nuestro Negocio';
  const ubicacion = lead.direccion || lead.ubicacion_buscada || 'Puerto Rico';
  const telefono = lead.telefono || '';
  const ratingStr = lead.rating ? `⭐ ${lead.rating} (${lead.reviews} reseñas)` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${nombre}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8f9fa}
.hero{background:linear-gradient(135deg,${primary},${secondary});color:white;text-align:center;padding:80px 20px}
.hero h1{font-size:clamp(28px,5vw,52px);font-weight:900;margin-bottom:12px}
.hero p{font-size:18px;opacity:.85;margin-bottom:8px}
.hero .rating{font-size:14px;opacity:.7;margin-bottom:28px}
.btn{display:inline-block;background:${accent};color:white;padding:14px 32px;border-radius:50px;font-weight:700;font-size:16px;text-decoration:none}
.section{padding:60px 20px;max-width:1000px;margin:0 auto}
.section h2{font-size:28px;font-weight:800;color:${primary};margin-bottom:8px;text-align:center}
.section p{text-align:center;color:#666;margin-bottom:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}
.card{background:white;border-radius:12px;padding:24px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08);border-top:4px solid ${accent}}
.card h3{font-weight:700;color:${primary};font-size:15px;margin-top:8px}
footer{background:${primary};color:rgba(255,255,255,.8);text-align:center;padding:28px 20px}
footer strong{color:white;display:block;font-size:18px;margin-bottom:6px}
</style>
</head>
<body>
<div class="hero">
  <div style="display:inline-block;background:rgba(255,255,255,.15);padding:4px 16px;border-radius:50px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:16px">${lead.categoria || 'Negocio Local'}</div>
  <h1>${nombre}</h1>
  <p>Servicio profesional para tu comunidad</p>
  ${ratingStr ? `<p class="rating">${ratingStr} en Google</p>` : '<p class="rating">📍 '+ubicacion+'</p>'}
  ${telefono ? `<a class="btn" href="tel:${telefono}">📞 Contáctanos</a>` : `<a class="btn" href="#">📞 Contáctanos</a>`}
</div>
<div style="background:white;padding:60px 20px">
  <div class="section">
    <h2>Nuestros Servicios</h2>
    <p>Todo lo que necesitas, en un solo lugar</p>
    <div class="grid">
      ${svcs.map(s=>`<div class="card"><div style="font-size:32px">✦</div><h3>${s}</h3></div>`).join('')}
    </div>
  </div>
</div>
<div style="background:#f8f9fa;padding:60px 20px">
  <div class="section">
    <h2>Sobre Nosotros</h2>
    <p style="max-width:600px;margin:0 auto 0;line-height:1.8;color:#555">Somos un negocio local comprometido con nuestra comunidad. Brindamos servicios de calidad con atención personalizada y el trato cercano que caracteriza a Puerto Rico.</p>
  </div>
</div>
<footer>
  <strong>${nombre}</strong>
  <span>📍 ${ubicacion}${telefono ? ' • 📞 '+telefono : ''}</span>
  <span style="display:block;font-size:11px;margin-top:12px;opacity:.5">Preview por Roy Lorenzo — Websites para PR</span>
</footer>
</body>
</html>`;
}

export default async function handler(request) {
  const base44 = createClientFromRequest(request);

  let leads = [];
  try {
    leads = await base44.entities.Lead.list() || [];
  } catch(e) {
    throw new Error('Error cargando leads: ' + e.message);
  }

  const pending = leads.filter(l => !l.preview_html);
  let previews_generados = 0;

  for (const lead of pending) {
    try {
      const preview_html = buildHTML(lead);
      await base44.entities.Lead.update(lead.id, { preview_html });
      previews_generados++;
    } catch(e) {
      console.error('Error generando preview para', lead.nombre_negocio, e.message);
    }
  }

  return { previews_generados, total_leads: leads.length };
}
