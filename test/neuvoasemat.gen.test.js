// Neuvoasemat: arpoo siemennettyja asemia ja kirjoittaa kunkin pelin Mestarin neuvon
// tekstin lapikayntia varten (docs/NEUVOASEMAT.md). Ei testaa mitaan, vaan tuottaa
// aineiston jota Tommi lukee: sanooko neuvo saannon jolla kortti valittiin (sääntötaso,
// docs/MESTARIN_NEUVO.md 11.9.2026). Ajetaan vain pyydettaessa, kuten Botbench:
//   NEUVOASEMAT=1 npx vitest run test/neuvoasemat.gen.test.js
// Siemen on vakio, joten sama koodi tuottaa saman tiedoston; muuttunut tiedosto kertoo
// muuttuneesta valinnasta tai tekstista.
import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SUITS, RANKS, VAL } from '../src/shared/helpers.js';
import { fi } from '../src/locales/fi.js';
import { getAdvice as seiskaAdvice } from '../src/games/Seiska.jsx';
import { getAdvice as moskaAdvice } from '../src/games/Moska.jsx';
import { getAdvice as kasinoAdvice } from '../src/games/Kasino.jsx';
import { getAdvice as rsAdvice, runHeadless, isPlayable } from '../src/games/ristiseiskaEngine.js';

const ON = process.env.NEUVOASEMAT === '1';
const PER_TYPE = 4;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function deckWith(r) {
  const d = SUITS.flatMap(s => RANKS.map(rk => ({ s, r: rk, v: VAL[rk], id: `${rk}${s}` })));
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
const lbl = c => c ? `${c.r}${c.s}` : '–';
const lblAll = cs => cs.map(lbl).join(' ');
const sortHand = h => [...h].sort((a, b) => (SUITS.indexOf(a.s) - SUITS.indexOf(b.s)) || (a.v - b.v));
const pick = (r, n) => Math.floor(r() * n);

// Kerää enintään PER_TYPE asemaa per neuvotyyppi.
function collect(gen, n, render) {
  const byType = {};
  for (let i = 0; i < n; i++) {
    const res = gen(i);
    if (!res || !res.type) continue;
    (byType[res.type] ||= []);
    if (byType[res.type].length < PER_TYPE) byType[res.type].push(render(res, i));
  }
  return byType;
}
function section(title, byType) {
  const out = [`## ${title}`, ''];
  for (const [type, items] of Object.entries(byType).sort()) {
    out.push(`### \`${type}\` (${items.length})`, '');
    items.forEach((s, i) => out.push(`**${i + 1}.** ${s}`, ''));
  }
  return out.join('\n');
}

// ── Seiska ─────────────────────────────────────────────────────
function seiskaGen(seed) {
  const r = rng(seed);
  const deck = deckWith(r);
  const handN = 2 + pick(r, 6);
  const hand = sortHand(deck.splice(0, handN));
  let top = deck.shift();
  let reqSuit = null;
  if (top.r === 'A') top = deck.shift();
  if (top.r === '7') reqSuit = SUITS[pick(r, 4)];
  const seenN = pick(r, 16);
  const seen = deck.splice(0, seenN);
  const opp = [3 + pick(r, 5), 1 + pick(r, 6)];
  const g = {
    activePlayer: 0, aceBonus: null, finished: [], drawsThisTurn: 0, reqSuit,
    discardTop: top, discardPile: [...seen, top],
    players: [{ hand, isHuman: true, name: 'Hero' }, { hand: deck.splice(0, opp[0]) }, { hand: deck.splice(0, opp[1]) }],
  };
  const a = seiskaAdvice(g);
  return a && { ...a, g, seen, opp };
}
// Kohdennetut asemat harvinaisiin haaroihin: kolmen kortin käsi jossa on pari ja yksi käypä
// pariton kortti (playLeaveGroup), sekä ässän bonusvuoro (aceBonusPlay / aceBonusSkip).
function seiskaGenTargeted(seed) {
  const r = rng(5000 + seed);
  const deck = deckWith(r);
  const top = deck.find(c => c.r !== '7' && c.r !== 'A');
  deck.splice(deck.indexOf(top), 1);
  const seen = deck.splice(0, pick(r, 10));
  const opp = [3 + pick(r, 5), 1 + pick(r, 6)];
  const players = [{ hand: [], isHuman: true, name: 'Hero' }, { hand: deck.splice(0, opp[0]) }, { hand: deck.splice(0, opp[1]) }];
  if (seed % 2 === 0) {
    const pairRank = RANKS.filter(x => x !== '7' && x !== 'A' && x !== top.r)[pick(r, 11)];
    const pair = deck.filter(c => c.r === pairRank && c.s !== top.s).slice(0, 2);
    const single = deck.find(c => c.s === top.s && c.r !== '7' && c.r !== 'A' && c.r !== pairRank);
    if (pair.length < 2 || !single) return null;
    players[0].hand = sortHand([...pair, single]);
    const g = { activePlayer: 0, aceBonus: null, finished: [], drawsThisTurn: 0, reqSuit: null, discardTop: top, discardPile: [...seen, top], players };
    const a = seiskaAdvice(g);
    return a && { ...a, g, seen, opp };
  }
  const ace = deck.find(c => c.r === 'A');
  deck.splice(deck.indexOf(ace), 1);
  players[0].hand = sortHand(deck.splice(0, 2 + pick(r, 5)));
  const g = { activePlayer: 0, aceBonus: ace.s, finished: [], drawsThisTurn: 0, reqSuit: null, discardTop: ace, discardPile: [...seen, top, ace], players };
  const a = seiskaAdvice(g);
  return a && { ...a, g, seen, opp, bonus: ace.s };
}
function seiskaRender(a) {
  const { g, seen, opp } = a;
  const params = { cards: a.cards ? a.cards.map(lbl).join(', ') : undefined, card: a.cards?.[0] ? lbl(a.cards[0]) : undefined, n: a.cards?.length, suit: a.suit };
  const fn = fi.games.seiska.advice[a.type];
  const text = typeof fn === 'function' ? fn(params) : fn;
  return `Käsi: ${lblAll(g.players[0].hand)} · Päällimmäinen: ${lbl(g.discardTop)}${g.reqSuit ? ` (vaadittu maa ${g.reqSuit})` : ''}${a.bonus ? ` · Ässän bonusvuoro, bonusmaa ${a.bonus}` : ''} · Nähty kasassa: ${seen.length ? lblAll(seen) : 'ei mitään'} · Vastustajilla ${opp.join(' ja ')} korttia`
    + `\n   Neuvo: ${text}`;
}

// ── Ristiseiska ────────────────────────────────────────────────
function ristiseiskaCollect() {
  const byType = {};
  const seen = new Set();
  for (let game = 0; game < 12; game++) {
    runHeadless({ nP: 4, aiLevel: 'hard', onStep: g => {
      if (g.phase !== 'play') return;
      const heroTurn = g.activePlayer === 0 || (g.givingCardTo !== null && g.givingPlayerIdx === 0);
      if (!heroTurn) return;
      const a = rsAdvice(g);
      if (!a) return;
      const hand = sortHand(g.players[0].hand);
      const key = a.type + lblAll(hand);
      if (seen.has(key)) return;
      seen.add(key);
      (byType[a.type] ||= []);
      if (byType[a.type].length >= PER_TYPE) return;
      const playable = hand.filter(c => isPlayable(c, g.rows));
      const rows = SUITS.map(s => { const row = g.rows[s]; return row.active ? `${s} ${row.low}–${row.high}` : `${s} kiinni`; }).join(', ');
      const text = fi.games.ristiseiska.advice[a.type];
      const txt = typeof text === 'function' ? text({ card: lbl(a.card) }) : text;
      const extra = a.type === 'give' ? ` · Antaa pantin pelaajalle ${g.players[g.givingCardTo]?.name}` : g.bonusTurn === 0 ? ' · Bonusvuoro' : '';
      byType[a.type].push(`Käsi: ${lblAll(hand)} · Tornit: ${rows} · Pelattavissa: ${playable.length ? lblAll(playable) : 'ei mitään'}${extra}\n   Neuvo: ${txt}`);
    } });
  }
  return byType;
}

// ── Moska ──────────────────────────────────────────────────────
function moskaState(r, phase) {
  const deck = deckWith(r);
  const trumpCard = deck.pop();
  const ts = trumpCard.s;
  const hero = sortHand(deck.splice(0, 4 + pick(r, 3)));
  const p1 = deck.splice(0, 3 + pick(r, 4));
  const p2 = deck.splice(0, 3 + pick(r, 4));
  const players = [{ id: 0, name: 'Hero', isHuman: true, hand: hero, rank: null }, { id: 1, name: 'Loki', hand: p1, rank: null }, { id: 2, name: 'Tyche', hand: p2, rank: null }];
  let table;
  if (phase === 'add') {
    const n = 1 + pick(r, 3);
    table = Array.from({ length: n }, () => ({ atk: deck.shift(), def: r() < 0.5 ? deck.shift() : null, atkBy: 2 }));
    return { players, deck, trumpCard, ts, table, primaryAtk: 2, defender: 1, attackers: [2], phase: 'add', rankings: [], passChain: [], addQueue: [0] };
  }
  // Puolustus: pöydässä 1–2 samanarvoista kaatamatonta korttia
  const atk1 = deck.shift();
  const same = deck.find(c => c.r === atk1.r);
  table = [{ atk: atk1, def: null, atkBy: 1 }];
  if (same && r() < 0.5) { deck.splice(deck.indexOf(same), 1); table.push({ atk: same, def: null, atkBy: 1 }); }
  return { players, deck, trumpCard, ts, table, primaryAtk: 1, defender: 0, attackers: [1], phase: 'defend', rankings: [], passChain: [], addQueue: [] };
}
function moskaRender(a) {
  const g = a.g;
  const card = a.card || a.cards?.[0];
  const params = { cards: a.cards ? a.cards.map(lbl).join(', ') : undefined, card: card ? lbl(card) : undefined, target: a.target ? lbl(a.target) : undefined };
  const fn = fi.games.moska.advice[a.type];
  const text = typeof fn === 'function' ? fn(params) : fn;
  const table = g.table.map(t => t.def ? `${lbl(t.atk)}→${lbl(t.def)}` : lbl(t.atk)).join(', ');
  const who = g.phase === 'add' ? `Hero lyö sivusta, puolustajalla ${g.players[g.defender].hand.length} korttia` : 'Hero puolustaa';
  return `${who} · Valtti: ${g.ts} · Pöytä: ${table} · Käsi: ${lblAll(g.players[0].hand)}\n   Neuvo: ${text}`;
}

// ── Kasino ─────────────────────────────────────────────────────
function kasinoGen(seed) {
  const r = rng(seed);
  const deck = deckWith(r);
  const table = deck.splice(0, 2 + pick(r, 4));
  const hero = sortHand(deck.splice(0, 3 + pick(r, 2)));
  const opp = deck.splice(0, 4);
  const cap0 = deck.splice(0, pick(r, 8)), cap1 = deck.splice(0, pick(r, 8));
  const g = {
    players: [{ id: 0, name: 'Hero', isHuman: true, hand: hero, captured: cap0, tikkiCount: 0, score: 0 }, { id: 1, name: 'Loki', hand: opp, captured: cap1, tikkiCount: 0, score: 0 }],
    deck, table, builds: [], lastCapture: null, round: 1, phase: 'idle', cur: 0,
  };
  const a = kasinoAdvice(g, 0, 13);
  return a && { ...a, g };
}
function kasinoRender(a) {
  const g = a.g;
  const targets = a.tableCards && a.tableCards.length ? a.tableCards.map(lbl).join('+') : undefined;
  const fn = fi.games.kasino.advice[a.type];
  const text = typeof fn === 'function' ? fn({ card: lbl(a.handCard), targets, value: a.value }) : fn;
  return `Pöytä: ${lblAll(g.table)} · Käsi: ${lblAll(g.players[0].hand)} · Kaapattuja: Hero ${g.players[0].captured.length}, Loki ${g.players[1].captured.length}\n   Neuvo: ${text}`;
}

describe('neuvoasemat', () => {
  it.skipIf(!ON)('kirjoittaa docs/NEUVOASEMAT.md', () => {
    const seiska = collect(seiskaGen, 400, seiskaRender);
    for (const [type, items] of Object.entries(collect(seiskaGenTargeted, 60, seiskaRender))) {
      if (!seiska[type]) seiska[type] = items;
    }
    const rs = ristiseiskaCollect();
    const moskaAdd = collect(i => { const g = moskaState(rng(1000 + i), 'add'); const a = moskaAdvice(g, new Set()); return a && { ...a, g }; }, 200, moskaRender);
    const moskaDef = collect(i => { const g = moskaState(rng(2000 + i), 'defend'); const a = moskaAdvice(g, new Set()); return a && { ...a, g }; }, 200, moskaRender);
    const kasino = collect(kasinoGen, 300, kasinoRender);
    const md = [
      '# Neuvoasemat: Mestarin neuvo arvotuissa asemissa',
      '',
      'Generoitu `test/neuvoasemat.gen.test.js`:llä (siemen vakio, `NEUVOASEMAT=1`). Jokainen asema on',
      'arvottu eikä pelattu, joten se voi olla pelissä epätodennäköinen; neuvo on silti se jonka',
      '`getAdvice` antaisi. Tarkoitus on lukea sanooko teksti säännön jolla kortti valittiin',
      '(`docs/MESTARIN_NEUVO.md` › Sääntötaso). Enintään neljä asemaa per neuvotyyppi.',
      '',
      section('Seiska', seiska),
      section('Ristiseiska (pelatut asemat, Hero paikalla 0)', rs),
      section('Moska: sivustalyönti', moskaAdd),
      section('Moska: puolustus', moskaDef),
      section('Kasino (kaksi pelaajaa, ei rakennelmia)', kasino),
      '',
    ].join('\n');
    writeFileSync(resolve(process.cwd(), 'docs/NEUVOASEMAT.md'), md);
  });
});
