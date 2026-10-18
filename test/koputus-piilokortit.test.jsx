// @vitest-environment jsdom
//
// Koputuksen botin viesti tai pöytä ei saa nimetä vastustajan piilokorttia, kun Avoimet
// kortit on pois. Sama malli kuin kultakala-piilokortit.test.jsx (auditointi J-36), yleistetty
// retrossa 19.10.2026. KOPUTUS.md › Pelaajien näkyvyys: muiden pelaajien kortit ovat piilossa
// koko pelin ajan, poistopakka on näkyvä kaikille. Botin viesti saa siis nimetä vain kortin
// joka menee poistopakkaan (vaihto, heitto, reaktion lyönti).
//
// Positiivinen kontrolli: Avoimet kortit (seeAll) näyttää bottien pöytäkortit, joten sama
// tunnistin löytää niistä kortteja. Ilman kontrollia tyhjä tulos ei todistaisi mitään.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { clearAnnouncements } from '../src/shared/Announcer.jsx';
import { mulberry32, strSeed } from './prng.js';
import Koputus from '../src/games/Koputus.jsx';

const BOTS = ['Aapo', 'Bea', 'Cecil'];
const SUIT_WORD = '(?:pata|hertta|ruutu|risti)';
const SUIT = new RegExp(`[♠♥♦♣]|\\b${SUIT_WORD}\\b`);
// Kortin nimi ruudunlukijan muodossa ("pata kuusi") tai näkyvänä ("6♠").
const CARD = `(?:${SUIT_WORD} \\S+?|(?:10|[2-9AJQK])[♠♥♦♣])`;
// Julkiseksi menevä kortti: aiSwapped, aiDiscard ja aiReact (fi.js › games.koputus.msg).
const PUBLIC = new RegExp(`${CARD} poistopakkaan|lyömällä ${CARD}`, 'g');

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
afterEach(() => { cleanup(); clearAnnouncements(); vi.useRealTimers(); vi.restoreAllMocks(); });

/**
 * Bottien pöytäkorttien ruudunlukijanimet: pelaajaruudukko alkaa nimirivillä, jonka
 * nimiväli on botin nimi. @param {HTMLElement} root
 */
function botTableCards(root) {
  const out = [];
  for (const span of root.querySelectorAll('span')) {
    if (!BOTS.includes(span.textContent ?? '') || span.children.length) continue;
    const grid = span.parentElement?.parentElement;
    if (!grid) continue;
    grid.querySelectorAll('[role="img"][aria-label], .sr-only').forEach(el => {
      const v = el.getAttribute('aria-label') ?? el.textContent ?? '';
      if (SUIT.test(v)) out.push(`${span.textContent}: ${v}`);
    });
  }
  return out;
}

/** Pelaa ihmisenä ja palauttaa piilokorttien vuodot sekä botin julkiset korttiviestit. */
async function playKoputus(seeAll, seed) {
  const rnd = mulberry32(strSeed(`koputus-piilo#${seed}`));
  // Botin valinnat ja sekoitus käyttävät Math.randomia: siemen tekee ajosta toistettavan.
  vi.restoreAllMocks();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(strSeed(`random#koputus#${seeAll}#${seed}`)));
  const props = {
    onResult: () => {}, onSnapshot: () => {}, soundOn: false, seeAll,
    showLastPlay: true, showAIKnown: true, showIntention: true, showLog: true, isMobile: false,
    playerCount: 2 + (seed % 3), playerNames: BOTS, aiLevel: 'hard', onAiLevelChange: () => {},
    onPlayerGroupChange: () => {}, playerGroup: 'porukka',
    onSeeAllChange: () => {}, onShowLogChange: () => {}, onSoundOnChange: () => {},
  };
  let utils;
  await act(async () => { utils = render(<LangProvider><Koputus {...props} /></LangProvider>); });
  const root = utils.container;
  const start = [...root.querySelectorAll('button')].find(b => /aloita/i.test(b.textContent ?? ''));
  await act(async () => { fireEvent.click(start); });
  const messageLeaks = new Set(), tableLeaks = new Set(), publicMsgs = new Set();
  const collect = () => {
    for (const el of root.querySelectorAll('div, span, p, li')) {
      if (el.children.length) continue;
      for (const sentence of (el.textContent ?? '').split(/(?<=[.!])\s+/)) {
        if (!BOTS.some(b => sentence.startsWith(`${b} `)) || !SUIT.test(sentence)) continue;
        const rest = sentence.replace(PUBLIC, '');
        if (SUIT.test(rest)) messageLeaks.add(sentence);
        else publicMsgs.add(sentence);
      }
    }
    botTableCards(root).forEach(l => tableLeaks.add(l));
  };
  for (let i = 0; i < 300; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    // Lopussa kortit paljastetaan kaikille (tulosruutu), joten keruu päättyy siihen.
    if (/Peli päättyi/.test(root.textContent ?? '')) break;
    collect();
    const clickable = [...root.querySelectorAll('button:not([disabled]), [role=button]:not([aria-disabled=true])')]
      .filter(b => !/🔮|Avoimet/.test(b.textContent ?? ''));
    if (clickable.length && rnd() < 0.8) {
      await act(async () => { fireEvent.click(clickable[Math.floor(rnd() * clickable.length)]); });
    }
  }
  return { messageLeaks: [...messageLeaks], tableLeaks: [...tableLeaks], publicMsgs: [...publicMsgs] };
}

/** @param {boolean} seeAll */
async function playSeeds(seeAll) {
  const all = { messageLeaks: [], tableLeaks: [], publicMsgs: [] };
  for (let seed = 0; seed < 3; seed++) {
    const r = await playKoputus(seeAll, seed);
    for (const k of Object.keys(all)) all[k].push(...r[k]);
    cleanup();
  }
  return all;
}

describe('Koputus: botin piilokortit (retro 19.10.2026)', () => {
  it('ilman Avoimia kortteja botin viesti ja pöytä eivät nimeä piilokorttia', async () => {
    const { messageLeaks, tableLeaks, publicMsgs } = await playSeeds(false);
    // Keruu toimii: botin viesteissä on poistopakkaan menneitä kortteja.
    expect(publicMsgs.length).toBeGreaterThan(0);
    expect(messageLeaks).toEqual([]);
    expect(tableLeaks).toEqual([]);
  }, 120_000);

  it('Avoimet kortit näyttää bottien pöytäkortit', async () => {
    const { tableLeaks } = await playSeeds(true);
    expect(tableLeaks.length).toBeGreaterThan(0);
  }, 120_000);
});
