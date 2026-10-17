// @vitest-environment jsdom
//
// Botin nosto kuuluu kerran ja nimeää kortit. Botti sanoo noston päätöksen hetkellä
// ("X nostaa ruutu kaksi"). Ennen korjausta resolveDefenseLoss kirjasi saman teon
// uudelleen ("X nosti 2 korttia kaatamatta jääneistä"), ja ruudunlukija sanoi noston
// kahdesti (Tommin kuuntelu 17.10.2026, docs/AUDITOINTI-RUUDUNLUKIJA.md › J-25).
// Bottien Taistelussa jokainen puolustaja on botti, joten nosti-riviä ei saa tulla lainkaan.
// Kaadot nimeävät kortit samassa muodossa kuin Heron kaato ("X kaatoi ruutu neljä kortilla …").

import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import MaijaGame from '../src/games/Maija.jsx';

// Testi antaa vain Bottien Taistelun tarvitsemat propsit, kuten allbots-smoke.test.jsx.
const Maija = /** @type {any} */ (MaijaGame);

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

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

it('Maija: botin nosto kirjataan kerran', async () => {
  let result = null;
  let utils;
  await act(async () => {
    const props = { onResult: r => { result = r; }, soundOn: false, seeAll: false, showLog: true,
      showLastPlay: true, showIntention: false, isMobile: false, playerCount: 4, aiLevel: 'normal',
      onAiLevelChange: () => {} };
    utils = render(<LangProvider><Maija {...props} /></LangProvider>);
  });
  const btn = /** @type {HTMLElement} */ ([...utils.container.querySelectorAll('button')].find(b => b.textContent?.includes('🔮')));
  await act(async () => { fireEvent.click(btn); });

  const partial = new Set();
  const took = new Set();
  const beats = new Set();
  for (let i = 0; i < 6000 && result === null; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(2600); });
    const text = utils.container.textContent ?? '';
    for (const m of text.matchAll(/\S+ nostaa (pata|hertta|ruutu|risti)/g)) partial.add(m[0]);
    for (const m of text.matchAll(/\S+ nosti \S+ korttia? kaatamatta/g)) took.add(m[0]);
    for (const m of text.matchAll(/\S+ kaatoi (kaikki: )?(pata|hertta|ruutu|risti) \S+ kortilla/g)) beats.add(m[0]);
  }
  expect(result).not.toBeNull();
  expect(partial.size).toBeGreaterThan(0);
  expect(beats.size).toBeGreaterThan(0);
  expect([...took]).toEqual([]);
}, 30_000);
