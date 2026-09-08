import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR, SUIT_COLOR_DARK } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, kortin, SUITS, RANKS, VAL, newDeck, sortHand as sortHandBy, shuffledAINames, BOT_RESULT_DELAY } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import { useStickySetting } from '../shared/storage.js';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { useGameLog } from '../shared/useGameLog.js';
import { useGameState } from '../shared/useGameState.js';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import GameLog from '../shared/GameLog.jsx';
import GameStatusBar from '../shared/GameStatusBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import PoytaPanel from '../shared/PoytaPanel.jsx';


function renderLogMessage(text) {
  const parts = [];
  let lastIndex = 0;
  const cardRegex = /(\d+|[JQKA])([♠♥♦♣])/g;
  let match;

  while ((match = cardRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const rank = match[1];
    const suit = match[2];
    const color = SUIT_COLOR_DARK[suit];
    parts.push(
      <span key={`${match.index}-${rank}${suit}`} style={{ color, fontWeight: 700 }}>
        {rank}{suit}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 1 ? <>{parts}</> : text;
}

// ── Kasino-arvot ──────────────────────────────────────────────
const isRuutuKymppi  = c => c && c.r === '10' && c.s === '♦';
const isPataKakkonen = c => c && c.r === '2'  && c.s === '♠';
const handVal  = c => isPataKakkonen(c) ? 15 : isRuutuKymppi(c) ? 16 : c.r === 'A' ? 14 : c.v;
const tableVal = c => isPataKakkonen(c) ? 2  : isRuutuKymppi(c) ? 10 : c.r === 'A' ? 1  : c.v;

// Kuinka vaarallista on jättää candidate pöytään (mahdollistaa pistekorttien kaappauksen)?
function leaveDanger(candidate, table) {
  const cv = tableVal(candidate);
  let score = 0;
  for (const t of table) {
    const sum = cv + tableVal(t);
    // Vastustaja voi kaapata molemmat jos pystyy pelaamaan kortin arvolla = sum (max 14 = ässä)
    if (sum <= 14) {
      if (isPataKakkonen(t)) score += 10;
      else if (isRuutuKymppi(t)) score += 7;
      else score += 1;
    }
  }
  return score;
}

// ── AI-pistearvo: sama kaava kuin Vaihtoehdot-modaalissa ─────────────────
function aiCardScore(cards, isMokki = false) {
  let pts = 0;
  for (const c of cards) {
    if (isRuutuKymppi(c)) pts += 2;
    else if (isPataKakkonen(c)) pts += 1;
    else if (c.r === 'A') pts += 1;
  }
  if (isMokki) pts += 1;
  const spades = cards.filter(c => c.s === '♠').length;
  return pts * 10000 + spades * 100 + cards.length;
}

// Paras (eniten pisteitä) kaappaus jonka tämä käsikortti voi tehdä — pisteytys aiCardScore-kaavalla.
// Palauttaa { score, cards } tai null. Käytetään ihmispelaajan käden järjestämiseen (paras vasemmalle).
function bestCaptureForCard(hc, table, builds) {
  const v = handVal(hc);
  const buildCards = builds.filter(b => b.value === v).flatMap(b => b.cards);
  let best = null;
  const consider = (sel) => {
    const captured = [...sel, ...buildCards];
    if (captured.length === 0) return;
    const clearsAll = sel.length === table.length && builds.every(b => b.value === v);
    const score = aiCardScore([hc, ...captured], clearsAll);
    if (best === null || score > best.score) best = { score, cards: captured };
  };
  const n = table.length;
  if (n <= 16) {
    for (let mask = 0; mask < (1 << n); mask++) {
      const sel = table.filter((_, i) => (mask >> i) & 1);
      if (sel.length > 0 && !canPartition(sel, v)) continue;
      consider(sel);
    }
  } else {
    // Iso pöytä: vältä 2^n-läpikäynti — kokeile koko pöytää tai pelkkiä rakennelmia
    if (canPartition(table, v)) consider(table); else consider([]);
  }
  return best;
}

// Onko kädessä kortti joka voi kaapata jotain pöydältä (koko-suojattu, vrt. bestCaptureForCard)
function hasAnyTableCapture(hand, table) {
  const n = table.length;
  if (n === 0) return false;
  if (n > 16) return hand.some(hc => canPartition(table, handVal(hc)));
  return hand.some(hc => {
    const hv = handVal(hc);
    for (let mask = 1; mask < (1 << n); mask++) {
      const sel = table.filter((_, i) => (mask >> i) & 1);
      if (canPartition(sel, hv)) return true;
    }
    return false;
  });
}

// Onko jollain candidates-korteista + pöytäyhdistelmällä rakennelma jonka pool-käsi voi täydentää
// myöhemmin (koko-suojattu). candidates=hand ja pool=hand kysyy "onko kädessä lainkaan mahdollisuutta";
// candidates=[hc] kysyy saman yhdelle tietylle kortille (käytetään vihjeen per-kortti-listauksessa).
function hasAnyBuildOption(candidates, pool, table, buildCap) {
  const n = table.length;
  const canBuildWith = (hc, sel) => {
    const hv = handVal(hc);
    const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
    return bv <= buildCap && pool.some(c => c.id !== hc.id && handVal(c) === bv);
  };
  if (n > 16) {
    // Iso pöytä: vältä 2^n-läpikäynti — kokeile vain tyhjää ja koko pöytää (vrt. bestCaptureForCard)
    return candidates.some(hc => canBuildWith(hc, []) || canBuildWith(hc, table));
  }
  return candidates.some(hc => {
    for (let mask = 0; mask < (1 << n); mask++) {
      if (canBuildWith(hc, table.filter((_, i) => (mask >> i) & 1))) return true;
    }
    return false;
  });
}

// ── Mestari-AI (hard): tuntematon korttipankki ─────────────────────────────
// Palauttaa kaikki kortit joita em. pelaaja ei varmuudella tiedä
function getUnknownPool(g, playerIdx) {
  const known = new Set();
  const mark = cards => cards.forEach(c => known.add(`${c.r}${c.s}`));
  mark(g.players[playerIdx].hand);
  mark(g.table);
  mark(g.builds.flatMap(b => b.cards));
  g.players.forEach(p => mark(p.captured));
  return SUITS.flatMap(s => RANKS.map(r => `${r}${s}`)).filter(rs => !known.has(rs));
}

// Todennäköisyys, että vähintään yhdellä vastustajalla on kortti jolla handVal = targetHV
// (hypergeometrinen: käytetään ilman palautusta)
function pAnyOpponentHas(g, playerIdx, targetHV) {
  const pool = getUnknownPool(g, playerIdx);
  const U = pool.length;
  if (U === 0) return 0;
  // Laske kuinka monta tuntematonta korttia osuu targetHV:hen
  const m = pool.filter(rs => {
    const r = rs.slice(0, -1); // rank: 'A','2'..'K','10' (suit on viimeinen merkki)
    if (r === '2' && rs.endsWith('♠')) return targetHV === 15;  // 2♠ handVal=15
    if (r === '10' && rs.endsWith('♦')) return targetHV === 16; // 10♦ handVal=16
    if (r === 'A') return targetHV === 14;
    return VAL[r] === targetHV;
  }).length;
  if (m === 0) return 0;
  const k = g.players.filter((_, i) => i !== playerIdx).reduce((s, p) => s + p.hand.length, 0);
  if (k === 0) return 0;
  // P(ei yksikään k vastustajan kortista osu) = product((U-m-i)/(U-i))  i=0..k-1
  let pNone = 1;
  for (let i = 0; i < k && (U - i) > 0; i++) {
    pNone *= Math.max(0, U - m - i) / (U - i);
  }
  return 1 - pNone;
}

// Etsi paras pöytäkorttilisäys rakennelmakaapin yhteyteen (sama arvo kuin rakennelmalla)
function findTableBonus(table, value) {
  let best = null;
  const n = table.length;
  for (let mask = 1; mask < (1 << n); mask++) {
    const sel = table.filter((_, i) => (mask >> i) & 1);
    if (canPartition(sel, value)) {
      const score = aiCardScore(sel);
      if (!best || score > best.score) best = { cards: sel, score };
    }
  }
  return best ? best.cards : [];
}

// Todennäköisyyspainotettu varastusriski: kuinka vaarallinen tämä jättö on?
function pWeightedLeaveDanger(candidate, g, playerIdx) {
  const cardW = c => isPataKakkonen(c) ? 10 : isRuutuKymppi(c) ? 7 : c.r === 'A' ? 3 : 1;
  const cv = tableVal(candidate);
  // Suora: joku kaappaa candidaten yksin (tarvitsee käsikortin arvolla cv)
  let danger = pAnyOpponentHas(g, playerIdx, cv) * cardW(candidate);
  // Epäsuora: yhdistelmä candidaten + pöytäkortin kaappaus
  for (const t of g.table) {
    const sum = cv + tableVal(t);
    if (sum > 16) continue; // korkein kaappausarvo: ♦10 = 16, ♠2 = 15, ässä = 14
    danger += pAnyOpponentHas(g, playerIdx, sum) * cardW(t);
  }
  return danger;
}

// Paras (pistearvoltaan) pöytäkaappaus. Palauttaa { handCard, tableCards, score, isMokki }
// tai null. Moduulitasolla (jaettu runAI:n ja Heron neuvon kanssa).
function findBestCapture(p, table, builds = []) {
  let best = null;
  for (const handCard of p.hand) {
    const hv = handVal(handCard);
    const n = table.length;
    for (let mask = 1; mask < (1 << n); mask++) {
      const sel = table.filter((_, i) => (mask >> i) & 1);
      if (canPartition(sel, hv)) {
        const isMokki = sel.length === table.length && builds.length === 0;
        const score = aiCardScore([handCard, ...sel], isMokki);
        if (!best || score > best.score) best = { handCard, tableCards: sel, score, isMokki };
      }
    }
  }
  return best;
}

// Paras rakennelma (pistearvon mukaan). Palauttaa { handCard, tableCards, value, capturer, score }
// tai null. buildCap = rakennelman maksimiarvo (13 tai 16 erikoissäännöllä).
function findAIBuild(p, table, buildCap) {
  let best = null;
  for (const handCard of p.hand) {
    const hv = handVal(handCard);
    const n = table.length;
    for (let mask = 0; mask < (1 << n); mask++) {
      const sel = table.filter((_, i) => (mask >> i) & 1);
      const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
      if (bv > buildCap) continue;
      const capturer = p.hand.find(c => c.id !== handCard.id && handVal(c) === bv);
      if (!capturer) continue;
      const score = aiCardScore([handCard, ...sel, capturer]);
      if (!best || score > best.score) best = { handCard, tableCards: sel, value: bv, capturer, score };
    }
  }
  return best;
}

// Oppipojan naiivi kaappaus: maksimoi korttien MÄÄRÄ, ei pistearvoa —
// ohittaa ässät/pistekortit jos isompi kasa on tarjolla. (Kokeiltu myös
// "näkee vain parit" -versiota: se oli mitatusti VAHVEMPI kuin Kisälli,
// joten heikkous toteutetaan pisteiden, ei kombonäön, kautta.)
function findNaiveCapture(p, table) {
  let best = null;
  for (const handCard of p.hand) {
    const hv = handVal(handCard);
    const n = table.length;
    for (let mask = 1; mask < (1 << n); mask++) {
      const sel = table.filter((_, i) => (mask >> i) & 1);
      if (canPartition(sel, hv)) {
        const isMokki = sel.length === table.length;
        if (!best || sel.length > best.tableCards.length) best = { handCard, tableCards: sel, score: aiCardScore([handCard, ...sel], isMokki), isMokki };
      }
    }
  }
  return best;
}

// Jätettävä kortti tasoittain. Oppipoika ei arvioi vaaraa lainkaan, Kisälli käyttää
// heuristiikkaa ja Mestari hypergeometrista inferenssiä. Ässän suojaus on vain Mestarilla.
function pickTrail(g, playerIdx, level) {
  const p = g.players[playerIdx];
  if (level === 'beginner') {
    // Oppipoika: "pienin" kortti pöytään NUMEROARVON mukaan (A=1) ilman
    // vaara-arviota — kohtelee ässää pikkukorttina vaikka Kasinossa se on 14,
    // eikä suojaa pistekortteja (♠2 lähtee herkästi)
    return [...p.hand].sort((a, b) => a.v - b.v)[0];
  }
  if (level === 'hard') {
    // Mestari: minimoi probabilistinen varastusriski, suojele pistekortit
    const nonSpecial = p.hand.filter(c => !isPataKakkonen(c) && !isRuutuKymppi(c) && c.r !== 'A');
    const leavePool = nonSpecial.length > 0 ? nonSpecial : p.hand;
    return [...leavePool].sort((a, b) => {
      const da = pWeightedLeaveDanger(a, g, playerIdx);
      const db = pWeightedLeaveDanger(b, g, playerIdx);
      return da !== db ? da - db : tableVal(a) - tableVal(b);
    })[0];
  }
  // Kisälli: heuristinen varastusriski
  const nonSpecial = p.hand.filter(c => !isPataKakkonen(c) && !isRuutuKymppi(c));
  const leavePool = nonSpecial.length > 0 ? nonSpecial : p.hand;
  return [...leavePool].sort((a, b) => {
    const da = leaveDanger(a, g.table);
    const db = leaveDanger(b, g.table);
    return da !== db ? da - db : tableVal(a) - tableVal(b);
  })[0];
}

// Kasinon siirtovalinta puhtaana funktiona: sama prioriteettijärjestys ajaa botin ja
// Mestarin neuvon (kompositioauditointi H7, 5.9.2026). Ennen tätä `getAdvice` oli 48 rivin
// peilikuva `runAI`n hard-haarasta ja rakennuskynnys 0.5 oli kirjoitettu kahdesti.
// Prioriteetti: 1 kaappaa oma rakennelma, 2 varasta vastustajan (ei Oppipoika), 3 laske
// paras pöytäkaappaus, 4 rakenna (ei Oppipoika, Mestari vain jos varastusriski <= 0.5),
// 5 suorita kaappaus, 6 jätä kortti. Palauttaa siirto-olion tai null.
// @returns {{type: 'takeOwnBuild'|'stealBuild'|'build'|'capture'|'trail', handCard: any,
//   tableCards?: any[], build?: any, bonus?: any[], value?: number, isMokki?: boolean,
//   stealRisk?: number} | null}
export function kasinoChooseMove(g, playerIdx, buildCap, level) {
  if (!g) return null;
  const p = g.players[playerIdx];
  if (!p || !p.hand.length) return null;
  const isBeginner = level === 'beginner';

  // 1. Kaappaa oma rakennelma (kaikki tasot). Oppipoika ei näe pöytäbonusta.
  const ownBuilds = g.builds.filter(b => b.ownerIdx === playerIdx);
  for (const build of ownBuilds) {
    const capturer = p.hand.find(hc => handVal(hc) === build.value);
    if (capturer) {
      // Kiirettä ei luvata ilman laskettua riskiä: onko kenelläkään vastustajalla
      // mahdollisesti kortti jolla rakennelman voi varastaa (julkinen tieto).
      const bonus = isBeginner ? [] : findTableBonus(g.table, build.value);
      return { type: 'takeOwnBuild', handCard: capturer, build, bonus, tableCards: bonus,
        value: build.value, stealRisk: pAnyOpponentHas(g, playerIdx, build.value) };
    }
  }

  // 2. Varasta vastustajan rakennelma (Kisälli ja Mestari)
  if (!isBeginner) {
    for (const build of g.builds.filter(b => b.ownerIdx !== playerIdx)) {
      const capturer = p.hand.find(hc => handVal(hc) === build.value);
      if (capturer) {
        const bonus = findTableBonus(g.table, build.value);
        return { type: 'stealBuild', handCard: capturer, build, bonus, tableCards: bonus,
          value: build.value };
      }
    }
  }

  // 3. Laske paras pöytäkaappaus. Oppipoika kaappaa naiivisti (korttimäärä).
  const capture = isBeginner ? findNaiveCapture(p, g.table) : findBestCapture(p, g.table, g.builds);

  // 4. Harkitse rakentamista (ei Oppipoika, ei jos oma rakennelma jo pöydässä)
  if (!isBeginner && ownBuilds.length === 0) {
    const buildResult = findAIBuild(p, g.table, buildCap);
    // Kisälli rakentaa aina kun voi. Mestari rakentaa samoin, mutta inferenssi estää
    // korkean varastusriskin rakennukset. (Aiempi EV-portti "rakennus vain jos arvo
    // > 1.5 × kaappaus" esti rakentamisen lähes aina ja HÄVISI mitatusti Kisällille —
    // rakentaminen on Kasinossa vahva siirto.)
    if (buildResult && (level !== 'hard' || pAnyOpponentHas(g, playerIdx, buildResult.value) <= 0.5)) {
      return { type: 'build', handCard: buildResult.handCard,
        tableCards: buildResult.tableCards, value: buildResult.value };
    }
  }

  // 5. Suorita kaappaus
  if (capture) {
    return { type: 'capture', handCard: capture.handCard, tableCards: capture.tableCards,
      isMokki: capture.isMokki };
  }

  // 6. Jätä kortti pöytään
  return { type: 'trail', handCard: pickTrail(g, playerIdx, level) };
}

// Mestarin neuvo Herolle: sama valintafunktio kuin botilla, Mestari-tasolla ja vain
// julkisesta tiedosta. Tämä kerros kääntää siirron neuvotyypiksi, koska neuvo erottaa
// kaksi asiaa joita botti ei erota: kiireellinen oman rakennelman kaappaus turvallisesta
// ja mökki tavallisesta kaappauksesta. Palauttaa
// { type, handCard, tableCards?, buildId?, value? } — type vastaa games.kasino.advice.* -avainta.
export function getAdvice(g, playerIdx, buildCap) {
  const move = kasinoChooseMove(g, playerIdx, buildCap, 'hard');
  if (!move) return null;
  const base = { handCard: move.handCard, tableCards: move.tableCards, value: move.value, buildId: /** @type {any} */ (null) };
  switch (move.type) {
    case 'takeOwnBuild':
      return { ...base, type: move.stealRisk > 0 ? 'takeOwnBuild' : 'takeOwnBuildSafe', buildId: move.build.id };
    case 'stealBuild':
      return { ...base, type: 'stealBuild', buildId: move.build.id };
    case 'capture':
      return { ...base, type: move.isMokki ? 'captureMokki' : 'capture' };
    default:
      return { ...base, type: move.type };
  }
}

// ── Multi-capture: voidaanko valitut pöytäkortit jakaa ryhmiin,
//    joista kukin summautuu kohdearvoon?
function canPartition(cards, target) {
  if (!cards.length) return false;
  const used = new Array(cards.length).fill(false);

  function bt(currentSum, groupCount) {
    const allUsed = used.every(u => u);
    if (allUsed) return groupCount > 0 && currentSum === 0;
    for (let i = 0; i < cards.length; i++) {
      if (used[i]) continue;
      const v = tableVal(cards[i]);
      if (currentSum + v > target) continue;
      used[i] = true;
      if (currentSum + v === target) {
        if (bt(0, groupCount + 1)) return true;
      } else {
        if (bt(currentSum + v, groupCount)) return true;
      }
      used[i] = false;
    }
    return false;
  }
  return bt(0, 0);
}

// Etsi miten kortit jakautuvat ryhmiin (käytetään UI-visualisointiin)
function findGroups(cards, target) {
  const used = new Array(cards.length).fill(false);
  const groups = [];

  function bt(currentGroup, currentSum) {
    const allUsed = used.every(u => u);
    if (allUsed) return currentSum === 0;
    for (let i = 0; i < cards.length; i++) {
      if (used[i]) continue;
      const v = tableVal(cards[i]);
      if (currentSum + v > target) continue;
      used[i] = true;
      currentGroup.push(cards[i].id);
      if (currentSum + v === target) {
        groups.push([...currentGroup]);
        if (bt([], 0)) return true;
        groups.pop();
      } else {
        if (bt(currentGroup, currentSum + v)) return true;
      }
      currentGroup.pop();
      used[i] = false;
    }
    return false;
  }
  if (bt([], 0)) return groups;
  return [];
}

// Kierroksen pistelasku. Moduulitasolla ja exportattuna sauman takia: pistetaulukko
// (vakiosäännöt, linjattu 18.8.2026, KASINO.md › Pisteet) on kiinnitetty testissä
// test/kasino-pistelasku.test.js, eikä sitä voisi testata komponentin sisältä.
export function scoreRound(g) {
  const counts      = g.players.map(p => p.captured.length);
  const maxCards    = Math.max(...counts);
  const spadesCounts = g.players.map(p => p.captured.filter(c => c.s === '♠').length);
  const maxSpades   = Math.max(...spadesCounts);
  const tikkiCounts = g.players.map(p => p.tikkiCount);
  const cardsTied   = counts.filter(c => c === maxCards).length > 1;
  const spadesTied  = spadesCounts.filter(s => s === maxSpades).length > 1;
  return g.players.map((p, i) => {
    let pts = 0;
    const hasMostCards   = counts[i] === maxCards  && !cardsTied;
    const hasMostSpades  = spadesCounts[i] === maxSpades && !spadesTied;
    const isInCardsTie   = cardsTied  && counts[i] === maxCards;
    const isInSpadesTie  = spadesTied && spadesCounts[i] === maxSpades;
    if (hasMostCards)  pts += 3; // vakiosäännöt, linjattu 18.8.2026 (KASINO.md)
    if (hasMostSpades) pts += 1;
    const ruutuKymppiCount  = p.captured.filter(isRuutuKymppi).length;
    const pataKakkonenCount = p.captured.filter(isPataKakkonen).length;
    const aceCount          = p.captured.filter(c => c.r === 'A').length;
    pts += ruutuKymppiCount * 2 + pataKakkonenCount + aceCount;
    const tikkiPts = (tikkiCounts[i] > 0 && tikkiCounts.some((t, j) => j !== i && t < tikkiCounts[i]))
      ? p.tikkiCount : 0;
    pts += tikkiPts;
    return {
      roundPts: pts,
      cards: counts[i], spades: spadesCounts[i],
      tikkiCount: p.tikkiCount, aces: aceCount,
      hasMostCards, hasMostSpades, isInCardsTie, isInSpadesTie,
      ruutuKymppiCount, pataKakkonenCount, aceCount, tikkiPts,
    };
  });
}

// Sääntövalinta (aloitusnäytöltä): salli rakennelmat erikoiskorttien arvoille (A=14, ♠2=15, ♦10=16)
const KASINO_DEFAULT_RULES = { specialBuilds: false };

function initGame(nPlayers, pool, allBots = false, rules = KASINO_DEFAULT_RULES) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  const players = Array.from({ length: nPlayers }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1], isHuman: allBots ? false : i === 0,
    hand: [], captured: [], tikkiCount: 0, score: 0,
  }));
  const table = deck.splice(0, 4);
  players.forEach(p => p.hand = deck.splice(0, 4));
  // Vaihe ja vuoro asuvat pelitilassa. Ennen ne olivat kahtena useStatena, joilla
  // molemmilla oli käsin synkattu ref-kaksonen (phaseRef, curRef) ajastimia ja
  // klikkivartijoita varten (kompositioauditointi H5).
  return { players, deck, table, builds: [], lastCapture: null, round: 1, rules,
           phase: /** @type {Vaihe} */ ('idle'), cur: 0 };
}

function dealHands(g) {
  if (g.deck.length === 0) return g;
  const deck = [...g.deck];
  const players = g.players.map(p => ({ ...p, hand: [...p.hand, ...deck.splice(0, 4)] }));
  return { ...g, players, deck };
}

const sortHand = hand => sortHandBy(hand, handVal);


const mokkiSfx = isMokki => isMokki ? tr('games.kasino.msg.mokkiSuffix') : '';
const M = {
  gameStart: (hint) => tr('games.kasino.msg.gameStart', { hint }),
  newDeal: (left) => tr('games.kasino.msg.newDeal', { left }),
  get forcedLeave() { return tr('games.kasino.msg.forcedLeave'); },
  yourTurn: (count, hint) => tr('games.kasino.msg.yourTurn', { count, hint }),
  aiThinking: (name) => tr('games.kasino.msg.aiThinking', { name }),
  get endRound() { return tr('games.kasino.msg.endRound'); },
  newRound: (scores, hint) => tr('games.kasino.msg.newRound', { scores, hint }),
  humanCapture: (who, handCard, captureStr, isMokki) => tr('games.kasino.msg.capture', { who, handCard, captureStr, mokki: mokkiSfx(isMokki) }),
  humanLeave: (who, card) => tr('games.kasino.msg.leave', { who, card }),
  warning: (card, captured) => tr('games.kasino.msg.warning', { card, captured }),
  invalidMove: (card) => tr('games.kasino.msg.invalidMove', { card }),
  aiCapture: (name, handCard, captureStr, isMokki) => tr('games.kasino.msg.capture', { who: name, handCard, captureStr, mokki: mokkiSfx(isMokki) }),
  humanBuild: (who, value) => tr('games.kasino.msg.build', { who, value }),
  aiBuild:    (name, value) => tr('games.kasino.msg.build', { who: name, value }),
  get noBuildLeave() { return tr('games.kasino.msg.noBuildLeave'); },
};

import { useT, tr } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

// Suljettu arvojoukko: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'idle'|'select_table'} Vaihe */

export default function Kasino({ game, onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay = true, showNextBtn = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(playerCount);
  const [rules, setRules] = useStickySetting('kasino:rules', KASINO_DEFAULT_RULES); // sääntövalinnat aloitusnäytöltä; muistetaan
  const buildCap = rules.specialBuilds ? 16 : 13; // rakennelman max-arvo (13=K, 16=♦10 erikoissäännöllä)
  const cardBack = 'ilves';
  const { G, gRef, setGS } = useGameState();
  const [selTable, setSelTable] = useState([]);
  const [selBuilds, setSelBuilds] = useState([]); // selected build IDs for capture
  const [captureMode, setCaptureMode] = useState(false); // kaappaustila
  const [buildMode, setBuildMode] = useState(false); // rakennustila
  const [leaveMode, setLeaveMode] = useState(false); // jättämistila
  const [msg, setMsg_] = useState('');
  const logOpen = showLog; // omistaja on App, ks. onShowLogChange
  // Paljastus ja asetus ovat eri asiat (kompositioauditointi H6, päätös 3.9.2026).
  // `seeAll` on App:n omistama asetus joka ei tallennu, ja `revealAll` on tämän pelin
  // näkymätila. Katselutila pakottaa paljastuksen päälle koskematta asetukseen, ja
  // `startGame` palauttaa näkymän asetuksen mukaiseksi.
  const [revealAll, setRevealAll] = useState(seeAll);
  useEffect(() => { setRevealAll(seeAll); }, [seeAll]);
  const [scores, setScores] = useState(null);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [aiSel, setAiSel] = useState({ handCard: null, tableCards: [] });
  const [captureAnim, setCaptureAnim] = useState(null); // {handCard, tableCards}
  const [pendingCapture, setPendingCapture] = useState(null); // odottaa Seuraava-nappia
  const [jpId, setJP] = useState(null);
  const [shuffling, setShuffling] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  // Esc sulkee vaihtoehdot-modaalin
  useEffect(() => {
    if (!showOptions) return;
    const onEsc = e => { if (e.key === 'Escape') setShowOptions(false); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [showOptions]);
  const [helpTerm, setHelpTerm] = useState(null); // 'kaappaus' | 'rakennus'
  const [advice, setAdvice] = useState(null); // { text, handCardId, tableCardIds, buildId } | null
  const prevDeckRef = useRef(null);
  const cumulBdRef    = useRef(null); // kumulatiivinen pisteytysdata joka kierros
  const showNextBtnRef = useRef(showNextBtn);
  useEffect(() => { showNextBtnRef.current = showNextBtn; }, [showNextBtn]);
  const sndRef     = useRef(soundOn);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const lastPlayTmr = useRef(null);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedMove, schedAI, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { setAdvice(null); }, [G]); // neuvo vanhenee jokaisesta tilamuutoksesta

  // Renderin lukemat: vaihe ja vuoro luetaan G:stä eikä rinnakkaisesta useStatesta.
  const phase  = G?.phase ?? 'idle';
  const curIdx = G?.cur ?? 0;

  function askAdvice() {
    const g = gRef.current;
    if (!g) return;
    const a = getAdvice(g, 0, buildCap);
    if (!a) return;
    const targets = a.tableCards && a.tableCards.length ? a.tableCards.map(lbl).join('+') : undefined;
    setAdvice({
      text: t('games.kasino.advice.' + a.type, {
        card: a.handCard ? lbl(a.handCard) : undefined,
        targets,
        value: a.value,
      }),
      handCardId: a.handCard ? a.handCard.id : null,
      tableCardIds: a.tableCards ? a.tableCards.map(c => c.id) : [],
      buildId: a.buildId ?? null,
    });
  }
  // Auto-advance kun showNextBtn=false tai allBots-tila ja kaappaus odottaa jatkoa
  useEffect(() => {
    if (pendingCapture && (!showNextBtnRef.current || allBotsRef.current)) {
      const delay = allBotsRef.current ? 400 : 600;
      const id = schedMove(() => continueAfterCapture(), delay);
      return () => clearTimeout(id);
    }
  }, [pendingCapture]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  // allBots: kierrosten välissä EI edetä automaattisesti — katsoja näkee pisteiden
  // kertymisen ja klikkaa "Seuraava peli →". Vain pelin lopussa (joku ≥16p) siirrytään
  // automaattisesti tulosnäkymään.
  useEffect(() => {
    if (!scores || !allBotsRef.current) return;
    if (!scores.some(s => s.totalScore >= 16)) return;
    let tid;
    const tryAdv = () => {
      if (pausedRef.current) { tid = tm(tryAdv, 500); return; }
      setScores(null); // kierrospisteiden paneeli piiloon uuden pelin alkaessa
    };
    tid = tm(tryAdv, 3000);
    return () => clearTimeout(tid);
  }, [scores]); // eslint-disable-line react-hooks/exhaustive-deps

  const { log, logRef, addLog, commit, resetLog } = useGameLog({
    setGS,
    onMessage: setMsg_, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => {
      const g = gRef.current; if (!g) return null;
      return {
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: p.score ?? 0 })),
        tableCards: [...(g.table ?? []), ...(g.builds ?? []).flatMap(b => b.cards ?? [])],
      };
    },
  });


  function flashLastPlay(name, card, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: [card], isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function startGame(forcedCount, allBotsMode = false) {
    clearTimeout(aiTmr.current);
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    setRevealAll(seeAll || allBotsMode);
    pausedRef.current = false; setPaused(false);
    const cnt = forcedCount || nP;
    const g = { ...initGame(cnt, playerNames, allBotsMode, rules),
                phase: /** @type {Vaihe} */ ('select_table') };
    commit(g);
    setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false); setScores(null); setPakaAnim(false);
    resetLog();
    cumulBdRef.current = null;
    if (allBotsMode) {
      addLog(t('games.kasino.msg.botBattleStart'));
      schedAI(() => runAI(0, gRef.current), 2000);
    } else {
      const hint = getTurnHint(g.players[0].hand, g.table, g.builds);
      addLog(M.gameStart(hint));
    }
    setScreen('game');
    setShuffling(true);
  }

  function startBotBattle() {
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }


  function getTurnHint(hand, table, builds = []) {
    const uniq = arr => arr.filter((hc, i, a) => a.findIndex(c => c.id === hc.id) === i);

    // Omat rakennelmat joihin kädessä sopiva kortti
    const ownBuildHCards = uniq(
      builds.filter(b => b.ownerIdx === 0 && hand.some(hc => handVal(hc) === b.value))
        .flatMap(b => hand.filter(hc => handVal(hc) === b.value))
    );
    // Vastustajan rakennelmat jotka voi kähveltää
    const stealHCards = uniq(
      builds.filter(b => b.ownerIdx !== 0 && hand.some(hc => handVal(hc) === b.value))
        .flatMap(b => hand.filter(hc => handVal(hc) === b.value))
    );

    if (table.length === 0) {
      const parts = [];
      if (ownBuildHCards.length) parts.push(t('games.kasino.hint.viaBuild', { cards: ownBuildHCards.map(c => lbl(c)).join(', ') }));
      if (stealHCards.length)    parts.push(t('games.kasino.hint.steal', { cards: stealHCards.map(c => lbl(c)).join(', ') }));
      if (parts.length) return t('games.kasino.hint.emptyWith', { parts: parts.join(' · ') });
      return t('games.kasino.hint.emptyLeave');
    }

    // Pöytäkorttien kaappaus
    const n = table.length;
    const tableCaptureHCards = n > 16
      ? hand.filter(hc => canPartition(table, handVal(hc)))
      : hand.filter(hc => {
          const hv = handVal(hc);
          for (let mask = 1; mask < (1 << n); mask++) {
            const sel = table.filter((_, i) => (mask >> i) & 1);
            if (canPartition(sel, hv)) return true;
          }
          return false;
        });

    // Kaappaus = pöytäkortit + omat rakennelmat (deduplikoitu)
    const allCaptureHCards = [...tableCaptureHCards];
    for (const hc of ownBuildHCards) {
      if (!allCaptureHCards.find(c => c.id === hc.id)) allCaptureHCards.push(hc);
    }
    // Kähvellys vain ne jotka eivät ole jo kaappauksissa
    const uniqueStealHCards = stealHCards.filter(hc => !allCaptureHCards.find(c => c.id === hc.id));

    // Rakennelman luonti (ei jo muissa kategorioissa)
    const allUsed = [...allCaptureHCards, ...uniqueStealHCards];
    const buildCreateHCards = hand.filter(hc =>
      !allUsed.find(c => c.id === hc.id) && hasAnyBuildOption([hc], hand, table, buildCap)
    );

    const totalCount = allCaptureHCards.length + uniqueStealHCards.length + buildCreateHCards.length;
    if (!totalCount) return t('games.kasino.hint.noCapture');

    const parts = [];
    if (allCaptureHCards.length)   parts.push(t('games.kasino.hint.capture', { cards: allCaptureHCards.map(c => lbl(c)).join(', ') }));
    if (uniqueStealHCards.length)  parts.push(t('games.kasino.hint.steal', { cards: uniqueStealHCards.map(c => lbl(c)).join(', ') }));
    if (buildCreateHCards.length)  parts.push(t('games.kasino.hint.build', { cards: buildCreateHCards.map(c => lbl(c)).join(', ') }));
    return parts.join(' · ');
  }

  function advance(g, fromIdx) {
    let g2 = g;
    // Jaon lokirivi odottaa tilaa (kompositioauditointi H4).
    const lines = /** @type {string[]} */ ([]);
    const allHandsEmpty = g2.players.every(p => p.hand.length === 0);
    if (allHandsEmpty) {
      if (g2.deck.length === 0) { endRound(g2); return; }
      g2 = dealHands({ ...g2, deck: [...g2.deck] });
      lines.push(M.newDeal(korttia(g2.deck.length)));
    }
    const next = (fromIdx + 1) % g2.players.length;
    const p = g2.players[next];

    // Pakollinen siirto: yksi kortti kädessä ja pöytä tyhjä (vain ihmispelaajalle).
    // Ei koske pelaajaa jolla on oma rakennelma pöydällä — sitä ei saa jättää lunastamatta (noBuildLeave).
    const hasOwnBuildForced = g2.builds.some(b => b.ownerIdx === 0);
    // KA-2 (8.9.2026): pakkosiirto ei koske tilannetta jossa viimeinen kortti voi varastaa rakennelman.
    const canStealBuild = p.hand.length === 1 && g2.builds.some(b => b.value === handVal(p.hand[0]));
    if (next === 0 && p.isHuman && p.hand.length === 1 && g2.table.length === 0 && !hasOwnBuildForced && !canStealBuild) {
      setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false);
      const g3 = { ...doLeave({ ...g2, cur: 0, phase: /** @type {Vaihe} */ ('idle') }, 0, p.hand[0], lines) };
      commit(g3);
      lines.forEach(addLog);
      addLog(M.forcedLeave);
      schedMove(() => advance(g3, 0), 1200);
      return;
    }

    setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false);
    g2 = { ...g2, cur: next, phase: /** @type {Vaihe} */ ('select_table') };
    commit(g2);
    lines.forEach(addLog);
    if (p.isHuman) {
      const hint = getTurnHint(p.hand, g2.table, g2.builds);
      addLog(M.yourTurn(korttia(p.hand.length), hint));
    } else {
      addLog(M.aiThinking(p.name));
      schedAI(() => runAI(next, gRef.current), 1200);
    }
  }

  function endRound(g) {
    let g2 = g;
    // Rakennelmat → lisää pöytäkortteihin (viimeinen kaappaaja saa ne)
    if (g2.builds.length > 0) {
      const buildCards = g2.builds.flatMap(b => b.cards);
      g2 = { ...g2, table: [...g2.table, ...buildCards], builds: [] };
    }
    if (g2.table.length > 0 && g2.lastCapture !== null) {
      const players = g2.players.map((p, i) =>
        i === g2.lastCapture ? { ...p, captured: [...p.captured, ...g2.table] } : p
      );
      g2 = { ...g2, players, table: [] };
    }
    const results = scoreRound(g2);
    const newScores = results.map((r, i) => ({
      ...g2.players[i], ...r,
      totalScore: (g2.players[i].score || 0) + r.roundPts,
    }));

    // Kumulatiivinen breakdown-kertymä
    if (!cumulBdRef.current) {
      cumulBdRef.current = g2.players.map(() =>
        ({ mostCards: 0, mostSpades: 0, ruutuKymppi: 0, pataKakk: 0, aces: 0, tikki: 0, cardsTied: 0, spadesTied: 0 })
      );
    }
    results.forEach((r, i) => {
      const bd = cumulBdRef.current[i];
      if (r.hasMostCards)   bd.mostCards++;
      if (r.hasMostSpades)  bd.mostSpades++;
      if (r.isInCardsTie)   bd.cardsTied++;
      if (r.isInSpadesTie)  bd.spadesTied++;
      bd.ruutuKymppi += r.ruutuKymppiCount;
      bd.pataKakk    += r.pataKakkonenCount;
      bd.aces        += r.aceCount;
      bd.tikki       += r.tikkiPts;
    });

    const anyAt16 = newScores.some(s => s.totalScore >= 16);
    if (anyAt16) {
      const ranking = g2.players.map((p, i) => ({
        name: p.name, isHuman: p.isHuman, score: newScores[i].totalScore,
        place: newScores.filter((_, j) => newScores[j].totalScore > newScores[i].totalScore).length + 1,
      })).sort((a, b) => a.place - b.place);
      const scoreBreakdown = g2.players.map((p, i) => {
        const bd = cumulBdRef.current[i];
        const items = [];
        if (bd.mostCards)   items.push({ label: t('games.kasino.score.mostCards', { n: bd.mostCards }),     pts: bd.mostCards * 3 });
        if (bd.cardsTied)   items.push({ label: t('games.kasino.score.cardsTied', { n: bd.cardsTied }),     pts: 0 });
        if (bd.mostSpades)  items.push({ label: t('games.kasino.score.mostSpades', { n: bd.mostSpades }),   pts: bd.mostSpades });
        if (bd.spadesTied)  items.push({ label: t('games.kasino.score.spadesTied', { n: bd.spadesTied }),   pts: 0 });
        if (bd.ruutuKymppi) items.push({ label: t('games.kasino.score.ruutuKymppi', { n: bd.ruutuKymppi }), pts: bd.ruutuKymppi * 2 });
        if (bd.pataKakk)    items.push({ label: t('games.kasino.score.pataKakk', { n: bd.pataKakk }),       pts: bd.pataKakk });
        if (bd.aces)        items.push({ label: t('games.kasino.score.aces', { n: bd.aces }),               pts: bd.aces });
        if (bd.tikki)       items.push({ label: t('games.kasino.score.tikki', { n: bd.tikki }),             pts: bd.tikki });
        return { name: p.name, score: newScores[i].totalScore, items };
      }).sort((a, b) => b.score - a.score);
      if (allBotsRef.current) {
        tm(() => onResult?.({ ranking, scoreBreakdown }), BOT_RESULT_DELAY);
      } else {
        onResult?.({ ranking, scoreBreakdown });
      }
    }
    const finalPlayers = g2.players.map((p, i) => ({ ...p, score: newScores[i].totalScore }));
    const g3 = { ...g2, players: finalPlayers };
    commit(g3, M.endRound);
    setScores(newScores);
    if (sndRef.current) SFX.score();
  }

  function startNextRound() {
    const g = gRef.current;
    const finalPlayers = g.players;
    const newG = initGame(nP, playerNames, allBotsRef.current, rules);
    // Nimi ja pisteet seuraavat istuinta. `initGame` arpoo nimet joka kutsulla, joten
    // ilman tätä vastustajat vaihtoivat nimeä kierrosten välissä, vaikka pisteet
    // seurasivat istuinta. Löytyi 4.9.2026 Botbenchin istuinkytkentää korjatessa.
    const withScores = {
      ...newG,
      players: newG.players.map((p, i) => ({
        ...p,
        name: finalPlayers[i]?.name ?? p.name,
        score: finalPlayers[i]?.score || 0,
      })),
    };
    commit({ ...withScores, cur: 0, phase: /** @type {Vaihe} */ ('select_table') });
    setScores(null); setSelTable([]); setSelBuilds([]); setPakaAnim(false);
    const h0 = withScores.players[0];
    const scoreStr = finalPlayers.map(p => t('games.kasino.msg.scoreItem', { name: p.name, score: p.score })).join(', ');
    if (allBotsRef.current) {
      addLog(t('games.kasino.msg.botNewRound', { scores: scoreStr }));
      schedAI(() => runAI(0, gRef.current), 2000);
    } else {
      addLog(M.newRound(scoreStr, getTurnHint(h0.hand, withScores.table, withScores.builds)));
    }
  }

  // `lines` kerää lokirivit kutsujalle: funktio rakentaa uuden tilan mutta ei
  // committoi sitä, ja tila on kirjoitettava ennen lokiriviä (kompositioauditointi H4).
  function doCapture(g, playerIdx, handCard, tableCards, silent = false, lines = /** @type {string[]} */ ([])) {
    const isMökki = tableCards.length === g.table.length && g.table.length > 0 && g.builds.length === 0;
    const allCaptured = [handCard, ...tableCards];
    const newTable = g.table.filter(c => !tableCards.find(t => t.id === c.id));
    let players = g.players.map((p, i) => i === playerIdx ? {
      ...p,
      hand: p.hand.filter(c => c.id !== handCard.id),
      captured: [...p.captured, ...allCaptured],
      tikkiCount: p.tikkiCount + (isMökki ? 1 : 0),
    } : p);

    // Jos sai mökin, tarkista jos kaikilla muilla on mökit — jos on, poista ne
    if (isMökki) {
      const othersWithTikki = players.filter((p, i) => i !== playerIdx && p.tikkiCount > 0).length;
      if (othersWithTikki === players.length - 1) {
        players = players.map(p => ({ ...p, tikkiCount: 0 }));
      }
    }

    const newG = { ...g, players, table: newTable, lastCapture: playerIdx };
    if (sndRef.current) SFX.capture();
    if (isMökki && sndRef.current) tm(() => SFX.tikki(), 200);
    flashLastPlay(g.players[playerIdx].name, handCard, g.players[playerIdx].isHuman);
    if (!silent) {
      const who = `${g.players[playerIdx].name} kaappasi`;
      const groups = findGroups(tableCards, handVal(handCard));
      const captureStr = groups.length > 1
        ? groups.map(grp => grp.map(id => lbl(tableCards.find(c => c.id === id))).join('+')).join(' ja ')
        : tableCards.map(lbl).join('+');
      lines.push(M.humanCapture(who, lbl(handCard), captureStr, isMökki));
    }
    return newG;
  }

  function doLeave(g, playerIdx, handCard, lines = /** @type {string[]} */ ([])) {
    const players = g.players.map((p, i) => i === playerIdx
      ? { ...p, hand: p.hand.filter(c => c.id !== handCard.id) }
      : p
    );
    const newG = { ...g, players, table: [...g.table, handCard] };
    setJP(handCard.id);
    tm(() => setJP(null), 2200);
    if (sndRef.current) SFX.leave();
    const who = g.players[playerIdx].name;
    lines.push(M.humanLeave(who, lbl(handCard)));
    flashLastPlay(g.players[playerIdx].name, handCard, g.players[playerIdx].isHuman);
    return newG;
  }

  // Validoi: voidaanko pöytäkortit jakaa ryhmiin, joista kukin = käsikortin arvo
  function isValidCapture(handCard, tableCards) {
    if (!tableCards.length) return false;
    return canPartition(tableCards, handVal(handCard));
  }

  // ── Rakennelma-apufunktiot ──────────────────────────────────
  function getBuildValue(handCard, tableCards, hand) {
    const handV = handVal(handCard);
    const tableSum = tableCards.reduce((s, c) => s + tableVal(c), 0);
    const buildValue = handV + tableSum;
    if (buildValue > buildCap) return null; // max rakennelman arvo: 13 (K) tai 16 (♦10) erikoissäännöllä
    const hasCapturer = hand.some(c => c.id !== handCard.id && handVal(c) === buildValue);
    return hasCapturer ? buildValue : null;
  }

  function doBuild(g, playerIdx, handCard, tableCards, buildValue, lines = /** @type {string[]} */ ([])) {
    const build = {
      id: `build_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      cards: [handCard, ...tableCards],
      value: buildValue,
      ownerIdx: playerIdx,
    };
    const newTable = g.table.filter(c => !tableCards.find(t => t.id === c.id));
    const players = g.players.map((p, i) => i === playerIdx
      ? { ...p, hand: p.hand.filter(c => c.id !== handCard.id) }
      : p
    );
    if (sndRef.current) SFX.build();
    lines.push(t('games.kasino.msg.buildMade', {
      who: g.players[playerIdx].name,
      cards: build.cards.map(lbl).join(' + '),
      value: buildValue,
    }));
    return { ...g, players, table: newTable, builds: [...g.builds, build] };
  }

  function doBuildCapture(g, playerIdx, handCard, capturedBuilds, capturedTableCards, silent = false, lines = /** @type {string[]} */ ([])) {
    const buildCards = capturedBuilds.flatMap(b => b.cards);
    const allCaptured = [handCard, ...buildCards, ...capturedTableCards];
    const newBuilds = g.builds.filter(b => !capturedBuilds.find(cb => cb.id === b.id));
    const newTable = g.table.filter(c => !capturedTableCards.find(t => t.id === c.id));
    const isMökki = newBuilds.length === 0 && newTable.length === 0;
    let players = g.players.map((p, i) => i === playerIdx ? {
      ...p,
      hand: p.hand.filter(c => c.id !== handCard.id),
      captured: [...p.captured, ...allCaptured],
      tikkiCount: p.tikkiCount + (isMökki ? 1 : 0),
    } : p);
    if (isMökki) {
      const othersWithTikki = players.filter((p, i) => i !== playerIdx && p.tikkiCount > 0).length;
      if (othersWithTikki === players.length - 1) {
        players = players.map(p => ({ ...p, tikkiCount: 0 }));
      }
    }
    if (sndRef.current) SFX.capture();
    if (isMökki && sndRef.current) tm(() => SFX.tikki(), 200);
    flashLastPlay(g.players[playerIdx].name, handCard, g.players[playerIdx].isHuman);
    const isSteal = capturedBuilds.some(b => b.ownerIdx !== playerIdx);
    const actor = g.players[playerIdx].name;
    const buildVal = capturedBuilds[0]?.value ?? handCard.v;
    if (!silent) {
      if (isSteal) {
        lines.push(t('games.kasino.msg.stealBuild', { name: actor, val: buildVal, bonus: '', mokki: '' }));
      } else {
        lines.push(t('games.kasino.msg.takeBuild', { name: actor, val: buildVal, bonus: '', mokki: '' }));
      }
    }
    return { ...g, players, table: newTable, builds: newBuilds, lastCapture: playerIdx };
  }

  // Ihmispelaajan toiminnot
  // Sama vartija kolmessa kohdassa: valinta on auki vain Heron omalla vuorolla
  // ja vain valintavaiheessa. Luetaan pelitilasta, koska klikki voi osua kesken
  // ajastetun bottisiirron.
  const isHumanTurn = () => {
    const g = gRef.current;
    return !!g && g.phase === 'select_table' && g.cur === 0;
  };

  function humanToggleTable(card) {
    if (!isHumanTurn()) return;
    setSelTable(prev => {
      const has = prev.find(c => c.id === card.id);
      return has ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
  }

  function humanToggleBuild(build) {
    if (!isHumanTurn()) return;
    setSelBuilds(prev => {
      const has = prev.includes(build.id);
      return has ? prev.filter(id => id !== build.id) : [...prev, build.id];
    });
  }

  function humanSelectHand(card) {
    if (!isHumanTurn()) return;
    const g = gRef.current;
    const hasOwnBuild = g.builds.some(b => b.ownerIdx === 0);
    const hv = handVal(card);
    // Porsaanreikäauditointi 8.9.2026 KA-1: oma rakennelma on lunastettava ennen muuta siirtoa,
    // sama sääntö jota botti noudattaa (kasinoChooseMove ottaa oman rakennelman aina ensin).
    if (hasOwnBuild && !g.builds.some(b => b.ownerIdx === 0 && selBuilds.includes(b.id))) { addLog(M.noBuildLeave); return; }

    // Rakennelma(t) valittu → kaappaa rakennelmat (+ mahdolliset pöytäkortit)
    if (selBuilds.length > 0) {
      const selectedBuildObjs = g.builds.filter(b => selBuilds.includes(b.id));
      const allMatchValue = selectedBuildObjs.every(b => b.value === hv);
      const extraTableValid = selTable.length === 0 || canPartition(selTable, hv);
      if (!allMatchValue || !extraTableValid) {
        addLog(M.invalidMove(lbl(card)));
        return;
      }
      const snapshotBuilds = [...selectedBuildObjs];
      const snapshotTable = [...selTable];
      const animCards = [...snapshotBuilds.flatMap(b => b.cards), ...snapshotTable];
      setCaptureAnim({ handCard: card, tableCards: animCards });
      setSelTable([]); setSelBuilds([]);
      commit({ ...g, phase: /** @type {Vaihe} */ ('idle') });
      schedMove(() => {
        const lines = /** @type {string[]} */ ([]);
        const g2 = doBuildCapture(gRef.current, 0, card, snapshotBuilds, snapshotTable, false, lines);
        commit(g2);
        lines.forEach(addLog);
        setPendingCapture({ g2, fromIdx: 0 });
      }, 1200);
      return;
    }

    // Rakennustila — toimii myös tyhjällä pöytävalinnalla (parirakennelma, mask=0)
    if (buildMode) {
      if (hasOwnBuild && selTable.length === 0) { addLog(M.noBuildLeave); return; }
      const buildVal = getBuildValue(card, selTable, g.players[0].hand);
      if (buildVal !== null) {
        const lines = /** @type {string[]} */ ([]);
        const g2 = { ...doBuild(g, 0, card, selTable, buildVal, lines), phase: /** @type {Vaihe} */ ('idle') };
        commit(g2);
        lines.forEach(addLog);
        setSelTable([]); setSelBuilds([]); setCaptureMode(false); setBuildMode(false); setLeaveMode(false);
        tm(() => advance(g2, 0), 600);
      } else {
        addLog(M.invalidMove(lbl(card)));
      }
      return;
    }

    // Tyhjä valinta (ei buildMode) → leaveMode tai tila-virhe
    if (selTable.length === 0) {
      if (hasOwnBuild) { addLog(M.noBuildLeave); return; }
      if (captureMode) { addLog(t('games.kasino.msg.captureModeHint')); return; }
      if (!leaveMode)  { addLog(t('games.kasino.msg.chooseAction')); return; }
      // leaveMode: jätä kortti pöytään
      const lines = /** @type {string[]} */ ([]);
      const g2 = { ...doLeave(g, 0, card, lines), phase: /** @type {Vaihe} */ ('idle') };
      commit(g2);
      lines.forEach(addLog);
      setSelTable([]); setSelBuilds([]); setLeaveMode(false);
      tm(() => advance(g2, 0), 600);
      return;
    }

    // Normaalitila — kaappaus (selTable.length > 0, ei buildMode)
    if (isValidCapture(card, selTable)) {
      const captured = [...selTable];
      setCaptureAnim({ handCard: card, tableCards: captured });
      setSelTable([]); setSelBuilds([]);
      commit({ ...g, phase: /** @type {Vaihe} */ ('idle') });
      schedMove(() => {
        const lines = /** @type {string[]} */ ([]);
        const g2 = doCapture(gRef.current, 0, card, captured, false, lines);
        commit(g2);
        lines.forEach(addLog);
        setPendingCapture({ g2, fromIdx: 0 });
      }, 1200);
      return;
    }

    addLog(M.invalidMove(lbl(card)));
  }

  function runAI(playerIdx, g) {
    if (!g) g = gRef.current;
    if (!g || (gRef.current?.phase ?? g.phase) === 'idle') return;
    const p = g.players[playerIdx];
    if (!p.hand.length) { advance(g, playerIdx); return; }
    const level = botLevelsRef.current?.[playerIdx] ?? aiLevelRef.current;
    // Kyvykkyysporras (ei satunnaiskohinaa) asuu `kasinoChooseMove`ssa, jonka myös
    // Mestarin neuvo kutsuu (kompositioauditointi H7):
    //   Oppipoika: naiivi kaappaus (korttimäärä, ei pisteet), ei rakenna, ei
    //              varasta, ei bonuksia; jättökortti ilman vaara-arviota
    //   Kisälli:   pistekaappaus + rakentaminen + varastus + bonukset,
    //              heuristinen jättövaara
    //   Mestari:   + hypergeometrinen inferenssi (rakennus-EV, jättövaara, A-suoja)
    // Tämä funktio on siirron kuljettaja: animaatio, viive, lokirivi ja tilan kirjoitus.
    const move = kasinoChooseMove(g, playerIdx, buildCap, level);
    if (!move) { advance(g, playerIdx); return; }
    const aDel = allBotsRef.current ? 400 : 1200; // animation delay
    const qDel = allBotsRef.current ? 200 : 700;  // quick action delay

    // ─── Rakennelman kaappaus: oma tai varastettu ────────────────────────────
    if (move.type === 'takeOwnBuild' || move.type === 'stealBuild') {
      const { handCard: capturer, build, bonus } = move;
      const animCards = [...build.cards, ...bonus];
      const isMokkiTake = g.builds.filter(b => b.id !== build.id).length === 0
        && g.table.filter(c => !bonus.find(b2 => b2.id === c.id)).length === 0;
      // Rivi kirjoitetaan vasta animaation jälkeen yhdessä tilan kanssa
      // (kompositioauditointi H4): se kertoo tapahtuneesta eikä aikeesta.
      const key = move.type === 'takeOwnBuild' ? 'games.kasino.msg.takeBuild' : 'games.kasino.msg.stealBuild';
      const takeLine = t(key, { name: p.name, val: build.value, bonus: bonus.length > 0 ? ' + ' + bonus.map(lbl).join('+') : '', mokki: isMokkiTake ? t('games.kasino.msg.mokkiSuffix') : '' });
      setCaptureAnim({ handCard: capturer, tableCards: animCards });
      setAiSel({ handCard: capturer, tableCards: animCards });
      schedMove(() => {
        const g2 = gRef.current;
        const g3 = doBuildCapture(g2, playerIdx, capturer, [build], bonus, true);
        commit(g3, takeLine);
        setPendingCapture({ g2: g3, fromIdx: playerIdx });
      }, aDel);
      return;
    }

    // ─── Rakenna ─────────────────────────────────────────────────────────────
    if (move.type === 'build') {
      if (initShowIntention) setAiSel({ handCard: move.handCard, tableCards: move.tableCards });
      schedMove(() => {
        const g2 = gRef.current;
        setAiSel({ handCard: null, tableCards: [] });
        const lines = /** @type {string[]} */ ([]);
        const g3 = doBuild(g2, playerIdx, move.handCard, move.tableCards, move.value, lines);
        commit(g3);
        lines.forEach(addLog);
        schedMove(() => advance(g3, playerIdx), 400);
      }, qDel + Math.random() * 200);
      return;
    }

    // ─── Kaappaa pöydältä ────────────────────────────────────────────────────
    if (move.type === 'capture') {
      const groups = findGroups(move.tableCards, handVal(move.handCard));
      const captureStr = groups.length > 1
        ? groups.map(grp => grp.map(id => lbl(move.tableCards.find(c => c.id === id))).join('+')).join(' ja ')
        : move.tableCards.map(lbl).join('+');
      const captureLine = M.aiCapture(p.name, lbl(move.handCard), captureStr, move.isMokki);
      setCaptureAnim({ handCard: move.handCard, tableCards: move.tableCards });
      setAiSel({ handCard: move.handCard, tableCards: move.tableCards });
      schedMove(() => {
        const g2 = gRef.current;
        const g3 = doCapture(g2, playerIdx, move.handCard, move.tableCards, true);
        commit(g3, captureLine);
        setPendingCapture({ g2: g3, fromIdx: playerIdx });
      }, aDel);
      return;
    }

    // ─── Jätä kortti pöytään ─────────────────────────────────────────────────
    schedMove(() => {
      const g2 = gRef.current;
      const lines = /** @type {string[]} */ ([]);
      const g3 = doLeave(g2, playerIdx, move.handCard, lines);
      commit(g3);
      lines.forEach(addLog);
      schedMove(() => advance(g3, playerIdx), 400);
    }, qDel + Math.random() * 200);
  }

  function continueAfterCapture() {
    if (!pendingCapture) return;
    const { g2, fromIdx } = pendingCapture;
    setPendingCapture(null);
    setCaptureAnim(null);
    setAiSel({ handCard: null, tableCards: [] });
    setSelBuilds([]); setCaptureMode(false); setBuildMode(false);
    advance({ ...g2, phase: /** @type {Vaihe} */ ('select_table') }, fromIdx);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  // ── Näkymät ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <GameStartScreen
      icon={'🪙'}
      title="KASINO"
      counts={[2, 3, 4]}
      value={nP}
      onCountChange={setNP}
      playerGroup={playerGroup}
      onPlayerGroupChange={onPlayerGroupChange}
      onStart={() => startGame()}
      onBotBattle={startBotBattle}
      botBattleSub={t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}
      isMobile={isMobile}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
            <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5 }}>{t('games.kasino.opts.specialBuilds')}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[[t('games.kasino.opts.yes'), true], [t('games.kasino.opts.no'), false]].map(([lab, val]) => {
                const active = rules.specialBuilds === val;
                return (
                  <button key={lab} onClick={() => setRules(r => ({ ...r, specialBuilds: val }))}
                    style={{ minWidth: 48, height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${active ? C.gold : '#2a4a32'}`, background: active ? C.gold + '18' : 'transparent', color: active ? C.gold : C.dim, transition: 'all 0.2s' }}>
                    {lab}
                  </button>
                );
              })}
            </div>
          </div>
          <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
            {t('games.kasino.opts.hint')}
          </span>
        </div>
    </GameStartScreen>
  );

  if (!G) return null;

  const human = G.players[0];
  const isMyTurn = curIdx === 0 && phase === 'select_table' && !allBots;
  const selSum = selTable.reduce((s, c) => s + tableVal(c), 0);

  // "Paras" kaappaus vasemmalle: omalla vuorolla siirrä eniten pisteitä kaappaava
  // käsikortti ensimmäiseksi (lasketaan vain omalla vuorolla → ei jankia AI-vuoroilla).
  const orderedHand = (() => {
    const base = sortHand(human.hand);
    if (!isMyTurn) return base;
    let bestId = null, bestScore = 0;
    for (const c of human.hand) {
      const cap = bestCaptureForCard(c, G.table, G.builds);
      if (cap && cap.score > bestScore) { bestScore = cap.score; bestId = c.id; }
    }
    if (bestId == null) return base;
    return [base.find(c => c.id === bestId), ...base.filter(c => c.id !== bestId)];
  })();

  // Laske ryhmät valituille korteille (jos käsikortti olisi valittuna)
  // Näytetään vain visuaalisena vihjeenä
  const groupColors = ['#4caf7d', '#5ba8d4', '#c9a84c', '#e05c3b'];
  // Kartoita kortti → ryhmäindeksi parhaalle matchaukselle ihmispelaajan käteen
  let cardGroupMap = {};
  let multiGroupDisplay = null;
  if (selTable.length > 0 && isMyTurn) {
    for (const hc of human.hand) {
      if (!isValidCapture(hc, selTable)) continue;
      const groups = findGroups(selTable, handVal(hc));
      if (groups.length > 1) {
        groups.forEach((grp, gi) => grp.forEach(id => { cardGroupMap[id] = gi; }));
        multiGroupDisplay = groups.map(grp =>
          '(' + grp.map(id => lbl(selTable.find(c => c.id === id))).join('+') + ')'
        ).join(' + ');
        break;
      }
    }
  }

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <TurnPrompt show={isMyTurn} action={t('ui.turn.kasino')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />

      {/* Pisteet-info */}
      {showInfo && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.8, marginBottom: isMobile ? 8 : 12, padding: '12px 16px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}55`, borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: C.gold, fontWeight: 700, fontSize: 12, flex: 1 }}>{t('games.kasino.ui.scoringTitle')}</span>
            <button onClick={() => setShowInfo(false)} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>✕</button>
          </div>
          {t('games.kasino.ui.scoring')}
        </div>
      )}

      {/* Viestikupla */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 60 : 70, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>🪙</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }}>{renderLogMessage(msg)}</p>
      </div>

      {/* Pisteet + pakka */}
      <div style={{ display: 'flex', gap: isMobile ? 4 : 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {G.players.map((p, i) => (
          <div key={p.id} style={{ padding: isMobile ? '3px 7px' : '4px 12px', borderRadius: 20, fontFamily: 'sans-serif', fontSize: isMobile ? 10 : 12, background: curIdx === i ? C.gold + '14' : 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === i ? C.gold + '66' : C.panelBorder}`, color: curIdx === i ? C.gold : C.dim }}>
            {p.name}: {p.score}{isMobile ? '' : '/16'}p {curIdx === i ? '●' : ''}
          </div>
        ))}
      </div>

      {/* Kierroksen pisteet */}
      {scores && (
        <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}44`, borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, marginBottom: 6, letterSpacing: 1 }}>{t('games.kasino.ui.roundPoints')}</div>
          {scores.map((s, i) => {
            const p = G.players[i];
            const has10d = p.captured.some(isRuutuKymppi);
            const has2s = p.captured.some(isPataKakkonen);
            return (
              <div key={i} style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ minWidth: 70 }}>{p.name}</span>
                <span style={{ color: C.gold, fontWeight: 700 }}>{s.roundPts}p</span>
                <span style={{ color: C.dim, fontSize: 11 }}>({s.cards}k · {s.spades}♠ · {s.aces}A · {s.tikkiCount}🏠)</span>
                {has10d && <span style={{ fontSize: 11, color: '#c05a00' }}>10♦</span>}
                {has2s && <span style={{ fontSize: 11, color: '#5ba8d4' }}>2♠</span>}
                <span style={{ marginLeft: 'auto', color: C.gold }}>→ {s.totalScore}p</span>
              </div>
            );
          })}
          {/* Ottelu on ratkennut. Ihmispelissä App on jo vaihtanut tulosruutuun, joten tässä
              näkyy vain katselutilan teksti; katselutilassa peli jää näkyviin bannerin alle. */}
          {scores.some(s => s.totalScore >= 16) ? (
            <div style={{ marginTop: 10, textAlign: 'center', fontFamily: 'sans-serif', fontSize: 12, color: C.botMode }}>{t('games.kasino.ui.showingResults')}</div>
          ) : (
            <button onClick={startNextRound} style={{ marginTop: 10, width: '100%', background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '10px 0', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 1 }}>
              {t('games.kasino.ui.nextGame')}
            </button>
          )}
        </div>
      )}

      {/* AI-pelaajat */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 10 }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === p.id ? C.gold + '55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px' }}>
                  <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: curIdx === p.id ? C.gold : C.dim }}>
                    🤖 {p.name.slice(0, 8)}{curIdx === p.id ? ' ●' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', flex: 1 }}>
                    {p.hand.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} selected={initShowIntention && aiSel.handCard?.id === c.id} />)}
                  </div>
                </div>
              ))}
            </div>
          )
          : (
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => (
                <div key={p.id} style={{ flex: 1, minWidth: 90, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === p.id ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: isMobile ? '5px 8px' : '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: curIdx === p.id ? C.gold : C.dim, marginBottom: 4 }}>
                    🤖 {p.name} {curIdx === p.id ? '●' : ''}{!isMobile && ` · ${korttia(p.captured.length)} ${t('games.kasino.ui.captured')}`}
                  </div>
                  <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: revealAll ? 'wrap' : 'nowrap', overflow: revealAll ? 'visible' : 'hidden' }}>
                    {revealAll
                      ? p.hand.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} selected={initShowIntention && aiSel.handCard?.id === c.id} />)
                      : p.hand.map((_, ci) => <div key={ci} style={{ width: 28, height: 40, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                    }
                  </div>
                </div>
              ))}
            </div>
          )
      )}

      {/* Pöytä */}
      <PoytaPanel isMobile={isMobile}
        minHeight={{ m: 90, t: 220 }}
        title={<span>{t('games.kasino.ui.tableTitle', { n: G.table.length, builds: G.builds.length })}</span>}
        right={<>
          <PakkaCount count={G.deck.length} flash={pakaAnim} />
          {(selTable.length > 0 || selBuilds.length > 0) && (
            <span style={{ color: selBuilds.length > 0 ? '#e05c3b' : multiGroupDisplay ? C.gold : C.blue }}>
              {selBuilds.length > 0
                ? `Rakennelma: ${G.builds.filter(b => selBuilds.includes(b.id)).map(b => b.value).join('+')}${selTable.length > 0 ? ` + ${selTable.map(lbl).join('+')}` : ''}`
                : multiGroupDisplay
                  ? `Multi: ${multiGroupDisplay}`
                  : `Valittu: ${selTable.map(lbl).join('+')} = ${selSum}`
              }
            </span>
          )}
        </>}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {G.table.map(c => {
            const isSel = selTable.find(x => x.id === c.id);
            const isAiPick = aiSel.tableCards.find(x => x.id === c.id);
            const gi = cardGroupMap[c.id];
            return (
              <div key={c.id} style={gi !== undefined ? { outline: `3px solid ${groupColors[gi % groupColors.length]}`, borderRadius: 9 } : {}}>
                <Card
                  card={c}
                  showBadges
                  small={isMobile}
                  selected={!!isSel || !!isAiPick}
                  advice={!isSel && !isAiPick && !!advice?.tableCardIds?.includes(c.id)}
                  dim={!!advice?.handCardId && !advice?.tableCardIds?.includes(c.id)}
                  highlight={isMyTurn && !isSel}
                  justPlaced={c.id === jpId}
                  onClick={isMyTurn && !allBots ? () => humanToggleTable(c) : undefined}
                  backStyle={BACKS[cardBack]}
                />
              </div>
            );
          })}
          {captureAnim && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 10, background: `${C.gold}10`, border: `1px solid ${C.gold}44`, flexWrap: 'wrap' }}>
              <Card card={captureAnim.handCard} small showBadges backStyle={BACKS[cardBack]} />
              <span style={{ color: C.gold, fontSize: 13, fontFamily: 'Georgia,serif' }}>←</span>
              {captureAnim.tableCards.map(c => <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} />)}
            </div>
          )}
          {!captureAnim && G.table.length === 0 && G.builds.length === 0 && (
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.tikki, opacity: 0.8, padding: '10px 0' }}>{t('games.kasino.ui.tableEmpty')}</div>
          )}
        </div>

        {/* Rakennelmat */}
        {G.builds.length > 0 && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.panelBorder}`, paddingTop: 10 }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, marginBottom: 6 }}>{t('games.kasino.ui.buildsLabel')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {G.builds.map(build => {
                const isMine = G.players[build.ownerIdx]?.isHuman;
                const isSel = selBuilds.includes(build.id);
                const isAdvised = advice?.buildId === build.id;
                const borderColor = isSel ? C.gold : isAdvised ? C.botMode : isMine ? '#4caf7d' : '#e05c3b';
                return (
                  <div
                    key={build.id}
                    onClick={isMyTurn && !allBots ? () => humanToggleBuild(build) : undefined}
                    style={{ border: `2px solid ${borderColor}`, borderRadius: 10, padding: '6px 8px', background: isSel ? `${C.gold}12` : 'rgba(255,255,255,0.02)', cursor: isMyTurn ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                  >
                    <div style={{ display: 'flex', gap: 3 }}>
                      {build.cards.map(c => (
                        <Card key={c.id} card={c} small showBadges backStyle={BACKS[cardBack]} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: borderColor, fontWeight: 700 }}>
                      {isMine ? '🔨' : '⚔'} {build.value} {isMine ? '(oma)' : `(${G.players[build.ownerIdx].name})`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </PoytaPanel>

      {/* Viimeisin siirto */}
      <div style={{ position: 'relative', height: 0 }}>
        {lastPlay && (
          <div key={lastPlay.cards[0].id} style={{ position: 'absolute', bottom: 4, left: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,22,18,0.95)', border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`, borderRadius: 12, padding: '4px 12px', animation: 'lastPlayFade 1.9s ease forwards', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>{lastPlay.name}</span>
            {lastPlay.cards.map(c => (
              <span key={c.id} style={{ background: C.card, borderRadius: 4, padding: '1px 5px', fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif', color: SUIT_COLOR[c.s] }}>{c.r}{c.s}</span>
            ))}
          </div>
        )}
      </div>

      {!allBots && (<>
      {/* Ihmispelaajan käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn ? C.gold : C.dim, marginBottom: 8 }}>
          {allBots ? '🤖' : '👤'} {G.players[0].name} {curIdx === 0 ? '●' : ''} · {t('ui.action.cards', { n: human.captured.length })} {t('games.kasino.ui.captured')}, {human.tikkiCount} {t('games.kasino.ui.sweeps')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {orderedHand.map(c => {
            const hv = handVal(c);
            const hasSelection = selTable.length > 0 || selBuilds.length > 0;
            const validBuildCapture = selBuilds.length > 0 &&
              G.builds.filter(b => selBuilds.includes(b.id)).every(b => b.value === hv) &&
              (selTable.length === 0 || canPartition(selTable, hv));
            const validTableCapture = !buildMode && selTable.length > 0 && selBuilds.length === 0 && isValidCapture(c, selTable);
            const validBuildCreate = buildMode && selTable.length > 0 && selBuilds.length === 0 && getBuildValue(c, selTable, human.hand) !== null;
            const valid = validBuildCapture || validTableCapture || validBuildCreate;
            return (
              <Card key={c.id} card={c} small={isMobile} showBadges
                highlight={valid}
                advice={!!advice?.handCardId && advice.handCardId === c.id}
                dim={advice?.handCardId
                  ? advice.handCardId !== c.id
                  : isMyTurn && hasSelection && !valid}
                onClick={isMyTurn && !allBots ? () => humanSelectHand(c) : undefined}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>
      </>)}

      {/* Bottien taistelu -hallintapalkki */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Peruuta / Seuraava */}
      <div style={{ minHeight: isMobile ? 36 : 44, display: 'flex', alignItems: 'center', marginBottom: isMobile ? 4 : 10, gap: 8, flexWrap: 'wrap' }}>
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => {
              if (!captureMode) {
                // Nimi on tbl eikä t, koska t on käännösfunktio. Varjostus teki
                // alla olevasta addLogista ajonaikaisen TypeErrorin ja nappi kuoli
                // juuri siinä tilanteessa jossa sen piti kertoa syy.
                const h = G.players[0].hand, tbl = G.table;
                const hasTableCapture = hasAnyTableCapture(h, tbl);
                const hasBuildCapture = G.builds.some(b => h.some(hc => handVal(hc) === b.value));
                if (!hasTableCapture && !hasBuildCapture) {
                  addLog(t('games.kasino.msg.noCaptureOpts'));
                  return;
                }
              }
              setCaptureMode(m => !m); setBuildMode(false); setLeaveMode(false); setSelTable([]); setSelBuilds([]);
            }}
            style={{ background: captureMode ? `${C.gold}18` : 'transparent', border: `1px solid ${captureMode ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: captureMode ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            🎯 {t('games.kasino.ui.capture')}{captureMode ? ' ●' : ''}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => {
              if (!buildMode) {
                const h = G.players[0].hand, tbl = G.table;
                if (!hasAnyBuildOption(h, h, tbl, buildCap)) { addLog(t('games.kasino.msg.noBuildOpts')); return; }
              }
              setBuildMode(m => !m); setCaptureMode(false); setLeaveMode(false); setSelTable([]); setSelBuilds([]);
            }}
            style={{ background: buildMode ? `${C.gold}18` : 'transparent', border: `1px solid ${buildMode ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: buildMode ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            🔨 {t('games.kasino.ui.build')}{buildMode ? ' ●' : ''}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => {
              if (!leaveMode) {
                const h = G.players[0].hand, tbl = G.table;
                const hasCapture = hasAnyTableCapture(h, tbl) || G.builds.some(b => h.some(hc => handVal(hc) === b.value));
                const hasBuild = hasAnyBuildOption(h, h, tbl, buildCap);
                const voit = [];
                if (hasCapture) voit.push(t('games.kasino.msg.canCapture'));
                if (hasBuild)   voit.push(t('games.kasino.msg.canBuild'));
                if (voit.length) addLog(t('games.kasino.msg.leaveModeWarn', { opts: voit.join(t('games.kasino.msg.and')) }));
              }
              setLeaveMode(m => !m); setCaptureMode(false); setBuildMode(false); setSelTable([]); setSelBuilds([]);
            }}
            style={{ background: leaveMode ? `${C.gold}18` : 'transparent', border: `1px solid ${leaveMode ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: leaveMode ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            📤 {t('games.kasino.ui.leave')}{leaveMode ? ' ●' : ''}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && (
          <button
            onClick={() => setShowOptions(v => !v)}
            style={{ background: showOptions ? `${C.gold}18` : 'transparent', border: `1px solid ${showOptions ? C.gold : C.dim + '66'}`, borderRadius: 9, padding: '8px 14px', color: showOptions ? C.gold : C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}
          >
            📋{isMobile ? '' : ' ' + t('games.kasino.ui.options')}
          </button>
        )}
        {!allBots && isMyTurn && (selTable.length > 0 || selBuilds.length > 0) && (
          <button onClick={() => { setSelTable([]); setSelBuilds([]); }} style={{ background: 'transparent', border: `1px solid ${C.dim}66`, borderRadius: 9, padding: '10px 16px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            {t('ui.action.cancelSelection')}
          </button>
        )}
        {!allBots && isMyTurn && !pendingCapture && <AdviceButton onClick={askAdvice} />}
        {!allBots && pendingCapture && showNextBtn && (
          <button onClick={continueAfterCapture} style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 9, padding: '10px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
            {t('games.kasino.ui.next')}
          </button>
        )}
      </div>

      {/* Tilarivi */}
      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
        extras={
          <button onClick={() => setShowInfo(v => !v)} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${showInfo ? C.gold + '55' : C.panelBorder}`, background: 'transparent', color: showInfo ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ℹ {t('games.kasino.ui.points')}
          </button>
        }
      />

      {/* Loki */}
      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)} renderMessage={renderLogMessage} />


      {/* Vaihtoehdot-modaali */}
      {showOptions && isMyTurn && (() => {
        const hand = G.players[0].hand;
        const table = G.table;
        const n = table.length;

        // Arvostus: pisteet → padat → korttimäärä (kaikki laskevasti)
        const optScore = (cards, isMokki = false) => {
          let pts = 0;
          for (const c of cards) {
            if (isRuutuKymppi(c)) pts += 2;
            else if (isPataKakkonen(c)) pts += 1;
            else if (c.r === 'A') pts += 1;
          }
          if (isMokki) pts += 1;
          const spades = cards.filter(c => c.s === '♠').length;
          return pts * 10000 + spades * 100 + cards.length;
        };

        // Pöytäkaappaukset — tallennetaan kortit tekstin sijaan
        const captures = [];
        for (const hc of hand) {
          const hv = handVal(hc);
          for (let mask = 1; mask < (1 << n); mask++) {
            const sel = table.filter((_, i) => (mask >> i) & 1);
            if (canPartition(sel, hv)) {
              const isMokki = sel.length === table.length && G.builds.length === 0;
              captures.push({ hc, tableCards: sel, isMokki, score: optScore([hc, ...sel], isMokki) });
            }
          }
        }
        captures.sort((a, b) => b.score - a.score);

        // Omat rakennelmakaappaukset
        const ownCaptures = G.builds
          .filter(b => b.ownerIdx === 0)
          .flatMap(b => hand.filter(hc => handVal(hc) === b.value).map(hc => ({
            hc, build: b, score: optScore([hc, ...b.cards])
          })))
          .sort((a, b) => b.score - a.score);

        // Kähvellykset
        const steals = G.builds
          .filter(b => b.ownerIdx !== 0)
          .flatMap(b => hand.filter(hc => handVal(hc) === b.value).map(hc => ({
            hc, build: b, owner: G.players[b.ownerIdx].name, score: optScore([hc, ...b.cards])
          })))
          .sort((a, b) => b.score - a.score);

        // Rakennelmat — pisteet lasketaan koko tulevasta saaliista (hc + pöytäkortit + kaappaaja)
        const builds = [];
        for (const hc of hand) {
          const hv = handVal(hc);
          for (let mask = 0; mask < (1 << n); mask++) {
            const sel = table.filter((_, i) => (mask >> i) & 1);
            const bv = hv + sel.reduce((s, c) => s + tableVal(c), 0);
            if (bv > buildCap) continue;
            const capturer = hand.find(c => c.id !== hc.id && handVal(c) === bv);
            if (capturer) builds.push({ hc, tableCards: sel, value: bv, capturer,
              score: optScore([hc, ...sel, capturer]) });
          }
        }
        builds.sort((a, b) => b.score - a.score);

        const hasAny = captures.length || ownCaptures.length || steals.length || builds.length;

        // Pieni kortti — sama koko kuin pöydällä mobiilissa
        const CS = ({ card }) => (
          <Card card={card} xsmall showBadges backStyle={BACKS[cardBack]} />
        );
        // Rivin wrapper
        const CardRow = (/** @type {{ children?: any, accent?: string }} */ { children, accent }) => (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '6px 2px',
            borderBottom: `1px solid ${C.panelBorder}33`, flexWrap: 'wrap',
            borderLeft: accent ? `3px solid ${accent}` : undefined,
            paddingLeft: accent ? 8 : 2 }}>
            {children}
          </div>
        );
        const Sep = ({ color = C.gold, ch = '←' }) => (
          <span style={{ color, fontFamily: 'Georgia,serif', fontSize: 14, flexShrink: 0, opacity: 0.8 }}>{ch}</span>
        );

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={() => setShowOptions(false)}>
            <div role="dialog" aria-modal="true" aria-label={t('games.kasino.ui.options')} style={{ background: C.bg, border: `1px solid ${C.panelBorder}`, borderRadius: '16px 16px 0 0', padding: '16px', maxHeight: '65vh', overflowY: 'auto', maxWidth: 560, width: '100%', margin: '0 auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Georgia,serif', fontSize: 14, color: C.gold, letterSpacing: 1 }}>{t('games.kasino.ui.optionsTitle')}</span>
                <button onClick={() => setShowOptions(false)} aria-label={t('ui.shared.close')} style={{ background: 'transparent', border: 'none', color: C.dim, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>

              {!hasAny && <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, padding: '8px 0' }}>{t('games.kasino.ui.noOptions')}</div>}

              {(captures.length > 0 || ownCaptures.length > 0) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7 }}>{t('games.kasino.ui.capturesHeader')}</span>
                    <button onClick={() => setHelpTerm(t => t === 'kaappaus' ? null : 'kaappaus')} style={{ background: 'transparent', border: `1px solid ${helpTerm === 'kaappaus' ? C.gold : C.dim + '55'}`, borderRadius: 6, padding: '1px 7px', fontSize: 10, color: helpTerm === 'kaappaus' ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{t('games.kasino.ui.captureMode')} {helpTerm === 'kaappaus' ? '▴' : '▾'}</button>
                  </div>
                  {helpTerm === 'kaappaus' && (
                    <div style={{ marginBottom: 8, padding: '7px 10px', background: `${C.gold}0e`, borderLeft: `2px solid ${C.gold}66`, borderRadius: '0 6px 6px 0', fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>🎯 {t('games.kasino.ui.captureMode')}</span>{t('games.kasino.ui.captureHelpA')}<span style={{ color: '#7ec8a0' }}>{t('games.kasino.ui.mokkiWord')}</span>{t('games.kasino.ui.captureHelpB')}
                    </div>
                  )}
                  {captures.map((c, i) => (
                    <CardRow key={i} accent={c.isMokki ? C.tikki : undefined}>
                      <CS card={c.hc} />
                      <Sep />
                      {c.tableCards.map(tc => <CS key={tc.id} card={tc} />)}
                      {c.isMokki && <span style={{ fontSize: 11, color: C.tikki, fontFamily: 'sans-serif', fontWeight: 700 }}>{t('games.kasino.ui.mokki')}</span>}
                    </CardRow>
                  ))}
                  {ownCaptures.map((c, i) => (
                    <CardRow key={i}>
                      <CS card={c.hc} />
                      <Sep />
                      {c.build.cards.map(bc => <CS key={bc.id} card={bc} />)}
                      <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim }}>{t('games.kasino.ui.own')}</span>
                    </CardRow>
                  ))}
                </div>
              )}

              {steals.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>{t('games.kasino.ui.stealsHeader')}</div>
                  {steals.map((s, i) => (
                    <CardRow key={i} accent='#e09060'>
                      <CS card={s.hc} />
                      <Sep color='#e09060' />
                      {s.build.cards.map(bc => <CS key={bc.id} card={bc} />)}
                      <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#e09060' }}>{s.owner}</span>
                    </CardRow>
                  ))}
                </div>
              )}

              {builds.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.gold, letterSpacing: 1.5, opacity: 0.7 }}>{t('games.kasino.ui.buildsHeader')}</span>
                    <button onClick={() => setHelpTerm(t => t === 'rakennus' ? null : 'rakennus')} style={{ background: 'transparent', border: `1px solid ${helpTerm === 'rakennus' ? C.gold : C.dim + '55'}`, borderRadius: 6, padding: '1px 7px', fontSize: 10, color: helpTerm === 'rakennus' ? C.gold : C.dim, cursor: 'pointer', fontFamily: 'sans-serif' }}>{t('games.kasino.ui.buildMode')} {helpTerm === 'rakennus' ? '▴' : '▾'}</button>
                  </div>
                  {helpTerm === 'rakennus' && (
                    <div style={{ marginBottom: 8, padding: '7px 10px', background: `${C.gold}0e`, borderLeft: `2px solid ${C.gold}66`, borderRadius: '0 6px 6px 0', fontFamily: 'sans-serif', fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>🔨 {t('games.kasino.ui.buildMode')}</span>{t('games.kasino.ui.buildHelp')}
                    </div>
                  )}
                  {builds.map((b, i) => (
                    <CardRow key={i} accent='#7ec8a0'>
                      <CS card={b.hc} />
                      {b.tableCards.length > 0 && <Sep color={C.dim} ch='+' />}
                      {b.tableCards.map(tc => <CS key={tc.id} card={tc} />)}
                      <Sep color='#7ec8a0' ch={`→ ${b.value}`} />
                      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>🔑</span>
                      <Card card={b.capturer} xsmall showBadges highlight backStyle={BACKS[cardBack]} />
                    </CardRow>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PendingResult overlay — allBots-tilan loppunäyttö */}

    </div>
  );
}
