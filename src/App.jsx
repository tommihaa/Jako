import { useState, useEffect, lazy, Suspense } from 'react';
import { C, SUIT_COLOR, SUIT_COLOR_DARK, setTwoColorDeck } from './shared/colors.js';
import GameResult from './shared/GameResult.jsx';
import StatsPanel from './shared/StatsPanel.jsx';
import ShareQR from './shared/ShareQR.jsx';
import Announcer from './shared/Announcer.jsx';
import { useT, useLang, LANGS } from './shared/i18n.jsx';
import { loadPref, savePref, useStickySetting } from './shared/storage.js';
import { KANSA, NAME_GROUPS, POOL_BY_GROUP } from './shared/playerGroups.js';
import { SANASTO, MERKISTO, MERKISTO_KATEGORIAT, splitWithGlossary } from './shared/glossary.js';
import { SFX, setTheme as setSfxTheme } from './shared/audio.js';
import { SFX_CATALOG } from './shared/sfxCatalog.js';
import Flag from './shared/Flag.jsx';
import ReplayView from './shared/ReplayView.jsx';
import { TODO } from './todo.js';

/* eslint-disable no-undef */
const APP_VERSION = __APP_VERSION__;
const BUILD_DATE  = __BUILD_DATE__;
const BUILD_TIME  = __BUILD_TIME__;
/* eslint-enable no-undef */
// Google Forms -palautelomake. Versio + kieli esitäytetään URL-parametreilla (entry.*);
// vastaukset valuvat linkitettyyn Sheetiin. Arvosana + vapaa teksti jätetään pelaajan täytettäväksi.
function feedbackUrl(lang) {
  const base = 'https://docs.google.com/forms/d/e/1FAIpQLSfOV6KonFUGJ2VcG6BXITdY7WeXLTmfw5czQOMdDESWUTN5bg/viewform';
  const params = new URLSearchParams({
    'usp': 'pp_url',
    'entry.1663935268': `v${APP_VERSION} · ${BUILD_DATE} ${BUILD_TIME}`, // Versio-kenttä — sama leima kuin valikossa, esitäyttyy automaattisesti
    'entry.1066319749': lang,    // Kieli-kenttä
  });
  return `${base}?${params.toString()}`;
}
// Suora sähköpostipalaute (mailto) — Forms-lomakkeen rinnalla. EI kerää mitään: avaa pelaajan oman sähköpostin.
const MAILTO = `mailto:no.jopas@gmail.com?subject=${encodeURIComponent(`Jako ${APP_VERSION}, palaute`)}`;
// Ihmisten Puolue -ryhmän YouTube-soittolista (englanninkieliset tekstitykset). EI lokalisoitu.
const PUOLUE_YT = 'https://www.youtube.com/playlist?list=PL-vRZZ9yf7oqRYbSCXM4xlNvpNhhQktjz';
// Lahjoituslinkki (Ko-fi). Bränditeksti — kuten YouTube-linkki, EI lokalisoitu.
const KOFI = 'https://ko-fi.com/tommih';
// Jaettava pelin osoite (Web Share API / kopioi).
const SHARE_URL = 'https://tommi-jako.vercel.app';
// Sisarpelit (vain suomeksi linkitetyt — molemmat vain suomenkielisiä pelejä).
const ITU_URL = 'https://tommi-itu.vercel.app';
const SUPERJATSI_URL = 'https://tommi-superjatsi.vercel.app';
// Ryhmäkohtaiset kuvaukset — tietoisesti EI käännetä, käyttäjän oma ääni, näytetään aina englanniksi.
const GROUP_BLURB = {
  porukka: 'I learned many of these games with the locals.',
  puolue:  'Ihmisten Puolue is strictly Finnish humor — until you understand it.',
  jumalat: 'I love backgammon, and to the gods of luck we pray.',
  kansa:   'Strictly Finnish archetypes.',
  meme:    'The discourse, in card form.',
};
// Goa'uld: tekojumalan julkeudet — satunnainen poimitaan aina kun ryhmä valitaan.
const GOAULD_TAUNTS = ['Kneel or fold.', 'You ante. We annex.', 'Bow. Then deal.', "Gods don't fold.", "We don't bluff. We reign."];
// Pelit ladataan laiskasti (code splitting) — kukin oma chunkkinsa, haetaan vasta
// kun peli avataan. Valikko ei enää kanna kaikkien 9 pelin koodia kerralla.
const Koputus = lazy(() => import('./games/Koputus.jsx'));
const Lapsy = lazy(() => import('./games/Lapsy.jsx'));
const Kultakala = lazy(() => import('./games/Kultakala.jsx'));
const Maija = lazy(() => import('./games/Maija.jsx'));
const Kasino = lazy(() => import('./games/Kasino.jsx'));
const Moska = lazy(() => import('./games/Moska.jsx'));
const Seiska = lazy(() => import('./games/Seiska.jsx'));
const Ristiseiska = lazy(() => import('./games/Ristiseiska.jsx'));
const Paskahousu = lazy(() => import('./games/Paskahousu.jsx'));

// Nimipoolit (PELIPORUKKA ym.) ja NAME_GROUPS on siirretty shared/playerGroups.js:ään,
// jotta päävalikon asetukset ja aloitusnäytön GroupPicker jakavat saman datan.

// Pikkukortti-ikoni valikon ruutuun (esim. Maija = Q♠) — luettavampi kuin tumma Unicode-korttiglyyfi
const CardIcon = ({ rank, suit, suitColor = '#1a1a1a' }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 26, height: 34, background: '#f6efdd', borderRadius: 4, lineHeight: 1.05, boxShadow: '0 1px 3px rgba(0,0,0,0.4)', fontFamily: 'Georgia,serif' }}>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{rank}</span>
    <span style={{ fontSize: 13, color: suitColor }}>{suit}</span>
  </span>
);

const GAMES = [
  {
    id: 'kultakala', name: 'Kultakala', emoji: '🐟',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Kultakala, maxWidth: 560, pakka: 'taydennetty',
  },
  {
    id: 'lapsy', name: 'Läpsy', emoji: '👋',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Lapsy, maxWidth: 520, pakka: 'jaettu',
  },
  {
    id: 'ristiseiska', name: 'Ristiseiska', emoji: '♣',
    players: '3–4', minPlayers: 3, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Ristiseiska, maxWidth: 620, pakka: 'jaettu',
  },
  {
    id: 'seiska', name: 'Seiska', emoji: '7️⃣',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Helppo', diffColor: '#4caf7d',
    component: Seiska, maxWidth: 580, pakka: 'kierratetty', suosikki: true,
  },
  {
    id: 'kasino', name: 'Kasino', emoji: '🪙',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Kasino, maxWidth: 560, pakka: 'taydennetty', suosikki: true,
  },
  {
    id: 'koputus', name: 'Koputus', emoji: '🤜',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Koputus, maxWidth: 560, pakka: 'taydennetty',
  },
  {
    id: 'maija', name: 'Maija', emoji: <CardIcon rank="Q" suit="♠" />,
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Maija, maxWidth: 560, pakka: 'taydennetty',
  },
  {
    id: 'paskahousu', name: 'Paskahousu', emoji: '🃏',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Keskitaso', diffColor: '#e0a93b',
    component: Paskahousu, maxWidth: 580, pakka: 'taydennetty', suosikki: true,
  },
  {
    id: 'moska', name: 'Moska', emoji: '⚔️',
    players: '2–4', minPlayers: 2, maxPlayers: 4,
    diff: 'Vaativa', diffColor: '#e05c3b',
    component: Moska, maxWidth: 580, pakka: 'taydennetty',
  },
];


// ── Muutosloki: ks. src/changelogs/fi.js. Vain suomeksi (kääntäminen 22 kielelle
// paisutti tiedostomäärää ja julkaisukustannusta ilman hyötyä — selain kääntää
// tarvittaessa Käännä-toiminnollaan) ──────────────────────────────────────────
const loadChangelog = () =>
  import('./changelogs/fi.js').then(m => m.CHANGELOG);

// ── Hautakivi: "taso vaikuttaa vähän" -merkintä (17.7.2026–4.9.2026) ──────────
// Tässä oli `FLAT_AI_GAMES` ja sen mukana Koneäly-osion merkintä kolmelle pelille
// (Ristiseiska, Kasino, Paskahousu). Merkintä kertoi pelaajalle, ettei tasovalitsin
// muuta lopputulosta näissä peleissä. **Se nojasi vialliseen mittaukseen.**
//
// Botbench kytki tuloksen istuimeen nimen kautta, ja `AI_NAMES` oli kolme nimeä, joten
// neljän pelaajan pelissä istuimet 0 ja 3 saivat saman nimen. Istumajärjestys on ABAB,
// joten vika käänsi tason ja veti voitto-osuutta kohti 50 prosenttia. Juuri se sai nämä
// kolme peliä näyttämään litteiltä. Kasinossa vika oli pahempi, koska se arpoi nimet
// uusiksi joka kierroksella eikä tulos vastannut istuinta lainkaan.
//
// Koko kartta mitattiin uudelleen 4.9.2026 korjatulla mittarilla (13 500 peliä).
// Ristiseiska 66,1 / 56,6 / 58,0. Kasino 76,0 / 61,8 / 79,4. Paskahousu 56,5 / 49,7 / 56,5.
// Ehto merkinnälle oli N≥400 ja kaikki kolme paria noin 50 prosenttia, eikä yksikään peli
// täytä sitä enää. Tommin päätös 4.9.2026 oli poistaa merkintä kokonaan.
//
// **Älä palauta tätä ilman uutta mittausta.** Jos jokin peli näyttää taas litteältä, luvut
// ovat `docs/BOTBENCH.md` osiossa "Koko kartta uudelleen 4.9.2026" ja i18n-avain oli
// `ui.settings.ai.flatNote` 23 lokaalissa. Ylin porras on ohut kaikkialla, mutta se on eri
// väite kuin "taso ei vaikuta", eikä se yksin riitä merkinnän perusteeksi.


// Tyhjä per-peli-tilastorakenne. places = sijoitusjakauma (1.–4.), byLevel = erittely AI-tasoittain.
const mkGameStat = () => ({
  played: 0, wins: 0,
  places: { 1: 0, 2: 0, 3: 0, 4: 0 },
  byLevel: {
    beginner: { played: 0, wins: 0 },
    normal:   { played: 0, wins: 0 },
    hard:     { played: 0, wins: 0 },
  },
});
const mkStats = () => Object.fromEntries(GAMES.map(g => [g.id, mkGameStat()]));

// Yhdistä tallennettu (mahd. vanha/vajaa) tilasto-objekti tuoreiden oletusten päälle.
// Migraatio: vanha tallenne oli pelkkä { played, wins } ilman places/byLevel-kenttiä, ja
// myöhemmin lisätty peli puuttuu kokonaan → ilman tätä recordResult kaatuisi.
const normalizeStats = (raw) => {
  const base = mkStats();
  if (!raw || typeof raw !== 'object') return base;
  for (const id of Object.keys(base)) {
    const r = raw[id];
    if (!r || typeof r !== 'object') continue;
    base[id].played = Number(r.played) || 0;
    base[id].wins   = Number(r.wins) || 0;
    if (r.places && typeof r.places === 'object') {
      for (const p of [1, 2, 3, 4]) base[id].places[p] = Number(r.places[p]) || 0;
    }
    if (r.byLevel && typeof r.byLevel === 'object') {
      for (const lvl of ['beginner', 'normal', 'hard']) {
        const lr = r.byLevel[lvl];
        if (lr && typeof lr === 'object') {
          base[id].byLevel[lvl].played = Number(lr.played) || 0;
          base[id].byLevel[lvl].wins   = Number(lr.wins) || 0;
        }
      }
    }
  }
  return base;
};

// ── Sanasto-apufunktiot ───────────────────────────────────────────────────────

/** Värikoodaa maavärit tekstiin tummaa taustaa varten */
function renderSelitys(text) {
  return text.split(/((?:[2-9]|10|[AJQKT])[♠♥♦♣]|[♠♥♦♣])/).map((p, i) => {
    const suit = p.match(/[♠♥♦♣]/)?.[0];
    return suit ? <span key={i} style={{ color: SUIT_COLOR_DARK[suit], fontWeight: 700 }}>{p}</span> : p;
  });
}

/** Yksi sääntörivi korostettavilla termeillä — laajenee paikalleen */
function RuleRow({ text }) {
  const t = useT();
  const { lang } = useLang();
  const isEn = lang !== 'fi';
  const [openTerm, setOpenTerm] = useState(null);
  const parts = splitWithGlossary(text);
  const defn = openTerm ? SANASTO.find(s => s.term === openTerm) : null;
  const defnTerm = defn ? (isEn ? t(`glossary.sanasto.${defn.term}.term`) : defn.term) : '';
  const defnSelitys = defn ? (isEn ? t(`glossary.sanasto.${defn.term}.selitys`) : defn.selitys) : '';
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
        <span style={{ color: C.gold, flexShrink: 0, fontSize: 10, marginTop: 3 }}>▸</span>
        <span style={{ fontSize: 12, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.55 }}>
          {parts.map((p, i) =>
            p.isTerm
              ? <span key={i}
                  onClick={() => setOpenTerm(o => o === p.term ? null : p.term)}
                  style={{ color: openTerm === p.term ? C.gold : '#d4b86a', textDecoration: 'underline dotted', textUnderlineOffset: 3, cursor: 'pointer', fontWeight: 600 }}>
                  {p.text}
                </span>
              : <span key={i}>{renderSelitys(p.text)}</span>
          )}
        </span>
      </div>
      {defn && (
        <div style={{ marginLeft: 14, marginTop: 3, padding: '5px 10px', background: `${C.gold}12`, borderLeft: `2px solid ${C.gold}66`, borderRadius: '0 6px 6px 0', fontSize: 11, fontFamily: 'sans-serif', lineHeight: 1.65, color: C.dim }}>
          <span style={{ color: C.gold, fontWeight: 700 }}>{defn.emoji} {defnTerm}</span>{' · '}{renderSelitys(defnSelitys)}
        </div>
      )}
    </div>
  );
}

/** Sanasto-rivi Asetuksissa: termi + expand-selitys */
function SanastoRivi({ s }) {
  const t = useT();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const isEn = lang !== 'fi';
  const term = isEn ? t(`glossary.sanasto.${s.term}.term`) : s.term;
  const selitys = isEn ? t(`glossary.sanasto.${s.term}.selitys`) : s.selitys;
  const pelitLabel = s.pelitLabel ? (isEn ? t(`glossary.pelitLabels.${s.pelitLabel}`) : s.pelitLabel) : null;
  const gameNames = pelitLabel ?? (s.pelit || []).map(id => GAMES.find(g => g.id === id)?.name ?? id).join(', ');
  return (
    <div style={{ borderBottom: `1px solid ${C.panelBorder}33` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 2px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, flexShrink: 0, minWidth: 22, ...(s.emojiStyle || {}) }}>{s.emoji}</span>
        <span style={{ flex: 1, fontFamily: 'sans-serif', fontSize: 13, color: open ? C.gold : C.text, transition: 'color 0.15s' }}>{term}</span>
        {gameNames && <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, opacity: 0.6, marginRight: 4 }}>{gameNames}</span>}
        <span style={{ fontSize: 13, color: C.dim, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
      </button>
      {open && (
        <div style={{ padding: '0 4px 10px 30px', fontSize: 12, fontFamily: 'sans-serif', lineHeight: 1.65, color: C.dim }}>
          {renderSelitys(selitys)}
        </div>
      )}
    </div>
  );
}

function StatBadge({ s }) {
  const t = useT();
  if (!s || s.played === 0) return null;
  const pct = Math.round(s.wins / s.played * 100);
  const color = pct >= 60 ? '#4caf7d' : pct >= 40 ? '#c9a84c' : '#e05c3b';
  return (
    <div style={{ fontFamily: 'sans-serif', fontSize: 10, color, marginTop: 2, letterSpacing: 0.5 }}>
      {t('ui.stat', { w: s.wins, p: s.played, pct })}
    </div>
  );
}


function GameBtn({ g, stats, onSelect, onOpenGlossary }) {
  const t = useT();
  const { lang } = useLang();
  const [showDesc, setShowDesc] = useState(false);
  const desc = t(`games.${g.id}.desc`);
  const rules = t(`games.${g.id}.rules`);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      border: 'none',
      borderRadius: 14,
      overflow: 'hidden',
      borderLeft: `4px solid ${g.diffColor}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.45)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => onSelect(g.id)}
          style={{
            background: 'transparent', border: 'none',
            padding: '14px 4px 14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 26, flexShrink: 0, minWidth: 32, textAlign: 'center' }}>{g.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              {g.name}
              {g.suosikki && (
                <span title={t('ui.menu.recommended')} aria-label={t('ui.menu.recommended')} style={{ fontSize: 11, color: C.gold, lineHeight: 1 }}>★</span>
              )}
            </div>
            {lang !== 'fi' && (
              <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', fontStyle: 'italic', marginBottom: 3 }}>
                {renderSelitys(t(`games.${g.id}.altName`))}
              </div>
            )}
            <StatBadge s={stats[g.id]} />
          </div>
        </button>
        <button
          onClick={() => setShowDesc(v => !v)}
          aria-label={t('ui.rulesAria', { name: g.name })}
          aria-expanded={showDesc}
          style={{
            flexShrink: 0, margin: '0 12px 0 4px', background: showDesc ? `${C.gold}1a` : 'transparent',
            border: `1px solid ${showDesc ? C.gold : C.panelBorder}`,
            borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer',
            color: showDesc ? C.gold : C.dimAA, fontFamily: 'sans-serif', lineHeight: 1,
            display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600,
          }}
        >
          {t('ui.rules.label')}
          <span style={{ fontSize: 9, opacity: 0.8 }}>{showDesc ? '▲' : '▼'}</span>
        </button>
      </div>
      {showDesc && (
        <div style={{ padding: '0 14px 12px 52px' }}>
          <div style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.5, fontStyle: 'italic', marginBottom: rules ? 8 : 0 }}>
            {renderSelitys(desc)}
          </div>
          {Array.isArray(rules) && rules.map((rule, i) => <RuleRow key={i} text={rule} />)}
          {onOpenGlossary && (
            <button
              onClick={onOpenGlossary}
              style={{
                marginTop: 10, background: 'transparent', border: 'none', cursor: 'pointer',
                color: C.gold, fontFamily: 'sans-serif', fontSize: 11.5, padding: 0,
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}
            >📖 {t('ui.rules.moreTerms')}</button>
          )}
        </div>
      )}
    </div>
  );
}

// Päävalikon kielivalitsin — custom-dropdown, ryhmittelee kielet varmennustason mukaan:
// Testatut (status native/auto) ja Testaamattomat (status untested).
// Merkki nimen jäljessä: kulta ✓ = natiivi, "web" = konevarmistettu (auto).
function langMarker(status) {
  if (status === 'native') return <span title="natiivi" style={{ fontSize: 11, color: C.gold, lineHeight: 1 }}>✓</span>;
  if (status === 'auto') return <span title="konevarmistettu (web), ei natiivitarkistusta" style={{ fontSize: 8, color: C.dim, opacity: 0.7, border: `1px solid ${C.panelBorder}`, borderRadius: 3, padding: '0 3px', lineHeight: 1.5, fontFamily: 'sans-serif' }}>web</span>;
  return null;
}
function LangSelector({ lang, setLang, t, isMobile }) {
  const [open, setOpen] = useState(false);
  const groups = [
    { key: 'tested', langs: LANGS.filter(l => l.status === 'native' || l.status === 'auto') },
    { key: 'untested', langs: LANGS.filter(l => l.status === 'untested') },
  ];
  const current = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('ui.lang.label')}: ${current.name}`}
        title={current.name}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'transparent', border: `1px solid ${open ? C.gold : C.panelBorder}`,
          color: open ? C.gold : C.dimAA, borderRadius: 9,
          padding: isMobile ? '6px 9px' : '9px 9px', cursor: 'pointer',
          fontFamily: 'sans-serif', lineHeight: 1, flexShrink: 0,
        }}
      >
        <Flag code={current.code} />
        {isMobile && <span style={{ fontSize: 12 }}>{current.name}</span>}  {/* omalla rivillään → tilaa koko nimelle */}
        <span style={{ fontSize: 9, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 590 }} />
          <div role="listbox" aria-label={t('ui.lang.label')} style={{
            position: 'absolute', top: '100%', right: 0,
            marginTop: 6, zIndex: 591,
            background: '#0f2419', border: `1px solid ${C.panelBorder}`, borderRadius: 10,
            padding: 8, minWidth: 210, maxWidth: 'calc(100vw - 24px)', maxHeight: 340, overflowY: 'auto',  // rajaa näytön leveyteen → ei levity reunan yli
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          }}>
            {groups.map(({ key, langs }) => langs.length > 0 && (
              <div key={key} style={{ marginBottom: 6 }}>
                <div style={{ fontFamily: 'Georgia,serif', fontSize: 10, color: C.dim, opacity: 0.6, letterSpacing: 1.5, margin: '2px 4px 4px', textTransform: 'uppercase' }}>
                  {t(`ui.lang.${key}`)}
                </div>
                {langs.map(({ code, name, status }) => {
                  const active = lang === code;
                  return (
                    <button
                      key={code} role="option" aria-selected={active} title={name}
                      onClick={() => { setLang(code); setOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        background: active ? `${C.gold}22` : 'transparent',
                        border: `1px solid ${active ? C.gold : 'transparent'}`,
                        color: active ? C.gold : C.dim, borderRadius: 7,
                        padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'Georgia,serif', fontSize: 13,
                        opacity: status === 'untested' ? 0.8 : 1,
                      }}
                    >
                      <Flag code={code} />
                      <span style={{ flex: 1 }}>{name}</span>
                      {langMarker(status)}
                    </button>
                  );
                })}
              </div>
            ))}
            <div style={{ fontFamily: 'Georgia,serif', fontSize: 9, color: C.dim, opacity: 0.5, margin: '2px 4px 0' }}>
              {t('ui.lang.note')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GameHeader({ title, onBack, gearBtn, isMobile }) {
  const t = useT();
  const btnBase = {
    background: 'rgba(13,33,24,0.92)', borderRadius: 9,
    padding: isMobile ? '9px 16px' : '10px 20px', cursor: 'pointer', fontFamily: 'Georgia,serif',
    border: '1px solid #2a4a32', color: C.dim, fontSize: isMobile ? 13 : 14,
  };
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(13,33,24,0.95)',
      borderBottom: '1px solid #2a4a32',
      padding: isMobile ? '10px 8px' : '14px 8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={onBack} style={{ ...btnBase, flexShrink: 0, position: 'absolute', left: 8 }}>
          {t('ui.menu.back')}
        </button>
        <div style={{ fontFamily: 'Georgia,serif', fontSize: isMobile ? 12 : 14, color: C.text, letterSpacing: 1 }}>
          {title}
        </div>
        <div style={{ position: 'absolute', right: 8 }}>{gearBtn}</div>
      </div>
    </div>
  );
}

export default function App() {
  const t = useT();
  const { lang, setLang } = useLang();
  const [active, setActive]         = useState(null);
  // Oletuspelaajamäärä, jolla pelit alustetaan. Varsinainen valinta tehdään
  // kunkin pelin aloitusnäytöllä (Pelaajia 2/3/4), joten globaalia säädintä ei ole.
  const playerCount = 4;
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo]     = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showShare, setShowShare]     = useState(false); // jako-modaali (QR + linkki)
  const [stats, setStats]           = useState(() => normalizeStats(loadPref('stats', {}))); // persistoidaan jako:stats-avaimeen
  const [showStats, setShowStats]   = useState(false);
  useEffect(() => { savePref('stats', stats); }, [stats]);
  const [sessions, setSessions]     = useState(() => loadPref('sessions', 0)); // pelisessio = sovelluskäynti; lasketaan kerran per selainistunto (ks. recordResult)
  useEffect(() => { savePref('sessions', sessions); }, [sessions]);
  const [showLog, setShowLog]       = useStickySetting('showLog', true);   // tapahtumaloki auki oletuksena; valinta muistetaan
  const [soundOn, setSoundOn]       = useStickySetting('soundOn', false);  // äänet pois oletuksena; valinta muistetaan
  const [soundTheme, setSoundTheme] = useStickySetting('soundTheme', 'oletus'); // 'oletus' | 'torvi-kannel'
  useEffect(() => { setSfxTheme(soundTheme); }, [soundTheme]); // SFX on singleton kaikille 9 pelille — ei kosketa yhtään games/*.jsx-tiedostoa
  const [twoColorDeck, setTwoColorDeckPref] = useStickySetting('twoColorDeck', false); // ♠♣ musta + ♥♦ punainen; muistetaan kuten kieli ja äänet
  useEffect(() => { setTwoColorDeck(twoColorDeck); }, [twoColorDeck]); // mutatoi SUIT_COLOR-paletit (colors.js) — re-render hoitaa loput
  const [seeAll, setSeeAll]         = useState(false);  // POIKKEUS: cheat-tila EI tallennu — nollautuu joka latauksessa (ks. storage.js)
  const [showLastPlay, setShowLastPlay] = useStickySetting('showLastPlay', true);
  const [showIntention, setShowIntention] = useStickySetting('showIntention', true);
  const [showNextBtn, setShowNextBtn]   = useStickySetting('showNextBtn', true);
  const [showAIKnown, setShowAIKnown]   = useStickySetting('showAIKnown', true);
  // Näkyvyysesiasetus: yksi merkityksellinen valinta, joka asettaa kaikki opastustogglet kerralla.
  // 'beginner' = täysi opastus, 'experienced' = vähemmän kohinaa, 'custom' = käyttäjä on säätänyt
  // yksittäisiä toggleja Lisäasetuksista. Yksittäiset togglet persistoituvat edelleen erikseen.
  const UI_PRESETS = {
    beginner:    { showAIKnown: true,  showLastPlay: true, showIntention: true,  showNextBtn: true,  showLog: true  },
    experienced: { showAIKnown: false, showLastPlay: true, showIntention: false, showNextBtn: false, showLog: false },
  };
  const [uiPreset, setUiPreset] = useStickySetting('uiPreset', 'beginner');
  const applyPreset = (p) => {
    const v = UI_PRESETS[p];
    if (!v) return;
    setShowAIKnown(v.showAIKnown); setShowLastPlay(v.showLastPlay);
    setShowIntention(v.showIntention); setShowNextBtn(v.showNextBtn); setShowLog(v.showLog);
    setUiPreset(p);
  };
  const [aiLevel, setAiLevel]           = useStickySetting('aiLevel', 'normal'); // 'beginner' | 'normal' | 'hard'
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 600);
  // Ensikertalainen kokoelmassa → Meme-jengi oletuksena (hauska ensivaikutelma);
  // sen jälkeen satunnainen ryhmä. Valinta muistetaan; 'visited'-lippu ratkaisee laiskan oletuksen.
  const [playerGroup, setPlayerGroup] = useStickySetting('playerGroup', () => {
    if (!loadPref('visited', false)) return 'meme';
    const groups = ['porukka', 'jumalat', 'puolue', 'kansa', 'meme', 'goauld'];
    return groups[Math.floor(Math.random() * groups.length)];
  });
  // Migraatio 21.8.2026: nimiryhmän avain 'laituri' → 'porukka'. Vanha arvo voi olla tallessa
  // localStoragessa, ja ilman tätä POOL_BY_GROUP-haku putoaisi oletukseen (KANSA) eikä
  // valitsin näyttäisi mitään valituksi.
  useEffect(() => { if (playerGroup === 'laituri') setPlayerGroup('porukka'); }, [playerGroup]);
  const [goauldTaunt, setGoauldTaunt] = useState(() => GOAULD_TAUNTS[Math.floor(Math.random() * GOAULD_TAUNTS.length)]);
  const [resultData, setResultData] = useState(null);   // {ranking, revealCards?, scoreBreakdown?}
  const [botResult, setBotResult]   = useState(null);   // bot-only result — stay on game view
  const [gameKey, setGameKey]       = useState(0);       // increment → remount game
  const [showGlossary, setShowGlossary] = useState(false);
  const [showEsittely, setShowEsittely] = useState(false);
  const [siirtorekisteri, setSiirtorekisteri] = useState([]); // allBots replay frames
  const [replayOpen, setReplayOpen]     = useState(false);
  const [showChangelog, setShowChangelog]       = useState(false);
  const [changelogData, setChangelogData]       = useState(null); // ladataan laiskasti changelogs/<lang>.js:stä
  // Lataa muutosloki kun se avataan, ja uudelleen jos kieli vaihtuu sen ollessa auki.
  useEffect(() => {
    if (showChangelog) loadChangelog().then(setChangelogData).catch(() => {});
  }, [showChangelog]);
  const [showTodo, setShowTodo]                 = useState(false);
  const [showA2hs, setShowA2hs]                 = useState(false); // "Lisää aloitusnäytölle" -ohje
  const [showPeliasetukset, setShowPeliasetukset] = useState(false);
  const [showLisaasetukset, setShowLisaasetukset] = useState(false); // yksittäiset togglet preset-valinnan takana
  const [showKonealy, setShowKonealy]           = useState(false);
  const [showKokeileAania, setShowKokeileAania] = useState(false);
  const [showPelaajat, setShowPelaajat]         = useState(false);

  // Merkitse kokoelma nähdyksi → seuraavalla kerralla ryhmä arvotaan (ks. playerGroup-init).
  useEffect(() => { savePref('visited', true); }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (active) window.history.pushState(null, '');
    window.scrollTo(0, 0);
  }, [active]);

  useEffect(() => {
    if (botResult) window.scrollTo(0, 0);
  }, [botResult]);

  useEffect(() => {
    setSiirtorekisteri([]);
    setReplayOpen(false);
  }, [gameKey]);

  useEffect(() => {
    const handlePop = () => setActive(null);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const playerPool = POOL_BY_GROUP[playerGroup] || KANSA;
  // Goa'uld näyttää satunnaisen julkeuden, muut ryhmät kiinteän kuvauksen.
  const currentBlurb = playerGroup === 'goauld' ? goauldTaunt : GROUP_BLURB[playerGroup];

  function selectGame(id) {
    setActive(id);
  }

  function recordResult(gameId, result, level) {
    const place = result.ranking.find(r => r.isHuman)?.place;
    if (!place) return; // ei ihmistä rankingissa → ei kirjata (varmistus; bot-only suodatetaan jo aiemmin)
    // Pelisessio = sovelluskäynti: kasvata kerran per selainistunto, ensimmäisellä pelatulla pelillä.
    // sessionStorage säilyy reloadin yli mutta nollautuu välilehden sulkeutuessa → 1 käynti = 1 sessio.
    try {
      if (!sessionStorage.getItem('jako:sessionStarted')) {
        sessionStorage.setItem('jako:sessionStarted', '1');
        setSessions(s => s + 1);
      }
    } catch { /* sessionStorage ei käytettävissä — ohitetaan sessiolaskenta */ }
    const heroWon = place === 1;
    const lvl = ['beginner', 'normal', 'hard'].includes(level) ? level : 'normal';
    setStats(prev => {
      const g = prev[gameId] || mkGameStat();
      return {
        ...prev,
        [gameId]: {
          played: g.played + 1,
          wins: g.wins + (heroWon ? 1 : 0),
          places: { ...g.places, [place]: (g.places[place] || 0) + 1 },
          byLevel: {
            ...g.byLevel,
            [lvl]: {
              played: g.byLevel[lvl].played + 1,
              wins: g.byLevel[lvl].wins + (heroWon ? 1 : 0),
            },
          },
        },
      };
    });
  }

  function handleSnapshot(frame) {
    setSiirtorekisteri(prev => [...prev, frame]);
  }

  function handleGameResult(gameId, result) {
    // result = {ranking, revealCards?, scoreBreakdown?}
    const isBotOnly = !result.ranking.some(r => r.isHuman);
    if (isBotOnly) {
      setBotResult(result);
    } else {
      recordResult(gameId, result, aiLevel);
      setResultData(result);
    }
  }

  const gearBtn = (
    <button
      onClick={() => setShowSettings(v => !v)}
      style={{
        background: 'transparent', border: `1px solid ${showSettings ? C.gold : C.panelBorder}`,
        color: showSettings ? C.gold : C.dim, borderRadius: 9, padding: isMobile ? '7px 8px' : '9px 12px',
        fontSize: isMobile ? 16 : 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label={t('ui.menu.settings')}
    >⚙</button>
  );

  const infoBtn = (
    <button
      onClick={() => setShowInfo(v => !v)}
      style={{
        background: 'transparent', border: `1px solid ${showInfo ? C.gold : C.panelBorder}`,
        color: showInfo ? C.gold : C.dim, borderRadius: 9, padding: isMobile ? '7px 8px' : '9px 12px',
        fontSize: isMobile ? 16 : 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label={t('ui.menu.info')}
    >ℹ</button>
  );

  // Natiivijako (Web Share API) — mobiilin jakovalikko. Vain jos selain tukee.
  const shareNative = async () => {
    try { await navigator.share({ title: t('ui.share.title'), text: t('ui.share.text'), url: SHARE_URL }); }
    catch { /* käyttäjä perui jaon */ }
  };
  // Kopioi linkki leikepöydälle + ✓-palaute 2 s. Kaksi tasoa, koska Clipboard API
  // toimii VAIN suojatussa kontekstissa (https/localhost) — esim. dev-palvelin
  // LAN-osoitteen (http://192.168.x.x) kautta putoaa execCommand-varareittiin.
  const copyShareLink = async () => {
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(SHARE_URL); ok = true; } catch { /* varareittiin */ }
    }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = SHARE_URL;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* leikepöytä ei käytettävissä */ }
    }
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };
  const shareBtn = (
    <button
      onClick={() => setShowShare(true)}
      style={{
        background: 'transparent', border: `1px solid ${C.panelBorder}`,
        color: C.dim, borderRadius: 9, padding: isMobile ? '7px 8px' : '9px 12px',
        fontSize: isMobile ? 16 : 18, cursor: 'pointer', lineHeight: 1, fontFamily: 'sans-serif',
        flexShrink: 0,
      }}
      aria-label={t('ui.menu.share')}
      title={t('ui.menu.share')}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    </button>
  );

  const glossaryScreen = showGlossary && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, overflowY: 'auto', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isMobile ? '16px 12px' : '32px 24px' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13 }}>{t('glossary.backInfo')}</button>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 16, color: C.gold, letterSpacing: 2 }}>{t('glossary.title')}</span>
          <div style={{ width: 90 }} />
        </div>

        {/* Sanasto */}
        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 8, opacity: 0.8 }}>{t('glossary.sanastoTitle')}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
            {t('glossary.sanastoIntro')}
          </div>
          {[
            { key: 'perus',  label: 'Perustermit' },
            { key: 'kortti', label: 'Kortit ja erikoistilanteet' },
            { key: 'alue',   label: 'Alueet ja vyöhykkeet' },
          ].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>{t('glossary.cat.' + key)}</div>
              {SANASTO.filter(s => s.kategoria === key).map(s => <SanastoRivi key={s.term} s={s} />)}
            </div>
          ))}
        </div>

        {/* Merkistö */}
        <div style={{ padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, marginBottom: 8, opacity: 0.8 }}>{t('glossary.merkistoTitle')}</div>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 12, lineHeight: 1.5 }}>
            {t('glossary.merkistoIntro')}
          </div>
          {MERKISTO_KATEGORIAT.map((key) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>{t('glossary.cat.' + key)}</div>
              {MERKISTO.filter(m => m.kategoria === key).map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.panelBorder}33` }}>
                  <span style={{ fontSize: 15, flexShrink: 0, minWidth: 22, textAlign: 'center', lineHeight: 1 }}>{m.icon}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text, flexShrink: 0, minWidth: 130 }}>{lang === 'fi' ? m.label : t(`glossary.merkisto.${m.label}.label`)}</span>
                  <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.45, flex: 1 }}>
                    {lang === 'fi' ? m.selitys : t(`glossary.merkisto.${m.label}.selitys`)}
                    {m.peli && <span style={{ color: C.gold, opacity: 0.6, marginLeft: 4 }}>({m.peli})</span>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <button onClick={() => setShowGlossary(false)} style={{ background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13, width: '100%' }}>{t('glossary.backToInfo')}</button>
      </div>
    </div>
  );

  const settingsPanel = showSettings && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '16px 12px' : '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>{t('ui.settings.title')}</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >{t('ui.settings.close')}</button>
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPeliasetukset(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.settings.gameSettings')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showPeliasetukset ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showPeliasetukset && (
            <div style={{ padding: '0 14px 14px' }}>
              {/* Esiasetus: yksi merkityksellinen valinta opastuksen tasolle. */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'beginner',    label: t('ui.settings.preset.beginner'),    desc: t('ui.settings.preset.beginnerDesc') },
                  { key: 'experienced', label: t('ui.settings.preset.experienced'), desc: t('ui.settings.preset.experiencedDesc') },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    style={{
                      flex: 1, minWidth: 'calc(50% - 4px)', padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'sans-serif', fontSize: 12,
                      background: uiPreset === key ? `${C.gold}22` : 'transparent',
                      border: `1px solid ${uiPreset === key ? C.gold : C.panelBorder}`,
                      color: uiPreset === key ? C.gold : C.dim,
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{desc}</div>
                  </button>
                ))}
              </div>
              {uiPreset === 'custom' && (
                <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', fontStyle: 'italic', opacity: 0.7, marginBottom: 6 }}>
                  {t('ui.settings.preset.custom')}
                </div>
              )}

              {/* Yksittäiset togglet preset-valinnan takana — etuovi pysyy kevyenä. */}
              <button
                onClick={() => setShowLisaasetukset(v => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 0', background: 'transparent', border: 'none', borderTop: `1px solid ${C.panelBorder}`, marginTop: 4, cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 12, color: C.dim, opacity: 0.8 }}>{t('ui.settings.advanced')}</span>
                <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showLisaasetukset ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
              </button>
              {showLisaasetukset && (() => {
                const isAllBots = siirtorekisteri.length > 0 || !!botResult;
                // preset:true → toggle kuuluu esiasetukseen; manuaalinen muutos merkitsee 'custom'.
                const markCustom = () => setUiPreset('custom');
                return [
                  !isAllBots && { label: t('ui.settings.seeAll'),       val: seeAll,        set: setSeeAll        },
                  { label: t('ui.settings.godMode'),                    disabled: true                          },
                  !isAllBots && { label: t('ui.settings.showAIKnown'),  val: showAIKnown,   set: setShowAIKnown,   preset: true },
                  { label: t('ui.settings.showLastPlay'),               val: showLastPlay,  set: setShowLastPlay,  preset: true },
                  { label: t('ui.settings.showIntention'),              val: showIntention, set: setShowIntention, preset: true },
                  { label: t('ui.settings.showNextBtn'),                val: showNextBtn,   set: setShowNextBtn,   preset: true },
                  { label: t('ui.settings.showLog'),                    val: showLog,       set: setShowLog,       preset: true },
                  { label: t('ui.settings.sound'),                      val: soundOn,       set: setSoundOn       },
                  { label: t('ui.settings.twoColorDeck'),               val: twoColorDeck,  set: setTwoColorDeckPref },
                ].filter(Boolean).map(({ label, val, set, disabled, preset }) => (
                  <label key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '4px 0', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1 }}>
                    <input
                      type="checkbox" checked={disabled ? false : val}
                      onChange={disabled ? undefined : () => { set(v => !v); if (preset) markCustom(); }}
                      disabled={!!disabled}
                      style={{ accentColor: C.gold, width: 14, height: 14, marginTop: 1, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: isMobile ? 11 : 12, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>{label}</span>
                  </label>
                ));
              })()}
              {showLisaasetukset && soundOn && (
                <div style={{ padding: '6px 0 0 24px' }}>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 6 }}>{t('ui.settings.soundTheme.title')}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { key: 'oletus', label: t('ui.settings.soundTheme.default') },
                      { key: 'torvi-kannel', label: t('ui.settings.soundTheme.hornKantele') },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSoundTheme(key)}
                        style={{
                          flex: 1, minWidth: 'calc(50% - 4px)', padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                          fontFamily: 'sans-serif', fontSize: 12,
                          background: soundTheme === key ? `${C.gold}22` : 'transparent',
                          border: `1px solid ${soundTheme === key ? C.gold : C.panelBorder}`,
                          color: soundTheme === key ? C.gold : C.dim,
                          transition: 'all 0.15s',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowKonealy(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.settings.aiTitle')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showKonealy ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showKonealy && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'beginner', label: t('ui.settings.ai.beginner.label'), desc: t('ui.settings.ai.beginner.desc') },
                  { key: 'normal',   label: t('ui.settings.ai.normal.label'),   desc: t('ui.settings.ai.normal.desc') },
                  { key: 'hard',     label: t('ui.settings.ai.hard.label'),     desc: t('ui.settings.ai.hard.desc') },
                ].map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => setAiLevel(key)}
                    style={{
                      flex: 1, minWidth: 'calc(33% - 4px)', padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'sans-serif', fontSize: 12,
                      background: aiLevel === key ? `${C.gold}22` : 'transparent',
                      border: `1px solid ${aiLevel === key ? C.gold : C.panelBorder}`,
                      color: aiLevel === key ? C.gold : C.dim,
                      transition: 'all 0.15s',
                    }}
                  >
                    {label}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {soundOn && (
          <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
            <button
              onClick={() => setShowKokeileAania(v => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>🔊 Kokeile ääniä</span>
              <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showKokeileAania ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
            </button>
            {showKokeileAania && (
              <div style={{ padding: '0 14px 14px' }}>
                <button
                  onClick={() => setSoundOn(false)}
                  style={{
                    width: '100%', padding: '8px 6px', borderRadius: 8, cursor: 'pointer', marginBottom: 8,
                    fontFamily: 'sans-serif', fontSize: 12, fontWeight: 700,
                    background: '#6a2f2f22', border: '1px solid #a05050', color: '#e08080',
                  }}
                >
                  🔇 Hiljennä äänet
                </button>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SFX_CATALOG.map(([fn, label]) => (
                    <button
                      key={fn}
                      onClick={() => SFX[fn]()}
                      style={{
                        flex: 1, minWidth: 'calc(33% - 4px)', padding: '6px 4px', borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'sans-serif', fontSize: 11,
                        background: 'transparent', border: `1px solid ${C.panelBorder}`, color: C.dim,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowPelaajat(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.settings.playersTitle')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showPelaajat ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showPelaajat && (
          <div style={{ padding: '0 14px 14px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.4 }}>
            {t('ui.settings.playersIntro')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {NAME_GROUPS.map(({ key, pool }) => (
              <button
                key={key}
                onClick={() => {
                  setPlayerGroup(key);
                  if (key === 'goauld') setGoauldTaunt(GOAULD_TAUNTS[Math.floor(Math.random() * GOAULD_TAUNTS.length)]);
                }}
                style={{
                  flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'sans-serif', fontSize: 12,
                  background: playerGroup === key ? `${C.gold}22` : 'transparent',
                  border: `1px solid ${playerGroup === key ? C.gold : C.panelBorder}`,
                  color: playerGroup === key ? C.gold : C.dim,
                  transition: 'all 0.15s',
                }}
              >
                {t('ui.settings.groups.' + key)}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{t('ui.settings.namesCount', { n: pool.length })}</div>
              </button>
            ))}
          </div>
          {currentBlurb && (
            <p style={{ margin: '0 0 8px', fontSize: 11, color: C.dim, fontFamily: 'sans-serif', fontStyle: 'italic', opacity: 0.85 }}>
              {currentBlurb}
            </p>
          )}
          {playerGroup === 'puolue' && (
            <a href={PUOLUE_YT} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 0 8px',
              color: C.gold, fontSize: 11, fontFamily: 'sans-serif', textDecoration: 'none',
              border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '5px 10px',
            }}>▶ Ihmisten Puolue · YouTube (English subtitles)</a>
          )}
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.8, opacity: 0.7 }}>
            {playerPool.join(' · ')}
          </div>
          </div>
          )}
        </div>

      </div>
    </div>
  );

  const infoPanel = showInfo && (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500, overflowY: 'auto',
      background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '16px 12px' : '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2 }}>{t('ui.info.title')}</span>
          <button
            onClick={() => setShowInfo(false)}
            style={{
              background: 'transparent', border: `1px solid ${C.panelBorder}`,
              color: C.dim, borderRadius: 8, padding: '6px 14px',
              cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13,
            }}
          >{t('ui.info.close')}</button>
        </div>

        {/* Kielivalinta siirretty päävalikkoon (LangSelector) — ei enää Info-paneelissa. */}

        {/* Esittely */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowEsittely(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.esittely')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showEsittely ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showEsittely && (
            <div style={{ padding: '0 14px 14px' }}>
              {t('ui.infoPanel.esittelyParas').map((para, i) => (
                <p key={i} style={{ margin: '0 0 8px', color: C.text, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif', whiteSpace: 'pre-line' }}>{para}</p>
              ))}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <a href={feedbackUrl(lang)} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                  border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
                }}>{t('ui.infoPanel.feedbackForm')}</a>
                <a href={MAILTO} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                  border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
                }}>{t('ui.infoPanel.feedback')}</a>
                <a href={KOFI} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  color: C.red, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                  border: `1px solid ${C.red}55`, borderRadius: 8, padding: '6px 12px',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" />
                    <line x1="10" y1="1" x2="10" y2="4" />
                    <line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                  Support via Ko-fi
                </a>
              </div>
              {/* Muut pelit — sisarpelinosto vain suomeksi (Itu/Superjatsi ovat vain suomeksi;
                  tr() putoaisi muuten fi-fallbackiin, joten näkyvyys portitetaan tässä). */}
              {lang === 'fi' && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontFamily: 'Georgia,serif', fontSize: 12, color: C.dim, opacity: 0.8, marginBottom: 6 }}>{t('ui.infoPanel.otherGames.title')}</div>
                  <p style={{ margin: '0 0 8px', color: C.text, fontSize: 12, lineHeight: 1.6, fontFamily: 'sans-serif' }}>{t('ui.infoPanel.otherGames.intro')}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <a href={ITU_URL} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                      border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
                    }}>{t('ui.infoPanel.otherGames.itu')}</a>
                    <a href={SUPERJATSI_URL} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: C.gold, fontSize: 12, fontFamily: 'sans-serif', textDecoration: 'none',
                      border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '6px 12px',
                    }}>{t('ui.infoPanel.otherGames.superjatsi')}</a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tilastot — pelikohtaiset pelatut/voitot/sijoitukset (vain suomeksi toistaiseksi) */}
        <button
          onClick={() => setShowStats(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.stats.menuLink')}</span>
          <span style={{ color: C.gold, fontSize: 16 }}>›</span>
        </button>

        {/* Sanasto & Merkistö */}
        <button
          onClick={() => setShowGlossary(true)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.glossaryLink')}</span>
          <span style={{ color: C.gold, fontSize: 16 }}>›</span>
        </button>

        {/* Lisää aloitusnäytölle — ohje yleisimmille selaimille (mobiili + tietokone) */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowA2hs(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.a2hs.title')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showA2hs ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showA2hs && (
            <div style={{ padding: '0 14px 14px' }}>
              <p style={{ margin: '0 0 10px', color: C.text, fontSize: 12, lineHeight: 1.7, fontFamily: 'sans-serif' }}>{t('ui.infoPanel.a2hs.intro')}</p>
              {[['mobile', 'mobileRows'], ['desktop', 'desktopRows']].map(([titleKey, rowsKey]) => (
                <div key={titleKey} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>{t(`ui.infoPanel.a2hs.${titleKey}`)}</div>
                  {t(`ui.infoPanel.a2hs.${rowsKey}`).map(([browser, steps], i) => (
                    <div key={i} style={{ padding: '5px 0', borderBottom: `1px solid ${C.panelBorder}33` }}>
                      <div style={{ fontSize: 11, color: C.text, fontFamily: 'sans-serif', fontWeight: 700, marginBottom: 1 }}>{browser}</div>
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', lineHeight: 1.5 }}>{steps}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Muutosloki */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowChangelog(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.changelog')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showChangelog ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showChangelog && changelogData && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ fontSize: 10, color: C.dim, opacity: 0.75, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.4 }}>
                {t('ui.infoPanel.changelogTranslateHint')}
              </div>
              {changelogData.map((entry, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1, opacity: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>{entry.date}</div>
                  {entry.items.map((item, j) => {
                    // Rivi on joko merkkijono tai { text, revoked }. Kumottu rivi jää paikalleen
                    // ja luettavaksi, koska muutosloki on historiaa; himmennys ja merkki kertovat
                    // ettei se kuvaa nykytilaa. Ks. src/changelogs/fi.js.
                    const teksti  = typeof item === 'string' ? item : item.text;
                    const kumottu = typeof item === 'string' ? null : item.revoked;
                    return (
                      <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: C.gold, fontSize: 10, flexShrink: 0, marginTop: 3 }}>▸</span>
                        <span style={{ fontSize: 11, color: C.text, fontFamily: 'sans-serif', lineHeight: 1.55, opacity: kumottu ? 0.5 : 1 }}>
                          {kumottu && (
                            <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: C.gold, border: `1px solid ${C.panelBorder}`, borderRadius: 4, padding: '1px 5px', marginRight: 6, whiteSpace: 'nowrap' }}>
                              Kumottu
                            </span>
                          )}
                          {teksti}
                          {kumottu && (
                            <span style={{ display: 'block', marginTop: 3, fontStyle: 'italic', color: C.dim }}>{kumottu}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tulossa */}
        <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 12, background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowTodo(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 13, color: C.dim, opacity: 0.8 }}>{t('ui.infoPanel.todo')}</span>
            <span style={{ color: C.dim, fontSize: 13, transition: 'transform 0.15s', transform: showTodo ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>›</span>
          </button>
          {showTodo && (() => {
            // Teksti lokalisoidusta taulukosta VAIN jos se on linjassa TODO-vakion kanssa
            // (sama pituus). Muuten fallback item.label (suomi), jotta drift ei koskaan
            // näytä väärää yliviivaus-/statustilaa. Status tulee aina TODO-vakiosta.
            const locTodo = t('ui.infoPanel.todoItems');
            const useLocTodo = Array.isArray(locTodo) && locTodo.length === TODO.length;
            return (
            <div style={{ padding: '0 14px 14px' }}>
              {TODO.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.panelBorder}33`, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                    {item.status === 'open' ? '🎯' : item.status === 'done' ? '✅' : '⏸'}
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'sans-serif', lineHeight: 1.55, color: item.status === 'done' ? C.dim : C.text, textDecoration: item.status === 'done' ? 'line-through' : 'none', opacity: item.status === 'deferred' ? 0.55 : 1 }}>{useLocTodo ? locTodo[i] : item.label}</span>
                </div>
              ))}
            </div>
            );
          })()}
        </div>

      </div>
    </div>
  );

  // Jako-modaali: QR-koodi (kasvotusten / desktop) + linkki + kopiointi; natiivijako jos tuettu.
  const shareModal = showShare && (
    <div
      onClick={() => setShowShare(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 340, background: C.bg, border: `1px solid ${C.gold}55`, borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
      >
        <span style={{ fontFamily: 'Georgia,serif', fontSize: 18, color: C.gold, letterSpacing: 2, textAlign: 'center' }}>{t('ui.menu.share')}</span>
        <div style={{ background: '#f6efdd', borderRadius: 12, padding: 12, lineHeight: 0 }}>
          <ShareQR size={200} />
        </div>
        <span style={{ fontSize: 12, color: C.dim, fontFamily: 'sans-serif', textAlign: 'center', lineHeight: 1.5 }}>{t('ui.share.scan')}</span>
        <span style={{ fontSize: 13, color: C.text, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>{SHARE_URL}</span>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            onClick={copyShareLink}
            style={{ flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 13, background: shareCopied ? `${C.gold}22` : 'transparent', border: `1px solid ${shareCopied ? C.gold : C.panelBorder}`, color: shareCopied ? C.gold : C.text }}
          >{shareCopied ? `✓ ${t('ui.share.copied')}` : t('ui.share.copy')}</button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              onClick={shareNative}
              style={{ flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer', fontFamily: 'sans-serif', fontSize: 13, background: `${C.gold}22`, border: `1px solid ${C.gold}`, color: C.gold }}
            >{t('ui.share.shareVia')}</button>
          )}
        </div>
        <button
          onClick={() => setShowShare(false)}
          style={{ background: 'transparent', border: 'none', color: C.dim, cursor: 'pointer', fontFamily: 'Georgia,serif', fontSize: 13, marginTop: -4 }}
        >{t('ui.info.close')}</button>
      </div>
    </div>
  );

  if (active) {
    const game = GAMES.find(g => g.id === active);
    // Cast on tässä kirjaus eikä vaimennus. App välittää saman propsijoukon kaikille
    // yhdeksälle pelille, mutta jokainen destrukturoi vain tarvitsemansa (ks. CLAUDE.md,
    // Component props): yhtä kanonista signatuuria ei ole, joten yhdeksän komponentin
    // unionin propsityyppi on niiden leikkaus eikä yhdiste. Esimerkiksi game-propsin ottaa
    // vain Kasino. Jaettu GameProps-typedef poistaisi castin, mutta se olisi kanonisen
    // signatuurin luominen eli designpäätös, ei tyypitystyö.
    const GameComponent = /** @type {any} */ (game.component);
    const maxW = isMobile ? 'calc(100vw - 20px)' : game.maxWidth;

    // Tulosruutu pelin jälkeen (vain ihmispelaajan peli)
    if (resultData) {
      return (
        <GameResult
          ranking={resultData.ranking}
          revealCards={resultData.revealCards}
          scoreBreakdown={resultData.scoreBreakdown}
          isMobile={isMobile}
          onNewGame={() => { setResultData(null); setGameKey(k => k + 1); }}
          onMenu={() => { setResultData(null); setActive(null); }}
        />
      );
    }

    // Bottien Taistelu päättyi — näytetään banneri pelin päällä, loki jää näkyviin
    const botBanner = botResult && (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '8px 12px' : '10px 18px',
        background: `${C.gold}14`,
        borderBottom: `1px solid ${C.gold}44`,
        gap: 12,
      }}>
        <span style={{ fontFamily: 'Georgia,serif', fontSize: isMobile ? 12 : 13, color: C.gold }}>
          {t('ui.botBanner.won', { name: botResult.ranking[0]?.name })}
        </span>
        <div style={{ display:'flex', gap:8, flexShrink:0 }}>
          {siirtorekisteri.length > 0 && (
            <button
              onClick={() => setReplayOpen(true)}
              style={{
                background: 'transparent', border: `1px solid ${C.gold}`, borderRadius: 8,
                padding: isMobile ? '5px 10px' : '6px 14px',
                color: C.gold, fontFamily: 'Georgia,serif',
                fontSize: isMobile ? 11 : 12, cursor: 'pointer',
              }}
            >
              {t('ui.botBanner.replay', { n: siirtorekisteri.length })}
            </button>
          )}
          <button
            onClick={() => { setBotResult(null); setActive(null); setGameKey(k => k + 1); }}
            style={{
              background: C.gold, border: 'none', borderRadius: 8,
              padding: isMobile ? '6px 14px' : '7px 18px',
              color: '#0d2118', fontFamily: 'Georgia,serif',
              fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t('ui.botBanner.toMenu')}
          </button>
        </div>
      </div>
    );

    return (
      <div style={{ maxWidth: maxW, margin: '0 auto' }}>
        <Announcer message={siirtorekisteri[siirtorekisteri.length - 1]?.logText} />
        {replayOpen && siirtorekisteri.length > 0 && (
          <ReplayView frames={siirtorekisteri} onClose={() => setReplayOpen(false)} isMobile={isMobile} />
        )}
        {settingsPanel}
        {glossaryScreen}
        <GameHeader title={game.name} onBack={() => { setResultData(null); setBotResult(null); setActive(null); }} gearBtn={gearBtn} isMobile={isMobile} />
        {botBanner}
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: C.dim, fontFamily: 'Georgia,serif', fontSize: 14, letterSpacing: 2 }}>
            {t('ui.loading')}
          </div>
        }>
        {/* Asetuksen omistaja on App (kompositioauditointi H6, päätös 3.9.2026). Peli lukee
            soundOn-, seeAll- ja showLog-arvon propsista eikä kopioi sitä omaan tilaansa, ja
            pelin oma nappi kutsuu takaisin tänne. Näin Asetuksista tehty muutos näkyy pelissä
            heti ja pelistä tehty muutos tallentuu. seeAll pysyy tallentumattomana (ks.
            storage.js), ja katselutilan paljastus on pelin oma tila joka ei koske tähän
            asetukseen. Lokin kytkin kuuluu näkyvyysesiasetukseen, joten pelistä tehty muutos
            merkitsee esiasetuksen custom-tilaan samoin kuin Asetuksissa. */}
        <GameComponent
          key={gameKey}
          game={game}
          showLog={showLog}
          soundOn={soundOn}
          seeAll={seeAll}
          onSoundOnChange={setSoundOn}
          onSeeAllChange={setSeeAll}
          onShowLogChange={(v) => { setShowLog(v); setUiPreset('custom'); }}
          showLastPlay={showLastPlay}
          showIntention={showIntention}
          isMobile={isMobile}
          playerCount={Math.max(playerCount, game.minPlayers)}
          playerNames={playerPool}
          playerGroup={playerGroup}
          onPlayerGroupChange={setPlayerGroup}
          showNextBtn={showNextBtn}
          showAIKnown={showAIKnown}
          aiLevel={aiLevel}
          onAiLevelChange={setAiLevel}
          onResult={(result) => handleGameResult(active, result)}
          onSnapshot={handleSnapshot}
        />
        </Suspense>
      </div>
    );
  }

  return (
    <main style={{
      background: C.bg, minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      gap: isMobile ? 10 : 16, padding: isMobile ? '16px 12px' : '32px 24px',
      fontFamily: 'Georgia,serif', color: C.text,
    }}>
      {settingsPanel}
      {infoPanel}
      {showStats && <StatsPanel stats={stats} games={GAMES} sessions={sessions} isMobile={isMobile} onClear={() => { setStats(mkStats()); setSessions(0); try { sessionStorage.removeItem('jako:sessionStarted'); } catch { /* ohitetaan */ } }} onClose={() => setShowStats(false)} />}
      {glossaryScreen}
      {shareModal}

      {isMobile ? (
        // Mobiili: yksi rivi — JAKO vasemmalla (pystysuunnassa keskitetty), kontrollit oikealla
        // (kieli + jako + info + asetukset). space-between → eivät mene otsikon päälle, ⁹ näkyy.
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', marginBottom: 4, gap: 8,
        }}>
          <h1 style={{
            fontSize: 34, letterSpacing: 4, margin: 0, lineHeight: 1, flexShrink: 0,
            background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            JAKO<span style={{ fontSize: 16, verticalAlign: 'super', letterSpacing: 2 }}>{GAMES.length}</span>
          </h1>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <LangSelector lang={lang} setLang={setLang} t={t} isMobile={isMobile} />{shareBtn}{infoBtn}{gearBtn}
          </div>
        </div>
      ) : (
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', maxWidth: 900, marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <h1 style={{
              fontSize: 48, letterSpacing: 12, margin: 0,
              background: `linear-gradient(135deg,#e8c96a,${C.gold},#a07830)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              JAKO<span style={{ fontSize: 22, verticalAlign: 'super', letterSpacing: 2 }}>{GAMES.length}</span>
            </h1>
          </div>
          <div style={{ position: 'absolute', right: 0, display: 'flex', gap: 8, alignItems: 'center' }}><LangSelector lang={lang} setLang={setLang} t={t} isMobile={isMobile} />{shareBtn}{infoBtn}{gearBtn}</div>
        </div>
      )}

      <div style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 900,
      }}>
        {!Object.values(stats).some(s => s.played > 0) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            margin: '0 0 8px', padding: '9px 12px',
            border: `1px solid ${C.gold}55`, borderRadius: 10,
            background: `${C.gold}12`,
            fontFamily: 'sans-serif', fontSize: isMobile ? 11 : 12, color: C.text, lineHeight: 1.4,
          }}>
            <span style={{ color: C.gold, fontSize: 13, flexShrink: 0 }}>★</span>
            {t('ui.menu.startHere')}
          </div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {GAMES.map(g => <GameBtn key={g.id} g={g} stats={stats} onSelect={selectGame} onOpenGlossary={() => setShowGlossary(true)} />)}
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#b9c7b2', fontFamily: 'sans-serif', letterSpacing: 0.5 }}>
        v{APP_VERSION} · {BUILD_DATE} {BUILD_TIME}
      </div>
    </main>
  );
}
