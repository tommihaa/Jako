// Kaatotavan paritus (Tommin päätös 23.10.2026, MAIJA.md ja MOSKA.md › Ihmisen kaatotapa):
// eniten kaatava paritus, tasatilanteessa pienin pöydän kortti ensin, ja kaatoon käytetään
// pienimmät valitut kortit. Valtti on tässä risti.

import { it, expect } from 'vitest';
import { kaatoParitus } from '../src/shared/kaatoParitus.js';

const TRUMP = '♣';
const k = (v, s) => ({ id: `${v}${s}`, v, s });
const canBeat = (a, d) => (d.s === a.s && d.v > a.v) || (d.s === TRUMP && a.s !== TRUMP);
const value = c => (c.s === TRUMP ? 100 : 0) + c.v;
const pari = (targets, cards) => {
  const { pairs, unused } = kaatoParitus(targets, cards, canBeat, value);
  return { pairs: pairs.map(p => `${p.target.id}<${p.card.id}`), unused: unused.map(c => c.id) };
};

it('tasatilanteessa pienin pöydän kortti kaatuu ensin', () => {
  expect(pari([k(9, '♥'), k(6, '♥')], [k(10, '♥')])).toEqual({ pairs: ['6♥<10♥'], unused: [] });
});

it('kaataa mahdollisimman monta, vaikka pienin ensin -järjestys houkuttelisi väärin', () => {
  // Jos 10♥ kaataisi 6♥:n, 9♥ jäisi kaatamatta. Oikea paritus kaataa molemmat.
  expect(pari([k(6, '♥'), k(9, '♥')], [k(10, '♥'), k(8, '♥')]))
    .toEqual({ pairs: ['6♥<8♥', '9♥<10♥'], unused: [] });
});

it('valtti säästyy kun pienempi riittää', () => {
  expect(pari([k(6, '♥')], [k(2, '♣'), k(7, '♥')])).toEqual({ pairs: ['6♥<7♥'], unused: ['2♣'] });
});

it('pariton valittu kortti jää käteen', () => {
  expect(pari([k(6, '♥')], [k(7, '♥'), k(8, '♥')])).toEqual({ pairs: ['6♥<7♥'], unused: ['8♥'] });
});

it('valtti kaataa toisen maan kortin kun samaa maata ei ole', () => {
  expect(pari([k(9, '♥'), k(5, '♦')], [k(10, '♥'), k(3, '♣')]))
    .toEqual({ pairs: ['5♦<3♣', '9♥<10♥'], unused: [] });
});

it('kaatamaton kortti ei saa paria', () => {
  expect(pari([k(12, '♥')], [k(7, '♥')])).toEqual({ pairs: [], unused: ['7♥'] });
});
