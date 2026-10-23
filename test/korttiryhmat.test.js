// Saman maan peräkkäiset kortit kuuluvat yhdellä maan nimellä: "pata kaksi, kolme, hertta
// kymmenen". Ville Lammisen AccessibleBridgen tapa (Jako/docs/VERTAILU-ACCESSIBLEBRIDGE.md ›
// Opittavaa Jakoon, kohta 3), Tommin valinta 23.10.2026: arvot sanoina, järjestys ennallaan.
//
// Tilanne (`spokenCards`) ja lokin tai ilmoituksen näkyvä korttilista (`spokenSuits`)
// ryhmittelevät saman säännön mukaan. Summa plus-merkein (Kasino) ei ole luettelo.

import { describe, it, expect } from 'vitest';
import { spokenSuits, groupedCardNames } from '../src/shared/helpers.js';
import { spokenCards } from '../src/shared/a11yStatus.js';

const k = (/** @type {string} */ r, /** @type {string} */ s) => ({ r, s });

describe('saman maan kortit ryhmitellään', () => {
  it('Tilanne: maa sanotaan kerran jakson alussa', () => {
    expect(spokenCards([k('2', '♠'), k('3', '♠'), k('4', '♠'), k('10', '♥')]))
      .toBe('pata kaksi, kolme, neljä, hertta kymmenen');
  });

  it('järjestystä ei muuteta: maa toistuu kun se palaa', () => {
    expect(groupedCardNames([k('2', '♠'), k('10', '♥'), k('3', '♠')]))
      .toBe('pata kaksi, hertta kymmenen, pata kolme');
  });

  it('kuvakortit nimillään', () => {
    expect(groupedCardNames([k('J', '♣'), k('Q', '♣'), k('A', '♣')]))
      .toBe(groupedCardNames([k('J', '♣')]) + ', ' + groupedCardNames([k('Q', '')]) + ', ' + groupedCardNames([k('A', '')]));
  });

  it('lokin korttilista ryhmitellään, myös ilman välilyöntiä', () => {
    expect(spokenSuits('Hero: 7♣, 8♣, 9♥')).toBe('Hero: risti seitsemän, kahdeksan, hertta yhdeksän');
    expect(spokenSuits('Siirrä (7♣,8♣) →')).toBe('Siirrä (risti seitsemän, kahdeksan) →');
  });

  it('Kasinon summa ei ole luettelo', () => {
    expect(spokenSuits('4♥+6♥')).toBe('hertta neljä+hertta kuusi');
  });

  it('kaksoispisteen numeromuoto säilyy viimeisellä kortilla', () => {
    expect(spokenSuits('7♣: 3')).toBe('risti 7: 3');
  });
});
