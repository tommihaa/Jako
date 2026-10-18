// @vitest-environment jsdom
//
// Maasymboli ei saa päätyä ruudunlukijalle. TalkBack lukee ♠:n emojina eikä maana
// (Tommin kuuntelu Pixelillä 14. ja 15.10.2026, docs/AUDITOINTI-RUUDUNLUKIJA.md J-8).
// Auditoinnin lista näki vain pelin alkutilanteen, joten tämä pelaa jokaista peliä
// ihmisenä satunnaisilla napinpainalluksilla ja lukee jokaisen välitilan
// saavutettavuuspuun: tekstisolmut, jotka eivät ole `aria-hidden`-haaran tai nimen
// korvaavan `aria-label`in alla, sekä nimiattribuutit.
//
// Sallittu muoto on `Spoken` (symboli `aria-hidden`, sana `sr-only`) tai napin
// `aria-label`, jossa maa on sanana.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { clearAnnouncements } from '../src/shared/Announcer.jsx';
import { mulberry32, strSeed } from './prng.js';

import Paskahousu from '../src/games/Paskahousu.jsx';
import Koputus from '../src/games/Koputus.jsx';
import Kultakala from '../src/games/Kultakala.jsx';
import Lapsy from '../src/games/Lapsy.jsx';
import Maija from '../src/games/Maija.jsx';
import Moska from '../src/games/Moska.jsx';
import Seiska from '../src/games/Seiska.jsx';
import Ristiseiska from '../src/games/Ristiseiska.jsx';
import Kasino from '../src/games/Kasino.jsx';
import App from '../src/App.jsx';

const GAMES = { Paskahousu, Koputus, Kultakala, Lapsy, Maija, Moska, Seiska, Ristiseiska, Kasino };
const SUIT = /[♠♥♦♣]/;
// Rooli tai elementti, jonka nimi tulee `aria-label`ista sisällön sijaan.
const NAMED_BY_LABEL = /^(button|img|link|checkbox|switch|radio|tab|menuitem|option)$/;

/** @param {Element} el */
const labelReplacesContent = el => el.hasAttribute('aria-label')
  && (NAMED_BY_LABEL.test(el.getAttribute('role') ?? '') || ['BUTTON', 'A', 'IMG', 'INPUT', 'SELECT'].includes(el.tagName));

// Kortit yhdeksi muodoksi, jotta sama kohta eri korteilla raportoituu kerran.
/** @param {string} t */
const norm = t => t.replace(/(10|[2-9AJQK])[♠♥♦♣]/g, 'X♠').replace(/\d+/g, 'n').slice(0, 70);

// Kuvamerkki-emoji. Maasymbolit ovat samaa luokkaa, mutta niillä on oma tarkistuksensa yllä.
const EMOJI = /(?![♠♥♦♣])\p{Extended_Pictographic}/u;
// Erotin tai suuntamerkki: TalkBack luki ·:n "rivinkeskinen piste" (J-13 ryhmä 4). Sallittu
// muoto on `Sep`, `Spoken` tai `aria-hidden`.
const SYMBOL = /[·←→›✓×]/;

/** Elementin teksti ilman aria-hidden-haaroja. @param {Element} el */
function spokenText(el) {
  const c = /** @type {Element} */ (el.cloneNode(true));
  c.querySelectorAll('[aria-hidden="true"]').forEach(x => x.remove());
  // Nimetty kuva (kielilistan ✓ "natiivi") kuuluu nimellään eikä merkkinä.
  c.querySelectorAll('[role="img"][aria-label]').forEach(x => { x.textContent = x.getAttribute('aria-label'); });
  return c.textContent ?? '';
}

/** Ruudunlukijalle päätyvät maasymbolit. @param {HTMLElement} root */
function suitLeaks(root) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const suit = SUIT.test(n.nodeValue ?? ''), emoji = EMOJI.test(n.nodeValue ?? ''), symbol = SYMBOL.test(n.nodeValue ?? '');
    if (!suit && !emoji && !symbol) continue;
    let hidden = false;
    for (let el = n.parentElement; el && el !== root; el = el.parentElement) {
      if (el.getAttribute('aria-hidden') === 'true' || el.tagName === 'STYLE' || labelReplacesContent(el)) { hidden = true; break; }
    }
    // Emoji muussa kuin napissa: pelaajarivien 🤖/👤, vuoron ja roolin merkit ja viestirivin
    // pelikuvake kuuluivat puheessa (J-13, kartoitus 18.10.2026). Nappi tarkistetaan alla.
    const where = (n.parentElement?.closest('button,[role=button]') ?? n.parentElement)?.textContent ?? '';
    const inButton = !!n.parentElement?.closest('button,[role=button]');
    if (!hidden && suit) out.push(`teksti "${norm(where)}"`);
    else if (!hidden && emoji && !inButton) out.push(`emoji tekstissä "${norm(where)}"`);
    else if (!hidden && symbol && !inButton) out.push(`merkki tekstissä "${norm(where)}"`);
  }
  // Chrome Android tekee aria-pressed-elementistä ToggleButtonin ja pudottaa silloin
  // aria-labelin, joten nimi katoaa TalkBackilta (Pixel 8a 15.10.2026, J-12).
  root.querySelectorAll('[aria-pressed][aria-label]').forEach(el => {
    out.push(`aria-pressed ja aria-label samassa "${norm(el.getAttribute('aria-label') ?? '')}"`);
  });
  // Pelkkä ✕ tai muu merkki ilman aria-labelia: TalkBack lukee merkin nimen eikä toimintoa
  // (J-16, 16.10.2026). Näkyvässä tekstissä pitää olla kirjain tai numero.
  // Napin emoji kuuluu puheessa nimenä ("velho"), eikä sitä tarvitse lausua (J-13, Tommin
  // kuuntelu 16.10.2026). Emoji on aria-hidden-kääreessä tai nimi tulee aria-labelista.
  root.querySelectorAll('button,[role=button]').forEach(el => {
    if (el.closest('[aria-hidden="true"]')) return;
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) {
      const v = el.getAttribute('aria-label') ?? '';
      if (EMOJI.test(v)) out.push(`emoji napin nimessä "${norm(v)}"`);
      return;
    }
    const text = spokenText(el);
    if (!/[\p{L}\p{N}]/u.test(text)) out.push(`nimetön nappi "${text.trim()}"`);
    else if (EMOJI.test(text)) out.push(`emoji napin puheessa "${norm(text.trim())}"`);
    else if (SYMBOL.test(text)) out.push(`merkki napin puheessa "${norm(text.trim())}"`);
  });
  root.querySelectorAll('[aria-label],[alt],[title]').forEach(el => {
    if (el.closest('[aria-hidden="true"]')) return;
    for (const a of ['aria-label', 'alt', 'title']) {
      const v = el.getAttribute(a);
      if (v && SUIT.test(v)) out.push(`${a} "${norm(v)}"`);
    }
  });
  return out;
}

beforeEach(() => {
  globalThis.AudioContext = /** @type {any} */ (class {
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    resume() {}
  });
  vi.useFakeTimers();
});
afterEach(() => { cleanup(); clearAnnouncements(); vi.useRealTimers(); });

/** Pelaa ihmisenä satunnaisilla painalluksilla ja kerää vuodot. */
async function playAndScan(name, Component, seed) {
  const rnd = mulberry32(strSeed(`${name}#${seed}`));
  const leaks = new Set();
  const props = {
    game: { id: name.toLowerCase(), minPlayers: 2 },
    onResult: () => {}, onSnapshot: () => {}, soundOn: false, seeAll: false,
    showLastPlay: true, showIntention: true, showNextBtn: true, showAIKnown: true, showLog: true,
    isMobile: false, playerCount: name === 'Ristiseiska' ? 3 : 2 + (seed % 3), aiLevel: 'normal',
    onAiLevelChange: () => {}, onPlayerGroupChange: () => {}, playerGroup: 'porukka',
  };
  let utils;
  await act(async () => { utils = render(<LangProvider><Component {...props} /></LangProvider>); });
  const root = utils.container;
  const scan = () => suitLeaks(root).forEach(l => leaks.add(l));
  scan();
  // Aloitusnäytön "Aloita"-nappi on ensimmäinen kultainen nappi; tunnistetaan tekstistä.
  const start = [...root.querySelectorAll('button')].find(b => /aloita/i.test(b.textContent ?? ''));
  if (!start) throw new Error(`${name}: aloitusnappi puuttuu`);
  await act(async () => { fireEvent.click(start); });
  for (let i = 0; i < 400; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    scan();
    const clickable = [...root.querySelectorAll('button:not([disabled]), [role=button]:not([aria-disabled=true])')]
      .filter(b => !/🔮/.test(b.textContent ?? ''));
    if (clickable.length && rnd() < 0.8) {
      const b = clickable[Math.floor(rnd() * clickable.length)];
      await act(async () => { fireEvent.click(b); });
      scan();
    }
  }
  return [...leaks];
}

describe('ruudunlukija: maasymboli ei kuulu emojina (J-8)', () => {
  for (const [name, Component] of Object.entries(GAMES)) {
    it(`${name}: ei vuotoja ihmisen pelissä`, async () => {
      const all = new Set();
      for (let seed = 0; seed < 3; seed++) {
        (await playAndScan(name, Component, seed)).forEach(l => all.add(l));
        cleanup();
      }
      expect([...all]).toEqual([]);
    }, 120_000);
  }
});

// Valikko: sääntörivit, sanasto ja asetukset ovat pelien ulkopuolella ja niissä on
// kortteja ja maita ("2♠ / 2♣ = kova kakkonen", "Kaksivärinen pakka (♠ ♣ mustia…)").
describe('ruudunlukija: valikon tekstit (J-8)', () => {
  it('säännöt, sanasto ja asetukset eivät vuoda maasymbolia', async () => {
    let utils;
    await act(async () => { utils = render(<LangProvider><App /></LangProvider>); });
    const root = utils.container;
    const leaks = new Set();
    const scan = () => suitLeaks(root).forEach(l => leaks.add(l));
    for (const b of [...root.querySelectorAll('button[aria-expanded="false"]')]) {
      await act(async () => { fireEvent.click(b); });
    }
    scan();
    // Sanasto avautuu sääntöpaneelin linkistä ja sulkeutuu omasta napistaan.
    const glossary = [...root.querySelectorAll('button')].find(b => /sanasto/i.test(b.textContent ?? ''));
    expect(glossary, 'sanaston avausnappi').toBeTruthy();
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (glossary)); });
    scan();
    const close = [...root.querySelectorAll('button')].filter(b => /sulje|✕|←/i.test(b.textContent ?? ''));
    for (const b of close) await act(async () => { fireEvent.click(b); });
    const settings = root.querySelector('button[aria-label="Asetukset"]');
    expect(settings, 'asetusten avausnappi').toBeTruthy();
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (settings)); });
    const section = [...root.querySelectorAll('button')].find(b => /^Peliasetukset/.test(b.textContent ?? ''));
    if (section) await act(async () => { fireEvent.click(section); });
    const more = [...root.querySelectorAll('button')].find(b => /^Lisäasetukset/.test(b.textContent ?? ''));
    if (more) await act(async () => { fireEvent.click(more); });
    scan();
    expect(root.textContent).toContain('Kaksivärinen pakka');
    expect([...leaks]).toEqual([]);
  });
});

// TalkBack lukee title-attribuutin napin nimen perään. Jaa-napin title toi nimeen ⁹:n, jonka
// aria-label oli jo jättänyt pois (kuunneltu 17.10.2026, docs/AUDITOINTI-RUUDUNLUKIJA.md J-24).
describe('valikon napeissa ei ole tooltipiä', () => {
  it('nimetyllä napilla ei ole title-attribuuttia', async () => {
    let root;
    await act(async () => { ({ container: root } = render(<LangProvider><App /></LangProvider>)); });
    const lang = /** @type {HTMLElement} */ (root.querySelector('button[aria-expanded]'));
    await act(async () => { fireEvent.click(lang); });
    const leaks = [...root.querySelectorAll('button[title]')].map(b => `${b.getAttribute('aria-label') || b.textContent}: ${b.getAttribute('title')}`);
    expect(root.querySelector('button[aria-label="Jaa Jako"]')).not.toBeNull();
    expect(leaks).toEqual([]);
  });
});
