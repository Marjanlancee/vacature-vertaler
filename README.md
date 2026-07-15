# Vacature-skillsanalyse

Werkgever plakt een vacaturetekst, tool geeft terug:
- 5 hard skills + 5 soft skills
- 2-3 transferable beroepen met matchpercentage, uitleg en indicatief aantal werkenden in NL
- Uitnodigende CTA-tekst

## Bestanden
- `index.html` — frontend (React via CDN, geen build-stap nodig)
- `api/analyse.js` — Vercel serverless functie die de Claude API aanroept
- `vercel.json` — zorgt dat Vercel de root als static site serveert

## Setup na upload naar GitHub

1. Repo op GitHub aanmaken, deze drie bestanden + map uploaden (behoud de `api/` map-structuur)
2. In Vercel: "Add New Project" → repo importeren
3. Bij Environment Variables in Vercel: voeg toe
   - Naam: `ANTHROPIC_API_KEY`
   - Waarde: je eigen Anthropic API key (aan te maken via console.anthropic.com)
4. Deploy

Belangrijk: de API key staat nergens in de code, alleen in de Vercel environment variable. Zo blijft hij geheim ook al is de repo of frontend openbaar.

## Later uit te breiden
- Echte CBS/UWV-data i.p.v. LLM-schattingen voor "werkenden_nl"
- CTA-tekst met naam/contactgegevens invullen
