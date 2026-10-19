// @vitest-environment jsdom
//
// Kultakalan poistopakasta pitää voida nostaa ruudunlukijalla ja näppäimistöllä
// (auditointi J-38, Tommin kuuntelu 19.10.2026). KULTAKALA.md: "Nosta vuorollasi kortti
// pakasta tai poistopakasta." Poistopakka oli pelkkä klikattava div, joten TalkBack näki
// siitä vain kortin kuvan. Koputuksen poistopakka on jo nappi samalla nimellä.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { clearAnnouncements } from '../src/shared/Announcer.jsx';
import { mulberry32, strSeed } from './prng.js';
import Kultakala from '../src/games/Kultakala.jsx';

beforeEach(() => {
  globalThis.AudioContext = /** @type {any} */ (class {
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    resume() {}
  });
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed('kultakala-poistopakka')));
});
afterEach(() => { cleanup(); clearAnnouncements(); vi.useRealTimers(); vi.restoreAllMocks(); });

const props = {
  onResult: () => {}, onSnapshot: () => {}, soundOn: false, seeAll: false,
  showLastPlay: true, showAIKnown: true, showLog: true, isMobile: false,
  playerCount: 2, aiLevel: 'normal', onAiLevelChange: () => {},
  onPlayerGroupChange: () => {}, playerGroup: 'porukka', playerNames: undefined,
  onSeeAllChange: () => {}, onShowLogChange: () => {}, onSoundOnChange: () => {},
};

const nimi = name => el => el.getAttribute('aria-label') === name;

describe('Kultakala: poistopakka ruudunlukijalle (J-38)', () => {
  it('poistopakka on nimetty nappi, kun siinä on kortti ja on Heron nostovuoro', async () => {
    let utils;
    await act(async () => { utils = render(<LangProvider><Kultakala {...props} /></LangProvider>); });
    const root = utils.container;
    const start = [...root.querySelectorAll('button')].find(b => /aloita/i.test(b.textContent ?? ''));
    await act(async () => { fireEvent.click(start); });

    // Pelataan kunnes poistopakassa on kortti ja Hero on taas nostovuorossa: nosto pakasta
    // ja heitto poistopakkaan.
    let nappi = null;
    for (let i = 0; i < 200 && !nappi; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(700); });
      nappi = [...root.querySelectorAll('[role=button]')].find(nimi('Nosta poistopakasta')) ?? null;
      if (nappi) break;
      const pakka = [...root.querySelectorAll('[role=button]')].find(nimi('Nosta pakasta'));
      if (pakka) { await act(async () => { fireEvent.click(pakka); }); continue; }
      const heita = [...root.querySelectorAll('button:not([disabled])')].find(b => /heitä/i.test(b.textContent ?? ''));
      if (heita) await act(async () => { fireEvent.click(heita); });
    }
    expect(nappi).not.toBeNull();
    expect(nappi.getAttribute('tabindex')).toBe('0');

    // Enter nostaa kortin käteen, jolloin pakat eivät ole enää nostettavissa.
    await act(async () => { fireEvent.keyDown(nappi, { key: 'Enter' }); });
    expect([...root.querySelectorAll('[role=button]')].find(nimi('Nosta poistopakasta'))).toBeUndefined();
    expect([...root.querySelectorAll('[role=button]')].find(nimi('Nosta pakasta'))).toBeUndefined();
  }, 60_000);
});
