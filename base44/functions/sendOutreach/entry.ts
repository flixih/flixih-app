import { createClientFromRequest } from '@base44/sdk';

export default async function handler(request) {
  const base44 = createClientFromRequest(request);
  const { lead_id } = await request.json();

  if (!lead_id) {
    throw new Error('lead_id is required');
  }

  const lead = await base44.entities.Lead.get(lead_id);
  if (!lead) throw new Error(`Lead ${lead_id} not found`);
  if (!lead.email) throw new Error('Lead has no email address');

  // Build personalized email body with preview link if available
  const previewSection = lead.preview_url
    ? `\nLes comparto el preview aquí:\n${lead.preview_url}\n`
    : '';

  const emailBody = lead.email_cuerpo
    ? lead.email_cuerpo + previewSection
    : `Hola, espero que estén bien.

Mi nombre es Roy Lorenzo y me dedico a crear websites para personas y negocios de la comunidad.

Vi su negocio en Google y noté que ahora mismo no tienen página web, o que la que aparece no está funcionando bien. Como referencia, preparé un preview de cómo podría verse una página moderna para ${lead.nombre_negocio}.

La idea es que puedan tener una presencia más profesional online, enseñar sus servicios, horarios, ubicación y facilitar que más clientes los contacten.

Si les interesa, con mucho gusto se la puedo terminar y adaptar completa a su negocio.
${previewSection}
Si quieren, me pueden responder por aquí y se las enseño mejor.

Gracias,
Roy Lorenzo
Websites para PR`;

  // Send via base44's Core email integration
  await base44.integrations.Core.SendEmail({
    to: lead.email,
    subject: lead.email_asunto || `Preparé una idea de website para ${lead.nombre_negocio}`,
    body: emailBody,
  });

  // Update lead status
  await base44.entities.Lead.update(lead_id, {
    outreach_status: 'enviado',
    notas: (lead.notas ? lead.notas + '\n' : '') +
           `Email enviado el ${new Date().toLocaleDateString('es-PR')}`,
  });

  return { success: true, lead_id, email: lead.email };
}
// updated Tue Mar 24 06:35:44 UTC 2026
