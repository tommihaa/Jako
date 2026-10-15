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

/** Ruudunlukijalle päätyvät maasymbolit. @param {HTMLElement} root */
function suitLeaks(root) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!SUIT.test(n.nodeValue ?? '')) continue;
    let hidden = false;
    for (let el = n.parentElement; el && el !== root; el = el.parentElement) {
      if (el.getAttribute('aria-hidden') === 'true' || el.tagName === 'STYLE' || labelReplacesContent(el)) { hidden = true; break; }
    }
    if (!hidden) out.push(`teksti "${norm((n.parentElement?.closest('button,[role=button]') ?? n.parentElement)?.textContent ?? '')}"`);
  }
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
