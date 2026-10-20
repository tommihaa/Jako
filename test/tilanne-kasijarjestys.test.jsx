// @vitest-environment jsdom
//
// Tilanne lukee oman käden samassa järjestyksessä kuin ruutu näyttää sen. Tommin
// NVDA-kuuntelussa 20.10.2026 Ristiseiska sanoi kortit "omituisessa järjestyksessä",
// koska ruutu järjesti käden mutta Tilanne sai raa'an G.players[0].hand-taulukon.
//
// Testi kaappaa statusText-kutsun käden ja vaatii, että sama korttinimien jono löytyy
// ruudun saavutettavuusnimistä yhtenäisenä pätkänä samassa järjestyksessä.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { clearAnnouncements } from '../src/shared/Announcer.jsx';
import { cardName } from '../src/shared/helpers.js';
import { mulberry32, strSeed } from './prng.js';

/** @type {any[] | null} */
let viimeisinKasi = null;
vi.mock('../src/shared/a11yStatus.js', async (orig) => {
  const m = /** @type {any} */ (await orig());
  return { ...m, statusText: (/** @type {any} */ p) => { viimeisinKasi = p.hand ?? null; return m.statusText(p); } };
});

import Kasino from '../src/games/Kasino.jsx';
import Maija from '../src/games/Maija.jsx';
import Moska from '../src/games/Moska.jsx';
import Paskahousu from '../src/games/Paskahousu.jsx';
import Ristiseiska from '../src/games/Ristiseiska.jsx';
import Seiska from '../src/games/Seiska.jsx';

const GAMES = { Kasino, Maija, Moska, Paskahousu, Ristiseiska, Seiska };

beforeEach(() => {
  globalThis.AudioContext = /** @type {any} */ (class {
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    resume() {}
  });
  vi.useFakeTimers();
  viimeisinKasi = null;
});
afterEach(() => { cleanup(); clearAnnouncements(); vi.useRealTimers(); vi.restoreAllMocks(); });

/** Ruudun saavutettavuusnimet dokumenttijärjestyksessä: aria-label ja sr-only-teksti. */
function ruudunNimet(/** @type {HTMLElement} */ root) {
  return [...root.querySelectorAll('[aria-label], .sr-only')]
    .map(el => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim())
    .filter(Boolean);
}

describe('Tilanne lukee käden ruudun järjestyksessä', () => {
  for (const [name, Component] of Object.entries(GAMES)) {
    it(name, async () => {
      vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed(`kasijarjestys#${name}`)));
      /** @type {any} */
      const props = {
        game: { id: name.toLowerCase(), minPlayers: 2 },
        onResult: () => {}, onSnapshot: () => {}, soundOn: false, seeAll: false,
        showLastPlay: true, showIntention: true, showNextBtn: true, showAIKnown: true, showLog: true,
        isMobile: false, playerCount: 3, aiLevel: 'normal',
        onAiLevelChange: () => {}, onPlayerGroupChange: () => {}, playerGroup: 'porukka',
      };
      /** @type {any} */
      let utils;
      await act(async () => { utils = render(<LangProvider><Component {...props} /></LangProvider>); });
      const root = utils.container;
      const start = [...root.querySelectorAll('button')].find(b => /aloita/i.test(b.textContent ?? ''));
      await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (start)); });
      await act(async () => { await vi.advanceTimersByTimeAsync(100); });
      await act(async () => { fireEvent.keyDown(window, { key: 'h' }); });
      expect(viimeisinKasi, 'Tilanne ei antanut kättä').toBeTruthy();
      const kasi = /** @type {any[]} */ (viimeisinKasi).map(c => cardName(c));
      expect(kasi.length).toBeGreaterThan(2);
      const nimet = ruudunNimet(root);
      // Jokaisen käden kortin nimi esiintyy jossain saavutettavuusnimessä; etsitään
      // ensimmäisen kortin kohta ja vaaditaan loput perään samassa järjestyksessä.
      const osuu = (/** @type {string} */ n, /** @type {string} */ k) => n === k || n.includes(k);
      const loydetty = nimet.some((_, i) => kasi.every((k, j) => nimet[i + j] !== undefined && osuu(nimet[i + j], k)));
      expect(loydetty, `${name}: Tilanne ${kasi.join(', ')}\nruutu ${nimet.join(' | ')}`).toBe(true);
    });
  }
});
