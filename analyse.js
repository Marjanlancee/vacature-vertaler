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

Geef uitsluitend geldige JSON terug, zonder markdown-codeblokken, zonder inleidende tekst. Structuur:

{
  "functietitel": "korte herkenbare titel van de functie uit de vacature",
  "hard_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "soft_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "transferable": [
    {
      "beroep": "naam ander beroep",
      "percentage": 72,
      "uitleg": "één korte zin (max 15 woorden) waarom de skills overlappen",
      "werkenden_nl": "indicatieve schatting van aantal mensen dat dit beroep in Nederland uitoefent, bv. 'circa 7.000' of 'circa 15.000-20.000'"
    }
  ],
  "cta_tekst": "een korte, uitnodigende tekst (max 40 woorden) gericht aan de werkgever, in informele directe toon, die nieuwsgierig maakt naar een gratis tool die de vacature herschrijft zodat deze ook andere doelgroepen aanspreekt. Noem geen bedrijfs- of organisatienaam. Eindig met een uitnodiging om contact op te nemen."
}

Geef 2 tot 3 transferable beroepen, gesorteerd van hoog naar laag percentage. Kies beroepen die qua kernvaardigheden echt overlappen maar in een ander vakgebied liggen (zoals bakker -> laadpaalmonteur, vanwege precisie, ritme en handvaardigheid). Gebruik altijd "circa" of een bandbreedte bij werkenden_nl, dit zijn indicatieve schattingen, geen officiële CBS-cijfers, want CBS-beroepsgroepen zijn vaak breder dan één specifiek beroep.

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
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: "Anthropic API fout", detail: errText });
      return;
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    const raw = (textBlock?.text || "").trim();
    const clean = raw.replace(/^```json\s*|^```\s*|```$/gm, "").trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Analyse mislukt", detail: String(err) });
  }
}
