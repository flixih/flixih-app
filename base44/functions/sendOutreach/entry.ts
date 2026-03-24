import { createClientFromRequest } from '@base44/sdk';

export default async function handler(request) {
  const base44 = createClientFromRequest(request);

  let body = {};
  try { body = await request.json(); } catch(_) {}

  const { lead_id } = body;
  if (!lead_id) throw new Error('lead_id es requerido');

  const lead = await base44.entities.Lead.get(lead_id);
  if (!lead) throw new Error('Lead no encontrado');
  if (!lead.email) throw new Error('Este lead no tiene email');

  const subject = lead.email_asunto || `Preparé una idea de website para ${lead.nombre_negocio}`;
  const bodyText = lead.email_cuerpo || `Hola,\n\nMi nombre es Roy Lorenzo. Vi su negocio en Google y preparé un preview de website para ustedes.\n\n¿Les interesa?\n\nGracias,\nRoy Lorenzo\nWebsites para PR`;

  // Send via Outlook integration
  await base44.integrations.MicrosoftOutlook.SendEmail({
    to: lead.email,
    subject,
    body: bodyText,
  });

  await base44.entities.Lead.update(lead_id, {
    outreach_status: 'enviado',
    notas: (lead.notas ? lead.notas + '\n' : '') + `Email enviado el ${new Date().toLocaleDateString('es-PR')}`,
  });

  return { success: true, email: lead.email };
}
