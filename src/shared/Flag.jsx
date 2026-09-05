// Kielivalinnan liput. Siirretty App.jsx:stä 5.9.2026 (kompositioauditointi H8): 23
// inline-SVG:tä asuivat siellä sijainnin eivätkä rakenteen takia, eikä tiedosto tarvitse
// muuta sovelluksesta.
// Inline-SVG-liput kielivalintaan. Emojiliput eivät renderöidy Windowsilla (näkyvät
// maakoodina "GB"/"FI"), joten piirretään liput SVG:nä → näkyvät kaikilla alustoilla.
export default function Flag({ code }) {
  const c = { width: 18, height: 12, viewBox: '0 0 18 12', 'aria-hidden': true,
    style: { borderRadius: 2, display: 'block', flexShrink: 0, boxShadow: '0 0 0 0.5px rgba(0,0,0,0.25)' } };
  if (code === 'fi') return (
    <svg {...c}><rect width="18" height="12" fill="#fff"/><rect x="5" width="3" height="12" fill="#003580"/><rect y="4.5" width="18" height="3" fill="#003580"/></svg>
  );
  if (code === 'sv') return (
    <svg {...c}><rect width="18" height="12" fill="#006aa7"/><rect x="5" width="3" height="12" fill="#fecc00"/><rect y="4.5" width="18" height="3" fill="#fecc00"/></svg>
  );
  if (code === 'de') return (
    <svg {...c}><rect width="18" height="4" fill="#000"/><rect y="4" width="18" height="4" fill="#dd0000"/><rect y="8" width="18" height="4" fill="#ffce00"/></svg>
  );
  if (code === 'en') return (
    <svg {...c}>
      <clipPath id="ukclip"><rect width="18" height="12"/></clipPath>
      <g clipPath="url(#ukclip)">
        <rect width="18" height="12" fill="#012169"/>
        <path d="M0,0 L18,12 M18,0 L0,12" stroke="#fff" strokeWidth="2.4"/>
        <path d="M0,0 L18,12 M18,0 L0,12" stroke="#c8102e" strokeWidth="1"/>
        <rect x="7" width="4" height="12" fill="#fff"/><rect y="4" width="18" height="4" fill="#fff"/>
        <rect x="7.6" width="2.8" height="12" fill="#c8102e"/><rect y="4.6" width="18" height="2.8" fill="#c8102e"/>
      </g>
    </svg>
  );
  // Norja: punainen, valkoreunainen sininen pohjoismaaristi
  if (code === 'no') return (
    <svg {...c}><rect width="18" height="12" fill="#ba0c2f"/><rect x="4" width="5" height="12" fill="#fff"/><rect y="3.5" width="18" height="5" fill="#fff"/><rect x="5" width="3" height="12" fill="#00205b"/><rect y="4.5" width="18" height="3" fill="#00205b"/></svg>
  );
  // Tanska: punainen, valkoinen pohjoismaaristi
  if (code === 'da') return (
    <svg {...c}><rect width="18" height="12" fill="#c8102e"/><rect x="5" width="3" height="12" fill="#fff"/><rect y="4.5" width="18" height="3" fill="#fff"/></svg>
  );
  // Islanti: sininen, valkoreunainen punainen pohjoismaaristi
  if (code === 'is') return (
    <svg {...c}><rect width="18" height="12" fill="#02529c"/><rect x="4" width="5" height="12" fill="#fff"/><rect y="3.5" width="18" height="5" fill="#fff"/><rect x="5" width="3" height="12" fill="#dc1e35"/><rect y="4.5" width="18" height="3" fill="#dc1e35"/></svg>
  );
  // Ranska: pysty sininen/valkoinen/punainen
  if (code === 'fr') return (
    <svg {...c}><rect width="6" height="12" fill="#0055a4"/><rect x="6" width="6" height="12" fill="#fff"/><rect x="12" width="6" height="12" fill="#ef4135"/></svg>
  );
  // Italia: pysty vihreä/valkoinen/punainen
  if (code === 'it') return (
    <svg {...c}><rect width="6" height="12" fill="#009246"/><rect x="6" width="6" height="12" fill="#fff"/><rect x="12" width="6" height="12" fill="#ce2b37"/></svg>
  );
  // Espanja: vaaka punainen/keltainen(tuplakorkeus)/punainen
  if (code === 'es') return (
    <svg {...c}><rect width="18" height="12" fill="#aa151b"/><rect y="3" width="18" height="6" fill="#f1bf00"/></svg>
  );
  // Ukraina: sininen yläpuolisko, keltainen alapuolisko
  if (code === 'uk') return (
    <svg {...c}><rect width="18" height="6" fill="#0057b7"/><rect y="6" width="18" height="6" fill="#ffd700"/></svg>
  );
  // Venäjä: vaaka valkoinen/sininen/punainen
  if (code === 'ru') return (
    <svg {...c}><rect width="18" height="4" fill="#fff"/><rect y="4" width="18" height="4" fill="#0039a6"/><rect y="8" width="18" height="4" fill="#d52b1e"/></svg>
  );
  // Kreikka: sini-valkoraidat + kantonissa valkoinen risti
  if (code === 'el') return (
    <svg {...c}>
      <rect width="18" height="12" fill="#0d5eaf"/>
      <rect y="1.333" width="18" height="1.333" fill="#fff"/>
      <rect y="4" width="18" height="1.333" fill="#fff"/>
      <rect y="6.667" width="18" height="1.333" fill="#fff"/>
      <rect y="9.333" width="18" height="1.333" fill="#fff"/>
      <rect width="6.667" height="6.667" fill="#0d5eaf"/>
      <rect x="2.667" width="1.333" height="6.667" fill="#fff"/>
      <rect y="2.667" width="6.667" height="1.333" fill="#fff"/>
    </svg>
  );
  // Puola: valkoinen ylä, punainen ala
  if (code === 'pl') return (
    <svg {...c}><rect width="18" height="6" fill="#fff"/><rect y="6" width="18" height="6" fill="#dc143c"/></svg>
  );
  // Viro: vaaka sininen/musta/valkoinen
  if (code === 'et') return (
    <svg {...c}><rect width="18" height="4" fill="#0072ce"/><rect y="4" width="18" height="4" fill="#000"/><rect y="8" width="18" height="4" fill="#fff"/></svg>
  );
  // Portugali: vihreä/punainen pysty + keltainen pallo rajalla
  if (code === 'pt') return (
    <svg {...c}><rect width="18" height="12" fill="#da291c"/><rect width="7.2" height="12" fill="#046a38"/><circle cx="7.2" cy="6" r="2.1" fill="#ffe000" stroke="#fff" strokeWidth="0.4"/></svg>
  );
  // Karjala: vihreä pohja, musta pohjoismaaristi punaisin reunoin (Gallen-Kallela 1920)
  if (code === 'krl') return (
    <svg {...c}><rect width="18" height="12" fill="#159b3b"/><rect x="4" width="5" height="12" fill="#d2222d"/><rect y="3.5" width="18" height="5" fill="#d2222d"/><rect x="5" width="3" height="12" fill="#000"/><rect y="4.5" width="18" height="3" fill="#000"/></svg>
  );
  // Pohjoissaame: punainen + sininen kenttä, kapeat keltainen/vihreä raidat, náži-rengas
  if (code === 'se') return (
    <svg {...c}><rect width="18" height="12" fill="#0e3692"/><rect width="7.6" height="12" fill="#d72727"/><rect x="7.6" width="0.7" height="12" fill="#e6c200"/><rect x="8.3" width="0.7" height="12" fill="#0a7d2c"/><path d="M9 3 A3 3 0 0 0 9 9" fill="none" stroke="#0e3692" strokeWidth="1.1"/><path d="M9 3 A3 3 0 0 1 9 9" fill="none" stroke="#d72727" strokeWidth="1.1"/></svg>
  );
  // Romani: sininen yläosa, vihreä alaosa, punainen chakra-pyörä keskellä
  if (code === 'rom') return (
    <svg {...c}><rect width="18" height="6" fill="#0a4ea2"/><rect y="6" width="18" height="6" fill="#1c7c34"/><g stroke="#c81d25" strokeWidth="0.5"><line x1="6.6" y1="6" x2="11.4" y2="6"/><line x1="9" y1="3.6" x2="9" y2="8.4"/><line x1="7.3" y1="4.3" x2="10.7" y2="7.7"/><line x1="7.3" y1="7.7" x2="10.7" y2="4.3"/></g><circle cx="9" cy="6" r="2.4" fill="none" stroke="#c81d25" strokeWidth="0.6"/></svg>
  );
  // Latina: SPQR-viiri (Rooman punainen + kultainen teksti) — latinalla ei ole maalippua
  if (code === 'la') return (
    <svg {...c}><rect width="18" height="12" fill="#7c1419"/><text x="9" y="8.3" textAnchor="middle" fontSize="4.8" fontWeight="700" fill="#e8c24a" fontFamily="Georgia, 'Times New Roman', serif">SPQR</text></svg>
  );
  // Tšekki: valkoinen/punainen + sininen kiila vasemmalta
  if (code === 'cs') return (
    <svg {...c}><rect width="18" height="6" fill="#fff"/><rect y="6" width="18" height="6" fill="#d7141a"/><path d="M0 0 L9 6 L0 12 Z" fill="#11457e"/></svg>
  );
  // Unkari: vaakaraidat punainen/valkoinen/vihreä
  if (code === 'hu') return (
    <svg {...c}><rect width="18" height="4" fill="#ce2939"/><rect y="4" width="18" height="4" fill="#fff"/><rect y="8" width="18" height="4" fill="#477050"/></svg>
  );
  // Romania: pystyraidat sininen/keltainen/punainen
  if (code === 'ro') return (
    <svg {...c}><rect width="6" height="12" fill="#002b7f"/><rect x="6" width="6" height="12" fill="#fcd116"/><rect x="12" width="6" height="12" fill="#ce1126"/></svg>
  );
  return null;
}
