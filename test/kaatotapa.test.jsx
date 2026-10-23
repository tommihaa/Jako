// @vitest-environment jsdom
//
// Ihmisen kaatotapa (Tommin päätös 23.10.2026, MAIJA.md ja MOSKA.md › Ihmisen kaatotapa):
// puolustaja valitsee kädestä kaatavat kortit ja painaa Kaada, eikä pöydän korttia valita.
// Hero valitsee puolustuksessa kaikki korttinsa. Kortti joka ei kaada mitään ei tule
// valituksi, joten Kaada parittaa loput. Maijassa kaatamatta jääneet nostetaan samalla
// teolla, Moskassa ne jäävät pöytään.

import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import MaijaGame from '../src/games/Maija.jsx';
import MoskaGame from '../src/games/Moska.jsx';

const Maija = /** @type {any} */ (MaijaGame);
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
  cleanup();
});

function props() {
  return { onResult: () => {}, soundOn: false, seeAll: false, showLog: true, showLastPlay: true,
    showIntention: false, isMobile: false, playerCount: 3, aiLevel: 'normal', onAiLevelChange: () => {} };
}

const button = (c, re) => /** @type {HTMLElement | undefined} */ ([...c.querySelectorAll('button')].find(b => re.test(b.textContent ?? '')));
const omat = c => /** @type {HTMLElement[]} */ ([...c.querySelectorAll('[role="button"][data-mine]')]);

for (const [nimi, Peli, ota] of /** @type {[string, any, RegExp][]} */ ([['Maija', Maija, /^Ota kaikki/], ['Moska', Moska, /^Ota kortit/]])) {
  it(`${nimi}: Kaada parittaa valitut kortit ilman pöydän kortin valintaa`, async () => {
    let utils;
    await act(async () => { utils = render(<LangProvider><Peli {...props()} /></LangProvider>); });
    const c = utils.container;
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(c, /^Aloita/))); });
    let kaadot = 0;
    for (let i = 0; i < 200 && kaadot < 3; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
      const otto = button(c, ota);
      if (otto) {
        for (const k of omat(c)) await act(async () => { fireEvent.click(k); });
        const kaada = button(c, /^Kaada \(/);
        if (kaada) {
          await act(async () => { fireEvent.click(kaada); });
          kaadot++;
        } else {
          await act(async () => { fireEvent.click(otto); });
        }
        continue;
      }
      const pelaa = [...c.querySelectorAll('button')].find(b => /^(Pelaa|Lyö kortti|Hyökkää)/.test(b.textContent ?? '') && !b.disabled);
      const nappi = button(c, /^(Ohita|Seuraava kierros)/) ?? pelaa ?? omat(c)[0];
      if (nappi) await act(async () => { fireEvent.click(nappi); });
    }
    expect(kaadot).toBeGreaterThan(0);
    expect(c.textContent).toMatch(nimi === 'Maija' ? /Hero kaatoi/ : /Hero: [^.]* kaataa/);
  }, 120_000);
}
