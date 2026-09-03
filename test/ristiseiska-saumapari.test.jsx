// @vitest-environment jsdom
//
// Saumapari: pitää Ristiseiskan kaksi kuljettajaa samaa mieltä.
//
// Taustaa (kompositioauditointi, kysymys 4 ja päätös 4 3.9.2026). Botbench mittaa
// bottien voimasuhteita. Mittauksen tarkkuus riippuu pelien määrästä. Määrä
// puolestaan riippuu siitä, kuinka kalliisti yksi peli syntyy. Komponenttisauma
// renderöi oikean React-puun jsdomiin ja kelaa ajastimia eli maksaa sekunteja per
// peli. Puhdas sauma ajaa saman pelin funktiokutsuina millisekunneissa.
//
// Molemmat saumat käyttävät samaa sääntömoottoria (`ristiseiskaEngine.js`), joten
// sääntöjä ei ole kahtena kopiona. Se ei silti riitä: kuljettajat voivat kutsua
// moottoria eri järjestyksessä, eri tilasta tai eri tasolla. Tämä testi vaatii,
// että samasta siemenestä syntyy sama peli molemmilla, askel askeleelta.
//
// MIKSI TASO ON MESTARI. `aiNoise('hard')` on 0, joten aloittelija-virhettä ei
// arvota ja botin valinta on tilan funktio. Silloin kuljettajien eri määrä
// Math.random-nostoja (komponentti arpoo lisäksi ajastinjitterin) ei voi haarauttaa
// peliä. RAJOITE: tämä testi ei siis kata beginner- ja normal-tasojen virhearvontaa.
// Sen kattaminen vaatisi arpojan injektoinnin moottoriin, eikä sitä ole tehty.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import Ristiseiska from '../src/games/Ristiseiska.jsx';
import { runHeadless } from '../src/games/ristiseiskaEngine.js';
import { strSeed, mulberry32 } from './prng.js';

const LEVELS = ['hard', 'hard', 'hard', 'hard'];
const SEEDS  = ['sauma-0', 'sauma-1', 'sauma-2', 'sauma-3', 'sauma-4'];

// Web Audio ei ole jsdomissa; äänet ovat pois, mutta varmistetaan ettei
// mahdollinen actx()-kutsu kaada testiä (sama tynkä kuin savutestissä).
beforeEach(() => {
  globalThis.AudioContext = /** @type {any} */ (class {
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    resume() {}
  });
  globalThis.webkitAudioContext = globalThis.AudioContext;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  localStorage.clear();
});

// Kehys = kenen kädessä mikäkin kortti on. Vertailtava muoto molemmista saumoista.
const handIds = players => players.map(p => (p.hand ?? []).map(c => c.id));

/** Puhdas sauma: moottori ja sen oma silmukka, ei Reactia. */
function runPure(seedText) {
  const orig = Math.random;
  Math.random = mulberry32(strSeed(seedText));
  try {
    const frames = [];
    const { ranking } = runHeadless({
      nP: LEVELS.length, levels: LEVELS,
      onStep: g => frames.push(handIds(g.players)),
    });
    return { ranking, frames };
  } finally {
    Math.random = orig;
  }
}

/** Komponenttisauma: oikea React-komponentti jsdomissa, sama kuin Botbenchissä. */
async function runComponent(seedText) {
  const frames = [];
  let result = null;
  const props = {
    onResult: (r) => { result = r; },
    onSnapshot: (f) => { frames.push(handIds(f.players)); },
    soundOn: false,
    seeAll: false,
    showCounts: true,
    showLastPlay: true,
    showIntention: false,
    isMobile: false,
    playerCount: LEVELS.length,
    aiLevel: 'normal',
    botLevels: LEVELS,
    onAiLevelChange: () => {},
    // Propsit joita tämä testi ei tarvitse mutta joita tyyppitarkistus vaatii:
    // komponentti destrukturoi ne ilman oletusarvoa (ks. CLAUDE.md, Tyyppitarkistus).
    // `playerNames` jätetään tyhjäksi, jotta nimipooli on sama kuin puhtaassa saumassa.
    playerNames: undefined,
    playerGroup: undefined,
    onPlayerGroupChange: () => {},
    onSoundOnChange: () => {},
    onSeeAllChange: () => {},
    onShowLogChange: () => {},
  };

  let utils;
  await act(async () => {
    utils = render(<LangProvider><Ristiseiska {...props} /></LangProvider>);
  });

  // Siemen asetetaan vasta renderin jälkeen. Aloitusnäytön renderöinti kuluttaa
  // satunnaislukuja (ensimmäisellä kerralla eri määrän kuin myöhemmillä), eikä sillä
  // ole tekemistä pelin kanssa: jako alkaa vasta napin painalluksesta.
  const orig = Math.random;
  Math.random = mulberry32(strSeed(seedText));
  try {
    // Aloitusnäytön Bottien Taistelu -nappi tunnistetaan 🔮-emojista, kieliriippumattomasti.
    const btn = utils.getByRole('button', { name: /🔮/ });
    await act(async () => { fireEvent.click(btn); });

    const STEP_MS = 2600; // AI-viive allBots-tilassa ~2000 ms + jitter
    for (let i = 0; i < 6000 && result === null; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(STEP_MS); });
    }
  } finally {
    Math.random = orig;
  }
  return { ranking: result?.ranking ?? null, frames };
}

describe('Ristiseiska: puhdas sauma ja komponenttisauma pelaavat saman pelin', () => {
  for (const seed of SEEDS) {
    it(`siemen ${seed}: sama tulos ja sama kehysjono`, async () => {
      const pure = runPure(seed);
      const comp = await runComponent(seed);

      expect(pure.ranking, 'puhdas sauma ei päättänyt peliä').toBeTruthy();
      expect(comp.ranking, 'komponenttisauma ei päättänyt peliä').toBeTruthy();

      // Tulos on se mitä Botbench mittaa, joten se on vertailun tärkein rivi.
      expect(comp.ranking).toEqual(pure.ranking);

      // Kehysjono kertoo eron myös silloin kun lopputulos sattuu osumaan yhteen:
      // eri siirtojärjestys tuottaa saman voittajan mutta eri kädet matkan varrella.
      expect(comp.frames.length, 'eri määrä kehyksiä').toBe(pure.frames.length);
      expect(comp.frames).toEqual(pure.frames);
    }, 30_000);
  }
});
