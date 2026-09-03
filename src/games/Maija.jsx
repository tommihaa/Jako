import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { SUITS, RANKS, lbl, korttia, kortin, shuffle, cardName, sortHand as sortHandBy, shuffledAINames, lblColored, BOT_RESULT_DELAY } from '../shared/helpers.js';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import GameLog from '../shared/GameLog.jsx';
import GameStatusBar from '../shared/GameStatusBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import PoytaPanel from '../shared/PoytaPanel.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { useGameLog } from '../shared/useGameLog.js';
import { useGameState } from '../shared/useGameState.js';

// A=14 for combat comparisons — different from shared helpers (A=1)
const VAL = { A:14,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13 };

const isMaija = c => c && c.r === 'Q' && c.s === '♠';

// Q♠-minikortti (sama ulkoasu kuin valikon CardIcon, App.jsx) — korvaa Unicode-
// korttiglyyfin 🂭, joka renderöityy monella laitteella tofu-laatikkona. s = skaala.
const QCard = ({ s = 1 }) => (
  <span style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    width:26*s, height:34*s, background:'#f6efdd', borderRadius:Math.max(3, 4*s), lineHeight:1.05,
    boxShadow:'0 1px 3px rgba(0,0,0,0.4)', fontFamily:'Georgia,serif', flexShrink:0, verticalAlign:'middle' }}>
    <span style={{ fontSize:13*s, fontWeight:700, color:'#1a1a1a' }}>Q</span>
    <span style={{ fontSize:13*s, color:'#1a1a1a' }}>♠</span>
  </span>
);

function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v:VAL[r], id:`${r}${s}_${Math.random()}` }))));
}

function canBeat(attCard, defCard, trump) {
  if (isMaija(defCard)) return false;
  if (isMaija(attCard)) return false;
  if (defCard.s === attCard.s && defCard.v > attCard.v) return true;
  if (defCard.s === trump && attCard.s !== trump) return true;
  if (defCard.s === trump && attCard.s === trump && defCard.v > attCard.v) return true;
  return false;
}

// ── AI-päätöslogiikka (puhtaat funktiot) ─────────────────────────────
// Irrotettu runAIAttack/runAIDefendista, jotta sama logiikka ajaa botit ja Heron
// neuvon. Vain julkista tietoa (oma käsi, pöytä, poistopakka, valtti). Ei satunnaisuutta.

// Hyökkäys: palauttaa pelattavan korttitaulukon (saman maan ryhmä, Maija-dumppi
// priorisoituna, Mestarin valttihyökkäys pakan tyhjennyttyä).
function maijaPickAttack(hand, trump, defHandSize, discard, deckEmpty, level) {
  const maija = hand.find(isMaija);
  const treatsMaijaAsNormal = level === 'beginner';
  const bySuit = {};
  hand.forEach(c => {
    if ((treatsMaijaAsNormal || !isMaija(c)) && c.s !== trump) {
      if (!bySuit[c.s]) bySuit[c.s] = [];
      bySuit[c.s].push(c);
    }
  });
  if (!Object.keys(bySuit).length) {
    hand.forEach(c => { if (treatsMaijaAsNormal || !isMaija(c)) { if (!bySuit[c.s]) bySuit[c.s] = []; bySuit[c.s].push(c); } });
  }
  const suits = Object.values(bySuit).sort((a, b) => b.length - a.length);
  suits.forEach(grp => grp.sort((a, b) => level === 'beginner' ? b.v - a.v : a.v - b.v));
  // Monikorttihyökkäys on Kisällin kyky: Oppipoika lyö yhden kortin kerrallaan.
  // Ennen 26.7.2026 kaikki tasot löivät koko maan, jolloin Oppipoika sai pelin
  // vahvimman shedding-työkalun ilmaiseksi eikä Kisällille jäänyt erottavaa.
  const maxCards = level === 'beginner' ? 1 : defHandSize;
  let toPlay = (suits[0] || []).slice(0, Math.min((suits[0] || []).length, maxCards));

  if (deckEmpty && !maija && level === 'hard') {
    const myTrumps = hand.filter(c => c.s === trump && !isMaija(c));
    const trumpsDiscarded = discard.filter(c => c.s === trump).length;
    const trumpsElsewhere = 13 - trumpsDiscarded - myTrumps.length;
    if (myTrumps.length >= 2 && trumpsElsewhere <= 3) {
      toPlay = [...myTrumps].sort((a, b) => a.v - b.v).slice(0, defHandSize);
    }
  }
  if (maija && level !== 'beginner') {
    const otherSpades = hand.filter(c => c.s === '♠' && !isMaija(c)).sort((a, b) => a.v - b.v);
    toPlay = [maija, ...otherSpades].slice(0, defHandSize);
  }
  if (!toPlay.length) { toPlay = maija ? [maija] : [hand[0]]; }
  return toPlay;
}

// Puolustus: palauttaa { decisions, canBeatAll }. decisions = [{ ri, card }] siinä
// järjestyksessä kuin kaadot kannattaa tehdä (Mestari: tärkeimmät ensin). Tyhjä
// decisions = ei pysty kaatamaan mitään. Sivuvaikutukset (SFX) jäävät kutsujalle.
function maijaPickDefense(hand0, table, trump, deckEmpty, level) {
  let hand = [...hand0];

  const canBeatAll = (() => {
    let tmp = [...hand];
    for (const row of table) {
      if (row.def) continue;
      const best = tmp.filter(c => canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
      if (!best.length) return false;
      tmp = tmp.filter(c => c.id !== best[0].id);
    }
    return true;
  })();

  let trumpsNeeded = 0;
  {
    let tmp = [...hand];
    for (const row of table) {
      if (row.def) continue;
      const nonT2 = tmp.filter(c => c.s !== trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
      if (nonT2.length) { tmp = tmp.filter(c => c.id !== nonT2[0].id); }
      else {
        const trp2 = tmp.filter(c => c.s === trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
        if (trp2.length) { trumpsNeeded++; tmp = tmp.filter(c => c.id !== trp2[0].id); }
      }
    }
  }
  const cardsOnTable = table.filter(r => !r.def).length;
  let usesTrumpToBeat = canBeatAll;
  if (canBeatAll && trumpsNeeded > 0) {
    if (level === 'normal') usesTrumpToBeat = deckEmpty || cardsOnTable >= 3;
    else if (level === 'hard') usesTrumpToBeat = deckEmpty || cardsOnTable >= 2;
  }

  const rowOrder = [...table.keys()];
  if (level === 'hard') {
    const weight = (row) => row.def ? -1 : (isMaija(row.att) ? 100 : row.att.v);
    rowOrder.sort((a, b) => weight(table[b]) - weight(table[a]));
  }
  const decisions = [];
  for (const ri of rowOrder) {
    const row = table[ri];
    if (row.def) continue;
    const nonT = hand.filter(c => c.s !== trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
    const trp  = hand.filter(c => c.s === trump && canBeat(row.att, c, trump)).sort((a, b) => a.v - b.v);
    let chosen;
    if (canBeatAll && level === 'beginner') {
      chosen = [...nonT, ...trp].sort((a, b) => a.v - b.v)[0];
    } else {
      chosen = usesTrumpToBeat ? (nonT[0] || trp[0]) : nonT[0];
    }
    if (!chosen) continue;
    hand = hand.filter(c => c.id !== chosen.id);
    decisions.push({ ri, card: chosen });
  }
  return { decisions, canBeatAll };
}

// Mestarin neuvo Herolle (pelaaja 0): hard-tason logiikka, vain julkinen tieto.
// Palauttaa { type, cards?/card?, target? } — type vastaa games.maija.advice.* -avainta.
/** @param {*} g */
export function getAdvice(g) {
  const { phase, table } = g;
  if (!g) return null;
  if (phase === 'attacking' && g.attackerIdx === 0) {
    const hand = g.players[0].hand;
    if (!hand.length) return null;
    const defHandSize = g.players[g.defenderIdx].hand.length;
    const toPlay = maijaPickAttack(hand, g.trump, defHandSize, g.discard, g.deck.length === 0, 'hard');
    if (!toPlay.length) return null;
    if (toPlay.some(isMaija)) return { type: 'attackMaija', cards: toPlay };
    // Valttihyökkäys (pakka tyhjä, valtteja vähissä muualla) on oma neuvonsa: silloin
    // valtteja EI säästetä puolustukseen, joten perusneuvon lupaus ei päde.
    const allTrumps = toPlay.every(c => c.s === g.trump);
    return { type: allTrumps ? 'attackTrumps' : 'attack', cards: toPlay };
  }
  if (phase === 'defending' && g.defenderIdx === 0) {
    if (!table) return null;
    const { decisions } = maijaPickDefense(g.players[0].hand, table, g.trump, g.deck.length === 0, 'hard');
    if (!decisions.length) return { type: 'take' };
    const first = decisions[0];
    return { type: 'beat', card: first.card, target: table[first.ri].att };
  }
  return null;
}


// ── Kortti ──────────────────────────────────────────────────────────
/**
 * Maijan oma Card varjostaa jaetun komponentin tarkoituksella (eri korostuslogiikka).
 * @typedef {object} MaijaCardProps
 * @property {any}     [card]
 * @property {boolean} [small]
 * @property {boolean} [xsmall]
 * @property {boolean} [highlight]
 * @property {any}     [advice]
 * @property {boolean} [dim]
 * @property {boolean} [selected]
 * @property {any}     [onClick]
 * @property {any}     [backStyle]
 * @property {boolean} [faceDown]
 * @param {MaijaCardProps} props
 */
function Card({ card, small, xsmall, highlight, advice, dim, selected, onClick, backStyle, faceDown }) {
  const [h, setH] = useState(false);
  const w = xsmall ? 38 : small ? 44 : 58, ht = xsmall ? 52 : small ? 60 : 80;
  const back = backStyle || BACKS.ilves;
  const clickable = !!onClick;
  const mjBorder = card && isMaija(card);

  if (faceDown) return (
    <div aria-hidden="true" style={{ width:w, height:ht, borderRadius:7, position:'relative', overflow:'hidden',
      flexShrink:0, border:`1px solid ${back.border}` }}>
      {back.render(w, ht)}
    </div>
  );

  const a11y = clickable
    ? { role:'button', tabIndex:0, 'aria-label':cardName(card),
        onKeyDown:e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } }
    : { role:'img', 'aria-label':cardName(card) };

  const borderCol = selected ? C.blue : advice ? C.botMode : mjBorder ? C.maija : highlight ? C.gold : back.border;
  const shadow = selected ? '0 0 14px rgba(91,168,212,0.6)' :
                 advice ? '0 0 0 3px #c084fc, 0 0 26px 6px rgba(192,132,252,0.85)' :
                 highlight ? '0 0 14px rgba(201,168,76,0.6)' :
                 mjBorder ? '0 0 10px rgba(139,26,26,0.5)' :
                 h && clickable ? '0 6px 16px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.3)';

  return (
    <div {...a11y} onClick={clickable ? onClick : undefined}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width:w, height:ht, borderRadius:7, flexShrink:0,
        background:C.card, border:`2px solid ${borderCol}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:clickable ? 'pointer' : 'default',
        transform:`${h && clickable ? 'translateY(-5px) scale(1.06)' : advice && !selected ? 'translateY(-6px) scale(1.04)' : 'none'} ${selected ? 'translateY(-8px)' : ''}`,
        transition:'transform 0.15s,box-shadow 0.15s',
        boxShadow:shadow, opacity:dim ? 0.35 : 1,
        animation: advice ? 'advicePulse 1.4s ease-in-out infinite' : undefined,
      }}>
      <div style={{ textAlign:'center', fontFamily:'Georgia,serif', lineHeight:1.1,
        pointerEvents:'none', color:mjBorder ? C.maija : SUIT_COLOR[card.s] }}>
        <div style={{ fontSize:xsmall ? 11 : small ? 12 : 16, fontWeight:700 }}>{card.r}</div>
        <div style={{ fontSize:xsmall ? 12 : small ? 13 : 19 }}>{card.s}</div>
        {mjBorder && <div style={{ fontSize:8, color:C.maija, letterSpacing:0.5 }}>MAIJA</div>}
      </div>
    </div>
  );
}

const sortHand = hand => sortHandBy(hand, c => c.v);


// ── Alustus ─────────────────────────────────────────────────────────
function initGame(nPlayers, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  let deck = newDeck();
  let trumpIdx = deck.length - 1;
  while (deck[trumpIdx].s === '♠') {
    deck = shuffle(deck);
    trumpIdx = deck.length - 1;
  }
  const trump = deck[trumpIdx].s;
  const trumpCard = deck[trumpIdx];
  const players = Array.from({ length:nPlayers }, (_,i) => ({
    id:i, name:i===0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i-1],
    isHuman: allBots ? false : i===0,
    hand:deck.splice(0, 5),
  }));
  // Vaihe, pöytä ja pelistä pois pudonneet asuvat pelitilassa. Ennen ne olivat
  // kolmena useStatena, joilla kaikilla oli käsin synkattu ref-kaksonen
  // (phaseRef, tableRef, finRef) ajastimia varten (kompositioauditointi H5).
  return { players, deck, trump, trumpCard, discard:[],
    attackerIdx:0, defenderIdx:1,
    phase: /** @type {Vaihe} */ ('idle'), table: [], finished: /** @type {number[]} */ ([]) };
}

// ── Pääkomponentti ──────────────────────────────────────────────────
import { useT } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

// Suljettu arvojoukko: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'idle'|'attacking'|'defending'|'gameover'} Vaihe */

export default function Maija({ onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showCounts = true, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(playerCount);
  const cardBack = 'ilves';
  const { G, gRef, setGS } = useGameState();
  const [selectedCards, setSel] = useState([]);
  const [selDefTargetIdx, setSelDefTargetIdx] = useState(null);
  const [msg, setMsg_] = useState('');
  const logOpen = showLog; // omistaja on App, ks. onShowLogChange
  // Paljastus ja asetus ovat eri asiat (kompositioauditointi H6, päätös 3.9.2026).
  // `seeAll` on App:n omistama asetus joka ei tallennu, ja `revealAll` on tämän pelin
  // näkymätila. Katselutila pakottaa paljastuksen päälle koskematta asetukseen, ja
  // `startGame` palauttaa näkymän asetuksen mukaiseksi.
  const [revealAll, setRevealAll] = useState(seeAll);
  useEffect(() => { setRevealAll(seeAll); }, [seeAll]);
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [advice, setAdvice]               = useState(null); // { text, cardIds, targetId } | null
  const prevDeckRef = useRef(null);
  const sndRef     = useRef(soundOn);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const lastPlayTmr = useRef(null);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  // Neuvo vanhenee jokaisesta tilamuutoksesta. Yksi riippuvuus riittää, koska vaihe
  // ja pöytä asuvat G:ssä (kompositioauditointi H5).
  useEffect(() => { setAdvice(null); }, [G]);

  // Renderin lukemat: vaihe ja pöytä luetaan G:stä eikä rinnakkaisesta useStatesta.
  const phase = G?.phase ?? 'idle';
  const table = G?.table ?? [];

  function askAdvice() {
    const g = gRef.current;
    if (!g) return;
    const a = getAdvice(g);
    if (!a) return;
    const card = a.card || a.cards?.[0];
    setAdvice({
      text: t('games.maija.advice.' + a.type, {
        cards: a.cards ? a.cards.map(lbl).join(', ') : undefined,
        card:  card ? lbl(card) : undefined,
        target: a.target ? lbl(a.target) : undefined,
      }),
      cardIds: a.card ? [a.card.id] : (a.cards ? a.cards.map(c => c.id) : []),
      targetId: a.target ? a.target.id : null,
    });
  }
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  const { log, logRef, addLog, commit, resetLog } = useGameLog({
    setGS,
    onMessage: setMsg_, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => {
      const g = gRef.current; if (!g) return null;
      return {
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: null })),
        tableCards: (g.discard ?? []).slice(-3),
        // Kääntämätön suomi, kirjattu H4:ään; avainta ei lisätä tässä muutoksessa.
        extraText: g.trump ? `Valtti: ${g.trump}` : null,
      };
    },
  });


  const M = {
    gameStart: (trumpCard, attacker, defender) => t('games.maija.msg.gameStart', {
      trump: `<span style="color:${SUIT_COLOR[trumpCard.s]}">${trumpCard.s}</span>`, attacker, defender,
    }),
    finishedGame: (name, rank) => rank === 1
      ? t('games.maija.msg.finishedWin', { name })
      : t('games.maija.msg.finishedOut', { name }),
    maija: (name, hadMaija) => t(hadMaija ? 'games.maija.msg.maijaQ' : 'games.maija.msg.maija', { name }),
    newAttack: (attacker, defender) => t('games.maija.msg.newAttack', { attacker, defender }),
    defendTake: (name, unbeatenCount, detail) => t('games.maija.msg.defendTake', { name, cards: kortin(unbeatenCount), detail }),
    aiAttack: (name, cards) => t('games.maija.msg.aiAttack', { name, cards }),
    aiDefense: (name, count) => t('games.maija.msg.aiDefense', { name, cards: korttia(count) }),
    maijaWarning: t('games.maija.msg.maijaWarning'),
    defenderWinRound: (name) => t('games.maija.msg.defenderWinRound', { name }),
    defenderWinRoundNext: t('games.maija.msg.defenderWinRoundNext'),
    tooManyCards: t('games.maija.msg.tooManyCards'),
    maijaNotValid: t('games.maija.msg.maijaNotValid'),
    cardTooSmall: (defCard, attCard) => t('games.maija.msg.cardTooSmall', { defCard, attCard }),
    beatWith: (attCard, defCard) => t('games.maija.msg.beatWith', { attCard, defCard }),
  };

  function flashLastPlay(name, cards, isHuman = false) {
    if (!showLastPlay) return;
    setLastPlay({ name, cards: Array.isArray(cards) ? cards : [cards], isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  function startGame(forcedCount, allBotsMode = false) {
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    setRevealAll(seeAll || allBotsMode);
    pausedRef.current = false; setPaused(false);
    clearTimeout(aiTmr.current);
    const count = forcedCount ?? nP;
    const g = { ...initGame(count, playerNames, allBotsMode), phase: /** @type {Vaihe} */ ('attacking') };
    setSel([]); setSelDefTargetIdx(null);
    resetLog(); setPakaAnim(false);
    commit(g, M.gameStart(g.trumpCard, g.players[g.attackerIdx].name, g.players[g.defenderIdx].name));
    setScreen('game');
    setShuffling(true);
    aiTmr.current = tm(() => maybeAIAttack(g), 3100 + Math.random() * 400);
  }

  function startBotBattle() {
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }


  function drawHand(g, playerIdx) {
    const need = 5 - g.players[playerIdx].hand.length;
    if (need <= 0 || !g.deck.length) return g;
    const drawn = g.deck.slice(0, Math.min(need, g.deck.length));
    const players = g.players.map((p,i) => i===playerIdx ? { ...p, hand:[...p.hand, ...drawn] } : p);
    return { ...g, players, deck:g.deck.slice(drawn.length) };
  }

  // Palauttaa pelitilan johon uusi finished on kirjattu. Ennen se palautti pelkän
  // listan, ja kutsuja kuljetti sitä erikseen kolmen funktion läpi.
  // `lines` kerää lokirivit kutsujalle: tila kirjoitetaan ennen lokiriviä
  // (kompositioauditointi H4), ja kierroksen tilan committoi vasta advanceRound.
  function checkWinners(g, lines = /** @type {string[]} */ ([])) {
    const newFin = [...g.finished];
    g.players.forEach((p, i) => {
      if (!newFin.includes(i) && p.hand.length===0 && g.deck.length===0) {
        newFin.push(i);
        lines.push(M.finishedGame(p.name, newFin.length));
      }
    });
    const active = g.players.filter((_, i) => !newFin.includes(i));
    if (active.length <= 1) {
      if (active.length === 1) {
        const loser = active[0];
        const isMaijaPlayer = loser.hand.some(isMaija);
        if (sndRef.current) SFX.maija();
        lines.push(M.maija(loser.name, isMaijaPlayer));
      }
      const fullFin = [...newFin, ...active.map(p => p.id)];
      const ranking = fullFin.map((idx, pos) => ({
        name: g.players[idx].name, place: pos + 1, isHuman: g.players[idx].isHuman,
      }));
      commit({ ...g, finished: newFin, phase: /** @type {Vaihe} */ ('gameover') });
      lines.forEach(addLog);
      // Ihmispelissä pidempi viive kuin katselutilassa: viimeinen tikki jää näkyviin
      // ennen kuin App vaihtaa tulosruutuun.
      tm(() => onResult?.({ ranking }), allBotsRef.current ? BOT_RESULT_DELAY : 1800);
      return { done:true, g2:{ ...g, finished:newFin } };
    }
    return { done:false, g2:{ ...g, finished:newFin } };
  }

  function nextAttDef(g, skipDefender, fin) {
    const nPl = g.players.length;
    let newAtt, newDef;
    if (!skipDefender) {
      newAtt = g.defenderIdx;
      while (fin.includes(newAtt)) newAtt = (newAtt + 1) % nPl;
    } else {
      newAtt = (g.defenderIdx + 1) % nPl;
      while (fin.includes(newAtt)) newAtt = (newAtt + 1) % nPl;
    }
    newDef = (newAtt + 1) % nPl;
    while (fin.includes(newDef) || newDef === newAtt) newDef = (newDef + 1) % nPl;
    return { newAtt, newDef };
  }

  function advanceRound(g, skipDefender, lines = /** @type {string[]} */ ([])) {
    const { newAtt, newDef } = nextAttDef(g, skipDefender, g.finished);
    const g4 = { ...g, attackerIdx:newAtt, defenderIdx:newDef, table: [],
                 phase: /** @type {Vaihe} */ ('attacking') };
    setSel([]); setSelDefTargetIdx(null);
    commit(g4);
    lines.forEach(addLog);
    addLog(M.newAttack(g4.players[newAtt].name, g4.players[newDef].name));
    aiTmr.current = tm(() => maybeAIAttack(g4), 1800);
  }

  function resolveDefenseWin(g) {
    const allCards = g.table.flatMap(r => [r.att, r.def]);
    let g2 = { ...g, discard:[...g.discard, ...allCards] };
    g2 = drawHand(g2, g.defenderIdx);
    g2 = drawHand(g2, g.attackerIdx);
    const lines = /** @type {string[]} */ ([]);
    const { done, g2:g3 } = checkWinners(g2, lines);
    if (done) return;
    advanceRound(g3, false, lines);
  }

  function resolveDefenseLoss(g) {
    const unbeaten = g.table.filter(r => !r.def).map(r => r.att);
    const beaten = g.table.filter(r => r.def).flatMap(r => [r.att, r.def]);
    const players = g.players.map((p,i) => i===g.defenderIdx ? { ...p, hand:[...p.hand, ...unbeaten] } : p);
    let g2 = { ...g, players, discard:[...g.discard, ...beaten] };
    if (sndRef.current) SFX.take();
    const detail = beaten.length > 0 ? t('games.maija.msg.beatDetail', { n: beaten.length >> 1 }) : '';
    const lines = /** @type {string[]} */ ([M.defendTake(g.players[g.defenderIdx].name, unbeaten.length, detail)]);
    g2 = drawHand(g2, g2.attackerIdx);
    const { done, g2:g3 } = checkWinners(g2, lines);
    if (done) return;
    advanceRound(g3, true, lines);
  }

  function maybeAIAttack(g) {
    if (!g) g = gRef.current;
    if (!g || (gRef.current?.phase ?? g.phase) !== 'attacking') return;
    if (g.players[g.attackerIdx].isHuman) return;
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 1200;
    const schedAttack = () => {
      if (pausedRef.current) { tm(schedAttack, 300); return; }
      const g2 = gRef.current;
      runAIAttack(g2);
    };
    aiTmr.current = tm(schedAttack, baseDelay + Math.random() * 400);
  }

  function runAIAttack(g2) {
    if (!g2) return;
    {
      const hand = g2.players[g2.attackerIdx].hand;
      const defHandSize = g2.players[g2.defenderIdx].hand.length;
      if (!hand.length) { resolveDefenseWin({ ...g2, table: [] }); return; }
      // Kyvykkyysporras (ei satunnaiskohinaa):
      //   Oppipoika: lyö VAIN YHDEN kortin kerrallaan; pelaa ISOT kortit ensin
      //              (haluaa "voittaa" kierroksia) eikä suunnittele Maijan
      //              dumppausta — muttei myöskään pelkää sitä
      //   Kisälli:   monikorttihyökkäys (koko maa) + pienimmät ensin + Maija-prioriteetti
      //   Mestari:   + valttilaskenta pakan loputtua
      // Päätöslogiikka moduulitason maijaPickAttack-funktiossa (jaettu Heron neuvon kanssa).
      const atkLevel = botLevelsRef.current?.[g2.attackerIdx] ?? aiLevelRef.current;
      const toPlay = maijaPickAttack(hand, g2.trump, defHandSize, g2.discard, g2.deck.length === 0, atkLevel);
      if (initShowIntention) {
        const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
        setIntention({ playerIdx: g2.attackerIdx, cards: toPlay });
        aiTmr.current = tm(() => { setIntention(null); doAttack(g2, toPlay); }, intentionMs);
        return;
      }
      doAttack(g2, toPlay);
    }
  }

  function doAttack(g, cards) {
    if (sndRef.current) SFX.play();
    const attName = g.players[g.attackerIdx];
    const msg = M.aiAttack(attName.name, cards.map(lblColored).join(', '));
    flashLastPlay(attName.name, cards, attName.isHuman);
    const players = g.players.map((p,i) => i===g.attackerIdx
      ? { ...p, hand:p.hand.filter(c => !cards.find(x => x.id===c.id)) } : p);
    const tbl = cards.map(c => ({ att:c, def:null }));
    let g2 = { ...g, players };
    g2 = drawHand(g2, g.attackerIdx);
    g2 = { ...g2, table: tbl, phase: /** @type {Vaihe} */ ('defending') };
    setSel([]);
    commit(g2, msg);
    const defName = g2.players[g.defenderIdx];
    addLog(M.aiDefense(defName.name, tbl.length));
    if (tbl.some(r => isMaija(r.att))) {
      addLog(M.maijaWarning);
    }
    aiTmr.current = tm(() => maybeAIDefend(g2), 1000 + Math.random() * 400);
  }

  function maybeAIDefend(g) {
    if (!g) g = gRef.current;
    if (!g || (gRef.current?.phase ?? g.phase) !== 'defending') return;
    if (g.players[g.defenderIdx].isHuman) return;
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 1000;
    const schedDefend = () => {
      if (pausedRef.current) { tm(schedDefend, 300); return; }
      runAIDefend(gRef.current);
    };
    aiTmr.current = tm(schedDefend, baseDelay + Math.random() * 400);
  }

  function runAIDefend(g2) {
    if (!g2 || !g2.table) return;
    const tbl2 = g2.table;
    const defender = g2.players[g2.defenderIdx];
      const defLevel = botLevelsRef.current?.[g2.defenderIdx] ?? aiLevelRef.current;
      // Kaatopäätökset moduulitason maijaPickDefense-funktiossa (jaettu Heron neuvon
      // kanssa): valttiepäröinti, Mestarin tärkeysjärjestys ja osittaiskaato mukana.
      const { decisions } = maijaPickDefense(defender.hand, tbl2, g2.trump, g2.deck.length === 0, defLevel);
      const decMap    = new Map(decisions.map(d => [d.ri, d.card]));
      const chosenIds = new Set(decisions.map(d => d.card.id));
      const hand      = defender.hand.filter(c => !chosenIds.has(c.id));
      if (sndRef.current) decisions.forEach(() => SFX.beat());
      const newTbl = tbl2.map((row, ri) => decMap.has(ri) ? { ...row, def: decMap.get(ri) } : row);

      const players = g2.players.map((p,i) => i===g2.defenderIdx ? { ...p, hand } : p);
      const g3 = { ...g2, players, table: newTbl };
      const unbeaten = newTbl.filter(r => !r.def);
      if (unbeaten.length === 0) {
        const defName = g2.players[g2.defenderIdx];
        commit(g3, M.defenderWinRound(defName.name));
        if (sndRef.current) SFX.fanfare();
        tm(() => resolveDefenseWin(g3), 2200);
      } else {
        const n = g2.players[g2.defenderIdx];
        commit(g3, t('games.maija.msg.aiPartialBeat', { name: n.name, beat: newTbl.length - unbeaten.length, total: newTbl.length, cards: kortin(unbeaten.length) }));
        tm(() => resolveDefenseLoss(g3), 1500);
      }
  }

  function humanToggleCard(card) {
    if (phase !== 'attacking' || G.attackerIdx !== 0) return;
    const hand = G.players[0].hand;
    const alreadySel = selectedCards.find(c => c.id === card.id);
    if (alreadySel) {
      setSel(prev => prev.filter(c => c.id !== card.id));
    } else if (selectedCards.length === 0) {
      setSel([card]);
    } else if (selectedCards[0].s === card.s) {
      setSel(prev => [...prev, card]);
    }
  }

  function humanAttack() {
    if (!selectedCards.length) return;
    const g = gRef.current;
    if (selectedCards.length > g.players[g.defenderIdx].hand.length) {
      addLog(M.tooManyCards); return;
    }
    doAttack(g, selectedCards);
  }

  // 1. Valitse ensin pöytäkortti
  function humanSelectDefTarget(idx) {
    if (phase !== 'defending' || G.defenderIdx !== 0) return;
    const row = table[idx];
    if (row.def) return; // jo kaadettu
    setSelDefTargetIdx(prev => prev === idx ? null : idx);
  }

  // 2. Sitten valitse käsikortti
  function humanBeatWithCard(card) {
    if (phase !== 'defending' || G.defenderIdx !== 0 || selDefTargetIdx === null) return;
    if (isMaija(card)) { addLog(M.maijaNotValid); return; }
    const g = gRef.current;
    const row = table[selDefTargetIdx];
    if (!canBeat(row.att, card, g.trump)) {
      addLog(M.cardTooSmall(lblColored(card), lblColored(row.att))); return;
    }
    if (sndRef.current) SFX.beat();
    const newTbl = g.table.map((r, i) => i === selDefTargetIdx ? { ...r, def: card } : r);
    const players = g.players.map((p, i) => i === 0 ? { ...p, hand: p.hand.filter(c => c.id !== card.id) } : p);
    const g2 = { ...g, players, table: newTbl };
    commit(g2, M.beatWith(lblColored(row.att), lblColored(card)));
    setSelDefTargetIdx(null);
    if (newTbl.every(r => r.def)) {
      addLog(M.defenderWinRoundNext);
      if (sndRef.current) SFX.fanfare();
      tm(() => resolveDefenseWin(g2), 1200);
    }
  }

  function humanTakeAll() {
    if (phase !== 'defending' || G.defenderIdx !== 0) return;
    resolveDefenseLoss(gRef.current);
  }

  // ── Pelaajien valinta ────────────────────────────────────────────
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <GameStartScreen
      icon={<QCard s={2} />}
      title="MAIJA"
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

  // ── Peli päättyi ────────────────────────────────────────────────
  if (!G) return null;

  const isHumanAttacker = G.attackerIdx === 0 && phase === 'attacking' && !allBots;
  const isHumanDefender = G.defenderIdx === 0 && phase === 'defending' && !allBots;
  const unbeaten = table.filter(r => !r.def);
  const selDefTargetRow = selDefTargetIdx !== null ? table[selDefTargetIdx] : null;

  return (
    <div style={{ background:C.bg, fontFamily:'Georgia,serif', color:C.text,
      padding: isMobile ? '6px 8px' : '14px 16px', maxWidth:560, margin:'0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <TurnPrompt show={isHumanAttacker || isHumanDefender} action={t(isHumanAttacker ? 'ui.turn.maijaAttack' : 'ui.turn.maijaDefend')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />

      {/* Viestikupla */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`,
        borderRadius:14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12,
        minHeight: isMobile ? 44 : 60, display:'flex', alignItems:'center', gap:10 }}>
        <QCard s={0.7} />
        <p style={{ margin:0, fontFamily:'sans-serif', fontSize:13, lineHeight:1.55, color:C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Valtti */}
      <div style={{ display:'flex', gap:6, marginBottom: isMobile ? 4 : 10, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:20, border:`1px solid ${C.trump}55`, background:`${C.trump}0d` }}>
          <span style={{ fontFamily:'sans-serif', fontSize:11, color:C.dim }}>{t('ui.shared.trump')}</span>
          <span style={{ fontSize:18, color:SUIT_COLOR[G.trump], fontWeight:700 }}>{G.trump}</span>
          {G.trumpCard && <Card card={G.trumpCard} small backStyle={BACKS[cardBack]} />}
        </div>
      </div>

      {/* Muut pelaajat */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 10 }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => {
                const isAtt = G.attackerIdx === p.id;
                const isDef = G.defenderIdx === p.id;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isAtt ? C.red + '66' : isDef ? C.blue + '66' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px' }}>
                    <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: isAtt ? C.red : isDef ? C.blue : C.dim }}>
                      {isAtt ? '⚔️' : isDef ? '🛡️' : '🤖'} {p.name.slice(0, 8)}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                      {sortHand(p.hand).map(c => {
                        const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                        return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]} selected={isIntended} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          : (
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => {
                const isAtt = G.attackerIdx === p.id;
                const isDef = G.defenderIdx === p.id;
                return (
                  <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${isAtt ? C.red + '66' : isDef ? C.blue + '66' : C.panelBorder}`, borderRadius: 10, padding: '7px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isAtt ? C.red : isDef ? C.blue : C.dim, marginBottom: 4 }}>
                      {isAtt ? '⚔️' : isDef ? '🛡️' : '🤖'} {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {revealAll
                        ? p.hand.map(c => {
                            const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                            return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]} selected={isIntended} />;
                          })
                        : p.hand.map((_, ci) => <div key={ci} style={{ width: 22, height: 33, borderRadius: 4, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}` }} />)
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Pöytä */}
      <PoytaPanel isMobile={isMobile}
        minHeight={{ m: 170, t: 220 }}
        title={<span>{t('ui.shared.tableLabel')} · {phase==='attacking' ? t('games.maija.ui.phaseAtk') : t('games.maija.ui.phaseDef')}</span>}
        right={<PakkaCount count={G.deck.length} flash={pakaAnim} />}>
        {table.length === 0
          ? <div style={{ textAlign:'center', color:C.dim, fontFamily:'sans-serif', fontSize:12,
              opacity:0.5, paddingTop:40 }}>
              {isHumanAttacker ? t('games.maija.ui.attackHint') : t('ui.shared.wait')}
            </div>
          : <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-start' }}>
              {table.map((row, i) => {
                const isTarget = selDefTargetIdx === i;
                const canBeTarget = isHumanDefender && !row.def && selDefTargetIdx === null;
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <Card card={row.att} small
                      dim={!!row.def}
                      selected={isTarget}
                      highlight={canBeTarget}
                      advice={advice?.targetId === row.att.id}
                      onClick={isHumanDefender && !row.def ? () => humanSelectDefTarget(i) : undefined}
                      backStyle={BACKS[cardBack]}/>
                    {row.def
                      ? <Card card={row.def} small backStyle={BACKS[cardBack]}/>
                      : <div style={{ width:44, height:60, borderRadius:6,
                          border:`1.5px dashed ${C.panelBorder}`, opacity:0.3 }}/>
                    }
                  </div>
                );
              })}
            </div>
        }
      </PoytaPanel>

      {/* Viimeisin siirto — kelluva, ei varaa korkeutta */}
      <div style={{ position: 'relative', height: 0 }}>
        {lastPlay && (
          <div key={lastPlay.cards[0].id} style={{ position: 'absolute', bottom: 4, left: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,22,18,0.95)', border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`, borderRadius: 12, padding: '4px 12px', animation: 'lastPlayFade 1.9s ease forwards', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>{lastPlay.name}</span>
            {lastPlay.cards.map(c => (
              <span key={c.id} style={{ background: '#f8f2e6', borderRadius: 4, padding: '1px 5px', fontSize: 12, fontWeight: 700, fontFamily: 'Georgia,serif', color: SUIT_COLOR[c.s] }}>{c.r}{c.s}</span>
            ))}
          </div>
        )}
      </div>

      {!allBots && (<>
      {/* Pelaaja 0 (ihminen tai botti katselutilassa) */}
      <div style={{ background:'rgba(255,255,255,0.02)',
        border:`2px solid ${(isHumanAttacker || isHumanDefender) ? C.gold+'44' : C.panelBorder}`,
        borderRadius:14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 12, transition:'border-color 0.2s' }}>
        <div style={{ fontFamily:'sans-serif', fontSize:12,
          color:(isHumanAttacker || isHumanDefender) ? C.gold : C.dim, marginBottom:8 }}>
          {allBots ? '🤖' : '👤'} {G.players[0].name} {G.attackerIdx===0 ? '⚔️' : G.defenderIdx===0 ? '🛡️' : ''}
          {!allBots && isHumanAttacker && <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>{t('games.maija.ui.attackHint2')}</span>}
          {!allBots && isHumanDefender && !selDefTargetRow && <span style={{ color:C.dim, fontSize:11, marginLeft:8 }}>{t('games.maija.ui.defendHint1')}</span>}
          {!allBots && isHumanDefender && selDefTargetRow && <span style={{ color:C.gold, fontSize:11, marginLeft:8 }}>{t('games.maija.ui.defendHint2', { card: lbl(selDefTargetRow.att) })}</span>}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {sortHand(G.players[0].hand).map(c => {
            const isSel = !!selectedCards.find(x => x.id === c.id);
            const wrongSuit = isHumanAttacker && selectedCards.length > 0 && c.s !== selectedCards[0].s;
            const canBeatTarget = isHumanDefender && selDefTargetRow && canBeat(selDefTargetRow.att, c, G.trump) && !isMaija(c);
            const defDimmed = isHumanDefender && selDefTargetRow && !canBeatTarget;
            const isAdv     = !isSel && !!advice?.cardIds?.includes(c.id);
            // Mestarin neuvo päällä: kaikki muu himmenee, jotta osoitettu kortti erottuu
            const dimmed    = advice?.cardIds?.length ? !isAdv : (wrongSuit || !!defDimmed);
            return (
              <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                <Card card={c}
                  small={isMobile}
                  selected={isSel}
                  highlight={!!canBeatTarget}
                  advice={isAdv}
                  dim={!!dimmed}
                  onClick={isHumanAttacker ? () => humanToggleCard(c)
                    : (isHumanDefender && selDefTargetRow) ? () => humanBeatWithCard(c)
                    : undefined}
                  backStyle={BACKS[cardBack]}/>
                {isMaija(c) && <span style={{ fontSize:8, color:C.maija, fontFamily:'sans-serif' }}>⚠</span>}
              </div>
            );
          })}
        </div>
      </div>
      </>)}

      {/* Bottien taistelu -ohjauspaneeli */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Toimintopainikkeet */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', minHeight:allBots ? 0 : 44, alignItems:'center', marginBottom:10 }}>
        {!allBots && isHumanAttacker && selectedCards.length > 0 && (
          <>
            <button onClick={humanAttack} style={{ background:`linear-gradient(135deg,${C.red},#8a1500)`,
              border:'none', borderRadius:9, padding:'10px 20px', color:C.text,
              fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>
              {t('ui.action.play')} {selectedCards.length > 1 ? t('ui.action.cards', { n: selectedCards.length }) : t('ui.action.card')} ⚔️
            </button>
            <button onClick={() => setSel([])} style={{ background:'transparent',
              border:`1px solid ${C.dim}66`, borderRadius:9, padding:'10px 16px',
              color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.action.cancel')}</button>
          </>
        )}
        {!allBots && isHumanDefender && (
          <>
            {selDefTargetIdx !== null && (
              <button onClick={() => setSelDefTargetIdx(null)} style={{ background:'transparent',
                border:`1px solid ${C.dim}66`, borderRadius:9, padding:'10px 16px',
                color:C.dim, fontSize:13, cursor:'pointer', fontFamily:'Georgia,serif' }}>{t('ui.action.cancelSelection')}</button>
            )}
            {unbeaten.length > 0 && table.some(r => r.def) && (
              <button onClick={humanTakeAll} style={{ background:'transparent',
                border:`1px solid ${C.gold}88`, borderRadius:9, padding:'10px 20px',
                color:C.gold, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Georgia,serif' }}>
                {t('games.maija.ui.takeRest', { n: unbeaten.length })}
              </button>
            )}
            {unbeaten.length === table.length && (
              <button onClick={humanTakeAll} style={{ background:'transparent',
                border:`1px solid ${C.red}88`, borderRadius:9, padding:'10px 20px',
                color:C.red, fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:'Georgia,serif' }}>
                {t('games.maija.ui.takeAll')}
              </button>
            )}
          </>
        )}
        {!allBots && (isHumanAttacker || isHumanDefender) && <AdviceButton onClick={askAdvice} />}
      </div>

      {/* Tilarivi */}
      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
      >
        <span style={{ color:C.gold, fontWeight:700 }}>{t('ui.shared.goal')}</span> {t('games.maija.ui.goal')}
      </GameStatusBar>

      {/* Katselutila: pending result overlay */}

      {/* Loki */}
      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)} />

    </div>
  );
}
