// @vitest-environment jsdom
//
// Tyhjään pöytään hyökättäessä puolustusvuoron viesti ei toista korville juuri sanottuja
// hyökkäyskortteja. Muulloin pöytäluettelo säilyy, koska pöydällä on muutakin (Tommin valinta
// 25.10.2026, auditointi J-49).

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
const parit = () => ilmoitetut.slice(1).map((s, i) => [ilmoitetut[i], s]);
const hyokkays = () => parit().filter(([a]) => / hyökkäsi: /.test(a));
// Puolustusvuoro, joka alkaa muusta kuin hyökkäyksestä, esimerkiksi sivustalyönnin jälkeen.
const muuVuoro = () => parit().filter(([a, b]) => !/ hyökkäsi: /.test(a) && /puolustaa… \(pöydällä:|On vuorosi puolustautua\. Pöydällä:/.test(b));

async function pelaa(siemen) {
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed(siemen)));
  let utils;
  await act(async () => { utils = render(<LangProvider><Moska {...props()} /></LangProvider>); });
  const c = utils.container;
  await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(c, /^Aloita/))); });
  for (let i = 0; i < 600 && !(hyokkays().length >= 3 && muuVuoro().length); i++) {
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

it('Moskan puolustusvuoro ei toista tyhjän pöydän hyökkäyksen kortteja', async () => {
  for (let n = 0; n < 6 && !(hyokkays().length >= 3 && muuVuoro().length); n++) await pelaa(`puolustus-toisto-${n}`);
  expect(hyokkays().length).toBeGreaterThanOrEqual(3);
  for (const [a, b] of hyokkays()) {
    expect(b, a).toMatch(/^(\S+ puolustaa…|On vuorosi puolustautua\.)$/);
  }
  // Muualla luettelo säilyy.
  expect(muuVuoro().length).toBeGreaterThan(0);
}, 300_000);
