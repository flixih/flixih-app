# Flixih Lead System

Lead generation system for local businesses in Puerto Rico.
Built by Roy Lorenzo — Websites para PR.

## Setup in base44

### 1. Secrets
Add in base44 → Settings → Secrets:
- `GOOGLE_PLACES_API_KEY` — your Google Places API key

### 2. Entity
Create entity `Lead` in base44 → Data with these fields:
- nombre_negocio, categoria, direccion, telefono (text)
- rating, reviews (number)
- website_url, website_status, google_maps_url (text)
- ubicacion_buscada, lead_priority, outreach_status (text)
- email, email_status, email_asunto, email_cuerpo (text)
- preview_html, preview_url, notas (text)

### 3. Functions
The 3 backend functions are in `/functions/`:
- `searchLeads.ts` — Google Maps search + save leads
- `generatePreview.ts` — HTML website preview generator
- `sendOutreach.ts` — Send email via Outlook

### 4. Publish
Click Publish in the base44 editor.
