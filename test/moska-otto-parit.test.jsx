// @vitest-environment jsdom
//
// Otossa korva kuulee myös kaadetut parit, koska nekin menevät puolustajan käteen
// (MOSKA.md › Ruudunlukija, Tommin päätös 25.10.2026, auditointi J-48).

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
const OTTO = /otti (\d+) korttia\. Pöydällä oli kaatamatta: ([^.]*)\.?( Kaadetut parit: ([^.]*))?/;
// Otto, jossa käteen meni enemmän kortteja kuin kaatamatta jäi, eli mukana oli kaadettuja pareja.
const ottoParein = () => ilmoitetut.map(s => OTTO.exec(s)).filter(m => m && Number(m[1]) > m[2].split(', ').length);

async function pelaa(siemen) {
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed(siemen)));
  let utils;
  await act(async () => { utils = render(<LangProvider><Moska {...props()} /></LangProvider>); });
  const c = utils.container;
  await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(c, /^Aloita/))); });
  for (let i = 0; i < 600 && !ottoParein().length; i++) {
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

it('Moskan otto nimeää myös kaadetut parit', async () => {
  for (let n = 0; n < 6 && !ottoParein().length; n++) await pelaa(`otto-parit-${n}`);
  const [m] = ottoParein();
  expect(m, 'ei ottoa, jossa olisi kaadettuja pareja').toBeTruthy();
  // Jokainen käteen mennyt kortti nimetään: kaatamatta jääneet yksin ja parit kahtena.
  const kaatamatta = m[2].split(', ').length;
  const parit = m[4]?.split('; ') ?? [];
  expect(parit.every(p => / kaatajana /.test(p)), m[0]).toBe(true);
  expect(kaatamatta + 2 * parit.length, m[0]).toBe(Number(m[1]));
}, 300_000);
