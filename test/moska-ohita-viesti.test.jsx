// @vitest-environment jsdom
//
// Heron Ohita sivustalyönnissä kirjoittaa viestin kuten botin ohitus. Ilman sitä kadonneen
// napin jälkeen viestirivi luki uudelleen vihjeen "Voit lyödä sivusta", koska rivillä ei
// ollut uutta tekstiä (Tommin kuuntelu 25.10.2026).

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

const button = (c, re) => /** @type {HTMLElement | undefined} */ ([...c.querySelectorAll('button')].find(b => re.test(b.textContent ?? '') && !b.disabled));
const omat = c => /** @type {HTMLElement[]} */ ([...c.querySelectorAll('[role="button"][data-mine]')]);
const rivi = c => c.querySelector('[data-game-message]')?.textContent ?? '';

it('Ohita vaihtaa viestirivin vihjeestä ohitukseen', async () => {
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed('ohita-viesti')));
  let utils;
  await act(async () => { utils = render(<LangProvider><Moska onResult={() => {}} playerCount={3} aiLevel="normal" showLog isMobile={false} onAiLevelChange={() => {}} /></LangProvider>); });
  const c = utils.container;
  await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(c, /^Aloita/))); });
  let ohitettu = false;
  for (let i = 0; i < 600 && !ohitettu; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    const ohita = button(c, /^Ohita/);
    if (ohita && /Voit lyödä sivusta/.test(rivi(c))) {
      await act(async () => { fireEvent.click(ohita); });
      expect(rivi(c)).not.toMatch(/Voit lyödä sivusta/);
      expect(c.textContent).toMatch(/Hero ohittaa\./);
      ohitettu = true;
      break;
    }
    const otto = button(c, /^Ota kortit/);
    if (otto) { await act(async () => { fireEvent.click(otto); }); continue; }
    const pelaa = button(c, /^Hyökkää/);
    const nappi = button(c, /^(Ohita|Seuraava kierros)/) ?? pelaa ?? omat(c)[0];
    if (nappi) await act(async () => { fireEvent.click(nappi); });
  }
  expect(ohitettu).toBe(true);
}, 300_000);
