// @vitest-environment jsdom
//
// Kultakalan botin vaihtoviesti ei saa paljastaa botin piilossa olevia kortteja
// (auditointi J-36, Tommin kuuntelu 19.10.2026). KULTAKALA.md: muiden pelaajien kortit
// ovat piilossa koko pelin ajan. Viesti kertoo vain paikat ja poistopakkaan menevän kortin,
// paitsi kun Avoimet kortit on päällä.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { clearAnnouncements } from '../src/shared/Announcer.jsx';
import { mulberry32, strSeed } from './prng.js';
import Kultakala from '../src/games/Kultakala.jsx';

// Ruudunlukijan teksti (sr-only-lehtisolmu) sanoo maan sanana.
const SUIT = /[♠♥♦♣]|\b(pata|hertta|ruutu|risti)\b/;

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

/** Pelaa ihmisenä ja palauttaa botin vaihtoviestien ketjuosat (vaihtaa: … viimeiseen pilkkuun). */
async function botSwapChains(seeAll, seed) {
  const rnd = mulberry32(strSeed(`kultakala-piilo#${seed}`));
  const props = {
    onResult: () => {}, onSnapshot: () => {}, soundOn: false, seeAll,
    showLastPlay: true, showAIKnown: true, showLog: true, isMobile: false,
    playerCount: 2 + (seed % 3), aiLevel: 'normal', onAiLevelChange: () => {},
    onPlayerGroupChange: () => {}, playerGroup: 'porukka',
  };
  let utils;
  await act(async () => { utils = render(<LangProvider><Kultakala {...props} /></LangProvider>); });
  const root = utils.container;
  const start = [...root.querySelectorAll('button')].find(b => /aloita/i.test(b.textContent ?? ''));
  await act(async () => { fireEvent.click(start); });
  const chains = new Set();
  const collect = () => {
    for (const el of root.querySelectorAll('div, span, p')) {
      if (el.children.length) continue;
      const m = /^(?!Hero)(\S+) vaihtaa: (.*), [^,]* poistopakkaan\.$/.exec(el.textContent ?? '');
      if (m) chains.add(m[2]);
    }
  };
  for (let i = 0; i < 300; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    collect();
    const clickable = [...root.querySelectorAll('button:not([disabled]), [role=button]:not([aria-disabled=true])')]
      .filter(b => !/🔮|Avoimet/.test(b.textContent ?? ''));
    if (clickable.length && rnd() < 0.8) {
      await act(async () => { fireEvent.click(clickable[Math.floor(rnd() * clickable.length)]); });
    }
  }
  return [...chains];
}

describe('Kultakala: botin vaihtoviesti (J-36)', () => {
  it('ilman Avoimia kortteja ketju kertoo vain paikat', async () => {
    const all = [];
    for (let seed = 0; seed < 3; seed++) { all.push(...await botSwapChains(false, seed)); cleanup(); }
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter(c => SUIT.test(c))).toEqual([]);
  }, 120_000);

  it('Avoimet kortit näyttää ketjun kortit', async () => {
    const all = [];
    for (let seed = 0; seed < 3; seed++) { all.push(...await botSwapChains(true, seed)); cleanup(); }
    expect(all.some(c => SUIT.test(c))).toBe(true);
  }, 120_000);
});
