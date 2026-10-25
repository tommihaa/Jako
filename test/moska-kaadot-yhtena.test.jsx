// @vitest-environment jsdom
//
// Saman siirron kaadot kuuluvat ruudunlukijalle yhtenä viestinä ja tilanne kerran lopussa,
// mutta näkyvä loki pysyy rivi per kaato (Tommin valinta 25.10.2026, auditointi J-44).

import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import MoskaGame from '../src/games/Moska.jsx';
import { mulberry32, strSeed } from './prng.js';

const Moska = /** @type {any} */ (MoskaGame);

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
  vi.restoreAllMocks();
  cleanup();
});

function props() {
  return { onResult: () => {}, soundOn: false, seeAll: false, showLog: true, showLastPlay: true,
    showIntention: false, isMobile: false, playerCount: 3, aiLevel: 'normal', onAiLevelChange: () => {} };
}

const button = (c, re) => /** @type {HTMLElement | undefined} */ ([...c.querySelectorAll('button')].find(b => re.test(b.textContent ?? '')));
const omat = c => /** @type {HTMLElement[]} */ ([...c.querySelectorAll('[role="button"][data-mine]')]);
const MONTA = /^Hero: [^.]* kaataa [^,.]*, [^.]* kaataa /;
const puhutut = c => [...c.querySelectorAll('.sr-only')].map(e => e.textContent ?? '');

it('Heron monen kortin kaato kuuluu yhtenä viestinä', async () => {
  // Kiinteä siemen, koska satunnainen jako ei aina tuota monen kortin kaatoa.
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed('kaadot-yhtena')));
  let utils;
  await act(async () => { utils = render(<LangProvider><Moska {...props()} /></LangProvider>); });
  const c = utils.container;
  await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(c, /^Aloita/))); });
  let viesti;
  for (let i = 0; i < 600 && !viesti; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    const otto = button(c, /^Ota kortit/);
    if (otto) {
      for (const k of omat(c)) await act(async () => { fireEvent.click(k); });
      const kaada = button(c, /^Kaada \(/);
      await act(async () => { fireEvent.click(kaada ?? otto); });
      viesti = puhutut(c).find(s => MONTA.test(s));
      continue;
    }
    const pelaa = [...c.querySelectorAll('button')].find(b => /^(Pelaa|Lyö kortti|Hyökkää)/.test(b.textContent ?? '') && !b.disabled);
    const nappi = button(c, /^(Ohita|Seuraava kierros)/) ?? pelaa ?? omat(c)[0];
    if (nappi) await act(async () => { fireEvent.click(nappi); });
  }
  expect(viesti).toBeDefined();
  // Tilanne kerran, ja nimi kerran alussa.
  expect(viesti.match(/\(pöydällä on kaatamatta|\(kaikki kaadettu/g)?.length).toBe(1);
  expect(viesti.match(/Hero:/g)?.length).toBe(1);
  // Näkyvässä lokissa on yhä rivi per kaato.
  const kaatoa = (viesti.match(/ kaataa /g) ?? []).length;
  const rivit = [...c.querySelectorAll('[aria-hidden="true"]')].filter(e => /^Hero: .* kaataa /.test(e.textContent ?? ''));
  expect(rivit.length).toBeGreaterThanOrEqual(kaatoa);
}, 300_000);
