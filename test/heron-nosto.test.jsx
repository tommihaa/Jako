// @vitest-environment jsdom
//
// Heron nosto nimeää kortit, bottien nosto ei. Ruudunlukijan käyttäjä haluaa kuulla mitä
// käteen tuli (Tommin toive 17.10.2026, docs/AUDITOINTI-RUUDUNLUKIJA.md › J-26). Botin
// kortit ovat salaisia, joten Bottien Taistelussa yksikään nostorivi ei saa nimetä kortteja.
// Paskahousun kasa nimetään kuuteen korttiin asti, isompi kerrotaan määränä.

import { it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import MaijaGame from '../src/games/Maija.jsx';
import MoskaGame from '../src/games/Moska.jsx';
import PaskahousuGame from '../src/games/Paskahousu.jsx';
import SeiskaGame from '../src/games/Seiska.jsx';

// Testi antaa vain pelin tarvitsemat propsit, kuten allbots-smoke.test.jsx.
const Maija = /** @type {any} */ (MaijaGame);
const Moska = /** @type {any} */ (MoskaGame);
const Paskahousu = /** @type {any} */ (PaskahousuGame);
const Seiska = /** @type {any} */ (SeiskaGame);

const MAA = '(pata|hertta|ruutu|risti)';
// Nostorivi joka nimeää kortit: "X nosti 2 korttia: pata …", "X nostaa 3 kortin kasan: …",
// "… Sakkona +3 korttia: …".
const NIMEAVA = new RegExp(`(\\S+) (nosti \\d+ \\S+|nostaa \\d+ kortin kasan|unohti sanoa Lappu! Sakkona \\+\\d+ korttia): ${MAA}`, 'g');

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

function props(onResult) {
  return { onResult, soundOn: false, seeAll: false, showLog: true, showLastPlay: true,
    showIntention: false, isMobile: false, playerCount: 3, aiLevel: 'normal', onAiLevelChange: () => {} };
}

function button(container, re) {
  return /** @type {HTMLElement | undefined} */ ([...container.querySelectorAll('button')].find(b => re.test(b.textContent ?? '')));
}

for (const [nimi, Peli] of /** @type {[string, any][]} */ ([['Maija', Maija], ['Moska', Moska], ['Paskahousu', Paskahousu], ['Seiska', Seiska]])) {
  it(`${nimi}: Bottien Taistelussa nostot eivät nimeä kortteja`, async () => {
    let result = null;
    let utils;
    await act(async () => { utils = render(<LangProvider><Peli {...props(r => { result = r; })} /></LangProvider>); });
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(utils.container, /🔮/))); });
    const nimeavat = new Set();
    // Peliä ei tarvitse pelata loppuun, koska tarkistus koskee nostorivejä. Maijan
    // bottipeli venyy välillä yli kierrosrajan.
    for (let i = 0; i < 3000 && result === null; i++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(2600); });
      for (const m of (utils.container.textContent ?? '').matchAll(NIMEAVA)) nimeavat.add(m[0]);
    }
    expect([...nimeavat]).toEqual([]);
  }, 60_000);
}

// Hero pelaa yksinkertaisesti: ottaa kortit puolustuksessa, muuten valitsee ensimmäisen
// pelattavan kortin ja lyö sen. Täydennys pakasta tulee lyönnin jälkeen. Moskassa kortit
// ottava Hero ei enää vajaannu kuuteen, joten täydennys nähdään vain jos Hero hyökkää
// ennen ensimmäistä ottoa. Siksi peli aloitetaan alusta, kunnes täydennysrivi tulee.
for (const [nimi, Peli] of /** @type {[string, any][]} */ ([['Maija', Maija], ['Moska', Moska], ['Paskahousu', Paskahousu]])) {
  it(`${nimi}: Heron täydennys pakasta nimeää kortit`, async () => {
    const rivit = new Set();
    for (let yritys = 0; yritys < 15 && rivit.size === 0; yritys++) {
      cleanup();
      let utils;
      await act(async () => { utils = render(<LangProvider><Peli {...props(() => {})} /></LangProvider>); });
      await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(utils.container, /^Aloita/))); });
      await pelaaHerona(utils.container, rivit);
    }
    expect(rivit.size).toBeGreaterThan(0);
    for (const r of rivit) {
      const [, n, kortit] = /** @type {RegExpMatchArray} */ (r.match(/nosti (\d+) \S+: ([^.]*)\./));
      expect(kortit.split(', ').length).toBe(Number(n));
    }
  }, 120_000);
}

/** Hero tekee enintään 60 siirtoa ja kerää täydennysrivit. */
async function pelaaHerona(c, rivit) {
  for (let i = 0; i < 60 && rivit.size < 3; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
    // Pelattava oma kortti on nappi, jonka nimi tulee sisällöstä (Card.jsx).
    const kortti = /** @type {HTMLElement | null} */ (c.querySelector('[role="button"][data-mine]:not([aria-disabled="true"]):not([aria-pressed="true"])'));
    // Pelinappi on käytössä vasta kun kortti on valittu. Maijan kortti ei kerro valintaa
    // aria-pressedillä, joten valinta luetaan napin tilasta.
    const pelaa = [...c.querySelectorAll('button')].find(b => /^(Pelaa|Lyö kortti|Hyökkää)/.test(b.textContent ?? '') && !b.disabled);
    const nappi = button(c, /^(Ota kaikki|Ota loput|Ota kortit|Ohita|Seuraava kierros)/)
      ?? pelaa
      ?? kortti
      ?? button(c, /^(Nosta kasa|Aina voi kokeilla pakasta|Nosta kortti ja menetä)/);
    if (nappi) await act(async () => { fireEvent.click(nappi); });
    for (const m of (c.textContent ?? '').matchAll(/Hero nosti (\d+) \S+: ([^.]*)\./g)) rivit.add(m[0]);
  }
}

it('Paskahousu: Heron kasan nosto nimeää kortit kuuteen asti', async () => {
  let utils;
  await act(async () => { utils = render(<LangProvider><Paskahousu {...props(() => {})} /></LangProvider>); });
  await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(utils.container, /^Aloita/))); });
  const rivit = new Set();
  // Hero ei koskaan lyö: se nostaa kasan aina kun voi, muuten kokeilee pakasta.
  for (let i = 0; i < 400; i++) {
  await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
  const c = utils.container;
  const nappi = button(c, /^Nosta kasa/) ?? button(c, /^Aina voi kokeilla pakasta/) ?? button(c, /^Nosta kortti ja menetä vuoro/);
  if (nappi) await act(async () => { fireEvent.click(nappi); });
  for (const m of (c.textContent ?? '').matchAll(/\S+ nostaa (\d+) kortin kasan(: [^.]*)?\./g)) rivit.add(m[0]);
  }
  // Rivin edessä voi olla kuvake tai lokin aikaleima ilman väliä, joten nimi haetaan
  // rivin sisältä. Bottien nimissä ei ole sanaa Hero.
  const hero = [...rivit].filter(r => r.includes('Hero nostaa'));
  const botit = [...rivit].filter(r => !r.includes('Hero nostaa'));
  expect(hero.length).toBeGreaterThan(0);
  for (const r of hero) {
  const [, n, kortit] = /** @type {RegExpMatchArray} */ (r.match(/nostaa (\d+) kortin kasan(: [^.]*)?\./));
  if (Number(n) <= 6) expect(kortit?.slice(2).split(', ').length).toBe(Number(n));
  else expect(kortit).toBeUndefined();
  }
  for (const r of botit) expect(r).not.toContain(':');
}, 60_000);
