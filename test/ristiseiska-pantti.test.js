// Ristiseiskan panttisääntö molemmissa asennoissa, moottorista ilman Reactia.
//
// Sääntö on `RISTISEISKA.md` › Pantti. Passaava saa kortin edelliseltä pelaajalta
// jolla on kortteja, ensimmäisellä kierroksella panttia ei anneta, ja valintatapa on
// aloitusnäytön sääntövalinta. Vakiona antaja valitsee kortin itse, jolloin ihmiseltä
// kysytään; satunnaisasennossa kortti arvotaan myös ihmiseltä.
//
// Testi on olemassa siksi, että satunnaisasento jäi kaikkien porttien ulkopuolelle
// (kompositioauditointi, kysymys 4:n koe 4.9.2026). Saumaparitesti ajaa vakiosäännöllä,
// koska arvottu pantti kuluttaa satunnaislukuja eivätkä saumojen lukujonot ole samat.

import { describe, it, expect } from 'vitest';
import { initGame, applyMove } from '../src/games/ristiseiskaEngine.js';
import { strSeed, mulberry32 } from './prng.js';

const HARD = () => 'hard';

// Aja askeljono loppuun ja palauta viimeinen tila sekä tapahtumat.
function run(g, playerIdx, move) {
  const events = [];
  let last = g;
  for (const s of applyMove(g, playerIdx, move, HARD)) {
    if (s.g) last = s.g;
    if (s.ev) events.push(s.ev);
  }
  return { g: last, events };
}

const handSizes = g => g.players.map(p => p.hand.length);
const allIds = g => g.players.flatMap(p => p.hand.map(c => c.id)).sort();

/** Peli jossa pöytä on tyhjä, ensimmäinen kierros on ohi ja vuoro on botilla 1. */
function pelitilaPassaukseen(rules) {
  const orig = Math.random;
  Math.random = mulberry32(strSeed('pantti'));
  try {
    const g = initGame(4, null, false, rules);
    // Ihminen on istuin 0, joten antajaksi tulee prevWithCards(1) eli 0.
    return { ...g, activePlayer: 1, turnCount: 4, firstRoundDone: true };
  } finally {
    Math.random = orig;
  }
}

describe('Ristiseiskan pantti', () => {
  it('vakio: ihminen antajana pysäyttää pelin kortin valintaan', () => {
    const g0 = pelitilaPassaukseen({ randomPantti: false });
    const { g, events } = run(g0, 1, { t: 'pass' });

    expect(events.map(e => e.t)).toEqual(['passGiveMe']);
    expect(g.givingCardTo).toBe(1);
    expect(g.givingPlayerIdx).toBe(0);
    // Kädet eivät muutu ennen kuin ihminen on valinnut.
    expect(handSizes(g)).toEqual(handSizes(g0));
    // Vuoro ei etene, koska valintaa odotetaan.
    expect(g.activePlayer).toBe(1);
  });

  it('satunnainen: kortti arvotaan myös ihmiseltä eikä valintaa kysytä', () => {
    const g0 = pelitilaPassaukseen({ randomPantti: true });
    const orig = Math.random;
    Math.random = mulberry32(strSeed('arpa'));
    let out;
    try {
      out = run(g0, 1, { t: 'pass' });
    } finally {
      Math.random = orig;
    }
    const { g, events } = out;

    const give = events.find(e => e.t === 'passGive');
    expect(give, 'panttia ei annettu').toBeTruthy();
    expect(give.random).toBe(true);
    expect(give.giverIdx).toBe(0);
    expect(give.playerIdx).toBe(1);
    expect(g.givingCardTo).toBe(null);

    // Antajan käsi pienenee yhdellä ja passaajan kasvaa yhdellä, muut ennallaan.
    const ennen = handSizes(g0), jalkeen = handSizes(g);
    expect(jalkeen[0]).toBe(ennen[0] - 1);
    expect(jalkeen[1]).toBe(ennen[1] + 1);
    expect(jalkeen[2]).toBe(ennen[2]);
    expect(jalkeen[3]).toBe(ennen[3]);

    // Juuri se kortti siirtyi, eikä yksikään kortti katonnut.
    expect(g.players[0].hand.some(c => c.id === give.card.id)).toBe(false);
    expect(g.players[1].hand.some(c => c.id === give.card.id)).toBe(true);
    expect(allIds(g)).toEqual(allIds(g0));

    // Vuoro etenee passaajasta eteenpäin.
    expect(g.activePlayer).toBe(2);
  });

  it('ensimmäisellä kierroksella panttia ei anneta kummassakaan asennossa', () => {
    for (const rules of [{ randomPantti: false }, { randomPantti: true }]) {
      const g0 = { ...pelitilaPassaukseen(rules), turnCount: 1, firstRoundDone: false };
      const { g, events } = run(g0, 1, { t: 'pass' });
      expect(events[0].t, `rules=${JSON.stringify(rules)}`).toBe('passFirst');
      expect(events.some(e => e.t === 'passGive' || e.t === 'passGiveMe')).toBe(false);
      expect(handSizes(g)).toEqual(handSizes(g0));
      expect(g.activePlayer).toBe(2);
    }
  });
});
