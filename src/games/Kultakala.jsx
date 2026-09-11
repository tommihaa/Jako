import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { isRed, lbl, truncName, newDeck, cardName, shuffledAINames, lblColored, BOT_RESULT_DELAY, UNKNOWN_EV } from '../shared/helpers.js';
import FanStack from '../shared/FanStack.jsx';
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



// Värilliset kortit lokeissa

const M = {
  get gameStart() { return tr('games.kultakala.msg.gameStart'); },
  get deckEmpty() { return tr('games.kultakala.msg.deckEmpty'); },
  get yourTurn() { return tr('games.kultakala.msg.yourTurn'); },
  aiThinking: p => tr('games.kultakala.msg.aiThinking', { name: p.name }),
  aiDrawDiscard: p => tr('games.kultakala.msg.aiDrawDiscard', { name: p.name }),
  aiDrawDeck: p => tr('games.kultakala.msg.aiDrawDeck', { name: p.name }),
  aiDiscard: (p, c) => tr('games.kultakala.msg.aiDiscard', { name: p.name, card: lblColored(c) }),
  aiCannotForceSwap: (p, c, reason) => tr('games.kultakala.msg.aiCannotForceSwap', { name: p.name, card: lblColored(c), reason }),
  humanDrawDiscard: (c, v) => tr('games.kultakala.msg.humanDrawDiscard', { card: lblColored(c), v }),
  humanDrawDeck: (c, v) => tr('games.kultakala.msg.humanDrawDeck', { card: lblColored(c), v }),
  humanSwappedEnd: (idx, c, v, oldName) => tr('games.kultakala.msg.humanSwappedEnd', { idx: idx + 1, card: lblColored(c), v, oldName }),
  humanSwappedContinue: (idx, c, v, oldName) => tr('games.kultakala.msg.humanSwappedContinue', { idx: idx + 1, card: lblColored(c), v, oldName }),
  humanDiscard: (c) => tr('games.kultakala.msg.humanDiscard', { card: lblColored(c) }),
  gameOverScores: (scores) => tr('games.kultakala.msg.gameOverScores', { scores }),
};

function initGame(nPlayers, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const deck = newDeck();
  const players = Array.from({ length: nPlayers }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0,
    unknown: deck.shift(),
    row: [deck.shift(), deck.shift(), deck.shift(), deck.shift(), deck.shift()],
    known: new Set(),
  }));
  // Vaihe, vuoro ja kädessä oleva kortti asuvat pelitilassa eivätkä komponentin
  // omissa useStateissa (kompositioauditointi H5). Ennen ne olivat neljänä
  // useStatena ja kolmena refinä, ja neuvon vanheneminen riippui siitä että
  // jokainen niistä muistettiin listata efektin riippuvuuksiin.
  return { players, deck, discard: [], phase: /** @type {Vaihe} */ ('idle'),
           cur: 0, held: null, swapIdx: null, drawnFrom: /** @type {'deck'|'discard'|null} */ (null) };
}

// ── Bottipäätökset puhtaina funktioina ──────────────────────────
// Irrotettu aiTurn/aiChainSwap:sta, jotta sama logiikka ajaa botit ja Heron
// Mestari-neuvon. Käyttävät vain pelaajan omaa known-joukkoa + julkista tietoa.

// UNKNOWN_EV (tuntemattoman paikan odotusarvo) on helpers.js:ssä, koska Koputus käyttää
// samaa lukua samaan vertailuun.

// Kierroksia jäljellä: pelin päättää nostopakan tyhjeneminen, joten jako pakan
// koosta pelaajamäärällä. Julkista tietoa (pakan koko näkyy PakkaCountissa).
function kkRoundsLeft(g) {
  return Math.ceil(g.deck.length / (g.players.length || 1));
}

// Nostopäätös: mistä nostetaan. { source: 'deck' } tai { source: 'discard' }.
// Päätös sanoo vain kannattaako poistopakan kortti nostaa, ei mihin se laitetaan:
// poistopakasta nostettu on pakko vaihtaa paikkaan 5, ja ketju jatkuu siitä kuten
// ihmisellä (KULTAKALA.md > Nosto ja vaihto ovat eri päätökset, 8.9.2026). Siksi kortti
// verrataan paikan 5 korttiin eikä pahimpaan tunnettuun. Tähän asti paluuarvon
// `mode: 'swapWorst'` vei kortin suoraan pahimman tunnetun tilalle mihin tahansa
// paikkaan, mikä oli etu jota ihmisellä ei ollut. Ensimmäinen versio 8.9.2026 piti
// vanhan vertailun ja vaihtoi silti paikkaan 5: Botbench näytti kaksi pattia
// (pieni kortti kiersi paikan 5 kautta pelaajalta toiselle) ja verrokkiparin
// romahduksen 67,6 → 53,9 %.
// roundsLeft = kkRoundsLeft(g); undefined tarkoittaa ettei kierrostietoa käytetä.
function kkDrawDecision(p, top, level, roundsLeft) {
  if (!top) return { source: 'deck' };
  const slot5Known = p.known.has(4);
  if (level === 'hard') {
    // Mestari: pakollisen ensimmäisen askelen arvo ketjun loppuun asti (kkChainGain).
    // Tuntemattomaan paikkaan 5 vaaditaan sama kynnys kuin ennen: odotettu hyöty
    // vähintään 3, ja vähintään 1 kun kierroksia on enintään kaksi (18.8.2026).
    const slot5V = slot5Known ? p.row[4].v : UNKNOWN_EV;
    const gain = (slot5V - top.v) + kkChainGain(p, slot5V, 3);
    const lateGame = roundsLeft !== undefined && roundsLeft <= 2;
    const unknownBar = lateGame ? 1 : 3;
    return { source: (slot5Known ? gain > 0 : gain >= unknownBar) ? 'discard' : 'deck' };
  }
  // Kisälli ja Oppipoika: vain tunnetun paikan 5 tilalle, eivät täytä tuntemattomia
  // poistopakasta. Oppipojan deterministinen heikkous: kynnys +5 (ottaa esim. 11:n 7:n tilalle).
  // Oli +3 8.9.2026 asti; +5 mitattiin N=1600:lla (z 4,05), ks. KULTAKALA.md ja BOTBENCH.md.
  const eagerBonus = level === 'beginner' ? 5 : 0;
  if (slot5Known && top.v < p.row[4].v + eagerBonus) return { source: 'discard' };
  return { source: 'deck' };
}

// Mestarin ketjuarvo (7.9.2026): odotettu pistesäästö kun kädessä oleva kortti
// kuljetetaan paikasta idxPos rivin alkua kohti. Lopettaminen on arvoltaan 0, koska
// pakasta nostetun kortin saa heittää poistopakkaan, joten askel kannattaa vain kun
// summa on positiivinen. Tuntemattoman paikan arvo on UNKNOWN_EV, ja siitä syrjäytyvän
// kortin arvo sama, koska botti ei tiedä sitä ennen paljastusta. Lukee vain botin omaa
// riviä ja known-joukkoa (KULTAKALA.md > Pelaajakohtainen näkyvyys).
//
// Miksi tämä korvaa sääntötaulukon Mestarilla: taulukko ei vertaa nostettua korttia
// paikan tunnettuun arvoon (viitonen meni kakkosen tilalle kun edessä oli tuntemattomia),
// eikä vaihtoehtoon lopeta. Kisällillä ja Oppipojalla säännöstö säilyy sellaisenaan.
function kkChainGain(p, heldV, idxPos) {
  if (idxPos < 0) return 0;
  const slotV = p.known.has(idxPos) ? p.row[idxPos].v : UNKNOWN_EV;
  return Math.max(0, (slotV - heldV) + kkChainGain(p, slotV, idxPos - 1));
}

// Ketjuvaihdon yksi askel: kannattaako held vaihtaa paikkaan idxPos (0-indeksi)?
// Sama säännöstö kuin aiChainSwap-silmukassa (paikka 1:n vartijat mukana).
function kkChainStep(p, held, idxPos, playerCount, level = 'normal') {
  const pos = idxPos + 1;
  // Mestari laskee askelen arvon eikä lue sääntötaulukkoa (7.9.2026).
  if (level === 'hard') return kkChainGain(p, held.v, idxPos) > 0;
  const maxSwapValue = playerCount + 1;
  // Paikka 1: älä aja ulos tunnettua pientä korttia poistopakkaan
  if (pos === 1 && p.known.has(0) && p.row[0].v <= maxSwapValue) return false;
  if (pos === 1 && held.v > maxSwapValue) return false;
  const hasUnknownsAhead = Array.from({ length: pos - 1 }, (_, i) => i).some(i => !p.known.has(i));
  if (held.v <= maxSwapValue) {
    // A-3/4/5 (2/3/4 pel): vaihda tuntemattomaan tai tunnettuun jos sen jälkeen tuntemattomia
    return !p.known.has(idxPos) || hasUnknownsAhead;
  }
  if (held.v <= 7) {
    // 5-7: vaihda tuntemattomaan paikoissa 5,4,3,2 (ei paikkaan 1)
    return pos >= 2 && !p.known.has(idxPos);
  }
  return false; // 8-K: heitä pois
}

// Mestarin neuvo Herolle. phase 'drawing' → nostolähde; 'holding'/'swapping' →
// jatkanko ketjua paikassa swapIdx vai lopetanko (poistopakasta nostettua on pakko
// vaihtaa). Lukee kaiken pelitilasta: ariteetti oli viisi ja mittasi sitä, kuinka
// paljon vuoron tilaa asui G:n ulkopuolella (kompositioauditointi H5).
// Palauttaa { type, card?, slot? } — type vastaa games.kultakala.advice.* -avainta.
/** @param {*} g */
export function getAdvice(g) {
  const { phase, held, swapIdx } = g;
  const canStop = g.drawnFrom !== 'discard';
  const p = g.players[0];
  if (!p) return null;
  if (phase === 'drawing') {
    const top = g.discard[g.discard.length - 1];
    const d = kkDrawDecision(p, top, 'hard', kkRoundsLeft(g));
    return d.source === 'discard' ? { type: 'drawDiscard', card: top } : { type: 'drawDeck' };
  }
  if ((phase === 'holding' || phase === 'swapping') && held && swapIdx !== null) {
    // Ketju kannattaa vs. vaihtoa ei voi pysäyttää: eri syy, eri neuvo.
    if (kkChainStep(p, held, swapIdx, g.players.length, 'hard')) return { type: 'swapHere', slot: swapIdx };
    if (!canStop) return { type: 'swapForced', slot: swapIdx };
    return { type: 'stopSwap' };
  }
  return null;
}

// Paikallinen Card — tukee "unknown"-tilaa
/**
 * @typedef {object} KaCardProps
 * @property {any}     [card]
 * @property {boolean} [faceUp]
 * @property {boolean} [small]
 * @property {boolean} [mini]
 * @property {boolean} [tiny]
 * @property {boolean} [highlight]
 * @property {boolean} [dim]
 * @property {boolean} [pulse]
 * @property {boolean} [unknown]
 * @property {any}     [onClick]
 * @property {any}     [backStyle]
 * @param {KaCardProps} props
 */
function KaCard({ card, faceUp, small, mini, tiny, highlight, dim, pulse, unknown, onClick, backStyle }) {
  const [h, setH] = useState(false);
  const w = mini ? 30 : tiny ? 36 : small ? 44 : 60, ht = mini ? 42 : tiny ? 50 : small ? 60 : 82;
  const back = backStyle || BACKS.ilves;
  const clickable = !!onClick;

  if (unknown) {
    const a11yU = onClick
      ? { role: 'button', tabIndex: 0, 'aria-label': 'tuntematon kortti',
          onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } }
      : { 'aria-hidden': /** @type {const} */ (true) };
    return (
      <div {...a11yU} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ width: w, height: ht, borderRadius: 7, position: 'relative', overflow: 'hidden', flexShrink: 0, border: '2px solid #4a6a9a', boxShadow: `0 0 ${h ? '14px' : '7px'} rgba(74,106,154,0.${h ? '5' : '28'})`, cursor: 'default', transition: 'box-shadow 0.2s' }}>
        {back.render(w, ht)}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(20,30,60,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontSize: small ? 10 : 13, color: '#8aaccc', opacity: 0.9 }}>🔒</span>
          <span style={{ fontSize: small ? 8 : 10, color: '#6a8aaa', fontFamily: 'sans-serif', letterSpacing: 1 }}>?</span>
        </div>
      </div>
    );
  }

  const borderCol = highlight ? C.gold : pulse ? 'rgba(210,215,235,0.75)' : back.border;
  const shadow = highlight ? '0 0 16px rgba(201,168,76,0.6)' : pulse ? '0 0 10px rgba(210,215,255,0.35)' : h && clickable ? '0 6px 16px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.3)';

  const a11y = clickable
    ? { role: 'button', tabIndex: 0, 'aria-label': faceUp && card ? cardName(card) : 'kortti',
        onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } }
    : faceUp && card
      ? { role: 'img', 'aria-label': cardName(card) }
      : { 'aria-hidden': /** @type {const} */ (true) };

  return (
    <div {...a11y} onClick={clickable ? onClick : undefined} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: w, height: ht, borderRadius: 7, position: 'relative', overflow: 'hidden', flexShrink: 0, border: `2px solid ${borderCol}`, background: faceUp ? C.card : back.bg, cursor: clickable ? 'pointer' : 'default', transition: 'transform 0.15s,box-shadow 0.15s', transform: h && clickable ? 'translateY(-4px) scale(1.06)' : 'none', boxShadow: shadow, opacity: dim ? 0.4 : 1, animation: pulse ? 'platina 2.4s ease-in-out infinite' : undefined }}>
      {faceUp && card
        ? <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ textAlign: 'center', color: SUIT_COLOR[card.s], fontFamily: 'Georgia,serif', lineHeight: 1.1 }}>
            <div style={{ fontSize: mini ? 11 : small ? 13 : 17, fontWeight: 700 }}>{card.r}</div>
            <div style={{ fontSize: mini ? 12 : small ? 14 : 20 }}>{card.s}</div>
          </div>
        </div>
        : <>{back.render(w, ht)}</>}
    </div>
  );
}

// Suljetut arvojoukot: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'idle'|'drawing'|'holding'|'swapping'|'gameover'} Vaihe */

export default function Kultakala({ onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, showAIKnown = true, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen]   = useState('select');
  const [nP, setNP]           = useState(playerCount);
  const cardBack = 'ilves';
  const { G, gRef, setG, setGS } = useGameState();
  const [msg, setMsg_]        = useState('');
  const logOpen = showLog; // omistaja on App, ks. onShowLogChange
  const [revealed, setRevealed] = useState(false);
  // Paljastus ja asetus ovat eri asiat (kompositioauditointi H6, päätös 3.9.2026).
  // `seeAll` on App:n omistama asetus joka ei tallennu, ja `revealAll` on tämän pelin
  // näkymätila. Katselutila pakottaa paljastuksen päälle koskematta asetukseen, ja
  // `startGame` palauttaa näkymän asetuksen mukaiseksi.
  const [revealAll, setRevealAll] = useState(seeAll);
  useEffect(() => { setRevealAll(seeAll); }, [seeAll]);
  const [shuffling, setShuffling] = useState(false);
  const [kohahdus, setKohahdus] = useState(null);
  const [lastPlay, setLastPlay] = useState(null);
  const [advice, setAdvice]               = useState(null); // { text, target? } | null
  const sndRef      = useRef(soundOn);
  const aiLevelRef  = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const lastPlayTmr  = useRef(null);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedMove, schedAI, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  // Neuvo vanhenee jokaisesta tilamuutoksesta. Riippuvuuslista on yksi, koska vuoron
  // tila asuu G:ssä; ennen listassa oli neljä kohdetta ja uusi ulkokehän useState olisi
  // pudottanut vanhenemisen hiljaa (kompositioauditointi H5).
  useEffect(() => { setAdvice(null); }, [G]);
  const opastus = useOpastus('kultakala', G);
  const adv = advice || opastus.hl; // korostettava: neuvo tai opastuksen palaute

  // Renderin lukemat: vuoron tila luetaan G:stä eikä rinnakkaisesta useStatesta.
  const phase   = G?.phase ?? 'idle';
  const curIdx  = G?.cur ?? 0;
  const held    = G?.held ?? null;
  const swapIdx = G?.swapIdx ?? null;

  // Neuvo ja opastus laskevat saman olion; ero on siinä mitä UI näyttää ja milloin.
  function computeAdvice() {
    const g = gRef.current; if (!g) return null;
    const a = getAdvice(g);
    if (!a) return null;
    const key = a.type === 'drawDiscard' ? opastusAvain('draw:discard')
      : a.type === 'drawDeck' ? opastusAvain('draw:deck')
      : a.type === 'stopSwap' ? opastusAvain('stop')
      : opastusAvain('swap:' + a.slot);
    return {
      text: t('games.kultakala.advice.' + a.type, {
        card: a.card ? lbl(a.card) : undefined,
        slot: a.slot !== undefined && a.slot !== null ? a.slot + 1 : undefined,
      }),
      target: a.type === 'drawDiscard' ? 'discard' : a.type === 'drawDeck' ? 'deck' : null,
      key,
    };
  }
  // Opastuksen päällä neuvo näyttää vain korostuksen; sääntöteksti on jo opastuskuplassa.
  function askAdvice() { const a = computeAdvice(); setAdvice(a && opastus.pending ? { ...a, text: null } : a); }
  function askGuide() { opastus.ask(computeAdvice()); }


  function triggerKohahdus(card) {
    setKohahdus(card);
    tm(() => setKohahdus(null), 1800);
  }

  const { log, logRef, addLog, commit, resetLog } = useGameLog({
    setGS,
    onMessage: setMsg_, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => {
      const g = gRef.current; if (!g) return null;
      return {
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman,
          hand: [p.unknown, ...(p.row ?? [])].filter(Boolean),
          cardCount: 1 + (p.row?.length ?? 0), score: null })),
        tableCards: (g.discard ?? []).slice(-1),
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
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    setRevealAll(seeAll || allBotsMode);
    pausedRef.current = false; setPaused(false);
    clearTimeout(aiTmr.current);
    const count = forcedCount ?? nP;
    const g = { ...initGame(count, playerNames, allBotsMode), phase: /** @type {Vaihe} */ ('drawing') };
    setGS(g);
    setRevealed(false);
    resetLog();
    addLog(M.gameStart);
    setScreen('game');
    setShuffling(true);
    schedMove(() => maybeAI(0, g), 2500);
  }

  function startBotBattle() {
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }


  function advance(g, fromIdx) {
    if (gRef.current?.phase === 'gameover') return;
    const next = (fromIdx + 1) % g.players.length;
    if (g.deck.length === 0) {
      addLog(M.deckEmpty);
      tm(() => doReveal(g), 800);
      return;
    }
    const g2 = { ...g, cur: next, phase: /** @type {Vaihe} */ ('drawing'),
                 held: null, swapIdx: null, drawnFrom: null };
    const p = g2.players[next];
    commit(g2, p.isHuman ? M.yourTurn : M.aiThinking(p));
    schedMove(() => maybeAI(next, g2), 600);
  }

  function maybeAI(idx, g) {
    if (gRef.current?.phase === 'gameover') return;
    if (idx === 0 && !allBotsRef.current) return;
    const baseDelay = allBotsRef.current ? aiDelayRef.current : 900;
    schedMove(() => aiTurn(idx, gRef.current), baseDelay + Math.random() * 600);
  }

  function aiTurn(idx, g) {
    if (!g || g.phase === 'gameover') return;
    const p = g.players[idx];
    const top = g.discard[g.discard.length - 1];

    // Strategia: AI näkee vain omat korttinsa ja julkisen tiedon (pakan koko, poistopakan
    // ylin). Vastustajien rivejä lukenut uhka-analyysi poistettiin 18.8.2026: se oli
    // kuollutta koodia eikä vaikuttanut yhteenkään siirtoon, ja se rikkoi kanonin
    // näkyvyyssääntöä. Kierroskynnys jäi eloon kkDrawDecisionissa, kanonin suuntaisena.
    const roundsLeft = kkRoundsLeft(g);

    let card, newG;
    // Kyvykkyysporras (ei satunnaiskohinaa): tasot eroavat kyvyiltään.
    //   Oppipoika: ketju jatkuu vain ilmiselvällä kortilla (A-3); ottaa
    //              poistopakasta "melkein hyvän" liian herkästi
    //   Kisälli:   täysi ketjuvaihto, tarkka nostopäätös
    //   Mestari:   + täyttää tuntemattomia paikkoja proaktiivisesti poistopakan
    //              pikkukorteilla (tuntematon on odotusarvoltaan ~7 → ≤3 siihen on voitto)
    // Päätöslogiikka: kkDrawDecision (moduulitaso; sama ajaa Heron neuvon).
    // Huom: hard-vs-normal-ero on Kultakalassa mitatusti pieni (nostotuuri dominoi;
    // nollahypoteesitesti identtisillä säännöillä antoi saman jakauman). Mestarin
    // EV-logiikka pidetään, koska se on teoriassa oikein eikä mitatusti haittaa.
    const level = botLevelsRef.current?.[idx] ?? aiLevelRef.current;
    const decision = kkDrawDecision(p, top, level, roundsLeft);
    if (decision.source === 'discard') {
      const discard = [...g.discard]; discard.pop();
      newG = { ...g, discard }; card = top;
      commit({ ...newG, drawnFrom: 'discard' }, M.aiDrawDiscard(p));
      if (sndRef.current) SFX.flip();
      // Poistopakasta nostettu on pakko vaihtaa paikkaan 5, ja ketju jatkuu siitä
      // samoin kuin ihmisellä (8.9.2026, aiemmin suora vaihto pahimman tunnetun tilalle).
      tm(() => aiChainSwap(idx, gRef.current, card, true, null, level), 1000);
    } else {
      if (!g.deck.length) { advance(g, idx); return; }
      card = g.deck[0]; newG = { ...g, deck: g.deck.slice(1) };
      commit({ ...newG, drawnFrom: 'deck' }, M.aiDrawDeck(p));
      if (sndRef.current) SFX.flip();
      tm(() => {
        // Oppipoika: ketju jatkuu vain ilmiselvän hyvällä kortilla (A-3);
        // Kisälli/Mestari ketjuttavat täydellä säännöstöllä
        aiChainSwap(idx, gRef.current, card, false, level === 'beginner' ? 3 : null, level);
      }, 1000);
    }
  }

  // KETJUVAIHTO: järjestys 5,4,3,2,1, sama kuin humanSwapRow. mustSwap = poistopakkanosto:
  // ensimmäinen askel paikkaan 5 on pakollinen eikä sitä kysytä säännöstöltä, ja ketju
  // jatkuu siitä normaalisti. Varasijaa (suora vaihto huonoimman tunnetun tai tuntemattoman
  // tilalle) ei enää ole, koska ihmisellä ei ole sitä (KULTAKALA.md, 8.9.2026).
  // chainLimit (Oppipoika): jatka ketjua ensimmäisen vaihdon jälkeen vain jos
  // syrjäytetty kortti on ilmiselvän hyvä (arvo ≤ raja) — aloittelija tekee
  // ilmeisen jatkovaihdon (paljastunut ässä!) muttei suunnittele pidemmälle.
  function aiChainSwap(idx, g2, card, mustSwap, chainLimit = null, level = 'normal') {
    // Kopio, ei alkuperäinen: ketju kirjoittaa riviin ja known-joukkoon askel kerrallaan,
    // ja aiemmin se mutatoi g2:n pelaajaoliota paikallaan. Se oli ainoa immutaabelin
    // päivityksen poikkeus koko pelissä (kompositioauditointi H5).
    const src = g2.players[idx];
    const p2 = { ...src, row: [...src.row], known: new Set(src.known) };
    const playerCount = g2.players.length;
    const maxSwapValue = playerCount + 1;
    let held = card;
    const swaps = []; // Seuraa jokaista swappia: { pos, card }

    for (let pos = 5; pos >= 1; pos--) {
      const idx_pos = pos - 1;
      if (chainLimit !== null && swaps.length >= 1 && held.v > chainLimit) break;
      // Askelen säännöstö: kkChainStep (moduulitaso; sama ajaa Heron neuvon).
      // Pakollinen vaihto ohittaa sen vain paikassa 5, kuten Heron swapForced-neuvo.
      const forced = mustSwap && pos === 5;
      if (!forced && !kkChainStep(p2, held, idx_pos, playerCount, level)) break;
      const old = p2.row[idx_pos];
      p2.row[idx_pos] = held;
      p2.known.add(idx_pos);
      swaps.push({ pos, card: held });
      held = old;
    }

    // Päivitä pelin state vaihtojen jälkeen
    if (swaps.length > 0) {
      const players = g2.players.map((pl, i) => i === idx ? p2 : pl);
      const newG = { ...g2, players, discard: [...g2.discard, held] };
      if (sndRef.current) SFX.swap();

      // Logita ketjuvaihto - näytä kaikki välivaiheet väreillä
      const swapChain = swaps.map(s => t('games.kultakala.msg.slotItem', { pos: s.pos, card: lblColored(s.card) })).join(' → ');
      commit(newG, t('games.kultakala.msg.aiSwapChain', { name: g2.players[idx].name, chain: swapChain, card: lblColored(held) }));
      // Paikasta 1 ulos ajettu pikkukortti kohahduttaa, sama ehto kuin humanSwapRow:ssa.
      if (swaps[swaps.length - 1].pos === 1 && held.v <= 2) triggerKohahdus(held);

      tm(() => advance(newG, idx), 700);
    } else {
      // Ei vaihtoja - discardata kortti suoraan
      aiDoDiscard(idx, g2, card);
    }
  }


  function aiDoDiscard(idx, g, card) {
    const newG = { ...g, discard: [...g.discard, card] };
    commit(newG, M.aiDiscard(g.players[idx], card));
    flashLastPlay(g.players[idx].name, card, false);
    tm(() => advance(newG, idx), 600);
  }

  function humanDraw(fromDiscard) {
    const g = gRef.current;
    // Vain nostovaiheessa ja vain Heron omalla vuorolla
    if (!g || g.phase !== 'drawing' || g.cur !== 0) return;
    let card, newG, logMsg;
    if (fromDiscard) {
      if (!g.discard.length) return;
      const discard = [...g.discard]; card = discard.pop();
      newG = { ...g, discard };
      logMsg = M.humanDrawDiscard(card, card.v);
    } else {
      if (!g.deck.length) return;
      card = g.deck[0]; newG = { ...g, deck: g.deck.slice(1) };
      logMsg = M.humanDrawDeck(card, card.v);
    }
    if (sndRef.current) SFX.flip();
    opastus.answer(opastusAvain(fromDiscard ? 'draw:discard' : 'draw:deck'));
    commit({ ...newG, held: card, swapIdx: 4, phase: /** @type {Vaihe} */ ('holding'),
             drawnFrom: fromDiscard ? 'discard' : 'deck' }, logMsg);
  }

  function humanSwapRow(rowIdx) {
    const g = gRef.current;
    if (!g || (g.phase !== 'holding' && g.phase !== 'swapping') || g.cur !== 0) return;
    const held = g.held;
    const p = g.players[0];
    const newRow = [...p.row];
    const known = new Set(p.known);

    const old = p.row[rowIdx];
    newRow[rowIdx] = held;
    known.add(rowIdx);
    const players = g.players.map((pl, i) => i === 0 ? { ...pl, row: newRow, known } : pl);
    if (sndRef.current) SFX.swap();
    opastus.answer(opastusAvain('swap:' + rowIdx));
    const wasKnown = p.known.has(rowIdx);
    const oldName = wasKnown ? `${lbl(old)} (${old.v} p)` : `${lbl(old)} (${old.v} p paljastui)`;
    const nextIdx = rowIdx - 1;

    if (nextIdx < 0) {
      // Reached leftmost — displaced card forced to discard
      const finalG = { ...g, players, discard: [...g.discard, old], drawnFrom: null,
                       held: null, swapIdx: null, phase: /** @type {Vaihe} */ ('drawing') };
      commit(finalG, M.humanSwappedEnd(rowIdx, held, held.v, oldName));
      if (old.v <= 2) triggerKohahdus(old);
      tm(() => advance(finalG, 0), 500);
    } else {
      // Displaced card goes to KÄDESSÄ for possible continued chain
      const newG = { ...g, players, drawnFrom: null, held: old, swapIdx: nextIdx,
                     phase: /** @type {Vaihe} */ ('swapping') };
      commit(newG, M.humanSwappedContinue(rowIdx, held, held.v, oldName));
    }
  }

  function humanStopSwap() {
    const g = gRef.current;
    if (!g || (g.phase !== 'swapping' && g.phase !== 'holding') || g.cur !== 0) return;
    if (g.drawnFrom === 'discard') return;
    opastus.answer(opastusAvain('stop'));
    const held = g.held;
    const newG = { ...g, discard: [...g.discard, held], held: null, swapIdx: null,
                   drawnFrom: null, phase: /** @type {Vaihe} */ ('drawing') };
    commit(newG, M.humanDiscard(held));
    flashLastPlay(g.players[0].name, held, true);
    tm(() => advance(newG, 0), 300);
  }

  function doReveal(g) {
    setRevealed(true);
    if (sndRef.current) SFX.reveal();
    setGS({ ...g, phase: /** @type {Vaihe} */ ('gameover') });
    const scores = g.players.map(p => ({ ...p, total: p.unknown.v + p.row.reduce((s, c) => s + c.v, 0) }));
    const sortedSc = [...scores].sort((a, b) => a.total - b.total);
    const ranking  = sortedSc.map(p => ({
      name: p.name, isHuman: p.isHuman, score: p.total,
      place: sortedSc.filter(q => q.total < p.total).length + 1,
    }));
    const revealCards = g.players.map(p => ({ name: p.name, cards: [p.unknown, ...p.row] }));
    if (allBotsRef.current) { tm(() => onResult?.({ ranking, revealCards }), BOT_RESULT_DELAY); }
    else { onResult?.({ ranking, revealCards }); }
    // Tasapelissä samat pisteet jakavat sijan, ks. KULTAKALA.md > Tasapeli. Ranking laskee
    // sen jo (place = count(total < oma) + 1), joten tasapeli ei tarvitse omaa haaraa.
    addLog(M.gameOverScores(scores));
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  if (screen === 'select') return (
    <GameStartScreen
      icon={'🐟'}
      title="KULTAKALA"
      titleSize={isMobile ? 30 : 52}
      letterSpacing={isMobile ? 5 : 12}
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
  const canDraw = curIdx === 0 && phase === 'drawing' && !allBots;
  const canSwapRow = curIdx === 0 && (phase === 'holding' || phase === 'swapping') && !allBots;
  // canDiscard: holding phase AND drew from deck (not discard)
  const canDiscard = curIdx === 0 && phase === 'holding' && G?.drawnFrom !== 'discard' && !allBots;
  const canStop    = curIdx === 0 && !!held && (phase === 'swapping' || canDiscard) && !allBots;

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 560, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>
      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />
      <TurnPrompt show={canDraw} action={t('ui.turn.kultakala')} />
      <AdviceBubble text={advice?.text || opastus.text} onDismiss={() => { setAdvice(null); opastus.dismiss(); }} />
      {kohahdus && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(160,20,20,0.18)', border: '2px solid rgba(255,90,90,0.65)', borderRadius: 22, padding: '22px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: '0 0 50px rgba(255,60,60,0.45)', animation: 'kohahdus 1.8s ease-out forwards' }}>
            <span style={{ fontSize: 40 }}>😱</span>
            <span style={{ fontFamily: 'Georgia,serif', fontSize: 26, fontWeight: 700, color: isRed(kohahdus.s) ? '#ff7070' : '#e8e8e8' }}>{lbl(kohahdus)}</span>
            <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#cc8888', letterSpacing: 1 }}>pakotettiin poistopakkaan!</span>
          </div>
        </div>
      )}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>🐟</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: isMobile ? 12 : 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {ais.length > 0 && (
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 6 }}>
            {ais.map((p, i) => {
              const pi = allBots ? i : i + 1, isActive = curIdx === pi;
              return (
                <div key={p.id} style={{ display: 'flex', gap: 5, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '5px 8px' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: isActive ? C.gold : C.dim, minWidth: 54, flexShrink: 0 }}>🤖 {truncName(p.name)}{isActive ? ' ●' : ''}</div>
                  {/* Sama kehyslaatikko kaikille (reunus läpinäkyvä ilman korostusta),
                      jotta korostettu, korostamaton ja tuntematon istuvat samalla tasolla */}
                  <div style={{ borderRadius: 4, border: '2px solid transparent', padding: 1 }}>
                    <KaCard card={p.unknown} unknown={!revealed && !revealAll} faceUp={revealed || revealAll} tiny backStyle={BACKS[cardBack]} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {p.row.map((c, ci) => (
                      <div key={ci} style={{ borderRadius: 4, border: `2px solid ${showAIKnown && p.known.has(ci) ? C.gold : 'transparent'}`, boxShadow: showAIKnown && p.known.has(ci) ? `0 0 6px ${C.gold}66` : 'none', padding: 1 }}>
                        <KaCard card={c} faceUp={revealed || revealAll} tiny backStyle={BACKS[cardBack]} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            <div style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65, marginBottom: 2 }}>{t('ui.shared.fieldLabel')}</div>
            {ais.map((p, i) => {
              const pi = allBots ? i : i + 1, isActive = curIdx === pi;
              return (
                <div key={p.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, minWidth: 80, flexShrink: 0 }}>🤖 {truncName(p.name)}{isActive ? ' ●' : ''}</div>
                  {/* Sama kehyslaatikko kaikille (reunus läpinäkyvä ilman korostusta),
                      jotta korostettu, korostamaton ja tuntematon istuvat samalla tasolla */}
                  <div style={{ borderRadius: 6, border: '2px solid transparent', padding: 2 }}>
                    <KaCard card={p.unknown} unknown={!revealed && !revealAll} faceUp={revealed || revealAll} tiny backStyle={BACKS[cardBack]} />
                  </div>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {p.row.map((c, ci) => (
                      <div key={ci} style={{ borderRadius: 6, border: `2px solid ${showAIKnown && p.known.has(ci) ? C.gold : 'transparent'}`, boxShadow: showAIKnown && p.known.has(ci) ? `0 0 8px ${C.gold}66` : 'none', padding: 2 }}>
                        <KaCard card={c} faceUp={revealed || revealAll} tiny backStyle={BACKS[cardBack]} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Pakka-alue */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: isMobile ? '8px 10px' : '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, marginBottom: isMobile ? 6 : 12 }}>
        {(() => { const pw = isMobile ? 58 : 72, ph = isMobile ? 80 : 98; return (<>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.deck')}</div>
          <div onClick={canDraw ? () => humanDraw(false) : undefined}
            {...(canDraw ? { role: 'button', tabIndex: 0, 'aria-label': 'Nosta pakasta', onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); humanDraw(false); } } } : {})}>
            <FanStack
              count={G.deck.length}
              w={pw} h={ph}
              backStyle={BACKS[cardBack]}
              borderColor={adv?.target === 'deck' ? C.botMode : canDraw ? C.gold : undefined}
              glowColor={adv?.target === 'deck' ? C.botMode : canDraw ? C.gold : undefined}
            />
          </div>
          <div style={{ marginTop: 5 }}>
            <PakkaCount variant="count" count={G.deck.length} style={{ fontSize: 10, fontFamily: 'sans-serif' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.discardLabel')}</div>
          <div
            onClick={canDraw ? () => humanDraw(true) : canDiscard ? humanStopSwap : undefined}
            style={{ cursor: (canDraw && discardTop) || canDiscard ? 'pointer' : 'default', position: 'relative', width: pw, height: ph }}
          >
            {!discardTop
              ? <div style={{ width: pw, height: ph, borderRadius: 9, border: `1.5px dashed ${canDiscard ? C.gold : C.panelBorder}`, opacity: canDiscard ? 0.8 : 0.3, boxShadow: canDiscard ? `0 0 14px rgba(201,168,76,0.4)` : 'none', transition: 'all 0.2s' }} />
              : <div style={{ position: 'relative', width: pw, height: ph, borderRadius: 9, background: C.card, border: `2px solid ${adv?.target === 'discard' ? C.botMode : (canDraw || canDiscard) ? C.gold : '#aaa'}`, boxShadow: adv?.target === 'discard' ? '0 0 18px rgba(192,132,252,0.65)' : (canDraw || canDiscard) ? `0 0 18px rgba(201,168,76,0.5)` : '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: SUIT_COLOR[discardTop.s], fontFamily: 'Georgia,serif', lineHeight: 1.1, pointerEvents: 'none' }}>
                  <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700 }}>{discardTop.r}</div>
                  <div style={{ fontSize: isMobile ? 18 : 22 }}>{discardTop.s}</div>
                </div>
              </div>}
          </div>
          <div style={{ fontSize: 10, color: C.dim, fontFamily: 'sans-serif', marginTop: 5 }}>{G.discard.length} {t('ui.shared.pcs')}</div>
        </div>
        {held && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.gold, fontFamily: 'sans-serif', marginBottom: 5, letterSpacing: 1.5 }}>{t('ui.shared.handLabel')}</div>
            <KaCard card={held} faceUp small backStyle={BACKS[cardBack]} highlight />
            <div style={{ fontSize: 10, color: C.gold, fontFamily: 'sans-serif', marginTop: 5 }}>{held.v} p</div>
          </div>
        )}
        </>); })()}
      </div>

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

      {/* Pelaaja 0 (ihminen — piilotettu allBots-tilassa, koska näkyy ais-listassa) */}
      {!allBots && <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${curIdx === 0 ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'sans-serif', fontSize: 12, color: curIdx === 0 ? C.gold : C.dim, marginBottom: 8 }}>
          <span>{allBots ? '🤖' : '👤'} {human.name} {curIdx === 0 ? '●' : ''}</span>
          {!isMobile && <span style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, opacity: 0.65 }}>{t('ui.shared.fieldLabel')}</span>}
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 4 : 8, alignItems: 'flex-end', flexWrap: 'nowrap' }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <KaCard card={human.unknown} unknown faceUp={false} small={!isMobile} tiny={isMobile} backStyle={BACKS[cardBack]} />
            <div style={{ fontFamily: 'sans-serif', fontSize: 9, color: C.gold, marginTop: 3 }}>?</div>
          </div>
          <span style={{ color: C.dim, fontSize: isMobile ? 12 : 16, marginBottom: isMobile ? 14 : 20, flexShrink: 0 }}>+</span>
          {human.row.map((c, i) => {
            const isSwapTarget = canSwapRow && swapIdx === i;
            return (
              <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
                <KaCard card={c} faceUp={revealAll || allBots || human.known.has(i)} small={!isMobile} tiny={isMobile}
                  highlight={isSwapTarget}
                  pulse={human.known.has(i) && !isSwapTarget}
                  backStyle={BACKS[cardBack]} />
                <div style={{ fontFamily: 'sans-serif', fontSize: 9, color: isSwapTarget ? C.gold : C.dim, marginTop: 3 }}>{i + 1}</div>
              </div>
            );
          })}
        </div>
      </div>}

      {/* Toimintopainikkeet — piilotettu katselutilassa */}
      {!allBots && (
        <div style={{ minHeight: isMobile ? 32 : 44, display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center', marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
          {canSwapRow && swapIdx !== null && (
            <button onClick={() => humanSwapRow(swapIdx)} style={{ background: C.gold + '18', border: `1px solid ${C.gold}`, borderRadius: 9, padding: isMobile ? '6px 12px' : '10px 18px', color: C.gold, fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.5 }}
              dangerouslySetInnerHTML={{ __html: t('games.kultakala.ui.swapTo', { card: lblColored(held), n: swapIdx + 1 }) }} />
          )}
          {canStop && (
            <button onClick={humanStopSwap} style={{ background: 'transparent', border: `1px solid ${C.gold}88`, borderRadius: 9, padding: isMobile ? '6px 12px' : '10px 18px', color: C.gold, fontSize: isMobile ? 12 : 13, cursor: 'pointer', fontFamily: 'Georgia,serif', letterSpacing: 0.5 }}
              dangerouslySetInnerHTML={{ __html: t('games.kultakala.ui.discard', { card: lblColored(held) }) }} />
          )}
          {(canDraw || canSwapRow) && <><AdviceButton onClick={askAdvice} /><GuideButton onClick={askGuide} /></>}
        </div>
      )}

      {/* Bottien taistelu -ohjauspaneeli */}
      {allBots && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}

      {/* Tilarivi */}
      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
      >
        <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('games.kultakala.ui.goal')}
      </GameStatusBar>

      {/* Katselutila: pending result overlay */}

      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)} />

      <style>{`
        @keyframes revealFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9)}100%{box-shadow:none}}
        @keyframes platina{0%,100%{border-color:rgba(200,210,235,0.5);box-shadow:0 0 5px rgba(210,215,255,0.2)}50%{border-color:rgba(235,240,255,1);box-shadow:0 0 14px rgba(220,225,255,0.7)}}
        @keyframes kohahdus{0%{opacity:0;transform:scale(0.55)}15%{opacity:1;transform:scale(1.08)}60%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.92)}}
      `}</style>
    </div>
  );
}
