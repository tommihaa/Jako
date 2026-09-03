// ── Ristiseiskan sääntömoottori ─────────────────────────────────
//
// Puhdas sauma (kompositioauditointi, kysymys 4 ja päätös 4 3.9.2026). Tässä
// tiedostossa ei ole Reactia, ajastimia, ääniä eikä i18n:ää. Säännöt ovat yhdessä
// paikassa. Niitä ajaa kaksi eri kuljettajaa:
//
//   Ristiseiska.jsx  komponenttisauma  renderöi, ajastaa, lokittaa, soittaa äänet
//   runHeadless      puhdas sauma      pelaa pelin läpi silmukassa millisekunneissa
//
// Kumpikin kuljettaja kutsuu samoja funktioita, joten sääntöjä ei ole kahta kopiota.
// Se että ne silti pysyvät samaa mieltä, on testin `ristiseiska-saumapari.test.jsx`
// asia: yhteinen moottori ei takaa yhteistä lopputulosta, koska kuljettajat voivat
// kutsua sitä eri järjestyksessä.
//
// Askel (Step) on siirron yksi näkyvä vaihe: `{ g, ev }`. `g` on uusi pelitila tai
// null jos tila ei muuttunut. `ev` on tapahtuma jonka kuljettaja kääntää omalle
// kielelleen (lokirivi, ääni, tulosruutu). Askeljono on olemassa siksi, että yksi
// siirto tuottaa useamman lokirivin ja jokainen niistä kuvaa eri tilaa; H4:n
// invariantti "tila ennen lokiriviä" pysyy näin rakenteessa eikä kutsujärjestyksessä.

import { SUITS, aiShouldFumble, shuffledAINames, newDeck } from '../shared/helpers.js';

// ── Säännöt ─────────────────────────────────────────────────────
// Järjestys per maa: 7 → 6 → 8 → ala-pino (5,4,3,2,A) + ylä-pino (9,T,J,Q,K)
// 5 vaatii 8 ensin, 8 vaatii 6 ensin (kiusanteko)
// A kaataa ala-pinon (bonusvuoro), K kaataa ylä-pinon (bonusvuoro)

export const RANK_VAL = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

export function rv(card) { return RANK_VAL[card.r]; }

export function isPlayable(card, rows) {
  const row = rows[card.s];
  const v   = rv(card);
  if (!row.active) {
    if (v !== 7) return false;
    // ♣7 on pakko pelata ensin — muut 7:t vasta sen jälkeen
    if (!rows['♣'].active && card.s !== '♣') return false;
    return true;
  }
  if (v === row.low - 1) {
    if (v === 5) return row.high >= 8;  // 5 vaatii 8 ensin
    return true;
  }
  if (v === row.high + 1) {
    if (v === 8) return row.low <= 6;   // 8 vaatii 6 ensin
    return true;
  }
  return false;
}

export function hasAnyPlay(hand, rows) {
  return hand.some(c => isPlayable(c, rows));
}

function initRows() {
  const rows = {};
  SUITS.forEach(s => { rows[s] = { active: false, low: null, high: null }; });
  return rows;
}

// Sääntövariaatio (aloitusnäytöltä): randomPantti=false (vakio) → antaja valitsee panttikortin;
// true → kortti arvotaan antajan kädestä (koskee myös ihmistä). Antaja säilyy samana (edeltävä pelaaja).
export const DEFAULT_RULES = { randomPantti: false };

export function initGame(nP, pool, allBots = false, rules = DEFAULT_RULES) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  const per   = Math.floor(52 / nP);
  const extra = 52 % nP; // ylijäävät kortit jaetaan yksi kerrallaan, ettei mikään kortti jää jakamatta
  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0,
    hand: deck.splice(0, per + (i < extra ? 1 : 0)),
  }));

  let starter = 0;
  for (let i = 0; i < players.length; i++) {
    if (players[i].hand.some(c => c.r === '7' && c.s === '♣')) { starter = i; break; }
  }

  return {
    players,
    rows: initRows(),
    activePlayer: starter,
    finished: [],
    bonusTurn: null,
    givingCardTo: null,
    givingPlayerIdx: null,
    rules,
    phase: 'play',
    turnCount: 0,
    firstRoundDone: false,
  };
}

export function nextActive(players, from, finished) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (!finished.includes(idx)) return idx;
  }
  return -1;
}

function prevWithCards(players, from, finished) {
  const n = players.length;
  for (let i = 1; i < n; i++) {
    const idx = (from - i + n) % n;
    if (!finished.includes(idx) && players[idx].hand.length > 1) return idx;
  }
  return -1;
}

// Montako käsikorttia on samaa maata kuin annettu kortti
export function suitCount(hand, suit) { return hand.filter(c => c.s === suit).length; }

function distanceToPlay(card, rows) {
  const row = rows[card.s];
  if (!row.active) return 99;
  const v = rv(card);
  if (v < row.low) return row.low - v;
  if (v > row.high) return v - row.high;
  return 0;
}

// ── Valinta ─────────────────────────────────────────────────────

// AI: seiskat ensin (priorisoi maa jossa on eniten omia kortteja),
// porttikortteja (6 ja 8) pihdetään strategisesti, muuten pienin arvo.
export function aiBestCard(hand, rows, level = 'normal') {
  const valid = hand.filter(c => isPlayable(c, rows));
  if (!valid.length) return null;

  const sevens = valid.filter(c => c.r === '7');
  if (sevens.length) {
    return sevens.sort((a, b) => suitCount(hand, b.s) - suitCount(hand, a.s))[0];
  }

  const isHard = level === 'hard';

  // Normal/beginner: pidättele porttia aina kun samaa maata on useampi → pakotettu passaus
  // Hard: pidättelyn ehto on maakohtainen, ks. RISTISEISKA.md kohta 2.
  const nonGates = valid.filter(c => {
    if (c.r !== '6' && c.r !== '8') return true;
    const cnt = suitCount(hand, c.s);
    if (!isHard) {
      // Normal: pidättele jos samaa maata on useampi (cnt > 1), muuten pelaa
      return cnt <= 1;
    }
    // Mestari (hard): lukittu pöytä pakottaa passaamaan, ja passatessa annetaan kortti
    // panttina. Pidättely on siis keino päästä eroon yhdestä kortista jota ei muuten saisi
    // pelattua, joten se kannattaa kun samassa maassa on ENINTÄÄN yksi kaukainen kortti
    // (distanceToPlay ≥ 3, porttia itseään ei lasketa). Kaksi tai useampi kaukaista samassa
    // maassa → yksi pantti ei riitä niistä eroon, joten portti pelataan auki.
    // Nolla kaukaista → pidättele silti: lukko on silloin puhdas blokkaus ilman omaa hintaa.
    // Muutettu 18.8.2026, aiempi ehto laski kaukaisia koko kädestä maasta riippumatta.
    const farSameSuit = hand.filter(
      other => other.id !== c.id && other.s === c.s && distanceToPlay(other, rows) >= 3
    ).length;
    return farSameSuit > 1; // pelaa portti vasta kun pantti ei riitä
  });

  const pool = nonGates.length ? nonGates : valid;
  return [...pool].sort((a, b) => rv(a) - rv(b))[0];
}

// Korttipanttiin annetaan huonoin kortti: kauimpana pelattavuudesta,
// toissijainen kriteeri: maa jossa on vähiten omia kortteja (yksinäinen kortti)
export function aiWorstCard(hand, rows) {
  return [...hand].sort((a, b) => {
    const da = distanceToPlay(a, rows), db = distanceToPlay(b, rows);
    if (db !== da) return db - da;
    return suitCount(hand, a.s) - suitCount(hand, b.s);
  })[0];
}

// Botin siirto annetusta tilasta. Ainoa satunnaisuuden lähde on `aiShouldFumble`,
// joka on Mestarilla aina epätosi; muut tasot arpovat aloittelijan virheen.
// Bonusvuorolla virhettä ei arvota, koska siinä ei ole valintaa maiden välillä.
/** @returns {{t:'play', card: any} | {t:'pass'} | {t:'endBonus'}} */
export function chooseMove(g, playerIdx, level = 'normal') {
  const p    = g.players[playerIdx];
  const rows = g.rows;

  if (g.bonusTurn !== null && g.bonusTurn === playerIdx) {
    const card = aiBestCard(p.hand, rows, level);
    return card ? { t: 'play', card } : { t: 'endBonus' };
  }

  let card = aiBestCard(p.hand, rows, level);
  if (card) {
    if (card.r === '7') {
      // Aloittelija-virhe: avaa seiskan väärään maahan — valitsee huonoimman maan
      if (aiShouldFumble(level)) {
        const sevens = p.hand.filter(c => c.r === '7' && isPlayable(c, rows));
        if (sevens.length > 1) {
          card = sevens.sort((a, b) => suitCount(p.hand, a.s) - suitCount(p.hand, b.s))[0];
        }
      }
    } else if (card.r !== '6' && card.r !== '8') {
      // Aloittelija-virhe: pelaa porttikortin jota älykäs AI pidättelisi
      if (aiShouldFumble(level)) {
        const allValid = p.hand.filter(c => isPlayable(c, rows));
        const heldGate = allValid.find(c => (c.r === '6' || c.r === '8') && suitCount(p.hand, c.s) > 1);
        if (heldGate) card = heldGate;
      }
    }
  }

  return card ? { t: 'play', card } : { t: 'pass' };
}

// ── Siirtymät ───────────────────────────────────────────────────

/** @typedef {{g: any, ev: any}} Step */

// Vuoron vaihto. Emittoi `turnOf` botille ja `yourTurn` ihmiselle, koska kumpikin
// on eri lokirivi; `canPlay` lasketaan tässä eikä kuljettajassa.
/** @returns {Step[]} */
function advanceTurn(g, fromIdx) {
  const nextIdx = nextActive(g.players, fromIdx, g.finished);
  if (nextIdx === -1) return [];
  const turnCount = g.turnCount + 1;
  const firstRoundDone = g.firstRoundDone || turnCount >= g.players.length;
  const g2 = { ...g, activePlayer: nextIdx, turnCount, firstRoundDone };
  if (!g.players[nextIdx].isHuman) {
    return [{ g: g2, ev: { t: 'turnOf', playerIdx: nextIdx } }];
  }
  return [{ g: g2, ev: { t: 'yourTurn', playerIdx: nextIdx, canPlay: hasAnyPlay(g.players[nextIdx].hand, g2.rows) } }];
}

/** @returns {Step[]} */
function applyPlay(g, playerIdx, card) {
  const steps = [];
  const p = g.players[playerIdx];
  const v = rv(card);

  const rows = { ...g.rows };
  const row  = rows[card.s];
  if (!row.active) {
    rows[card.s] = { active: true, low: 7, high: 7 };
  } else if (v === row.low - 1) {
    rows[card.s] = { ...row, low: v };
  } else {
    rows[card.s] = { ...row, high: v };
  }

  const players = g.players.map((pl, i) => i !== playerIdx ? pl
    : { ...pl, hand: pl.hand.filter(c => c.id !== card.id) });

  let finished = [...g.finished];
  const wonNow = players[playerIdx].hand.length === 0 && !finished.includes(playerIdx);
  if (wonNow) finished = [...finished, playerIdx];

  // Tila ennen lokiriviä (kompositioauditointi H4): katselutilan frame kuvaa kättä
  // lyönnin jälkeen. Voittorivi kuvaa samaa tilaa, joten se on pelkkä lokirivi.
  steps.push({ g: { ...g, players, rows, finished }, ev: { t: 'played', playerIdx, card, v } });
  if (wonNow) steps.push({ g: null, ev: { t: 'won', playerIdx, rank: finished.length } });

  const remaining = players.filter((_, i) => !finished.includes(i));
  if (remaining.length <= 1) {
    remaining.forEach(pl => { if (!finished.includes(pl.id)) finished.push(pl.id); });
    const ranking = finished.map((idx, pos) => ({
      name: players[idx].name, place: pos + 1, isHuman: players[idx].isHuman,
    }));
    steps.push({ g: { ...g, players, rows, finished, phase: 'gameover' }, ev: { t: 'gameover', ranking } });
    return steps;
  }

  // A kaataa ala-pinon, K kaataa ylä-pinon → jatkaa (ei bonusta jos kortit loppuivat)
  const gaveBonus = (v === 1 || v === 13) && !finished.includes(playerIdx);
  const g2 = { ...g, players, rows, finished, bonusTurn: gaveBonus ? playerIdx : null };
  if (gaveBonus) {
    steps.push({ g: g2, ev: { t: 'bonus', playerIdx, card, v } });
    return steps;
  }

  return steps.concat(advanceTurn(g2, playerIdx));
}

/** @returns {Step[]} */
function applyPass(g, playerIdx, levelOf) {
  if (!g.firstRoundDone) {
    return [{ g: null, ev: { t: 'passFirst', playerIdx } }].concat(advanceTurn({ ...g }, playerIdx));
  }

  const giverIdx = prevWithCards(g.players, playerIdx, g.finished);
  const randomPantti = g.rules?.randomPantti;

  // Vakiosääntö: ihminen antajana valitsee itse panttikortin (pysähdytään valintaan).
  // Satunnais-variaatiossa kortti arvotaan myös ihmiseltä → valintavaihe ohitetaan.
  if (!randomPantti && giverIdx !== -1 && g.players[giverIdx].isHuman) {
    return [{ g: { ...g, givingCardTo: playerIdx, givingPlayerIdx: giverIdx }, ev: { t: 'passGiveMe', playerIdx } }];
  }

  if (giverIdx === -1) {
    return [{ g: null, ev: { t: 'passOnly', playerIdx } }].concat(advanceTurn({ ...g }, playerIdx));
  }

  const giver = g.players[giverIdx];
  const randomCard = giver.hand[Math.floor(Math.random() * giver.hand.length)];
  // Satunnais-variaatio: aina arvottu kortti (kuka tahansa antaja).
  // Vakio: strategisesti huonoin — AI:n aloittelija-virhe antaa silti satunnaisen.
  const toGive = randomPantti
    ? randomCard
    : (!giver.isHuman && aiShouldFumble(levelOf(giverIdx))) ? randomCard
    : aiWorstCard(giver.hand, g.rows);
  const players = g.players.map((pl, i) => {
    if (i === giverIdx)  return { ...pl, hand: pl.hand.filter(c => c.id !== toGive.id) };
    if (i === playerIdx) return { ...pl, hand: [...pl.hand, toGive] };
    return pl;
  });

  // Kädet vaihtuivat, joten tila kirjoitetaan ennen lokiriviä (H4).
  const step = { g: { ...g, players }, ev: { t: 'passGive', playerIdx, giverIdx, card: toGive, random: !!randomPantti } };
  return [step].concat(advanceTurn({ ...g, players }, playerIdx));
}

// Yksi siirto tilasta seuraavaan. `levelOf(idx)` kertoo istuimen AI-tason. Sitä
// tarvitaan vain pantin antajan aloittelija-virheeseen.
/** @returns {Step[]} */
export function applyMove(g, playerIdx, move, levelOf = () => 'normal') {
  if (move.t === 'play')     return applyPlay({ ...g, bonusTurn: null }, playerIdx, move.card);
  if (move.t === 'pass')     return applyPass(g, playerIdx, levelOf);
  if (move.t === 'endBonus') return advanceTurn({ ...g, bonusTurn: null }, playerIdx);
  return [];
}

// Ihminen antaa panttikortin valitsemastaan kädestä. Erillinen siirtymä, koska
// vuoro palaa passanneelle eikä antajalle.
/** @returns {Step[]} */
export function applyGiveCard(g, card) {
  const receiverIdx = g.givingCardTo;
  const players = g.players.map((pl, i) => {
    if (i === 0)           return { ...pl, hand: pl.hand.filter(c => c.id !== card.id) };
    if (i === receiverIdx) return { ...pl, hand: [...pl.hand, card] };
    return pl;
  });
  const g2 = { ...g, players, givingCardTo: null, givingPlayerIdx: null };
  return [{ g: g2, ev: { t: 'humanGives', card, receiverIdx } }].concat(advanceTurn(g2, receiverIdx));
}

// Mestarin neuvo Herolle: sama päätöslogiikka kuin hard-botilla, vain julkista tietoa.
// Palauttaa { type, card? } — type vastaa games.ristiseiska.advice.* -avainta.
export function getAdvice(g) {
  const hero = g.players[0];
  if (g.givingCardTo !== null && g.givingPlayerIdx === 0) {
    const card = aiWorstCard(hero.hand, g.rows);
    return card ? { type: 'give', card } : null;
  }
  const card = aiBestCard(hero.hand, g.rows, 'hard');
  if (!card) return g.bonusTurn === 0 ? { type: 'bonusEnd' } : { type: 'pass' };
  return { type: card.r === '7' ? 'playSeven' : 'play', card };
}

// ── Puhdas sauma ────────────────────────────────────────────────
//
// Pelaa yhden bottipelin läpi ilman Reactia. `levels` on istuinkohtainen taso
// (sama muoto kuin komponentin botLevels-props), `stallGuard` katkaisee pattitilanteen
// mittaustuloksena eikä poikkeuksena, samoin kuin Botbench tekee komponenttisaumassa.
//
// `onStep(g, ev)` ajetaan täsmälleen niistä askelista joista komponenttisauma
// kirjoittaa lokirivin ja lähettää katselutilan framen. Se on tämän kuljettajan
// vastine `onSnapshot`-propsille. Ristiintarkistustesti vertaa juuri näitä.
/**
 * @returns {{ranking: any[] | null, moves: Array<{playerIdx: number, move: any}>, g: any}}
 */
export function runHeadless({ nP = 4, pool = null, rules = DEFAULT_RULES, levels = null, aiLevel = 'normal', stallGuard = 5000, onStep = null } = {}) {
  const levelOf = idx => levels?.[idx] ?? aiLevel;
  let g = initGame(nP, pool, true, rules);
  const moves = [];
  let ranking = null;

  // Jaon jälkeinen tila. Komponenttisaumassa tämän kirjoittaa `startGame`n
  // aloitusrivi, joten se on kummankin kuljettajan ensimmäinen frame.
  onStep?.(g, { t: 'gameStart' });

  for (let i = 0; i < stallGuard && ranking === null; i++) {
    const idx = g.activePlayer;
    const move = chooseMove(g, idx, levelOf(idx));
    moves.push({ playerIdx: idx, move });
    for (const s of applyMove(g, idx, move, levelOf)) {
      if (s.g) g = s.g;
      // Tulosaskel ei tuota lokiriviä, joten siitä ei synny frameakaan.
      if (s.ev?.t === 'gameover') { ranking = s.ev.ranking; break; }
      onStep?.(g, s.ev);
    }
  }

  return { ranking, moves, g };
}
