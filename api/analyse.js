export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Alleen POST toegestaan" });
    return;
  }

  const { vacatureText } = req.body || {};

  if (!vacatureText || !vacatureText.trim()) {
    res.status(400).json({ error: "Geen vacaturetekst meegegeven" });
    return;
  }

  const prompt = `Je bent een arbeidsmarktanalist. Analyseer onderstaande vacaturetekst.

Gebruik de websearch-tool om voor elk transferable beroep waar "opleiding" bij hoort een bestaande, actuele Nederlandse cursus of opleiding op te zoeken. Verzin nooit een cursusnaam of aanbieder. Als je via websearch niets bruikbaars vindt, laat het veld "cursus" dan leeg.

Gebruik nooit een liggend streepje (em dash, "—") in je tekst. Gebruik gewone punten en komma's.

Geef als allerlaatste bericht uitsluitend geldige JSON terug, zonder markdown-codeblokken, zonder tekst ervoor of erna. Structuur:

{
  "functietitel": "korte herkenbare titel van de functie uit de vacature",
  "hard_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "soft_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "transferable_dichtbij": [
    {
      "beroep": "naam ander beroep",
      "percentage": 82,
      "uitleg": "één korte zin (max 15 woorden) waarom de skills overlappen",
      "werkenden_nl": "indicatieve schatting, bv. 'circa 25.000-35.000'",
      "overstap_type": "coaching of opleiding",
      "cursus": "naam + aanbieder van een echt bestaande cursus/opleiding, alleen invullen bij overstap_type opleiding en alleen als via websearch gevonden, anders leeg"
    }
  ],
  "transferable_verrassend": [
    { "zelfde structuur als hierboven, maar 4 beroepen uit een heel ander vakgebied die toch verrassend sterk overlappen in kernvaardigheden" }
  ],
  "cta_tekst": "korte tekst (max 50 woorden), informele directe toon, geen bedrijfsnaam. Noem kort iets herkenbaars uit de vacature, benoem dan dat het uitzoeken van al deze kandidaten veel werk is, en nodig uit tot contact voor een gratis tool die de vacature herschrijft voor bredere doelgroepen."
}

Geef exact 4 items in transferable_dichtbij (beroepen die logisch dicht bij de functie liggen) en exact 4 items in transferable_verrassend (onverwachte beroepen uit een ander vakgebied met verrassend veel skill-overlap, zoals een nagelstyliste met de handvaardigheid en precisie van een lasser). Sorteer beide lijsten van hoog naar laag percentage. De werkenden_nl schattingen zijn indicatief, geen officiële CBS-cijfers, want CBS-beroepsgroepen zijn vaak breder dan één specifiek beroep.

Vacaturetekst:
"""
${vacatureText}
"""`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "Anthropic API fout", detail: errText });
      return;
    }

    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text");
    const raw = (textBlocks[textBlocks.length - 1]?.text || "").trim();
    const clean = raw.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Analyse mislukt", detail: String(err) });
  }
}
