import { useState, useEffect, useRef } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, newDeck, korttia, shuffledAINames, lblColored, BOT_RESULT_DELAY } from '../shared/helpers.js';
import FanStack from '../shared/FanStack.jsx';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import GameLog from '../shared/GameLog.jsx';
import GameStatusBar from '../shared/GameStatusBar.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { useGameLog } from '../shared/useGameLog.js';


const SPEC   = { J: 1, Q: 2, K: 3, A: 4 };
const isSpec = r => r in SPEC;

function deal(nPlayers) {
  const deck = newDeck();
  const piles = Array.from({ length: nPlayers }, () => []);
  deck.forEach((c, i) => piles[i % nPlayers].push(c));
  return piles;
}

import { useT } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

// Mestarin neuvo Herolle: valmiustieto ennen käännöstä (Läpsyssä ei ole pelivalintaa,
// Mestarin etu on muisti). Lukee jaettua muistia: seenByRank (kortinlaskija) ja
// knownBottoms[0] (Heron oman pinon tunnettu pohjajärjestys — kortit jotka Hero
// itse voitti näkyviltä, eli tiedon voisi muistaa itsekin).
// Palauttaa { type, card?, rank?, n? } — type vastaa games.lapsy.advice.* -avainta.
export function lapsyAdvice(memory, center, heroIdx = 0) {
  const top = center[0];
  if (top) {
    const kb = memory.knownBottoms[heroIdx];
    if (kb && kb.totalAbove === 0 && kb.cards.length > 0 && kb.cards[0].r === top.r) {
      return { type: 'predicted', card: kb.cards[0] };
    }
    const n = memory.seenByRank[top.r] || 0;
    if (n >= 2) return { type: 'alert', rank: top.r, n };
  }
  return { type: 'flip' };
}

// Suljettu arvojoukko: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'idle'|'match'|'gameover'} Vaihe */

export default function Lapsy({ onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showCounts = true, showLastPlay = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen] = useState('select');
  const [nP, setNP]         = useState(playerCount);
  const [phase, setPhase]   = useState(/** @type {Vaihe} */ ('idle'));
  const [center, setCenter] = useState([]);
  const [piles, setPiles]   = useState([]);
  const [curTurn, setCur]   = useState(0);
  const [challenge, setCh]  = useState(null);
  const [msg, setMsg]       = useState('');
  const cardBack = 'ilves';
  const logOpen = showLog; // omistaja on App, ks. onShowLogChange
  // Paljastus ja asetus ovat eri asiat (kompositioauditointi H6, päätös 3.9.2026).
  // `seeAll` on App:n omistama asetus joka ei tallennu, ja `revealAll` on tämän pelin
  // näkymätila. Katselutila pakottaa paljastuksen päälle koskematta asetukseen, ja
  // `startGame` palauttaa näkymän asetuksen mukaiseksi.
  const [revealAll, setRevealAll] = useState(seeAll);
  useEffect(() => { setRevealAll(seeAll); }, [seeAll]);
  const [shuffling, setShuffling] = useState(false);
  const [advice, setAdvice]  = useState(null); // { text } | null
  const [slapResult, setSR]   = useState(null);
  const [bestMs, setBestMs]   = useState(null);
  const [failReveal, setFR]  = useState(null);
  const [flipAnim,  setFA]   = useState(null); // { playerIdx, card }
  const [cardBackState]      = [cardBack];
  const [aiNames]            = useState(() => shuffledAINames(playerNames));

  const pilesRef       = useRef([]);
  const finishOrderRef = useRef([]);
  const centerRef    = useRef([]);
  const phaseRef     = useRef(/** @type {Vaihe} */ ('idle'));
  const curRef       = useRef(0);
  const chRef        = useRef(null);
  const sndRef       = useRef(soundOn);
  const aiLevelRef   = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös.
  // Muisti (memoryRef) on jaettu laskuri jonka YLLÄPITO on ehdoton, koska myös Heron
  // Mestarin neuvo lukee sitä. Muistin KÄYTTÖ portitetaan istuinkohtaisesti lukuhetkellä.
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  // AI memory: kortinlaskija (normal) tracks seen ranks; tosilaskija (hard) also tracks collected-card order
  const memoryRef    = useRef({ seenByRank: {}, knownBottoms: {} });
  const predMatchRef = useRef(false); // tosilaskija: true when the next flip was predicted
  const matchTimeRef = useRef(null);
  const recentMatch  = useRef(false);
  const aiSlapTmrs   = useRef([]);
  const failTmr      = useRef(null);
  const duelTmr      = useRef(null);
  const halvePending = useRef(false);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraTimerRefs: [failTmr] });
  const allBotNamesRef = useRef([]);
  const onSnapshotRef = useRef(onSnapshot);
  useEffect(() => { onSnapshotRef.current = onSnapshot; }, [onSnapshot]);

  useEffect(() => { pilesRef.current = piles; }, [piles]);
  useEffect(() => { centerRef.current = center; }, [center]);
  useEffect(() => { setAdvice(null); }, [center, curTurn, phase]); // neuvo vanhenee tilamuutoksista
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { curRef.current = curTurn; }, [curTurn]);
  useEffect(() => { chRef.current = challenge; }, [challenge]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);

  const { log, logRef, addLog, resetLog } = useGameLog({
    onMessage: setMsg, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => ({
      players: (pilesRef.current ?? []).map((pile, i) => ({
        name: allBotNamesRef.current[i] ?? `Bot${i + 1}`,
        isHuman: false, hand: pile ?? [], cardCount: pile?.length ?? 0, score: null })),
      tableCards: (centerRef.current ?? []).slice(-5),
    }),
  });


  const pName = i => allBotsRef.current ? (allBotNamesRef.current[i] ?? `Bot${i + 1}`) : (i === 0 ? 'Hero' : aiNames[i - 1]);

  const M = {
    gameStart: t('games.lapsy.msg.gameStart'),
    winChallengeNoRival: (winner, target) => t('games.lapsy.msg.winChallengeNoRival', { winner, target }),
    respondedSpecialNoRival: (player, card) => t('games.lapsy.msg.respondedSpecialNoRival', { player, card }),
    respondedSpecial: (player, card, target, count) => t('games.lapsy.msg.respondedSpecial', { player, card, target, cards: korttia(count) }),
    failedResponse: (player, winner, count) => t('games.lapsy.msg.failedResponse', { player, winner, cards: korttia(count) }),
    noResponse: (player, left) => t('games.lapsy.msg.noResponse', { player, cards: korttia(left) }),
    challengedNoRival: (player, card) => t('games.lapsy.msg.challengedNoRival', { player, card }),
    challenged: (player, card, target, count) => t('games.lapsy.msg.challenged', { player, card, target, cards: korttia(count) }),
    flipped: (player, card) => t('games.lapsy.msg.flipped', { player, card }),
    match: (rank) => t('games.lapsy.msg.match', { rank }),
    wrongSlap: (player) => t('games.lapsy.msg.wrongSlap', { player }),
    correctSlap: (player, ms, count) => t('games.lapsy.msg.correctSlap', { player, ms: ms ? ` (${ms} ms)` : '', count }),
    heroTooSlow: t('games.lapsy.msg.heroTooSlow'),
    heroSlapNoMatch: t('games.lapsy.msg.heroSlapNoMatch'),
    gameOver: (playerName) => playerName ? t('games.lapsy.msg.gameOverWin', { name: playerName }) : t('games.lapsy.msg.gameOverEnd'),
    duelStart: (a, b) => t('games.lapsy.msg.duelStart', { a, b }),
    duelHalved: (counts) => t('games.lapsy.msg.duelHalved', { counts }),
  };

  // Läpsyn pöytä on kaksi useStatea ja niiden ajastinpeilit, ei yhtä G-oliota. Peili
  // kirjoitetaan samassa lauseessa kuin state, koska ajastimesta herännyt läpsäisy lukee
  // sen ennen renderiä. Pari on nimetty tähän, koska katselutilan snapshot lukee juuri
  // näitä refejä: tila on kirjoitettava ennen lokiriviä (kompositioauditointi H4).
  function setBoard(newPiles, newCenter) {
    setPiles(newPiles);   pilesRef.current  = newPiles;
    setCenter(newCenter); centerRef.current = newCenter;
  }

  function updateDuelTimer(currentPiles) {
    const active = currentPiles.filter(p => p.length > 0);
    if (active.length === 2) {
      if (!duelTmr.current) {
        const names = currentPiles.map((p, i) => p.length > 0 ? pName(i) : null).filter(Boolean);
        addLog(M.duelStart(names[0], names[1]));
        halvePending.current = false;
        duelTmr.current = tm(() => { halvePending.current = true; duelTmr.current = null; }, 30000);
      }
    } else {
      clearTimeout(duelTmr.current);
      duelTmr.current = null;
      halvePending.current = false;
    }
  }

  function startGame(forcedCount, allBotsMode = false) {
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    setRevealAll(seeAll || allBotsMode);
    pausedRef.current = false; setPaused(false);
    clearTimeout(aiTmr.current);
    aiSlapTmrs.current.forEach(clearTimeout);
    clearTimeout(failTmr.current); setFR(null);
    clearTimeout(duelTmr.current); duelTmr.current = null; halvePending.current = false;
    const count = forcedCount ?? nP;
    const initPiles = deal(count);
    setBoard(initPiles, []);
    setCur(0); curRef.current = 0;
    setPhase('idle'); phaseRef.current = 'idle';
    setCh(null); chRef.current = null;
    setSR(null);
    finishOrderRef.current = []; // eliminointijärjestys, ensin poistunut ensin
    resetLog();
    memoryRef.current = { seenByRank: {}, knownBottoms: {} };
    predMatchRef.current = false;
    addLog(M.gameStart);
    setScreen('game');
    setShuffling(true);
    tm(() => {
      maybeAIFlip(0, initPiles, [], null);
      if (count === 2) updateDuelTimer(initPiles);
    }, 2300);
  }

  function startBotBattle() {
    allBotNamesRef.current = shuffledAINames(playerNames).slice(0, nP);
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }


  function nextTurn(fromIdx, newPiles, newCenter, ch) {
    const activeNow = newPiles.filter(p => p.length > 0);
    if (activeNow.length <= 1) {
      const winnerIdx = newPiles.findIndex(p => p.length > 0);
      if (newCenter.length > 0 && winnerIdx >= 0) {
        giveCenter(winnerIdx, newPiles, newCenter);
      } else {
        checkGameOver(newPiles);
      }
      return;
    }
    if (ch) {
      const target = ch.targetIdx;
      if (newPiles[target].length === 0) {
        addLog(M.winChallengeNoRival(pName(ch.byIdx), pName(target)));
        giveCenter(ch.byIdx, newPiles, newCenter);
        return;
      }
      setCur(target); curRef.current = target;
      tm(() => maybeAIFlip(target, newPiles, newCenter, ch), 100 + Math.random() * 80);
      return;
    }
    const n = newPiles.length;
    let next = (fromIdx + 1) % n, tries = 0;
    while (newPiles[next].length === 0 && tries < n) { next = (next + 1) % n; tries++; }
    if (tries >= n) { checkGameOver(newPiles); return; }
    setCur(next); curRef.current = next;
    tm(() => maybeAIFlip(next, newPiles, newCenter, null), 500);
  }

  function maybeAIFlip(idx, piles, center, ch) {
    if (phaseRef.current === 'gameover') return;
    if (idx === 0 && !allBotsRef.current) return;
    if (piles[idx].length === 0) { nextTurn(idx, piles, center, chRef.current); return; }
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 800 + Math.random() * 100;
    const delay = ch ? Math.min(1000, baseDelay * 0.6) : baseDelay + Math.random() * 200;
    const schedFlip = () => {
      if (pausedRef.current) { tm(schedFlip, 300); return; }
      doFlip(idx, piles, center);
    };
    tm(schedFlip, delay);
  }

  function doFlip(playerIdx, curPiles, curCenter) {
    if (phaseRef.current === 'gameover') return;
    const pile = [...curPiles[playerIdx]];
    if (pile.length === 0) { nextTurn(playerIdx, curPiles, curCenter, chRef.current); return; }
    const card = pile.shift();
    const newCenter = [card, ...curCenter];
    const newPiles = curPiles.map((p, i) => i === playerIdx ? pile : p);
    if (sndRef.current) SFX.flip();
    setFA({ playerIdx, card });
    tm(() => setFA(null), 1900);
    setBoard(newPiles, newCenter);

    // AI memory update — ylläpito on ehdoton (myös Heron Mestari-neuvo lukee tätä);
    // botit LUKEVAT muistia edelleen vain tasonsa mukaan (handleMatch portittaa
    // anticipationin normal/hard ja predictionin hard per istuin), joten
    // bottikäytös ei muutu ylläpidon laajentamisesta.
    {
      const mem = memoryRef.current;
      mem.seenByRank[card.r] = (mem.seenByRank[card.r] || 0) + 1;
      const kb = mem.knownBottoms[playerIdx];
      if (kb) {
        if (kb.totalAbove > 0) {
          kb.totalAbove--;           // burned one unknown card from above the known section
        } else if (kb.cards.length > 0) {
          const predictedCard = kb.cards.shift(); // consume the predicted card
          // If this predicted card matches the current top → we foresaw this exact match
          if (curCenter.length > 0 && predictedCard.r === curCenter[0].r) {
            predMatchRef.current = true;
          }
        }
      }
    }

    if (curCenter.length > 0 && curCenter[0].r === card.r) {
      handleMatch(newPiles, newCenter, playerIdx); return;
    }
    const ch = chRef.current;
    if (ch) {
      if (isSpec(card.r)) {
        if (sndRef.current) SFX.challenge();
        const nn = newPiles.length;
        let target2 = (playerIdx + 1) % nn, t2 = 0;
        while ((newPiles[target2].length === 0 || target2 === playerIdx) && t2 < nn) { target2 = (target2 + 1) % nn; t2++; }
        if (t2 >= nn || target2 === playerIdx) {
          addLog(M.respondedSpecialNoRival(pName(playerIdx), lblColored(card)));
          giveCenter(playerIdx, newPiles, newCenter); return;
        }
        const newCh = { byIdx: playerIdx, targetIdx: target2, cardsLeft: SPEC[card.r], specRank: card.r };
        setCh(newCh); chRef.current = newCh;
        const count = SPEC[card.r];
        addLog(M.respondedSpecial(pName(playerIdx), lblColored(card), pName(target2), count));
        nextTurn(playerIdx, newPiles, newCenter, newCh);
      } else {
        const left = ch.cardsLeft - 1;
        if (left <= 0) {
          addLog(M.failedResponse(pName(playerIdx), pName(ch.byIdx), newCenter.length));
          setCh(null); chRef.current = null;
          setFR({ card, winner: ch.byIdx, n: newCenter.length });
          clearTimeout(failTmr.current);
          failTmr.current = tm(() => { setFR(null); giveCenter(ch.byIdx, newPiles, newCenter); }, 1600);
        } else {
          const newCh = { ...ch, cardsLeft: left };
          setCh(newCh); chRef.current = newCh;
          addLog(M.noResponse(pName(playerIdx), left));
          nextTurn(playerIdx, newPiles, newCenter, newCh);
        }
      }
      return;
    }
    if (isSpec(card.r)) {
      if (sndRef.current) SFX.challenge();
      const n = newPiles.length;
      let target = (playerIdx + 1) % n, t = 0;
      while ((newPiles[target].length === 0 || target === playerIdx) && t < n) { target = (target + 1) % n; t++; }
      if (t >= n || target === playerIdx) {
        addLog(M.challengedNoRival(pName(playerIdx), lblColored(card)));
        giveCenter(playerIdx, newPiles, newCenter); return;
      }
      const newCh = { byIdx: playerIdx, targetIdx: target, cardsLeft: SPEC[card.r], specRank: card.r };
      setCh(newCh); chRef.current = newCh;
      const count2 = SPEC[card.r];
      addLog(M.challenged(pName(playerIdx), lblColored(card), pName(target), count2));
      nextTurn(playerIdx, newPiles, newCenter, newCh);
      return;
    }
    addLog(M.flipped(pName(playerIdx), lblColored(card)));
    nextTurn(playerIdx, newPiles, newCenter, null);
  }

  function handleMatch(piles, center, flippedBy) {
    setPhase('match'); phaseRef.current = 'match';
    setCh(null); chRef.current = null;
    matchTimeRef.current = performance.now();
    addLog(M.match(center[0].r));

    const matchRank = center[0].r;
    const mem = memoryRef.current;

    // Kortinlaskija (normal + hard): anticipation from how many of this rank were seen BEFORE
    // seenByRank already includes both matching cards → subtract 2 for prior sightings
    const prevSeen = Math.max(0, (mem.seenByRank[matchRank] || 0) - 2);
    // Tosilaskija (hard): additional bonus if the exact card was predicted from known pile order
    const predFlag = predMatchRef.current;
    predMatchRef.current = false; // consume

    aiSlapTmrs.current.forEach(clearTimeout);
    aiSlapTmrs.current = piles.map((pile, i) => {
      if ((i === 0 && !allBotsRef.current) || pile.length === 0) return null;
      const level = botLevelsRef.current?.[i] ?? aiLevelRef.current;
      const anticipation = (level === 'normal' || level === 'hard')
        ? Math.min(prevSeen / 2, 1.0) // 0.0 → 0.5 → 1.0
        : 0;
      const predicted = level === 'hard' && predFlag;
      // Per-level timing: avg = minDelay + spread/2 (before bonuses)
      // beginner ~2400ms, normal ~1700ms, hard ~1000ms
      // Botbench-baseline 17.7.2026 paljasti epämonotonisuuden: vanha beginner
      // (~1550ms) oli keskimäärin NOPEAMPI kuin normal (~1700ms), joten Oppipoika
      // voitti Kisällin. Korjaus hidasti Oppipoikaa; normal/hard ennallaan, jotta
      // ihmistä vastaan pelattava taso ei muutu. ~300 ms:n ero ei vielä riittänyt
      // (voitot 50/50, koska osa voitoista ratkeaa haastekorteilla, ei läpsyillä),
      // joten porras vastaa nyt hard↔normal-eroa. Todennus: docs/BOTBENCH.md.
      const { minDelay, spread } =
        level === 'beginner' ? { minDelay: 1500, spread: 1800 } :
        level === 'normal'   ? { minDelay: 1100, spread: 1200 } :
        level === 'hard'     ? { minDelay: 500,  spread: 1000 } :
                               { minDelay: 1100, spread: 1200 };
      // Anticipation (card counting) and prediction shorten effective minimum
      const anticipationBonus = anticipation * 200;
      const predictBonus      = predicted ? 150 : 0;
      const effectiveMin = Math.max(60, minDelay - anticipationBonus - predictBonus);
      const delay = effectiveMin + Math.random() * spread;
      return tm(() => {
        if (phaseRef.current !== 'match') return;
        const ms = Math.round(performance.now() - matchTimeRef.current);
        doSlap(i, pilesRef.current, centerRef.current, ms);
      }, delay);
    }).filter(Boolean);
  }

  function doSlap(playerIdx, curPiles, curCenter, ms) {
    if (phaseRef.current !== 'match') return;
    setPhase('idle'); phaseRef.current = 'idle';
    aiSlapTmrs.current.forEach(clearTimeout);
    if (curCenter.length < 2 || curCenter[0].r !== curCenter[1].r) {
      if (sndRef.current) SFX.wrongSlap();
      if (curPiles[playerIdx].length === 0) {
        addLog(M.wrongSlap(pName(playerIdx)));
        nextTurn(playerIdx, curPiles, curCenter, chRef.current);
        return;
      }
      const lostCard = curPiles[playerIdx][0];
      const newPiles = curPiles.map((p, i) => i === playerIdx ? p.slice(1) : p);
      const newCenter = [lostCard, ...curCenter];
      setBoard(newPiles, newCenter);
      addLog(M.wrongSlap(pName(playerIdx)));
      // Sakkokortti voi muodostaa uuden parin keskelle — silloin peli jatkuu läpsäistävänä parina,
      // ei vuoronvaihtona (muuten pari jää lukituksi eikä sitä voi enää laillisesti läpsäistä)
      if (newCenter.length >= 2 && newCenter[0].r === newCenter[1].r) {
        handleMatch(newPiles, newCenter, playerIdx);
      } else {
        nextTurn(playerIdx, newPiles, newCenter, chRef.current);
      }
      return;
    }
    if (sndRef.current) { SFX.slap(); tm(() => SFX.winPile(), 200); }
    const n = curCenter.length;
    addLog(M.correctSlap(pName(playerIdx), ms, n));
    if (playerIdx === 0 && ms && !allBotsRef.current) {
      setBestMs(prev => prev === null || ms < prev ? ms : prev);
    }
    setSR({ winner: playerIdx, ms, n }); tm(() => setSR(null), 2000);
    giveCenter(playerIdx, curPiles, curCenter);
  }

  function humanSlap() {
    if (allBotsRef.current) return;
    if (phaseRef.current !== 'match') {
      if (recentMatch.current) { return; }
      if (sndRef.current) SFX.wrongSlap();
      if (pilesRef.current[0].length === 0) { addLog(M.heroSlapNoMatch); return; }
      setPhase('idle'); phaseRef.current = 'idle';
      const lostCard = pilesRef.current[0][0];
      const newPiles = pilesRef.current.map((p, i) => i === 0 ? p.slice(1) : p);
      const newCenter = [lostCard, ...centerRef.current];
      setBoard(newPiles, newCenter);
      addLog(M.heroSlapNoMatch);
      // Sakkokortti voi muodostaa uuden parin keskelle — sama korjaus kuin doSlapissa
      if (newCenter.length >= 2 && newCenter[0].r === newCenter[1].r) {
        handleMatch(newPiles, newCenter, 0);
      }
      return;
    }
    const ms = Math.round(performance.now() - matchTimeRef.current);
    doSlap(0, pilesRef.current, centerRef.current, ms);
  }

  function humanFlip() {
    if (allBotsRef.current) return;
    if (curRef.current !== 0 || phaseRef.current !== 'idle') return;
    if (pilesRef.current[0].length === 0) return;
    doFlip(0, pilesRef.current, centerRef.current);
  }

  function askAdvice() {
    const a = lapsyAdvice(memoryRef.current, centerRef.current, 0);
    setAdvice({
      text: t('games.lapsy.advice.' + a.type, {
        card: a.card ? lbl(a.card) : undefined, rank: a.rank, n: a.n,
      }),
    });
  }

  function recordEliminated(newPiles) {
    const alreadyOut = finishOrderRef.current;
    const newlyOut = newPiles
      .map((p, i) => i)
      .filter(i => newPiles[i].length === 0 && !alreadyOut.includes(i));
    if (newlyOut.length > 0) {
      const updated = [...alreadyOut, ...newlyOut];
      finishOrderRef.current = updated;
    }
  }

  function giveCenter(winnerIdx, curPiles, curCenter) {
    recentMatch.current = true;
    tm(() => { recentMatch.current = false; }, 800);
    const newPiles = curPiles.map((p, i) => i === winnerIdx ? [...p, ...[...curCenter].reverse()] : p);

    // Tosilaskija: memorise the order of cards now at the bottom of the winner's pile.
    // Ylläpito ehdoton (Heron neuvo lukee tätä); botit lukevat vain hard-tasolla.
    {
      const mem = memoryRef.current;
      // Cards go to bottom in reversed center order — same as [...curCenter].reverse()
      mem.knownBottoms[winnerIdx] = {
        cards: [...curCenter].reverse(), // first element = first card to come up from known section
        totalAbove: curPiles[winnerIdx].length, // unknown cards sitting above the new known section
      };
    }

    // Kaksintaistelu: puolita pinot kun 30 s on kulunut ja kasa tyhjenee
    let finalPiles = newPiles;
    let halvedCounts = /** @type {string|null} */ (null);
    if (halvePending.current && newPiles.filter(p => p.length > 0).length === 2) {
      halvePending.current = false;
      finalPiles = newPiles.map(p => p.length === 0 ? p : p.slice(0, Math.ceil(p.length / 2)));
      halvedCounts = finalPiles.map((p, i) => p.length > 0 ? `${pName(i)}: ${p.length}` : null).filter(Boolean).join(', ');
      // Käynnistä seuraava 30 s kello
      duelTmr.current = tm(() => { halvePending.current = true; duelTmr.current = null; }, 30000);
    }

    recordEliminated(finalPiles);
    setBoard(finalPiles, []);
    // Puolituksen rivi kertoo uudet pinot, joten se kirjoitetaan vasta tilan jälkeen (H4).
    if (halvedCounts !== null) addLog(M.duelHalved(halvedCounts));
    setCh(null); chRef.current = null;
    setPhase('idle'); phaseRef.current = 'idle';
    if (checkGameOver(finalPiles)) return;
    updateDuelTimer(finalPiles);
    setCur(winnerIdx); curRef.current = winnerIdx;
    tm(() => maybeAIFlip(winnerIdx, finalPiles, [], null), 800);
  }

  function checkGameOver(piles) {
    const active = piles.filter(p => p.length > 0);
    if (active.length <= 1) {
      setPhase('gameover'); phaseRef.current = 'gameover';
      const winner = piles.findIndex(p => p.length > 0);
      addLog(M.gameOver(winner >= 0 ? pName(winner) : null));
      const eliminated = finishOrderRef.current;
      const fullOrder  = winner >= 0
        ? [winner, ...[...eliminated].reverse()]
        : [...eliminated].reverse();
      const ranking = fullOrder.map((idx, pos) => ({
        name: pName(idx), place: pos + 1, isHuman: idx === 0 && !allBotsRef.current,
      }));
      // Ihmispelissä pidempi viive kuin katselutilassa: viimeinen läpsy ja sen ääni
      // ehtivät soida ennen kuin App vaihtaa tulosruutuun.
      tm(() => onResult?.({ ranking }), allBotsRef.current ? BOT_RESULT_DELAY : 1800);
      return true;
    }
    return false;
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <GameStartScreen
      icon={'👋'}
      title="LÄPSY"
      counts={[2, 3, 4]}
      value={nP}
      onCountChange={setNP}
      playerGroup={playerGroup}
      onPlayerGroupChange={onPlayerGroupChange}
      onStart={() => startGame()}
      onBotBattle={startBotBattle}
      botBattleSub={t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}
      isMobile={isMobile}
    />
  );

  if (!piles.length) return null;

  const top2 = center.slice(0, 2);
  const isMatch = top2.length === 2 && top2[0].r === top2[1].r;
  const humanPile = piles[0] || [];
  const humanTurn = curTurn === 0 && phase === 'idle' && humanPile.length > 0;
  const ch = challenge;

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 520, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />
      <TurnPrompt show={humanTurn} action={t('ui.turn.lapsy')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 12, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, height: isMobile ? 44 : 60, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>👋</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {allBots
        ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 6 : 12 }}>
            {piles.map((pile, pi) => (
              <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${curTurn === pi ? C.red + '55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px', transition: 'border-color 0.2s' }}>
                <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: curTurn === pi ? C.red : C.dim }}>
                  🤖 {pName(pi).slice(0, 8)}{curTurn === pi ? ' ●' : ''}
                </span>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', flex: 1 }}>
                  {revealAll
                    ? <>
                        {pile.slice(0, 6).map((c, ci) => <Card key={ci} card={c} small backStyle={BACKS[cardBack]} />)}
                        {pile.length > 6 && <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, alignSelf: 'center', flexShrink: 0 }}>+{pile.length - 6}</span>}
                      </>
                    : <FanStack count={pile.length} w={36} h={50} backStyle={BACKS[cardBack]} borderColor={curTurn === pi ? C.red + '88' : undefined} />
                  }
                </div>
                <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flexShrink: 0 }}>{pile.length}k</span>
              </div>
            ))}
          </div>
        )
        : (
          <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 6 : 12, flexWrap: 'wrap' }}>
            {piles.slice(1).map((pile, i) => {
              const pi = i + 1;
              return (
                <div key={pi} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.04)', border: `1px solid ${curTurn === pi ? C.red + '55' : C.panelBorder}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center', transition: 'border-color 0.2s' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: curTurn === pi ? C.red : C.dim, marginBottom: 5 }}>
                    🤖 {pName(pi)}{curTurn === pi ? ' ●' : ''}
                  </div>
                  <div style={{ margin: '0 auto' }}>
                    {revealAll
                      ? <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                          {pile.slice(0, 6).map((c, ci) => <Card key={ci} card={c} small backStyle={BACKS[cardBack]} />)}
                          {pile.length > 6 && <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, alignSelf: 'center' }}>+{pile.length - 6}</span>}
                        </div>
                      : <FanStack
                          count={pile.length}
                          w={44} h={60}
                          backStyle={BACKS[cardBack]}
                          borderColor={curTurn === pi ? C.red + '88' : undefined}
                        />}
                  </div>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, marginTop: 5 }}>{korttia(pile.length)}</div>
                </div>
              );
            })}
          </div>
        )
      }

      <div style={{ height: isMobile ? 28 : 36, marginBottom: isMobile ? 4 : 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {bestMs !== null && (
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.gold, opacity: 0.7, letterSpacing: 1 }}>
            {t('games.lapsy.ui.best', { ms: bestMs })}
          </div>
        )}
        {ch && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 14px', background: C.gold + '14', border: `1px solid ${C.gold}55`, borderRadius: 20 }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold }}>{t('games.lapsy.ui.challenge', { name: pName(ch.byIdx) })}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: C.gold }}>{ch.cardsLeft}</span>
          </div>
        )}
      </div>

      <div style={{ height: isMobile ? 34 : 46, marginBottom: isMobile ? 4 : 10 }}>
        {failReveal && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(224,92,59,0.08)', border: `1px solid ${C.red}44`, borderRadius: 10, animation: 'fadeIn 0.25s ease' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.red, flexShrink: 0 }}>{t('games.lapsy.ui.wonChallenge', { winner: pName(failReveal.winner), cards: korttia(failReveal.n) })}</span>
            <span style={{ background: '#f8f2e6', borderRadius: 5, padding: '2px 8px', fontFamily: 'Georgia,serif', fontWeight: 700, fontSize: 16, color: SUIT_COLOR[failReveal.card.s] }}>{failReveal.card.r}{failReveal.card.s}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 16 : 28, marginBottom: isMobile ? 8 : 16, padding: isMobile ? '6px 0' : '14px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', marginBottom: 8, letterSpacing: 1.5 }}>{t('ui.shared.pileLabel')} · {center.length} {t('ui.shared.pcs')}</div>
          <div style={{ position: 'relative', width: 82, height: 130, margin: '0 auto' }}>
            {/* Flippaaja-animaatio */}
            {flipAnim && (
              <div key={flipAnim.card.id} style={{
                position: 'absolute',
                left: '50%',
                top: flipAnim.playerIdx === 0 ? 'auto' : '-44px',
                bottom: flipAnim.playerIdx === 0 ? '-44px' : 'auto',
                transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(13,22,18,0.95)',
                border: `1px solid ${C.panelBorder}`,
                borderRadius: 16, padding: '3px 9px',
                whiteSpace: 'nowrap', zIndex: 30,
                animation: flipAnim.playerIdx === 0 ? 'flipFromBottom 1.9s ease forwards' : 'flipFromTop 1.9s ease forwards',
                pointerEvents: 'none',
              }}>
                <span style={{
                  background: '#f8f2e6', borderRadius: 4, padding: '1px 4px',
                  fontSize: 11, fontWeight: 700, lineHeight: 1.3,
                  color: SUIT_COLOR[flipAnim.card.s],
                }}>
                  {flipAnim.card.r}{flipAnim.card.s}
                </span>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>
                  {pName(flipAnim.playerIdx)}
                </span>
              </div>
            )}
            {center.length > 2 && <div style={{ position: 'absolute', top: 0, left: 0, width: 82, height: 112, borderRadius: 9, background: '#f0eadc', border: '1px solid #ccc', transform: 'rotate(-5deg)', transformOrigin: 'bottom center', zIndex: 0 }} />}
            {top2.length > 1 && (
              <div style={{ position: 'absolute', top: 18, left: 2, width: 82, height: 112, borderRadius: 9, background: C.card, border: `2px solid ${isMatch ? C.red + 'bb' : '#bbb'}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6, zIndex: 1 }}>
                <div style={{ textAlign: 'center', color: SUIT_COLOR[top2[1].s], fontFamily: 'Georgia,serif', lineHeight: 1, opacity: 0.7 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{top2[1].r}</div>
                  <div style={{ fontSize: 18 }}>{top2[1].s}</div>
                </div>
              </div>
            )}
            {center.length > 0
              ? <div style={{ position: 'absolute', top: 0, left: 0, width: 82, height: 112, borderRadius: 9, background: C.card, border: `2px solid ${isMatch ? C.red : '#aaa'}`, boxShadow: isMatch ? `0 0 22px ${C.red}88` : '0 2px 8px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, animation: isMatch ? 'cardMatch 0.4s ease infinite' : 'none' }}>
                <div style={{ textAlign: 'center', color: SUIT_COLOR[center[0].s], fontFamily: 'Georgia,serif', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{center[0].r}</div>
                  <div style={{ fontSize: 28 }}>{center[0].s}</div>
                </div>
              </div>
              : <div style={{ position: 'absolute', top: 0, left: 0, width: 82, height: 112, borderRadius: 9, border: `1.5px dashed ${C.panelBorder}`, opacity: 0.4, zIndex: 2 }} />}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <button onClick={humanSlap} style={{ width: isMobile ? 110 : 108, height: isMobile ? 110 : 108, borderRadius: isMobile ? 55 : 54, background: isMatch ? `radial-gradient(circle at 40% 35%,${C.red}dd,#7a1500)` : `radial-gradient(circle at 40% 35%,#2a4a32,#0d2118)`, border: `3px solid ${isMatch ? C.red : C.panelBorder}`, color: isMatch ? C.text : C.dim, fontSize: isMobile ? 24 : 32, cursor: 'pointer', boxShadow: isMatch ? `0 0 32px ${C.red}88` : '0 4px 14px rgba(0,0,0,0.4)', transition: 'all 0.15s', animation: isMatch ? 'slapPulse 0.7s ease infinite' : 'none' }}>👋</button>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: isMatch ? C.red : C.dim, letterSpacing: 1.5, fontWeight: isMatch ? 700 : 400 }}>{isMatch ? t('games.lapsy.ui.slap') : t('games.lapsy.ui.slapIdle')}</span>
        </div>
      </div>

      <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: isMobile ? 4 : 8 }}>
        {slapResult && (
          <div style={{ padding: '4px 16px', background: '#4caf7d22', border: `1px solid #4caf7d66`, borderRadius: 20, fontFamily: 'sans-serif', fontSize: 12, color: '#88cc88' }}>
            {t('games.lapsy.msg.correctSlap', { player: pName(slapResult.winner), ms: slapResult.ms ? ` (${slapResult.ms} ms)` : '', count: slapResult.n || '' })}
          </div>
        )}
      </div>

      {!allBots && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: `2px solid ${humanTurn ? C.red + '66' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.2s' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: humanTurn ? C.red : C.dim, marginBottom: 6 }}>👤 Hero{curTurn === 0 ? ' ●' : ''}</div>
            <div>
              <FanStack
                count={humanPile.length}
                w={60} h={82}
                backStyle={BACKS[cardBack]}
                borderColor={humanTurn ? C.red + '88' : undefined}
              />
            </div>
            <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, marginTop: 5 }}>{korttia(humanPile.length)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <button onClick={humanFlip} disabled={!humanTurn} style={{ padding: '12px 22px', borderRadius: 10, border: `1px solid ${humanTurn ? C.red : C.dim + '44'}`, background: humanTurn ? `linear-gradient(135deg,${C.red},#8a1500)` : 'transparent', color: humanTurn ? C.text : C.dim + '66', fontFamily: 'Georgia,serif', fontSize: 13, fontWeight: 700, cursor: humanTurn ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>{t('games.lapsy.ui.flip')}</button>
            {humanTurn && <AdviceButton onClick={askAdvice} />}
          </div>
        </div>
      )}

      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
        accent={C.red}
        borderTop={false}
      >
        <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('games.lapsy.ui.goal')}
      </GameStatusBar>

      {allBots && phase !== 'gameover' && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}


      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)}
        headerBg="rgba(255,255,255,0.03)" rowBorder="1px solid rgba(42,26,26,0.5)"
        accentBg="rgba(200,50,30,0.04)" firstColor="#dd9988" restColor={C.dim} />
      <style>{`
        @keyframes slapPulse{0%,100%{box-shadow:0 0 32px ${C.red}88}50%{box-shadow:0 0 52px ${C.red}cc}}
        @keyframes cardMatch{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes flipFromTop{
          0%{opacity:0;transform:translateX(-50%) translateY(-10px)}
          18%{opacity:1;transform:translateX(-50%) translateY(0)}
          72%{opacity:1;transform:translateX(-50%) translateY(0)}
          100%{opacity:0;transform:translateX(-50%) translateY(-6px)}
        }
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flipFromBottom{
          0%{opacity:0;transform:translateX(-50%) translateY(10px)}
          18%{opacity:1;transform:translateX(-50%) translateY(0)}
          72%{opacity:1;transform:translateX(-50%) translateY(0)}
          100%{opacity:0;transform:translateX(-50%) translateY(6px)}
        }
      `}</style>

    </div>
  );
}
