export const config = {
  maxDuration: 120,
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

  const prompt = `Je bent een arbeidsmarktanalist. Analyseer onderstaande vacaturetekst of functienaam.

Als de invoer alleen een functienaam is (geen volledige vacaturetekst), baseer je de analyse dan op wat gebruikelijk hoort bij die functie in Nederland.

Gebruik de websearch-tool om voor elk transferable beroep waar "opleiding" bij hoort een bestaande, actuele Nederlandse cursus of opleiding op te zoeken, inclusief de directe URL van de aanbieder. Verzin nooit een cursusnaam, aanbieder of link. Belangrijk: als je via websearch geen cursus met een echte, werkende URL vindt, zet overstap_type dan op "coaching" in plaats van "opleiding", en laat "cursus" en "cursus_url" leeg. Gebruik "opleiding" dus alleen als je ook echt een cursus_url hebt gevonden.

Kies bij de transferable beroepen bij voorkeur beroepen met een substantiële beroepsbevolking in Nederland (liever te veel dan te weinig potentiele kandidaten), zodat een werkgever er ook daadwerkelijk mensen kan werven. Vermijd te specifieke niche-beroepen met een kleine populatie, tenzij er geen beter alternatief is. Baseer de keuze op reeel overlappende kernvaardigheden, niet alleen op de sector of werkomgeving van de oorspronkelijke vacature (dus niet automatisch alleen beroepen uit dezelfde branche zoals "zorg" of "ziekenhuis" als de vacature daar toevallig speelt, tenzij die branche relevant is voor de skill-overlap zelf).

Gebruik nooit een liggend streepje (em dash, "—") in je tekst. Gebruik gewone punten en komma's.

Geef als allerlaatste bericht uitsluitend geldige JSON terug. Begin dat laatste bericht direct met het teken { en eindig met het teken }. Voeg geen inleidende zin toe zoals "Ik heb nu..." of "Hier is de analyse", geen markdown-codeblokken, geen tekst erna. Structuur:

{
  "functietitel": "korte herkenbare titel van de functie",
  "hard_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "soft_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "transferable_dichtbij": [
    {
      "beroep": "naam ander beroep, bij voorkeur met een substantiele beroepsbevolking in Nederland",
      "percentage": 82,
      "uitleg": "één korte zin (max 15 woorden) waarom de skills overlappen en waarom dit kansrijk is voor werving",
      "werkenden_nl": "indicatieve schatting, bv. 'circa 25.000-35.000'",
      "overstap_type": "coaching of opleiding",
      "cursus": "naam + aanbieder van een echt bestaande cursus/opleiding, alleen invullen bij overstap_type opleiding en alleen als via websearch gevonden, anders leeg",
      "cursus_url": "de directe URL van die cursus/opleiding zoals gevonden via websearch, anders leeg"
    }
  ],
  "transferable_verrassend": [
    { "zelfde structuur als hierboven, maar 4 beroepen uit een heel ander vakgebied die toch verrassend sterk overlappen in kernvaardigheden, ook hier bij voorkeur met een redelijke beroepsbevolking" }
  ],
  "cta_tekst": "korte tekst (max 50 woorden), informele directe toon. Gebruik nooit het woord 'gratis' of 'kosteloos'. Noem kort iets herkenbaars uit de vacature, benoem dan dat het uitpluizen van al deze kandidaten net zoveel precisie kost, en nodig uit tot contact met NLwerktaanwerk voor een tool die de vacature herschrijft voor een bredere doelgroep. Eindig met: Bel of app Marjan Lancee, 06-41077991."
}

Geef exact 4 items in transferable_dichtbij (beroepen die logisch dicht bij de functie liggen) en exact 4 items in transferable_verrassend (onverwachte beroepen uit een ander vakgebied met verrassend veel skill-overlap, zoals een nagelstyliste met de handvaardigheid en precisie van een lasser). Sorteer beide lijsten van hoog naar laag percentage. De werkenden_nl schattingen zijn indicatief, geen officiële CBS-cijfers, want CBS-beroepsgroepen zijn vaak breder dan één specifiek beroep.

Vacaturetekst of functienaam:
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
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
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
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      res.status(500).json({ error: "Analyse mislukt", detail: "Geen JSON gevonden in antwoord", raw });
      return;
    }
    const clean = raw.slice(start, end + 1);
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Analyse mislukt", detail: String(err) });
  }
}
