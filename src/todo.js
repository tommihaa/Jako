// Tulossa-lista (Asetukset › Tulossa). Data eikä logiikkaa, joten se ei asu App.jsx:ssä
// 5.9.2026 alkaen (kompositioauditointi H8). Merkintä päivitetään julkaisun yhteydessä,
// ks. CLAUDE.md › Deploy.
// status: 'done' | 'open' | 'deferred'
/** @type {{label: string, status: 'done'|'open'|'deferred'}[]} */
export const TODO = [
  { label: '"Kokeile ääniä" -esikuuntelu Asetuksissa + pikamykistys', status: 'done' },
  { label: 'Ääniteema: Torvi & kantele (valittavissa Asetuksista, äänet päällä)', status: 'done' },
  { label: 'Kaksivärinen korttipakka nelivärisen ohella (valittavissa Asetuksista)', status: 'done' },
  { label: 'Kieliversiointi (23 kieltä)', status: 'done' },
  { label: 'Replay: shakki-symbolit siirtomerkintöihin (! !! ? ?? !? ?!)', status: 'deferred' },
  // UKK herää palautteen mukana — lokalisoitu fi+en, muut kielet putoavat tähän labeliin
  { label: 'Usein kysytyt kysymykset (UKK)', status: 'deferred' },
  { label: 'Jaa peli kaverille (linkki tai QR-koodi)', status: 'done' },
  { label: 'Ohje: sovelluksen lisääminen puhelimen aloitusnäytölle', status: 'done' },
  { label: 'Tekoälyn vaikeustasojen hionta (uskottavammat aloittelijan virheet)', status: 'done' },
  { label: 'Kysy Mestarilta neuvoa -nappi viiteen peliin (Seiska, Ristiseiska, Kultakala, Koputus, Läpsy)', status: 'done' },
  { label: 'Mestarin neuvo monivaiheisiin peleihin (Moska, Paskahousu, Kasino, Maija)', status: 'done' },
  { label: 'Mestarin opastus: 🎓-nappi kertoo säännön ilman korostusta, palaute vasta oman valinnan jälkeen', status: 'done' },
];
