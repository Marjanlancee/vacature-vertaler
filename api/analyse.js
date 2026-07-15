export const config = {
  maxDuration: 30,
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

Voor transferable_dichtbij: kies beroepen met een substantiële beroepsbevolking in Nederland (liever te veel dan te weinig potentiele kandidaten), zodat een werkgever er ook daadwerkelijk mensen kan werven. Baseer de keuze op reeel overlappende kernvaardigheden (hard en soft skills), uit vakgebieden die logisch dicht bij de oorspronkelijke functie liggen.

Voor transferable_verrassend geldt een andere, strengere aanpak: kies exact 4 beroepen uit een echt ander vakgebied (denk aan zorg, horeca, beauty, detailhandel, administratief, creatief, in plaats van net iets andere techniek). Deze mensen hebben de hard skills van de functie nog niet, maar wel de onderliggende soft skills en aanleg (zoals precisie, werken onder druk, veiligheidsbewustzijn, leergierigheid) die voorspellen dat ze het vak kunnen leren. Baseer transferable_verrassend dus vooral op overlap in soft skills, niet op hard skills. Wees hier eerlijk over in het veld "uitleg": benoem dat de hard skills nog geleerd moeten worden, maar dat de onderliggende soft skills of aanleg al aanwezig zijn. Vermijd dat een verrassend beroep eigenlijk nog steeds uit dezelfde technische sector komt, dat is dan geen verrassende match maar een dichtbij-match.

Gebruik nooit een liggend streepje (em dash, "—") in je tekst. Gebruik gewone punten en komma's.

Geef uitsluitend geldige JSON terug. Begin direct met het teken { en eindig met het teken }. Geen markdown-codeblokken, geen tekst ervoor of erna. Structuur:

{
  "functietitel": "korte herkenbare titel van de functie",
  "hard_skills": ["skill 1", "skill 2", "skill 3", "skill 4"],
  "soft_skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5", "skill 6", "skill 7"],
  "transferable_dichtbij": [
    {
      "beroep": "naam ander beroep, bij voorkeur met een substantiele beroepsbevolking in Nederland",
      "percentage": 82,
      "uitleg": "één korte zin (max 15 woorden) waarom de skills overlappen en waarom dit kansrijk is voor werving",
      "werkenden_nl": "indicatieve schatting, bv. 'circa 25.000-35.000'"
    }
  ],
  "transferable_verrassend": [
    {
      "beroep": "naam beroep uit een echt ander vakgebied",
      "percentage": 55,
      "uitleg": "één korte zin (max 20 woorden), eerlijk over welke soft skill overlapt en dat de hard skills nog geleerd moeten worden",
      "werkenden_nl": "indicatieve schatting, bv. 'circa 25.000-35.000'"
    }
  ],
  "cta_tekst": "tekst opgebouwd uit exact deze vier onderdelen achter elkaar. Deel 1: Wist je dat [kies hier een van de verrassende transferable beroepen uit transferable_verrassend] verrassend dicht bij deze functie zit? Deel 2 (altijd letterlijk): Dat kost precisie om te ontdekken. Deel 3 (altijd letterlijk): NLwerktaanwerk heeft een handig tooltje (ook gratis) die jouw vacature herschrijft voor een veel bredere doelgroep, en helpt je ook op weg met ontwikkelpaden binnen jouw branche. Deel 4 (altijd letterlijk): Vraag deze op!"
}

Geef exact 4 items in transferable_dichtbij en exact 4 items in transferable_verrassend. Sorteer beide lijsten van hoog naar laag percentage. De werkenden_nl schattingen zijn indicatief, geen officiële CBS-cijfers, want CBS-beroepsgroepen zijn vaak breder dan één specifiek beroep.

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
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }],
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
