// @vitest-environment jsdom
//
// App-tason näkymät ruudunlukijalle: pelin yläpalkki (← Valikko), tulosruutu paljastetuilla
// korteilla ja tilastopaneeli. Pelikohtainen vahti (ruudunlukija-maat.test.jsx) renderöi pelit
// ilman Appia, joten nämä näkymät jäivät sen ulkopuolelle (retro 19.10.2026). Tarkistus on
// sama `suitLeaks`: maa, emoji ja merkit · ← → › ✓ ×, sallittuna Spoken, Sep ja aria-hidden.
//
// Kultakala korvataan tynkäpelillä, joka antaa Appille tuloksen napin painalluksella. Näin
// tulosruutu saa paljastetut kortit ilman koko pelin pelaamista, ja tulos kulkee Appin oman
// reitin (handleGameResult → GameResult) läpi.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import { clearAnnouncements } from '../src/shared/Announcer.jsx';
import { suitLeaks } from './ruudunlukija-vuodot.js';
import App from '../src/App.jsx';

vi.mock('../src/games/Kultakala.jsx', async () => {
  const { createElement: h } = await import('react');
  const { newDeck } = await import('../src/shared/helpers.js');
  /** @param {{ onResult: (r: any) => void }} props */
  const Tynka = ({ onResult }) => h('button', {
    onClick: () => {
      const deck = newDeck();
      onResult({
        ranking: [
          { name: 'Hero', place: 1, score: 12, isHuman: true },
          { name: 'Aapo', place: 2, score: 20, isHuman: false },
          { name: 'Bea', place: 3, score: 31, isHuman: false },
        ],
        // Kultakalan muoto (tuntematon + rivi) ja Koputuksen tyhjä paikka (null).
        revealCards: [
          { name: 'Hero', cards: deck.splice(0, 6) },
          { name: 'Aapo', cards: deck.splice(0, 6) },
          { name: 'Bea', cards: [...deck.splice(0, 3), null] },
        ],
      });
    },
  }, 'Lopeta peli');
  return { default: Tynka };
});

beforeEach(() => {
  globalThis.AudioContext = /** @type {any} */ (class {
    createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {} } }; }
    createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {} } }; }
    get destination() { return {}; }
    get currentTime() { return 0; }
    resume() {}
  });
  // Tilastopaneelissa on rivi jokaisesta pelistä; pelattu peli tuo prosentit ja erittelyn.
  localStorage.setItem('jako:stats', JSON.stringify({
    kultakala: { played: 3, wins: 1, places: { 1: 1, 2: 2 }, byLevel: { normal: { played: 3, wins: 1 } } },
    kasino: { played: 1, wins: 0, places: { 2: 1 }, byLevel: { hard: { played: 1, wins: 0 } } },
  }));
});
afterEach(() => { cleanup(); clearAnnouncements(); localStorage.clear(); });

/** @param {HTMLElement} root @param {RegExp} re */
const button = (root, re) => /** @type {HTMLElement | undefined} */ (
  [...root.querySelectorAll('button')].find(b => re.test(b.textContent ?? '')));

/** Odottaa laiskasti ladatun pelin tai muun asynkronisen näkymän. @param {() => any} find */
async function waitFor(find) {
  for (let i = 0; i < 100; i++) {
    const el = find();
    if (el) return el;
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
  }
  throw new Error('näkymä ei ilmestynyt');
}

describe('ruudunlukija: App-tason näkymät (retro 19.10.2026)', () => {
  it('yläpalkki, tulosruutu ja tilastopaneeli eivät vuoda', async () => {
    let utils;
    await act(async () => { utils = render(<LangProvider><App /></LangProvider>); });
    const root = utils.container;
    const leaks = new Set();
    /** @param {string} where */
    const scan = where => suitLeaks(root).forEach(l => leaks.add(`${where}: ${l}`));

    // Pelin yläpalkki ja paluu valikkoon ← Valikko -napista.
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(root, /Kultakala/))); });
    await waitFor(() => button(root, /Lopeta peli/));
    scan('pelinäkymä');
    const back = button(root, /Valikko/);
    expect(back, '← Valikko').toBeTruthy();
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (back)); });
    expect(button(root, /Lopeta peli/), 'paluu valikkoon').toBeUndefined();

    // Tulosruutu paljastetuilla korteilla.
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(root, /Kultakala/))); });
    await act(async () => { fireEvent.click(await waitFor(() => button(root, /Lopeta peli/))); });
    // Positiivinen kontrolli: paljastetut kortit kuuluvat sanoina (J-35), joten näkymä on se jota haettiin.
    expect(root.textContent).toMatch(/Aapo: (pata|hertta|ruutu|risti) /);
    // Sija kuuluu järjestyslukuna (Tommin kuuntelu 19.10.2026, kaikki kielet).
    expect(root.textContent).toMatch(/ensimmäinen[\s\S]*toinen[\s\S]*kolmas/);
    scan('tulosruutu');

    // Tilastopaneeli Info-paneelista, jokainen pelirivi auki.
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(root, /Valikko/))); });
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (root.querySelector('button[aria-label="Info"]'))); });
    await act(async () => { fireEvent.click(/** @type {HTMLElement} */ (button(root, /Tilastot/))); });
    expect(root.textContent).toContain('Kasino');
    scan('tilastot');
    // Pelatun pelin rivi on nappi, jonka teksti kertoo voitot. Valikon pelinapit ovat paneelin
    // alla samassa puussa, joten rivit tunnistetaan voittotekstistä eikä pelin nimestä.
    const rows = [...root.querySelectorAll('button')].filter(b => /voittoa/.test(b.textContent ?? ''));
    expect(rows.length, 'pelattujen pelien rivit').toBe(2);
    for (const row of rows) {
      await act(async () => { fireEvent.click(row); });
      expect(root.textContent, 'rivi aukesi').toContain('Sijoitukset');
      scan('tilastot auki');
    }
    expect(root.textContent, 'sijoitusjakauman neljäs sija').toContain('neljäs');

    expect([...leaks]).toEqual([]);
  });
});
