import { C, SUIT_COLOR } from './colors.js';
import { useT } from './i18n.jsx';
import GroupPicker from './GroupPicker.jsx';

// Pelin aloitusnäyttö: tunnus ja nimi, pelaajamäärä, vastustajaryhmä ja kaksi nappia.
//
// Oli yhdeksänä kopiona (kompositioauditointi H1). Rakenne oli sama kaikissa, ja erot
// olivat tunnus, nimi, otsikon koko pitkillä nimillä sekä sallitut pelaajamäärät.
// Ne ovat nyt propseja. Pelikohtaiset sääntövalinnat (Kasino, Paskahousu, Ristiseiska)
// tulevat lapsina ryhmävalitsimen ja nappien väliin, siihen samaan kohtaan jossa ne
// olivat ennenkin.
//
// `onStart` on propsi eikä kiinteä kutsu, koska Seiska rakentaa istuinlistan ennen
// aloitusta ja muut kutsuvat startGamen ilman argumentteja.
/**
 * @typedef {object} GameStartScreenProps
 * @property {any} [icon]                 Tunnus otsikon yllä (emoji tai komponentti)
 * @property {string} title               Pelin nimi versaalein
 * @property {number} [titleSize]         Otsikon koko; pitkä nimi tarvitsee pienemmän
 * @property {number} [letterSpacing]
 * @property {number[]} counts            Sallitut pelaajamäärät
 * @property {number} value               Valittu pelaajamäärä
 * @property {(n: number) => void} onCountChange
 * @property {string} [playerGroup]
 * @property {(g: string) => void} [onPlayerGroupChange]
 * @property {() => void} onStart
 * @property {() => void} onBotBattle
 * @property {string} botBattleSub        Katselutilan alarivi (määrä ja taso)
 * @property {boolean} [isMobile]
 * @property {any} [children]             Pelikohtaiset sääntövalinnat
 */
/** @param {GameStartScreenProps} props */
export default function GameStartScreen({
  icon, title, titleSize = 52, letterSpacing = 12,
  counts, value, onCountChange,
  playerGroup, onPlayerGroupChange,
  onStart, onBotBattle, botBattleSub,
  isMobile = false, children,
}) {
  const t = useT();
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: isMobile ? 24 : 32, fontFamily: 'Georgia,serif', color: C.text }}>
      <div style={{ textAlign: 'center' }}>
        {icon && <div style={{ fontSize: 48, marginBottom: 8 }}>{icon}</div>}
        <h1 style={{ fontSize: titleSize, letterSpacing, margin: 0, background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{title}</h1>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 16, marginTop: 8 }}>
          {['♠', '♥', '♦', '♣'].map(s => <span key={s} style={{ color: SUIT_COLOR[s] }}>{s}</span>)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <p style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 11, margin: 0, letterSpacing: 2 }}>{t('ui.start.players')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {counts.map(n => (
            <button key={n} onClick={() => onCountChange(n)} style={{ width: 54, height: 54, borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${value === n ? C.gold : '#2a4a32'}`, background: value === n ? C.gold + '18' : 'transparent', color: value === n ? C.gold : C.dim, transition: 'all 0.2s' }}>{n}</button>
          ))}
        </div>
      </div>

      <GroupPicker value={playerGroup} onChange={onPlayerGroupChange} />

      {children}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button onClick={onStart} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 14, padding: '14px 44px', color: '#0d2118', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 2 }}>{t('ui.start.begin')}</button>
        <button onClick={onBotBattle} style={{ background: 'linear-gradient(135deg,#7B2FBE,#5a1d8a)', border: 'none', borderRadius: 14, padding: '10px 32px', color: '#f0e6ff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {t('ui.start.botBattle')}
          <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{botBattleSub}</span>
        </button>
      </div>
    </div>
  );
}
