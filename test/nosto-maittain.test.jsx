// @vitest-environment jsdom
//
// Heron pakasta nostamat kortit kuuluvat maittain ryhmiteltyinä: kortit luetellaan käden
// järjestyksessä, joten kukin maa sanotaan kerran (Tommin kuuntelu 25.10.2026, auditointi J-47).

import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { spokenHtml } from '../src/shared/helpers.js';
import MoskaGame from '../src/games/Moska.jsx';
import { mulberry32, strSeed } from './prng.js';

const ilmoitetut = /** @type {string[]} */ ([]);
vi.mock('../src/shared/Announcer.jsx', async orig => ({
  .../** @type {any} */ (await orig()),
  announce: (/** @type {string} */ m) => { ilmoitetut.push(spokenHtml(m)); },
}));

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
const MAAT = ['pata', 'hertta', 'ruutu', 'risti'];
// Ainakin kolme korttia, koska vasta silloin saman maan kortit voivat jäädä erilleen.
const NOSTO = /Hero nosti [3-6] korttia: ([^.]*)\./;
const nostot = () => ilmoitetut.map(s => NOSTO.exec(s)?.[1]).filter(Boolean);

async function pelaa(siemen) {
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed(siemen)));
  let utils;
  await act(async () => { utils = render(<LangProvider><Moska {...props()} /></LangProvider>); });
  const c = utils.container;
  await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(c, /^Aloita/))); });
  for (let i = 0; i < 600; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    const otto = button(c, /^Ota kortit/);
    if (otto) {
      for (const k of omat(c)) await act(async () => { fireEvent.click(k); });
      const kaada = button(c, /^Kaada \(/);
      await act(async () => { fireEvent.click(kaada ?? otto); });
      continue;
    }
    const pelaa = [...c.querySelectorAll('button')].find(b => /^(Pelaa|Lyö kortti|Hyökkää)/.test(b.textContent ?? '') && !b.disabled);
    const nappi = button(c, /^(Ohita|Seuraava kierros)/) ?? pelaa ?? omat(c)[0];
    if (nappi) await act(async () => { fireEvent.click(nappi); });
  }
  cleanup();
}

it('Moskan nostetut kortit kuuluvat maittain', async () => {
  // Seitsemännessä pelissä Hero nostaa viisi korttia, ja ristit tulevat nostojärjestyksessä
  // erilleen. Pelit ajetaan peräkkäin, koska jakso toistuu vain kokonaisena. Ilman
  // järjestystä viesti sanoo ristin kahdesti (tarkistettu).
  for (let n = 0; n <= 6; n++) await pelaa(`nosto-maittain-${n}`);
  const loydetyt = nostot();
  expect(loydetyt.length).toBeGreaterThan(0);
  for (const kortit of loydetyt) {
    for (const maa of MAAT) {
      expect((kortit.match(new RegExp(`(^|, )${maa} `, 'g')) ?? []).length, kortit).toBeLessThanOrEqual(1);
    }
  }
}, 300_000);
