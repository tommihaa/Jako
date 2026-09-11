import { useState, useEffect, useRef } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, newDeck, shuffledAINames, lblColored, BOT_RESULT_DELAY, UNKNOWN_EV } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import GameLog from '../shared/GameLog.jsx';
import GameStatusBar from '../shared/GameStatusBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import { useT, tr } from '../shared/i18n.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { useGameLog } from '../shared/useGameLog.js';
import { useGameState } from '../shared/useGameState.js';
import { AdviceButton, AdviceBubble, GuideButton, useOpastus, opastusAvain } from '../shared/MestariNeuvo.jsx';

const pScore = p => p.cards.reduce((s, c) => s + (c ? c.v : 0), 0);
const pCards = p => p.cards.filter(Boolean).length;
// Tasatilanteessa vähempi kortteja omannut voittaa (KOPUTUS.md, viety koodiin 18.8.2026)
// Export sauman takia: tasapeliavain (KOPUTUS.md › Pelin loppu, koodiin 18.8.2026)
// on kiinnitetty testissä test/koputus-tasapeli.test.js.
export const pRank  = (a, b) => (pScore(a) - pScore(b)) || (pCards(a) - pCards(b));
const pBetter = (q, p) => pRank(q, p) < 0;


function initGame(n, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  return {
    players: Array.from({ length: n }, (_, i) => ({
      id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1], isHuman: allBots ? false : i === 0,
      cards: [deck.shift(), deck.shift(), deck.shift(), deck.shift()],
      known: new Set(allBots ? [0, 1] : (i === 0 ? [] : [0, 1])),
    })),
    deck, discard: [],
    // Vaihe, vuoro, nostettu kortti, koputtaja ja viimeisen kierroksen jäljellä-joukko
    // asuvat pelitilassa. Ennen ne olivat viitena useStatena, joista kolmella oli
    // käsin synkattu ref-kaksonen (curRef, knockRef, lrRef) ajastimia varten
    // (kompositioauditointi H5).
    phase: /** @type {Vaihe} */ ('idle'), cur: 0, drawn: null,
    knockedBy: /** @type {number|null} */ (null),
    lastRound: /** @type {Set<number>|null} */ (null),
  };
}

const M = {
  get peekStart() { return tr('games.koputus.msg.peekStart'); },
  get peekOne()   { return tr('games.koputus.msg.peekOne'); },
  get peekDone()  { return tr('games.koputus.msg.peekDone'); },
  get yourTurn()  { return tr('games.koputus.msg.yourTurn'); },
  drawn:     c => tr('games.koputus.msg.drawn', { card: lblColored(c), v: c.v }),
  drawnD:    c => tr('games.koputus.msg.drawnD', { card: lblColored(c), v: c.v }),
  swapped:   c => tr('games.koputus.msg.swapped', { card: lblColored(c) }),
  discarded: c => tr('games.koputus.msg.discarded', { card: lblColored(c) }),
  reactQ:    c => tr('games.koputus.msg.reactQ', { card: lblColored(c) }),
  reactWin:  () => tr('games.koputus.msg.reactWin'),
  get reactWrong() { return tr('games.koputus.msg.reactWrong'); },
  get reactEnd()   { return tr('games.koputus.msg.reactEnd'); },
  get jackMsg()    { return tr('games.koputus.msg.jackMsg'); },
  get queenMsg()   { return tr('games.koputus.msg.queenMsg'); },
  get queenMsg2()  { return tr('games.koputus.msg.queenMsg2'); },
  get kingMsg()    { return tr('games.koputus.msg.kingMsg'); },
  knocked:   n => tr('games.koputus.msg.knocked', { name: n }),
  get gameOver()   { return tr('games.koputus.msg.gameOver'); },
  aiTurn:    n => tr('games.koputus.msg.aiTurn', { name: n }),
  aiSwapped: (n, c) => tr('games.koputus.msg.aiSwapped', { name: n, card: lblColored(c) }),
  aiDiscard: (n, c) => tr('games.koputus.msg.aiDiscard', { name: n, card: lblColored(c) }),
  aiKnock:   n => tr('games.koputus.msg.aiKnock', { name: n }),
  aiJack:      n => tr('games.koputus.msg.aiJack', { name: n }),
  aiQueenSwap: (n, tgt) => tr('games.koputus.msg.aiQueenSwap', { name: n, target: tgt }),
  aiKingSwap:  (n, tgt) => tr('games.koputus.msg.aiKingSwap', { name: n, target: tgt }),
  aiKingKeep:  (n, tgt) => tr('games.koputus.msg.aiKingKeep', { name: n, target: tgt }),
  aiReact:   (n, c) => tr('games.koputus.msg.aiReact', { name: n, card: lblColored(c) }),
  aiWrongReact: n => tr('games.koputus.msg.aiWrongReact', { name: n }),
};

// ── Bottipäätökset puhtaina funktioina ──────────────────────────
// Irrotettu runAI:sta, jotta sama logiikka ajaa botit ja Heron Mestari-neuvon.
// Käyttävät vain pelaajan omaa known-joukkoa + julkista tietoa (ei kurkkimista).

// UNKNOWN_EV (tuntemattoman paikan odotusarvo) on helpers.js:ssä, koska Kultakala käyttää
// samaa lukua samaan vertailuun.

// Botin erityiskortti (KOPUTUS.md Erityiskortit, 8.9.2026, porsaanreikäauditointi KO-3).
// Oppipoika ei käytä, Kisälli J ja K, Mestari kaikki. Palauttaa { g, msg } tai null.
// Vaihdon vastaanottaja ei tiedä saamaansa korttia: muisti tyhjenee paikasta (KO-1).
function koAISpecial(g, playerIdx, card, level, M) {
  if (level === 'beginner') return null;
  const p = g.players[playerIdx];
  const nonNull = (pl, i) => pl.cards[i] !== null;
  const unknownOwn = p.cards.findIndex((c, i) => c !== null && !p.known.has(i));
  const worst = [...p.known].filter(i => nonNull(p, i)).sort((a, b) => p.cards[b].v - p.cards[a].v)[0];
  const oppIdx = g.players.map((_, i) => i).filter(i => i !== playerIdx && g.players[i].cards.some(c => c !== null));
  const pickOpp = () => {
    const oi = oppIdx[Math.floor(Math.random() * oppIdx.length)];
    const slots = [0, 1, 2, 3].filter(i => nonNull(g.players[oi], i));
    return { oi, si: slots[Math.floor(Math.random() * slots.length)] };
  };
  const swapWith = (players, own, oi, si, ownSees) => players.map((pl, i) => {
    if (i === playerIdx) {
      const c = [...pl.cards]; const tc = players[oi].cards[si]; c[own] = tc;
      const kn = new Set([...pl.known].filter(k => k !== own)); if (ownSees) kn.add(own);
      return { ...pl, cards: c, known: kn };
    }
    if (i === oi) {
      const c = [...pl.cards]; c[si] = players[playerIdx].cards[own];
      return { ...pl, cards: c, known: new Set([...pl.known].filter(k => k !== si)) };
    }
    return pl;
  });
  if (card.r === 'J') {
    if (unknownOwn === -1) return null;
    const players = g.players.map((pl, i) => i === playerIdx ? { ...pl, known: new Set([...pl.known, unknownOwn]) } : pl);
    return { g: { ...g, players }, msg: M.aiJack(p.name) };
  }
  if (card.r === 'Q') {
    if (level !== 'hard' || worst === undefined || p.cards[worst].v <= UNKNOWN_EV || !oppIdx.length) return null;
    const { oi, si } = pickOpp();
    return { g: { ...g, players: swapWith(g.players, worst, oi, si, false) }, msg: M.aiQueenSwap(p.name, g.players[oi].name) };
  }
  if (card.r === 'K') {
    let players = g.players;
    if (unknownOwn !== -1) players = players.map((pl, i) => i === playerIdx ? { ...pl, known: new Set([...pl.known, unknownOwn]) } : pl);
    if (!oppIdx.length) return { g: { ...g, players }, msg: M.aiJack(p.name) };
    const { oi, si } = pickOpp();
    const me = players[playerIdx];
    const w = [...me.known].filter(i => nonNull(me, i)).sort((a, b) => me.cards[b].v - me.cards[a].v)[0];
    const tgt = players[oi].cards[si];
    if (w !== undefined && tgt.v < me.cards[w].v) {
      return { g: { ...g, players: swapWith(players, w, oi, si, true) }, msg: M.aiKingSwap(p.name, players[oi].name) };
    }
    return { g: { ...g, players }, msg: M.aiKingKeep(p.name, players[oi].name) };
  }
  return null;
}

// Koputusarvio: tunnettujen summa + tuntemattomien EV vs. kynnys
function koKnockEstimate(player, level) {
  const ks = [...player.known].reduce((s, i) => s + (player.cards[i]?.v || 0), 0);
  const uk = player.cards.filter(c => c !== null).length - player.known.size;
  const unkEV = level === 'hard' ? 6 : 5;
  const est = ks + uk * unkEV;
  // Oppipoika ei uskalla koputtaa ajoissa (mitattu: aikainen koputus on etu)
  const knockThreshold = level === 'beginner' ? 5 : 8;
  return { shouldKnock: est <= knockThreshold, est };
}

// Haluaako pelaaja poistopakan kortin? Oppipoika ei huomaa poistopakkaa lainkaan;
// Mestari ottaa myös pikkukortin (≤4) tuntemattomaan paikkaan (EV-hyöty ≥3).
function koWantsDiscard(g, playerIdx, level) {
  const pp = g.players[playerIdx];
  const top = g.discard[g.discard.length - 1];
  if (!top || level === 'beginner') return false;
  const worst = [...pp.known].filter(i => pp.cards[i] !== null)
    .sort((a, b) => pp.cards[b].v - pp.cards[a].v)[0];
  if (worst !== undefined && top.v < pp.cards[worst].v) return true;
  if (level === 'hard' && top.v <= UNKNOWN_EV - 3
      && pp.cards.some((c, i) => c !== null && !pp.known.has(i))) return true;
  return false;
}

// Vaihtokohde nostetulle kortille: hyötyvertailu. Tunnetun parannus = varma hyöty;
// tuntemattoman täyttö = EV-hyöty (Kisälli vaatii ≥5, Mestari ≥3). null = poistoon.
function koSwapTarget(player, card, level) {
  const wo = [...player.known].filter(i => player.cards[i] !== null)
    .sort((a, b) => player.cards[b].v - player.cards[a].v)[0];
  const unknownSlot = player.cards.findIndex((c, i) => c !== null && !player.known.has(i));
  const gainKnown   = wo !== undefined ? player.cards[wo].v - card.v : -Infinity;
  const gainUnknown = (level !== 'beginner' && unknownSlot !== -1) ? UNKNOWN_EV - card.v : -Infinity;
  const unknownGate = level === 'hard' ? 3 : 5;
  if (gainUnknown >= unknownGate && gainUnknown > gainKnown) return unknownSlot;
  if (gainKnown > 0) return wo;
  return null;
}

// Mestarin neuvo Herolle. phase 'draw' → koputus/nostolähde, 'drawn' → vaihto/poisto.
// Palauttaa { type, card?, slot? } — type vastaa games.koputus.advice.* -avainta.
export function getAdvice(g) {
  const { phase, drawn, knockedBy: knocked } = g;
  const p = g.players[0];
  if (!p) return null;
  if (phase === 'draw') {
    if (knocked === null && koKnockEstimate(p, 'hard').shouldKnock) return { type: 'knock' };
    if (koWantsDiscard(g, 0, 'hard')) {
      return { type: 'drawDiscard', card: g.discard[g.discard.length - 1] };
    }
    return { type: 'drawDeck' };
  }
  if (phase === 'drawn' && drawn) {
    const slot = koSwapTarget(p, drawn, 'hard');
    if (slot === null) return { type: 'discardDrawn' };
    // Tunnettu paikka = varma pienennys, tuntematon = odotusarvo (UNKNOWN_EV).
    // Eri syy, eri neuvo: perustelu ei saa luvata varmuutta jota koodilla ei ole.
    return { type: p.known.has(slot) ? 'swapSlot' : 'swapUnknown', slot };
  }
  return null;
}

/**
 * @typedef {object} PlayerGridProps
 * @property {any}     [player]
 * @property {boolean} [isActive]
 * @property {any}     [clickableSet]
 * @property {any}     [onCardClick]
 * @property {any}     [peekSet]
 * @property {boolean} [small]
 * @property {boolean} [showScore]
 * @property {string}  [phase]
 * @property {boolean} [debug]
 * @property {any}     [lastSwap]
 * @property {any}     [backStyle]
 * @property {boolean} [showKnown]
 * @property {any}     [intentSlot]
 * @property {any}     [adviceSlot]
 * @param {PlayerGridProps} props
 */
function PlayerGrid({ player, isActive, clickableSet, onCardClick, peekSet, small, showScore, phase, debug, lastSwap, backStyle, showKnown = true, intentSlot, adviceSlot }) {
  const t = useT();
  return (
    <div style={{ padding: small ? '4px 8px' : 14, borderRadius: 12, transition: 'border-color 0.2s', border: `1px solid ${isActive ? 'rgba(201,168,76,0.3)' : 'rgba(42,74,50,0.4)'}`, background: isActive ? 'rgba(201,168,76,0.03)' : 'transparent', display: small ? 'flex' : 'block', alignItems: small ? 'center' : undefined, gap: small ? 6 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: small ? 4 : 8, marginBottom: small ? 0 : 8, fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, flexShrink: 0 }}>
        <span style={{ fontSize: small ? 12 : 14 }}>{player.isHuman ? '👤' : '🤖'}</span>
        <span style={{ fontWeight: isActive ? 700 : 400, letterSpacing: 0.5 }}>{player.name}</span>
        {isActive && !small && <span style={{ fontSize: 9, animation: 'blink 1.2s ease infinite', opacity: 0.8 }}>{t('games.koputus.ui.turnIndicator')}</span>}
        {showScore && player.isHuman && <span style={{ marginLeft: 'auto', color: '#a0baa8', fontSize: 12 }}>{pScore(player)} p</span>}
        {!small && <span style={{ marginLeft: showScore && player.isHuman ? 6 : 'auto', fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65 }}>{t('ui.shared.fieldLabel')}</span>}
      </div>
      <div style={small ? { display: 'flex', flexDirection: 'row', gap: 4 } : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {player.cards.map((card, i) => {
          const vis = !!(debug || peekSet?.has(i));
          const cl = clickableSet?.has(i) ?? false;
          const memGlow = player.known.has(i) && !peekSet?.has(i) && showKnown;
          const reactHL = cl && phase === 'reaction';
          const justPlaced = lastSwap === i;
          if (card === null) return <Card key={i} empty small={small} />;
          return (
            <Card key={i} card={card} faceUp={vis}
              highlight={cl && !small && !reactHL}
              reactHL={reactHL}
              justPlaced={justPlaced}
              pulse={memGlow && !cl && !justPlaced}
              selected={intentSlot === i}
              advice={adviceSlot === i}
              backStyle={backStyle}
              onClick={cl ? () => onCardClick?.(i) : undefined}
              disabled={clickableSet && !cl}
              small={small}
            />
          );
        })}
      </div>
    </div>
  );
}

// Module-scopessa ettei React remounttaa nappia (ja siten hover-tilaa/transitiota) joka renderillä.
/**
 * @typedef {object} BtnProps
 * @property {any}     [label]
 * @property {any}     [onClick]
 * @property {string}  [color]
 * @property {boolean} [outline]
 * @property {boolean} [small]
 * @param {BtnProps} props
 */
function Btn({ label, onClick, color, outline, small: sm }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: outline ? (h ? color + '18' : 'transparent') : `linear-gradient(135deg,${color},${color}cc)`, border: `1px solid ${outline ? (h ? color : color + '66') : color}`, borderRadius: 9, padding: sm ? '7px 14px' : '10px 20px', color: outline ? (h ? color : color + 'bb') : '#0d2118', fontSize: sm ? 11 : 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.4, transition: 'all 0.15s' }}>
      {label}
    </button>
  );
}

// Suljettu arvojoukko: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'idle'|'peeking'|'draw'|'drawn'|'spec_j'|'spec_q_own'|'spec_q_tgt'|'spec_k'|'spec_k_decide'|'spec_k_confirm'|'reaction'|'gameover'} Vaihe */

export default function Koputus({ onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, showAIKnown = true, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen]     = useState('select');
  const [nP, setNP]             = useState(playerCount);
  const { G, gRef, setG, setGS } = useGameState();
  const [msg, setMsg_]          = useState('');
  // Paljastus ja asetus ovat eri asiat (kompositioauditointi H6, päätös 3.9.2026).
  // `seeAll` on App:n omistama asetus joka ei tallennu, ja `revealAll` on tämän pelin
  // näkymätila. Katselutila pakottaa paljastuksen päälle koskematta asetukseen, ja
  // `startGame` palauttaa näkymän asetuksen mukaiseksi.
  const [revealAll, setRevealAll] = useState(seeAll);
  useEffect(() => { setRevealAll(seeAll); }, [seeAll]);
  const [peeksDone, setPD]      = useState(0);
  const [tempPeek, setTP]       = useState(new Set());
  const [reactionOpen, setRO]   = useState(false);
  const [reactionSec, setRS]    = useState(3);
  const [specState, setSS]      = useState(null);
  const [lastSwap, setLastSwap] = useState(null);
  const logOpen = showLog; // omistaja on App, ks. onShowLogChange
  const cardBack = 'ilves';
  const [pakaAnim, setPakaAnim] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [intention, setIntention] = useState(null); // { playerIdx, slotIdx } | null
  const [advice, setAdvice] = useState(null); // { text, slot?, target? } | null
  const prevDeckRef = useRef(null);
  const stopReact = useRef(false);
  const reactInt  = useRef(null);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const sndRef     = useRef(soundOn);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedMove, schedAI, schedTick, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraIntervalRefs: [reactInt] });

  const { log, logRef, addLog: setMsg, commit, resetLog } = useGameLog({
    setGS,
    onMessage: setMsg_, skipEmpty: true, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => {
      const g = gRef.current; if (!g) return null;
      return {
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.cards ?? [], cardCount: p.cards?.length ?? 0, score: null })),
        tableCards: (g.discard ?? []).slice(-1),
      };
    },
  });
  // Neuvo vanhenee jokaisesta tilamuutoksesta. Yksi riippuvuus riittää, koska vuoron
  // tila asuu G:ssä (kompositioauditointi H5).
  useEffect(() => { setAdvice(null); }, [G]);
  const opastus = useOpastus('koputus', G);
  const adv = advice || opastus.hl; // korostettava: neuvo tai opastuksen palaute

  // Renderin lukemat: vuoron tila luetaan G:stä eikä rinnakkaisesta useStatesta.
  const phase     = G?.phase ?? 'idle';
  const curIdx    = G?.cur ?? 0;
  const drawn     = G?.drawn ?? null;
  const knockedBy = G?.knockedBy ?? null;

  // Neuvo ja opastus laskevat saman olion; ero on siinä mitä UI näyttää ja milloin.
  function computeAdvice() {
    const g = gRef.current; if (!g) return null;
    const a = getAdvice(g);
    if (!a) return null;
    const key = a.type === 'knock' ? opastusAvain('knock')
      : a.type === 'drawDiscard' ? opastusAvain('draw:discard')
      : a.type === 'drawDeck' ? opastusAvain('draw:deck')
      : a.type === 'discardDrawn' ? opastusAvain('discard')
      : opastusAvain('swap:' + a.slot);
    return {
      text: t('games.koputus.advice.' + a.type, {
        card: a.card ? lbl(a.card) : undefined,
        slot: a.slot !== undefined ? a.slot + 1 : undefined,
      }),
      slot: a.slot,
      target: a.type === 'drawDiscard' ? 'discard' : a.type === 'drawDeck' ? 'deck' : null,
      key,
    };
  }
  // Opastuksen päällä neuvo näyttää vain korostuksen; sääntöteksti on jo opastuskuplassa.
  function askAdvice() { const a = computeAdvice(); setAdvice(a && opastus.pending ? { ...a, text: null } : a); }
  function askGuide() { opastus.ask(computeAdvice()); }
  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const cur = G.deck.length;
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && cur === 0) setPakaAnim(true);
    prevDeckRef.current = cur;
  }, [G?.deck?.length]);

  function startGame(forcedCount, allBotsMode = false) {
    clearTimeout(aiTmr.current); clearInterval(reactInt.current);
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    setRevealAll(seeAll || allBotsMode);
    pausedRef.current = false; setPaused(false);
    const cnt = forcedCount || nP;
    const base = initGame(cnt, playerNames, allBotsMode);
    setSS(null); setRO(false);
    resetLog(); setPakaAnim(false);
    if (allBotsMode) {
      // Ohita kurkkausvaihe — kaikki botit tietävät jo 2 korttiaan
      const si = 1 % cnt;
      setGS({ ...base, phase: /** @type {Vaihe} */ ('draw'), cur: si });
      setPD(2); setTP(new Set());
      setMsg(t('games.koputus.msg.botBattleStart'));
      setScreen('game');
      setShuffling(true);
      schedAI(() => runAI(si, gRef.current), 2000);
    } else {
      setGS({ ...base, phase: /** @type {Vaihe} */ ('peeking') });
      setPD(0); setTP(new Set());
      setMsg(M.peekStart);
      setScreen('game');
      setShuffling(true);
    }
  }

  function startBotBattle() {
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }


  function onPeek(idx) {
    if (peeksDone >= 2) return;
    const next = peeksDone + 1;
    setPD(next);
    setTP(prev => new Set([...prev, idx]));
    const newG = { ...gRef.current, players: gRef.current.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p) };
    setGS(newG);
    tm(() => setTP(prev => { const n = new Set(prev); n.delete(idx); return n; }), 2500);
    if (next === 1) setMsg(M.peekOne);
    else {
      setMsg(M.peekDone);
      tm(() => {
        const si = 1 % nP;
        const g2 = { ...(gRef.current ?? newG), phase: /** @type {Vaihe} */ ('draw'), cur: si };
        if (g2.players[si].isHuman) commit(g2, M.yourTurn);
        else { commit(g2, M.aiTurn(g2.players[si].name)); schedMove(() => runAI(si, gRef.current), 600); }
      }, 1600);
    }
  }

  // Pohjana on tuorein pelitila eikä kutsujan tallettama kopio. Ajastimesta heräävä
  // kutsu voi kantaa vanhentunutta oliota, ja vaihe kirjoitetaan nyt pelitilaan.
  function advance(gState, fromIdx) {
    const g = gRef.current ?? gState;
    let lastRound = g.lastRound;
    if (g.knockedBy !== null && lastRound !== null) {
      lastRound = new Set(lastRound); lastRound.delete(g.players[fromIdx].id);
      if (lastRound.size === 0) { endGame(g); return; }
    }
    const next = (fromIdx + 1) % g.players.length;
    setSS(null);
    const g2 = { ...g, lastRound, cur: next, phase: /** @type {Vaihe} */ ('draw'), drawn: null };
    const np = g2.players[next];
    if (np.isHuman) commit(g2, M.yourTurn);
    else { commit(g2, M.aiTurn(np.name)); schedAI(() => runAI(next, gRef.current), 600); }
  }

  function endGame(gState) {
    const players = gState.players;
    const sorted  = [...players].sort(pRank);
    const ranking = sorted.map(p => {
      const s = pScore(p);
      return { name: p.name, place: sorted.filter(q => pBetter(q, p)).length + 1, score: s, isHuman: p.isHuman };
    });
    const revealCards = players.map(p => ({ name: p.name, cards: p.cards }));
    if (sndRef.current) { SFX.reveal(); tm(() => SFX.fanfare(), 500); }
    if (allBotsRef.current) {
      tm(() => onResult?.({ ranking, revealCards }), BOT_RESULT_DELAY);
    } else {
      onResult?.({ ranking, revealCards });
    }
    commit({ ...(gRef.current ?? gState), phase: /** @type {Vaihe} */ ('gameover') }, M.gameOver);
  }

  function humanDrawDeck() {
    const g = gRef.current; if (!g || !g.deck.length) return;
    if (soundOn) SFX.flip();
    opastus.answer(opastusAvain('draw:deck'));
    const deck = [...g.deck], card = deck.shift();
    commit({ ...g, deck, drawn: card, phase: /** @type {Vaihe} */ ('drawn') }, M.drawn(card));
  }
  function humanDrawDiscard() {
    const g = gRef.current; if (!g || !g.discard.length) return;
    if (soundOn) SFX.flip();
    opastus.answer(opastusAvain('draw:discard'));
    const discard = [...g.discard], card = discard.pop();
    commit({ ...g, discard, drawn: card, phase: /** @type {Vaihe} */ ('drawn') }, M.drawnD(card));
  }
  function humanKnock() {
    const g = gRef.current;
    if (!g || g.knockedBy !== null) return;
    if (soundOn) SFX.tikki();
    opastus.answer(opastusAvain('knock'));
    const lr = new Set(g.players.filter((_, i) => i !== 0).map(p => p.id));
    commit({ ...g, knockedBy: 0, lastRound: lr }, M.knocked('Hero'));
  }

  function flashSlot(pIdx, cIdx) {
    setLastSwap({ pIdx, cIdx });
    tm(() => setLastSwap(null), 2200);
  }

  // KO-2 (8.9.2026): kun jatko on ajastettu, toinen klikkaus ei tee toista siirtoa.
  // Lukko avataan openReactionissa (advance-polku kulkee sen kautta).
  const lockRef = useRef(false);

  function humanSwap(cardIdx) {
    if (lockRef.current) return;
    const g = gRef.current, drawn = g.drawn, oldCard = g.players[0].cards[cardIdx];
    flashSlot(0, cardIdx);
    opastus.answer(opastusAvain('swap:' + cardIdx));
    if (soundOn) SFX.swap();
    const players = g.players.map((p, i) => {
      if (i !== 0) return p;
      const cards = [...p.cards]; cards[cardIdx] = drawn;
      return { ...p, cards, known: new Set([...p.known, cardIdx]) };
    });
    const newG = { ...g, players, discard: [...g.discard, oldCard] };
    lockRef.current = true;
    commit(newG, M.swapped(oldCard));
    stopReact.current = false;
    tm(() => openReaction(newG, oldCard, 0), 600);
  }
  function humanDiscard() {
    if (lockRef.current) return;
    const g = gRef.current, drawn = g.drawn;
    opastus.answer(opastusAvain('discard'));
    if (soundOn) SFX.play();
    const newG = { ...g, discard: [...g.discard, drawn] };
    if (drawn.r !== 'J' && drawn.r !== 'Q' && drawn.r !== 'K') lockRef.current = true;
    commit(newG, M.discarded(drawn));
    if (drawn.r === 'J') { commit({ ...newG, phase: /** @type {Vaihe} */ ('spec_j') }, M.jackMsg); return; }
    if (drawn.r === 'Q') { commit({ ...newG, phase: /** @type {Vaihe} */ ('spec_q_own') }, M.queenMsg); setSS({ type: 'Q', ownIdx: null }); return; }
    if (drawn.r === 'K') { commit({ ...newG, phase: /** @type {Vaihe} */ ('spec_k') }, M.kingMsg); setSS({ type: 'K', ownIdx: null }); return; }
    tm(() => openReaction(newG, drawn, 0), 200);
  }

  function handleJ(idx) {
    if (lockRef.current) return;
    lockRef.current = true;
    const g = gRef.current, card = g.players[0].cards[idx];
    setTP(new Set([idx])); tm(() => setTP(new Set()), 2500);
    const players = g.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p);
    const newG = { ...g, players };
    commit(newG, t('games.koputus.msg.peekedCard', { card: lbl(card), v: card.v }));
    tm(() => openReaction(newG, g.drawn, 0), 2800);
  }
  function handleQOwn(idx) {
    stopReact.current = true; clearInterval(reactInt.current);
    setSS({ type: 'Q', ownIdx: idx });
    commit({ ...gRef.current, phase: /** @type {Vaihe} */ ('spec_q_tgt') },
           t('games.koputus.msg.queenPickOther', { idx: idx + 1 }));
  }
  function handleQTarget(pIdx, cIdx) {
    if (lockRef.current) return;
    const g = gRef.current, own = specState.ownIdx;
    const oc = g.players[0].cards[own], tc = g.players[pIdx].cards[cIdx];
    // KO-1 (8.9.2026): kumpikaan ei ole nähnyt saamaansa korttia, joten muisti tyhjenee paikasta.
    const players = g.players.map((p, i) => {
      if (i === 0) { const c = [...p.cards]; c[own] = tc; return { ...p, cards: c, known: new Set([...p.known].filter(k => k !== own)) }; }
      if (i === pIdx) { const c = [...p.cards]; c[cIdx] = oc; return { ...p, cards: c, known: new Set([...p.known].filter(k => k !== cIdx)) }; }
      return p;
    });
    const newG = { ...g, players }; setSS(null);
    lockRef.current = true;
    commit(newG, t('games.koputus.msg.swapDoneHidden'));
    stopReact.current = false;
    tm(() => openReaction(newG, g.drawn, 0), 800);
  }
  function handleKPeek(idx) {
    stopReact.current = true; clearInterval(reactInt.current);
    const g = gRef.current, card = g.players[0].cards[idx];
    setTP(new Set([idx]));
    const players = g.players.map((p, i) => i === 0 ? { ...p, known: new Set([...p.known, idx]) } : p);
    const newG = { ...g, players, phase: /** @type {Vaihe} */ ('spec_k_decide') };
    commit(newG, t('games.koputus.msg.kingPeeked', { card: lbl(card), v: card.v }));
    setSS({ type: 'K', ownIdx: idx });
  }
  function handleKPeekTarget(pIdx, cIdx) {
    const g = gRef.current, tgtCard = g.players[pIdx].cards[cIdx];
    if (!tgtCard) return;
    setSS(prev => ({ ...prev, tgtPIdx: pIdx, tgtCIdx: cIdx, tgtCard }));
    commit({ ...g, phase: /** @type {Vaihe} */ ('spec_k_confirm') },
           t('games.koputus.msg.kingRivalCard', { card: lbl(tgtCard), v: tgtCard.v }));
  }
  function handleKSwap() {
    if (lockRef.current) return;
    const g = gRef.current, own = specState.ownIdx;
    const realPIdx = specState.tgtPIdx, realCIdx = specState.tgtCIdx;
    const oc = g.players[0].cards[own], tc = g.players[realPIdx].cards[realCIdx];
    // KO-1 (8.9.2026): Hero näki kohdekortin (kingPeeked), botti ei ole nähnyt saamaansa.
    const players = g.players.map((p, i) => {
      if (i === 0) { const c = [...p.cards]; c[own] = tc; return { ...p, cards: c }; }
      if (i === realPIdx) { const c = [...p.cards]; c[realCIdx] = oc; return { ...p, cards: c, known: new Set([...p.known].filter(k => k !== realCIdx)) }; }
      return p;
    });
    const newG = { ...g, players };
    setTP(new Set()); setSS(null); stopReact.current = false;
    lockRef.current = true;
    commit(newG, t('games.koputus.msg.swapDone'));
    tm(() => openReaction(newG, g.drawn, 0), 1200);
  }
  function handleKSkip() {
    if (lockRef.current) return;
    lockRef.current = true;
    setTP(new Set()); setSS(null); stopReact.current = false;
    setMsg(t('games.koputus.msg.skipped'));
    tm(() => openReaction(gRef.current, gRef.current?.drawn, 0), 800);
  }

  function openReaction(gState, card, byIdx) {
    lockRef.current = false;
    if (gState.deck.length < 2) { advance(gState, byIdx); return; }
    stopReact.current = false; setRO(true); setRS(3.5);
    commit({ ...(gRef.current ?? gState), phase: /** @type {Vaihe} */ ('reaction') }, M.reactQ(card));
    let t = 3.5;
    clearInterval(reactInt.current);
    reactInt.current = schedTick(() => {
      t = Math.round((t - 0.5) * 10) / 10; setRS(t);
      if (t <= 0) {
        clearInterval(reactInt.current);
        if (!stopReact.current) { stopReact.current = true; setRO(false); setMsg(M.reactEnd); advance(gState, byIdx); }
      }
    }, 500);
    gState.players.forEach((p, i) => {
      if (p.isHuman) return;
      const level = botLevelsRef.current?.[i] ?? aiLevelRef.current;
      const missProbability   = level === 'beginner' ? 0.5 : level === 'normal' ? 0.25 : 0.03;
      const wrongReactChance  = level === 'beginner' ? 0.15 : 0;
      const mi = [...p.known].find(ki => p.cards[ki]?.r === card.r);

      // Passiivisuus: jättää reagoimatta vaikka tietää sopivan kortin
      if (mi !== undefined && Math.random() < missProbability) return;

      if (mi !== undefined) {
        // Oikea reaktio
        const delay = 800 + Math.random() * 2400;
        schedMove(() => {
          if (stopReact.current) return;
          stopReact.current = true; clearInterval(reactInt.current); setRO(false);
          const cur = gRef.current;
          const reactedCard = cur.players[i].cards[mi];
          const players = cur.players.map((pl, pi) => {
            if (pi !== i) return pl;
            const cards = [...pl.cards]; cards[mi] = null;
            const kn = new Set([...pl.known].filter(k => k !== mi));
            return { ...pl, cards, known: kn };
          });
          const newG = { ...cur, players, discard: reactedCard ? [...cur.discard, reactedCard] : cur.discard };
          commit(newG, M.aiReact(p.name, p.cards[mi]));
          schedMove(() => advance(newG, byIdx), 900);
        }, delay);
      } else if (Math.random() < wrongReactChance) {
        // Aloittelija-virhe: arvaa tuntemattomalla kortilla
        const unknownIdxs = [0,1,2,3].filter(ki => !p.known.has(ki) && p.cards[ki] !== null);
        if (!unknownIdxs.length) return;
        const wrongIdx = unknownIdxs[Math.floor(Math.random() * unknownIdxs.length)];
        const delay = 1200 + Math.random() * 1600;
        schedMove(() => {
          if (stopReact.current) return;
          stopReact.current = true; clearInterval(reactInt.current); setRO(false);
          const cur = gRef.current;
          const wrongCard = cur.players[i].cards[wrongIdx];
          if (!wrongCard) return;
          if (wrongCard.r === card.r) {
            // Sattumalta oikein — käy onneksi
            if (sndRef.current) SFX.reactWin();
            const players = cur.players.map((pl, pi) => {
              if (pi !== i) return pl;
              const cards = [...pl.cards]; cards[wrongIdx] = null;
              const kn = new Set([...pl.known].filter(k => k !== wrongIdx));
              return { ...pl, cards, known: kn };
            });
            const newG = { ...cur, players, discard: [...cur.discard, wrongCard] };
            commit(newG, M.aiReact(p.name, wrongCard));
            schedMove(() => advance(newG, byIdx), 900);
          } else {
            // Väärä arvaus — rangaistus
            if (sndRef.current) SFX.reactWrong();
            const afterLoss = [...cur.players[i].cards]; afterLoss[wrongIdx] = null;
            const draws = cur.deck.slice(0, 2); let dIdx = 0;
            const withPenalty = afterLoss.map(c => { if (c === null && dIdx < draws.length) return draws[dIdx++]; return c; });
            const remainingDeck = cur.deck.slice(dIdx); // KO-4 (8.9.2026): vain sijoitetut kortit poistuvat pakasta
            const players = cur.players.map((pl, pi) => {
              if (pi !== i) return pl;
              const kn = new Set([...pl.known].filter(k => k !== wrongIdx));
              return { ...pl, cards: withPenalty, known: kn };
            });
            const newG = { ...cur, players, deck: remainingDeck, discard: [...cur.discard, wrongCard] };
            commit(newG, M.aiWrongReact(p.name));
            schedMove(() => advance(newG, byIdx), 1200);
          }
        }, delay);
      }
    });
  }

  function humanReact(cardIdx) {
    if (!reactionOpen || !gRef.current) return;
    const g = gRef.current, top = g.discard[g.discard.length - 1];
    if (!top) return;
    stopReact.current = true; clearInterval(reactInt.current); setRO(false);
    if (g.players[0].cards[cardIdx]?.r === top.r) {
      const remainingNonNull = g.players[0].cards.filter((c, i) => c !== null && i !== cardIdx).length;
      const isLastCard = remainingNonNull === 0;
      const reactedCard = g.players[0].cards[cardIdx];
      const players = g.players.map((p, i) => {
        if (i !== 0) return p;
        const cards = [...p.cards]; cards[cardIdx] = null;
        const kn = new Set(p.known); kn.delete(cardIdx);
        return { ...p, cards, known: kn };
      });
      const newG = { ...g, players, discard: reactedCard ? [...g.discard, reactedCard] : g.discard };
      if (isLastCard) {
        if (soundOn) SFX.lastCardWin();
        commit(newG, t('games.koputus.msg.lastCardPlayed'));
        tm(() => endGame(newG), 2200);
      } else {
        if (soundOn) SFX.reactWin();
        commit(newG, M.reactWin());
        tm(() => advance(newG, newG.cur), 2000);
      }
    } else {
      if (soundOn) SFX.reactWrong();
      const lostCard = g.players[0].cards[cardIdx];
      const afterLoss = [...g.players[0].cards]; afterLoss[cardIdx] = null;
      const draws = g.deck.slice(0, 2); let dIdx = 0;
      const withPenalty = afterLoss.map(c => { if (c === null && dIdx < draws.length) return draws[dIdx++]; return c; });
      const remainingDeck = g.deck.slice(dIdx); // KO-4 (8.9.2026)
      const newKn = new Set([...g.players[0].known].filter(k => k !== cardIdx));
      const players = g.players.map((p, i) => i === 0 ? { ...p, cards: withPenalty, known: newKn } : p);
      const newG = { ...g, players, deck: remainingDeck, discard: [...g.discard, lostCard] };
      commit(newG, M.reactWrong);
      tm(() => advance(newG, newG.cur), 2200);
    }
  }

  function runAI(playerIdx, gState) {
    if (!gState) gState = gRef.current; if (!gState) return;
    if ((gRef.current?.cur ?? gState.cur) !== playerIdx) return;
    const p = gState.players[playerIdx];
    // Kyvykkyysporras (ei satunnaiskohinaa):
    //   Oppipoika: ei huomaa poistopakkaa; arka koputtaja (kynnys 5) — botbench
    //              osoitti että AIKAINEN koputus on etu, joten heikkous on arkuus
    //   Kisälli:   poistopakka + vaihto huonoimpaan tunnettuun; arvio ×5, kynnys 8;
    //              täyttää tuntemattoman vain varmalla kortilla (A/2)
    //   Mestari:   + realistinen tuntemattoman arvio (×6) ja laajempi EV-vaihto
    //              tuntemattomaan paikkaan (≤4; KOPUTUS.md strategia, kohta 3)
    const level = botLevelsRef.current?.[playerIdx] ?? aiLevelRef.current;
    if (gState.knockedBy === null) {
      if (koKnockEstimate(p, level).shouldKnock) {
        if (sndRef.current) SFX.tikki();
        const lr = new Set(gState.players.filter((_, i) => i !== playerIdx).map(pl => pl.id));
        gState = { ...gState, knockedBy: playerIdx, lastRound: lr };
        commit(gState, M.aiKnock(p.name));
      }
    }
    const wantsDiscard = (gg) => koWantsDiscard(gg, playerIdx, level);
    const drawFromDiscard = wantsDiscard(gState);
    const thinkMs = allBotsRef.current ? Math.min(aiDelayRef.current * 0.25, 500) : 1600;
    const reactMs = allBotsRef.current ? 400 : 1200;
    tm(() => { setMsg(t(drawFromDiscard ? 'games.koputus.msg.aiDrawingDiscard' : 'games.koputus.msg.aiDrawingDeck', { name: p.name })); if (sndRef.current) SFX.flip(); }, thinkMs);
    schedAI(() => {
      const gNow = gRef.current; if (!gNow) return;
      const pNow = gNow.players[playerIdx];
      const drawFromDiscardNow = wantsDiscard(gNow);
      let card, deck, discard;
      if (drawFromDiscardNow) {
        card = gNow.discard[gNow.discard.length - 1];
        deck = gNow.deck; discard = gNow.discard.slice(0, -1);
      } else {
        if (!gNow.deck.length) { endGame(gNow); return; }
        card = gNow.deck[0]; deck = gNow.deck.slice(1); discard = gNow.discard;
      }
      const targetSlot = koSwapTarget(pNow, card, level);
      const target = targetSlot === null ? undefined : targetSlot;
      if (target !== undefined) {
        const doSwap = () => {
          const old = pNow.cards[target];
          const players = gNow.players.map((pl, i) => {
            if (i !== playerIdx) return pl;
            const cards = [...pl.cards]; cards[target] = card;
            return { ...pl, cards, known: new Set([...pl.known, target]) };
          });
          const updG = { ...gNow, players, deck, discard: [...discard, old] };
          commit(updG, M.aiSwapped(p.name, old));
          if (sndRef.current) SFX.swap();
          flashSlot(playerIdx, target);
          schedMove(() => openReaction(updG, old, playerIdx), reactMs);
        };
        if (initShowIntention) {
          const intentionMs = Math.min(1200, Math.max(400, aiDelayRef.current * 0.3));
          setIntention({ playerIdx, slotIdx: target });
          schedMove(() => { setIntention(null); doSwap(); }, intentionMs);
          return;
        }
        doSwap();
      } else {
        let updG = { ...gNow, deck, discard: [...discard, card] };
        commit(updG, M.aiDiscard(p.name, card));
        if (sndRef.current) SFX.play();
        // Erityiskortti (J/Q/K): botti käyttää sen tasonsa mukaan (KO-3, 8.9.2026)
        const sp = koAISpecial(updG, playerIdx, card, level, M);
        if (sp) { updG = sp.g; commit(updG, sp.msg); }
        schedMove(() => openReaction(updG, card, playerIdx), reactMs);
      }
    }, 3600);
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <GameStartScreen
      icon={'🤜'}
      title="KOPUTUS"
      titleSize={isMobile ? 36 : 54}
      letterSpacing={isMobile ? 8 : 14}
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

  if (!G) return null;

  const human = G.players[0];
  const ais = allBots ? G.players : G.players.slice(1);
  const discardTop = G.discard[G.discard.length - 1];
  const isHuman = curIdx === 0 && !allBots;

  const ownClickable = () => {
    const nonNull = i => G.players[0].cards[i] !== null;
    if (phase === 'peeking' && peeksDone < 2) return new Set([0, 1, 2, 3].filter(i => !human.known.has(i) && nonNull(i)));
    if (phase === 'drawn' && isHuman) return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'reaction' && reactionOpen) return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'spec_j') return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'spec_q_own') return new Set([0, 1, 2, 3].filter(nonNull));
    if (phase === 'spec_k') return new Set([0, 1, 2, 3].filter(nonNull));
    return null;
  };
  const tgtClickable = pi => (phase === 'spec_q_tgt' || phase === 'spec_k_decide') && pi !== 0 ? new Set([0, 1, 2, 3]) : null;
  const onOwnCard = idx => {
    if (phase === 'peeking') onPeek(idx);
    else if (phase === 'drawn' && isHuman) humanSwap(idx);
    else if (phase === 'reaction' && reactionOpen) humanReact(idx);
    else if (phase === 'spec_j') handleJ(idx);
    else if (phase === 'spec_q_own') handleQOwn(idx);
    else if (phase === 'spec_k') handleKPeek(idx);
  };
  const showDrawn = ['drawn', 'spec_j', 'spec_q_own', 'spec_q_tgt', 'spec_k', 'spec_k_decide', 'spec_k_confirm'].includes(phase);

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : 16, maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 40, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />
      <TurnPrompt show={isHuman && !showDrawn} action={t('ui.turn.koputus')} />
      <AdviceBubble text={advice?.text || opastus.text} onDismiss={() => { setAdvice(null); opastus.dismiss(); }} />
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 66 : 72, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 17, flexShrink: 0 }}>🤜</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>
      {knockedBy !== null && (
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.red + '14', border: `1px solid ${C.red}40`, borderRadius: 10, padding: '4px 14px', fontFamily: 'sans-serif', fontSize: 12, color: C.red, letterSpacing: 0.5 }}>{t('games.koputus.ui.knockedBanner')}</div>
        </div>
      )}
      {ais.length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 6 : 12 }}>
              {ais.map((ai) => {
                const pi = ai.id;
                return (
                  <div key={ai.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${curIdx === pi ? C.gold + '55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px' }}>
                    <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: curIdx === pi ? C.gold : C.dim }}>
                      🤖 {ai.name.slice(0, 8)}{curIdx === pi ? ' ●' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', flex: 1, paddingTop: 8 }}>
                      {ai.cards.map((c, ci) =>
                        c
                          ? <Card key={ci} card={c} small backStyle={BACKS[cardBack]} faceUp={revealAll}
                              selected={intention?.playerIdx === pi && intention.slotIdx === ci}
                              // Katselutila ei käytä PlayerGridiä, joten muistikorostus
                              // (showAIKnown) piti kytkeä tähän erikseen; ilman tätä
                              // katsoja ei nähnyt mitä kortteja botti tietää.
                              pulse={showAIKnown && ai.known.has(ci)} />
                          : <div key={ci} style={{ width: isMobile ? 30 : 36, height: isMobile ? 43 : 52, borderRadius: 5, border: '1px dashed rgba(255,255,255,0.1)', opacity: 0.3, flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          : (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: isMobile ? 'nowrap' : 'wrap', marginBottom: isMobile ? 6 : 12 }}>
              {ais.map((ai) => {
                const pi = ai.id;
                return (
                  <div key={ai.id} style={isMobile ? { width: '100%' } : { flex: 1, minWidth: 110 }}>
                    <PlayerGrid player={ai} isActive={curIdx === pi} small={true} backStyle={BACKS[cardBack]}
                      phase={phase} debug={revealAll} showKnown={showAIKnown}
                      lastSwap={lastSwap?.pIdx === pi ? lastSwap.cIdx : null}
                      clickableSet={tgtClickable(pi)}
                      intentSlot={intention?.playerIdx === pi ? intention.slotIdx : undefined}
                      onCardClick={ci => {
                        if (phase === 'spec_q_tgt') handleQTarget(pi, ci);
                        else if (phase === 'spec_k_decide') handleKPeekTarget(pi, ci);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )
      )}

      {/* Pakka-alue */}
      {(() => { const cw = isMobile ? 62 : 82; const ch = isMobile ? 88 : 112; return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', padding: isMobile ? '6px 8px' : '14px 16px', background: 'rgba(255,255,255,0.013)', border: '1px solid #1a3a22', borderRadius: 14, marginBottom: isMobile ? 6 : 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.deck')}</div>
          <div onClick={isHuman && phase === 'draw' && G.deck.length ? humanDrawDeck : undefined}
            {...(isHuman && phase === 'draw' && G.deck.length ? { role: 'button', tabIndex: 0, 'aria-label': t('ui.shared.drawDeckAria'), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); humanDrawDeck(); } } } : {})}
            style={{ cursor: isHuman && phase === 'draw' && G.deck.length ? 'pointer' : 'default', position: 'relative', width: cw, height: ch }}>
            {G.deck.length === 0
              ? <div style={{ width: cw, height: ch, borderRadius: 9, border: '1.5px dashed #1a3a22', opacity: 0.3 }} />
              : <>
                {G.deck.length > 2 && <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-5deg) translate(-4px,3px)', transformOrigin: 'bottom center', opacity: 0.55, zIndex: 0 }}>{BACKS[cardBack].render(cw, ch)}</div>}
                {G.deck.length > 1 && <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, transform: 'rotate(-2.5deg) translate(-2px,1.5px)', transformOrigin: 'bottom center', opacity: 0.75, zIndex: 1 }}>{BACKS[cardBack].render(cw, ch)}</div>}
                <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, overflow: 'hidden', background: BACKS[cardBack].bg, border: `2px solid ${adv?.target === 'deck' ? C.botMode : isHuman && phase === 'draw' ? C.gold : BACKS[cardBack].border}`, boxShadow: adv?.target === 'deck' ? '0 0 18px rgba(192,132,252,0.65)' : isHuman && phase === 'draw' ? `0 0 18px rgba(201,168,76,0.55)` : '0 2px 8px rgba(0,0,0,0.4)', zIndex: 2 }}>
                  {BACKS[cardBack].render(cw, ch)}
                </div>
              </>}
          </div>
          <div style={{ marginTop: 6 }}>
            <PakkaCount variant="count" count={G.deck.length} flash={pakaAnim} style={{ fontSize: 10, fontFamily: 'sans-serif' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: isMobile ? 52 : 72, flexShrink: 0 }}>
          {reactionOpen
            ? <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, borderRadius: 32, border: `3px solid ${C.red}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 22px ${C.red}44`, animation: 'rpulse 1s ease infinite' }}>
              <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.red, lineHeight: 1, fontFamily: 'monospace' }}>{reactionSec}</span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: 'sans-serif', letterSpacing: 1 }}>{t('games.koputus.ui.sec')}</span>
            </div>
            : <div style={{ width: isMobile ? 48 : 64, height: isMobile ? 48 : 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.12 }}>⚡</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.discardLabel')}</div>
          <div onClick={isHuman && phase === 'draw' && discardTop ? humanDrawDiscard : undefined}
            {...(isHuman && phase === 'draw' && discardTop ? { role: 'button', tabIndex: 0, 'aria-label': t('ui.shared.drawDiscardAria'), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); humanDrawDiscard(); } } } : {})}
            style={{ cursor: isHuman && phase === 'draw' && discardTop ? 'pointer' : 'default', position: 'relative', width: cw, height: ch }}>
            {!discardTop
              ? <div style={{ width: cw, height: ch, borderRadius: 9, border: '1.5px dashed #1a3a22', opacity: 0.25 }} />
              : <div style={{ position: 'absolute', top: 0, left: 0, width: cw, height: ch, borderRadius: 9, background: C.card, border: `2px solid ${adv?.target === 'discard' ? C.botMode : isHuman && phase === 'draw' ? C.gold : '#aaa'}`, boxShadow: adv?.target === 'discard' ? '0 0 18px rgba(192,132,252,0.65)' : isHuman && phase === 'draw' ? `0 0 18px rgba(201,168,76,0.55)` : '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: SUIT_COLOR[discardTop.s], fontFamily: 'Georgia,serif', textAlign: 'center', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700 }}>{discardTop.r}</div>
                  <div style={{ fontSize: isMobile ? 20 : 26 }}>{discardTop.s}</div>
                </div>
              </div>}
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginTop: 6 }}>{G.discard.length} {t('ui.shared.pcs')}</div>
        </div>
      </div>
      ); })()}

      {!allBots && (
      <div style={{ marginBottom: isMobile ? 6 : 12 }}>
        <PlayerGrid player={human} isActive={isHuman} phase={phase} debug={revealAll || allBots} backStyle={BACKS[cardBack]}
          clickableSet={ownClickable()} onCardClick={onOwnCard} peekSet={tempPeek}
          adviceSlot={adv?.slot}
          lastSwap={lastSwap?.pIdx === 0 ? lastSwap.cIdx : null} small={isMobile} />
      </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: drawn && showDrawn ? 'rgba(255,255,255,0.022)' : 'transparent', border: `1px solid ${drawn && showDrawn ? '#2a4a32' : 'transparent'}`, borderRadius: 10, marginBottom: isMobile ? 4 : 12, minHeight: isMobile ? 36 : 50, transition: 'background 0.2s' }}>
        {drawn && showDrawn
          ? <><span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim, flexShrink: 0 }}>{t('games.koputus.ui.drawnLabel')}</span><Card card={drawn} faceUp small /><span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{drawn.r}{drawn.s} · <span style={{ color: C.gold, fontWeight: 700 }}>{drawn.v} p</span></span></>
          : <span style={{ color: 'transparent', userSelect: 'none' }}>·</span>}
      </div>
      {phase === 'spec_k_confirm' && specState?.tgtCard && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${C.gold}44`, borderRadius: 10, marginBottom: 12 }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.gold, flexShrink: 0 }}>{t('games.koputus.ui.opponentCardLabel')}</span>
          <Card card={specState.tgtCard} faceUp small />
          <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.text }}>{specState.tgtCard.r}{specState.tgtCard.s} · <span style={{ color: C.gold, fontWeight: 700 }}>{specState.tgtCard.v} p</span></span>
        </div>
      )}

      {/* Bottien taistelu -hallintapalkki */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: isMobile ? 4 : 10, minHeight: isMobile ? 36 : 44, alignItems: 'center' }}>
        {isHuman && phase === 'drawn' && <Btn label={t('games.koputus.ui.discard')} onClick={humanDiscard} color={C.gold} />}
        {isHuman && phase === 'draw' && knockedBy === null && <Btn label={t('games.koputus.ui.knock')} onClick={humanKnock} color={C.red} outline />}
        {isHuman && (phase === 'draw' || phase === 'drawn') && <><AdviceButton onClick={askAdvice} /><GuideButton onClick={askGuide} /></>}
        {!allBots && phase === 'spec_q_tgt' && specState && <Btn label={t('games.koputus.ui.skipSwap')} onClick={() => { setSS(null); stopReact.current = false; tm(() => openReaction(gRef.current, drawn, 0), 200); }} color={C.dim} outline />}
        {!allBots && phase === 'spec_k_decide' && specState && <Btn label={t('games.koputus.ui.skipSwap')} onClick={handleKSkip} color={C.dim} outline />}
        {!allBots && phase === 'spec_k_confirm' && <Btn label={t('games.koputus.ui.swapHere')} onClick={handleKSwap} color={C.gold} />}
        {!allBots && phase === 'spec_k_confirm' && <Btn label={t('games.koputus.ui.skipSwap')} onClick={handleKSkip} color={C.dim} outline />}
      </div>

      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
      >
        <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('games.koputus.ui.goal')}
      </GameStatusBar>

      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)} />

      {/* PendingResult overlay — allBots-tilan loppunäyttö */}

      <style>{`
        @keyframes rpulse{0%{transform:scale(1);box-shadow:0 0 22px rgba(224,92,59,0.4)}40%{transform:scale(1.13);box-shadow:0 0 32px rgba(224,92,59,0.7)}100%{transform:scale(1);box-shadow:0 0 22px rgba(224,92,59,0.4)}}
        @keyframes slotFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9),0 0 18px rgba(201,168,76,0.6)}60%{box-shadow:0 0 0 2px rgba(201,168,76,0.5),0 0 10px rgba(201,168,76,0.3)}100%{box-shadow:none}}
        @keyframes reactPulse{0%,100%{border-color:#e05c3b;box-shadow:0 0 8px rgba(224,92,59,0.4)}50%{border-color:#ff7a5a;box-shadow:0 0 16px rgba(224,92,59,0.7)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
      `}</style>
    </div>
  );
}
