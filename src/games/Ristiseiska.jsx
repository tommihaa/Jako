import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR, suitColor } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, SUITS, truncName, sortHand as sortHandBy, lblColored, BOT_RESULT_DELAY } from '../shared/helpers.js';
import {
  RANK_VAL, isPlayable, hasAnyPlay, DEFAULT_RULES, initGame,
  chooseMove, applyMove, applyGiveCard, getAdvice,
} from './ristiseiskaEngine.js';
import Card from '../shared/Card.jsx';
import { useStickySetting } from '../shared/storage.js';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import GameLog from '../shared/GameLog.jsx';
import GameStatusBar from '../shared/GameStatusBar.jsx';
import PoytaPanel from '../shared/PoytaPanel.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { useGameLog } from '../shared/useGameLog.js';
import { useGameState } from '../shared/useGameState.js';

// ── Ristiseiska ─────────────────────────────────────────────────
// Järjestys per maa: 7 → 6 → 8 → ala-pino (5,4,3,2,A) + ylä-pino (9,T,J,Q,K)
// 5 vaatii 8 ensin, 8 vaatii 6 ensin (kiusanteko)
// A kaataa ala-pinon (bonusvuoro), K kaataa ylä-pinon (bonusvuoro)

// Kuvaa pelatun kortin vaikutus (kiusanteko-mekaniikka: 5 vaatii 8:n, 8 vaatii 6:n).
function playEffect(v) {
  if (v === 7) return tr('games.ristiseiska.effect.open');
  if (v === 6) return tr('games.ristiseiska.effect.lowerNotYet');
  if (v === 8) return tr('games.ristiseiska.effect.openBoth');
  return v <= 5 ? tr('games.ristiseiska.effect.toLower') : tr('games.ristiseiska.effect.toUpper');
}

const sortHand = hand => sortHandBy(hand, c => RANK_VAL[c.r]);


const rankFromVal = v => {
  if (v === 1)  return 'A';
  if (v <= 10)  return String(v);
  return ['J', 'Q', 'K'][v - 11];
};

// Yksi maan pinorivi (ala-pino + 7 + ylä-pino). Module-scopessa ettei React remounttaa
// koko pinoriviä (ja siten CSS-hehkuja/-transitioneja) joka pelinäytön renderillä.
function StackRow({ suit, G, isMobile, cardBack, t }) {
  const row = G.rows[suit];
  const cW = isMobile ? 46 : 60;
  const cH = isMobile ? 52 : 85;
  const sc  = suitColor(suit);
  // ♠ = #1a1a1a on näkymätön tummalla taustalla → käytetään vaalempaa mustaa
  const tc  = suit === '♠' ? '#333333' : sc;

  // Ala-pinon tila
  const lowerActive   = row.active && row.low  <= 6;
  const lowerPlayable = row.active && row.low  === 7;          // voi pelata 6:n
  const lowerRank     = row.active && row.low  <= 6 ? rankFromVal(row.low) : '6';
  const lowerCast     = row.low < 6;
  const lowerComplete = lowerCast && row.low === 1;

  // Ylä-pinon tila (8 vaatii 6 ensin)
  const upperActive   = row.active && row.high >= 8;
  const upperPlayable = row.active && row.high === 7 && row.low <= 6;
  const upperRank     = row.active && row.high >= 8 ? rankFromVal(row.high) : '8';
  const upperCast     = row.high > 8;
  const upperComplete = upperCast && row.high === 13;

  // 7 hehkuu: ♣7 alussa, muut 7:t kun ♣ on aktivoitu
  const sevenIsNext = !row.active && (suit === '♣' || G.rows['♣'].active);

  // Näytä ala-pino (pelattuna tai seisova)
  const lowerPile = lowerActive ? (
    <div style={{ position: 'relative', width: cW, height: cH, flexShrink: 0 }}>
      {/* Pino näkyy pinnalla olevana korttina */}
      <div style={{
        position: 'absolute', width: cW, height: cH, borderRadius: 6,
        background: lowerComplete ? BACKS[cardBack].bg : C.card,
        border: `2px solid ${lowerComplete ? BACKS[cardBack].border : tc}`,
        left: 0, top: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia,serif', fontWeight: 700, color: tc,
      }}>
        {!lowerComplete && (
          <>
            <div style={{ fontSize: 20 }}>{lowerRank}</div>
            <div style={{ fontSize: 16 }}>{suit}</div>
          </>
        )}
      </div>
    </div>
  ) : (
    <div style={{ width: cW, height: cH, flexShrink: 0, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.gold}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontWeight: 700, color: `${C.gold}33`, opacity: 0.5, boxShadow: lowerPlayable ? `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88` : undefined }}>
      <div style={{ fontSize: 16 }}>6</div>
      <div style={{ fontSize: 12 }}>{suit}</div>
    </div>
  );

  // Näytä ylä-pino (pelattuna tai seisova)
  const upperPile = upperActive ? (
    <div style={{ position: 'relative', width: cW, height: cH, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', width: cW, height: cH, borderRadius: 6,
        background: upperComplete ? BACKS[cardBack].bg : C.card,
        border: `2px solid ${upperComplete ? BACKS[cardBack].border : tc}`,
        left: 0, top: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia,serif', fontWeight: 700, color: tc,
      }}>
        {!upperComplete && (
          <>
            <div style={{ fontSize: 20 }}>{upperRank}</div>
            <div style={{ fontSize: 16 }}>{suit}</div>
          </>
        )}
      </div>
    </div>
  ) : (
    <div style={{ width: cW, height: cH, flexShrink: 0, borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.gold}44`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia,serif', fontWeight: 700, color: `${C.gold}33`, opacity: 0.5, boxShadow: upperPlayable ? `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88` : undefined }}>
      <div style={{ fontSize: 16 }}>8</div>
      <div style={{ fontSize: 12 }}>{suit}</div>
    </div>
  );

  // Aputext: näytä pelattavat kortit väreillä
  let helpText = '';
  let helpElements = null;
  if (!row.active) {
    // Vain ♣7 voidaan pelata ensin, sitten muut 7:t
    if (suit === '♣' || G.rows['♣'].active) {
      helpElements = (
        <>
          {t('games.ristiseiska.ui.playPrompt')}{' '}
          <span style={{ color: tc }}>7{suit}</span>
        </>
      );
    }
  } else {
    const lowerCast = row.low < 6;
    const upperCast = row.high > 8;
    const playable = [];
    // Ala-pino: seuraava on row.low - 1
    if (row.low > 1) {
      const nextLower = row.low - 1;
      // 5 vaatii 8:n ensin
      if (nextLower !== 5 || row.high >= 8) {
        playable.push(rankFromVal(nextLower));
      }
    }
    // Ylä-pino: seuraava on row.high + 1
    if (row.high < 13) {
      const nextUpper = row.high + 1;
      // 8 vaatii 6:n ensin
      if (nextUpper !== 8 || row.low <= 6) {
        playable.push(rankFromVal(nextUpper));
      }
    }
    if (playable.length > 0) {
      helpElements = (
        <>
          {t('games.ristiseiska.ui.playPrompt')}{' '}
          {playable.map((r, i) => (
            <span key={i} style={{ color: tc }}>
              {r}{suit}
              {i < playable.length - 1 ? ', ' : ''}
            </span>
          ))}
        </>
      );
    } else if (lowerComplete && upperComplete) {
      helpText = t('games.ristiseiska.ui.pilesBeaten');
    } else if (lowerCast && upperCast) {
      helpText = t('games.ristiseiska.ui.pilesOpen');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        {upperPile}
        {row.active ? (
          <div style={{
            width: cW, height: cH, flexShrink: 0, borderRadius: 6,
            background: C.card,
            border: `2px solid ${tc}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Georgia,serif', fontWeight: 700,
            color: tc,
            opacity: 1,
          }}>
            <div style={{ fontSize: 20 }}>7</div>
            <div style={{ fontSize: 16 }}>{suit}</div>
          </div>
        ) : (
          <div style={{
            width: cW, height: cH, flexShrink: 0, borderRadius: 6,
            background: 'rgba(255,255,255,0.02)',
            border: `1px dashed ${C.gold}44`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Georgia,serif', fontWeight: 700,
            color: `${C.gold}33`,
            opacity: 0.5,
            boxShadow: sevenIsNext ? (suit === '♣'
              ? `0 0 35px ${tc}ff, 0 0 60px ${tc}ff, inset 0 0 20px ${tc}aa`
              : `0 0 30px ${tc}ff, 0 0 50px ${tc}cc, inset 0 0 20px ${tc}88`)
              : undefined,
          }}>
            <div style={{ fontSize: 16 }}>7</div>
            <div style={{ fontSize: 12 }}>{suit}</div>
          </div>
        )}
        {lowerPile}
      </div>
      {(helpText || helpElements) && (
        <span style={{ fontSize: 11, color: C.dim, fontFamily: 'sans-serif', opacity: 0.7, textAlign: 'center' }}>
          {helpElements || helpText}
        </span>
      )}
    </div>
  );
}

// ── Komponentti ─────────────────────────────────────────────────
import { useT, tr } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble } from '../shared/MestariNeuvo.jsx';

// Suljettu arvojoukko: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'play'|'gameover'} Vaihe */
/** @typedef {{phase: Vaihe, [k: string]: any}} PeliTila Vain vaihe on kiinnitetty; muut kentät vapaita. */

export default function Ristiseiska({ onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen,   setScreen]  = useState('select');
  const [nP,       setNP]      = useState(playerCount);
  const [rules,    setRules]   = useStickySetting('ristiseiska:rules', DEFAULT_RULES); // sääntövalinta muistetaan
  const cardBack = 'ilves';
  const { G, gRef, setGS } = useGameState(/** @type {PeliTila|null} */ (null));
  const [msg,      setMsg_]    = useState('');
  const logOpen = showLog; // omistaja on App, ks. onShowLogChange
  const [selCard,  setSel]     = useState(null);
  // Paljastus ja asetus ovat eri asiat (kompositioauditointi H6, päätös 3.9.2026).
  // `seeAll` on App:n omistama asetus joka ei tallennu, ja `revealAll` on tämän pelin
  // näkymätila. Katselutila pakottaa paljastuksen päälle koskematta asetukseen, ja
  // `startGame` palauttaa näkymän asetuksen mukaiseksi.
  const [revealAll, setRevealAll] = useState(seeAll);
  useEffect(() => { setRevealAll(seeAll); }, [seeAll]);
  const [shuffling, setShuffling] = useState(false);
  const [lastPlay, setLastPlay] = useState(null);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [advice, setAdvice]               = useState(null); // { text, cardIds } | null
  const lastPlayTmr = useRef(null);
  const sndRef     = useRef(soundOn);
  const aiLevelRef = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedMove, schedAI, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { setAdvice(null); },          [G]); // neuvo vanhenee jokaisesta tilamuutoksesta

  function askAdvice() {
    const g = gRef.current;
    if (!g) return;
    const a = getAdvice(g);
    if (!a) return;
    setAdvice({
      text: t('games.ristiseiska.advice.' + a.type, a.card ? { card: lbl(a.card) } : undefined),
      cardIds: a.card ? [a.card.id] : [],
    });
  }

  const { log, logRef, addLog, commit, resetLog } = useGameLog({
    setGS,
    onMessage: setMsg_, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => {
      const g = gRef.current; if (!g) return null;
      return {
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: null })),
        tableCards: [],
      };
    },
  });

  function flashLastPlay(name, card, isHuman = false) {
    setLastPlay({ name, card, isHuman });
    clearTimeout(lastPlayTmr.current);
    lastPlayTmr.current = tm(() => setLastPlay(null), 2200);
  }

  const M = {
    gameStart:  (starter, card) => t('games.ristiseiska.msg.gameStart', { starter, card }),
    yourTurn:   canPlay => canPlay ? t('games.ristiseiska.msg.yourTurn') : t('games.ristiseiska.msg.yourTurnNoPlay'),
    turnOf:     name => t('games.ristiseiska.msg.turnOf', { name }),
    played:     (isH, name, card, effect) => t('games.ristiseiska.msg.played', { name, card, effect }),
    won:        (isH, name, rank) => rank === 1 ? t('games.ristiseiska.msg.winTop', { name }) : t('games.ristiseiska.msg.winPlace', { name, rank }),
    aiBonus:    (name, suit, pile) => t('games.ristiseiska.msg.aiBonus', { name, suit, pile }),
    humanBonus: (suit, pile) => t('games.ristiseiska.msg.humanBonus', { suit, pile }),
    passFirst:  (isH, name) => t('games.ristiseiska.msg.passFirst', { name }),
    passGiveMe: (isH, name) => t('games.ristiseiska.msg.passGiveMe', { name }),
    passGive:   (isH, name, giverH, giverName, card) => t('games.ristiseiska.msg.passGive', { name, giverName, card }),
    passGiveRandom: (isH, name, giverH, giverName, card) => t('games.ristiseiska.msg.passGiveRandom', { name, giverName, card }),
    passOnly:   (isH, name) => t('games.ristiseiska.msg.passOnly', { name }),
    badCard:    t('games.ristiseiska.msg.badCard'),
    cantPass:   t('games.ristiseiska.msg.cantPass'),
    humanGives: (card, receiver) => t('games.ristiseiska.msg.humanGives', { card, receiver }),
  };

  function startGame(forcedCount, allBotsMode = false) {
    allBotsRef.current = allBotsMode; setAllBots(allBotsMode);
    setRevealAll(seeAll || allBotsMode);
    pausedRef.current = false; setPaused(false);
    clearTimeout(aiTmr.current);
    const count = forcedCount ?? nP;
    const g = initGame(count, playerNames, allBotsMode, rules);
    resetLog(); setSel(null); setLastPlay(null);
    const s = g.players[g.activePlayer];
    commit(g, M.gameStart(s.name, lblColored({ r: '7', s: '♣' })));
    setScreen('game');
    setShuffling(true);
    if (!s.isHuman) schedMove(() => runAI(g), 3100);
  }

  function startBotBattle() {
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }

  // ── Kuljettaja ──────────────────────────────────────────────
  // Säännöt asuvat `ristiseiskaEngine.js`:ssä, ja tämä komponentti on niiden yksi
  // kuljettaja. Se kääntää moottorin askeleet lokiriveiksi, ääniksi ja ajastimiksi
  // eikä tee sääntöpäätöksiä itse. Toinen kuljettaja on moottorin `runHeadless`,
  // ja `test/ristiseiska-saumapari.test.jsx` vaatii että ne päätyvät samaan.

  const levelOf = idx => botLevelsRef.current?.[idx] ?? aiLevelRef.current;

  // Aja moottorin askeljono: jokainen askel on tila, lokirivi tai molemmat, ja
  // järjestys on moottorin eikä tämän funktion päätös.
  function playSteps(steps) {
    // Nimi ja ihmisyys eivät muutu pelin aikana, joten ne luetaan yhdestä tilasta.
    const base = gRef.current;
    const nameOf  = i => base?.players[i]?.name ?? '';
    const humanAt = i => !!base?.players[i]?.isHuman;

    for (const s of steps) {
      const ev = s.ev;
      let msg; // undefined = ei lokiriviä

      switch (ev?.t) {
        case 'played':
          if (sndRef.current) SFX.play();
          flashLastPlay(nameOf(ev.playerIdx), ev.card, humanAt(ev.playerIdx));
          msg = M.played(humanAt(ev.playerIdx), nameOf(ev.playerIdx), lblColored(ev.card), playEffect(ev.v));
          break;
        case 'won':
          msg = M.won(humanAt(ev.playerIdx), nameOf(ev.playerIdx), ev.rank);
          break;
        case 'bonus': {
          const suitGen  = t('games.ristiseiska.suitGen.' + ev.card.s);
          const pileName = t(ev.v === 1 ? 'games.ristiseiska.pile.lower' : 'games.ristiseiska.pile.upper');
          msg = humanAt(ev.playerIdx)
            ? M.humanBonus(suitGen, pileName)
            : M.aiBonus(nameOf(ev.playerIdx), suitGen, pileName);
          break;
        }
        case 'turnOf':
          msg = M.turnOf(nameOf(ev.playerIdx));
          break;
        case 'yourTurn':
          msg = M.yourTurn(ev.canPlay);
          break;
        case 'passFirst':
          if (sndRef.current) SFX.leave();
          msg = M.passFirst(humanAt(ev.playerIdx), nameOf(ev.playerIdx));
          break;
        case 'passGiveMe':
          msg = M.passGiveMe(humanAt(ev.playerIdx), nameOf(ev.playerIdx));
          break;
        case 'passGive':
          if (sndRef.current) SFX.leave();
          msg = (ev.random ? M.passGiveRandom : M.passGive)(
            humanAt(ev.playerIdx), nameOf(ev.playerIdx),
            humanAt(ev.giverIdx), nameOf(ev.giverIdx), lblColored(ev.card));
          break;
        case 'passOnly':
          msg = M.passOnly(humanAt(ev.playerIdx), nameOf(ev.playerIdx));
          break;
        case 'humanGives':
          msg = M.humanGives(lblColored(ev.card), nameOf(ev.receiverIdx));
          break;
        default:
          break; // gameover ei tuota lokiriviä, tulos näkyy tulosruudussa
      }

      if (s.g) commit(s.g, msg);
      else if (msg !== undefined) addLog(msg);

      if (ev?.t === 'won') {
        if (sndRef.current) SFX.capture();
        if (humanAt(ev.playerIdx) && sndRef.current) tm(() => SFX.fanfare(), 300);
      }
      if (ev?.t === 'passGive' && sndRef.current) SFX.take();
      if (ev?.t === 'gameover') {
        if (allBotsRef.current) tm(() => onResult?.({ ranking: ev.ranking }), BOT_RESULT_DELAY);
        else onResult?.({ ranking: ev.ranking });
        return;
      }
    }

    scheduleNext();
  }

  // Kuka liikkuu seuraavaksi ja milloin. Ainoa paikka joka ajastaa bottisiirron
  // kesken pelin; aloitusvuoron ajastaa `startGame`.
  function scheduleNext() {
    const g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    if (g.givingCardTo !== null) return; // odotetaan ihmisen panttikorttia
    const p = g.players[g.activePlayer];
    if (!p || p.isHuman) return;

    if (g.bonusTurn === g.activePlayer) {
      schedMove(() => runAI(gRef.current), 900);
      return;
    }
    const d = (allBotsRef.current ? aiDelayRef.current : 1100) + Math.random() * 400;
    schedMove(() => runAI(gRef.current), d);
  }

  // ── AI ──────────────────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const idx = g.activePlayer;
    const p = g.players[idx];
    if (!p || p.isHuman) return;

    const move = chooseMove(g, idx, levelOf(idx));

    // Aikeen näyttäminen on kuljettajan asia: se viivästyttää siirtoa muttei muuta sitä.
    if (move.t === 'play' && initShowIntention) {
      const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
      setIntention({ playerIdx: idx, cards: [move.card] });
      schedMove(() => { setIntention(null); playSteps(applyMove(gRef.current, idx, move, levelOf)); }, intentionMs);
      return;
    }
    playSteps(applyMove(g, idx, move, levelOf));
  }

  // ── Ihmistoiminnot ──────────────────────────────────────────
  function humanSelect(card) {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    setSel(prev => prev?.id === card.id ? null : card);
  }

  function humanPlay() {
    if (!selCard || !G) return;
    const g = gRef.current;
    if (!isPlayable(selCard, g.rows)) {
      addLog(M.badCard);
      return;
    }
    const card = selCard; setSel(null);
    playSteps(applyMove(g, 0, { t: 'play', card }, levelOf));
  }

  function humanPass() {
    if (!G || G.phase !== 'play' || G.activePlayer !== 0) return;
    if (hasAnyPlay(G.players[0].hand, G.rows)) {
      addLog(M.cantPass);
      return;
    }
    setSel(null);
    playSteps(applyMove(gRef.current, 0, { t: 'pass' }, levelOf));
  }

  function humanEndBonusTurn() {
    const g = gRef.current;
    if (!g || g.bonusTurn !== 0) return;
    setSel(null);
    playSteps(applyMove(g, 0, { t: 'endBonus' }, levelOf));
  }

  function humanGiveCard() {
    const g = gRef.current;
    const card = selCard;
    if (!g || g.givingCardTo === null || !card) return;
    setSel(null);
    playSteps(applyGiveCard(g, card));
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  // ── Select ──────────────────────────────────────────────────
  if (screen === 'select') return (
    <GameStartScreen
      icon={<span style={{ color: SUIT_COLOR['♣'] }}>♣</span>}
      title="RISTISEISKA"
      titleSize={isMobile ? 24 : 52}
      letterSpacing={isMobile ? 3 : 12}
      counts={[3, 4]}
      value={nP}
      onCountChange={setNP}
      playerGroup={playerGroup}
      onPlayerGroupChange={onPlayerGroupChange}
      onStart={() => startGame()}
      onBotBattle={startBotBattle}
      botBattleSub={t('ui.start.botBattleSub', { n: nP, level: t('ui.settings.ai.' + aiLevel + '.label') })}
      isMobile={isMobile}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: isMobile ? 300 : 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5 }}>{t('games.ristiseiska.opts.pantti')}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[[t('games.ristiseiska.opts.chosen'), false], [t('games.ristiseiska.opts.random'), true]].map(([lab, val]) => {
                const active = rules.randomPantti === val;
                return (
                  <button key={lab} onClick={() => setRules(r => ({ ...r, randomPantti: val }))}
                    style={{ minWidth: 40, height: 36, padding: '0 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Georgia,serif', border: `2px solid ${active ? C.gold : '#2a4a32'}`, background: active ? C.gold + '18' : 'transparent', color: active ? C.gold : C.dim, transition: 'all 0.2s' }}>
                    {lab}
                  </button>
                );
              })}
            </div>
          </div>
          <span style={{ color: C.dim, fontFamily: 'sans-serif', fontSize: 10, opacity: 0.75, lineHeight: 1.4 }}>
            {rules.randomPantti
              ? t('games.ristiseiska.opts.hintRandom')
              : t('games.ristiseiska.opts.hintChosen')}
          </span>
        </div>
    </GameStartScreen>
  );

  // ── Gameover ────────────────────────────────────────────────
  if (!G) return null;

  const human       = G.players[0];
  const isGiving    = G.givingCardTo !== null && G.givingPlayerIdx === 0;
  const isBonusTurn = G.bonusTurn === 0;
  const isMyTurn    = G.phase === 'play' && (G.activePlayer === 0 || isBonusTurn) && !allBots;
  const iCanPlay    = (G.activePlayer === 0 || isBonusTurn) && hasAnyPlay(human.hand, G.rows);
  const iCanPass    = G.activePlayer === 0 && !isBonusTurn && !iCanPlay;

  // ── Pöytä: yksi rivi per maa ────────────────────────────────
  // Näytetään vain pinon nykyinen huippukortti: [ylin ala-pino] [7] [ylin ylä-pino]
  // Ala-pinon huippu = pienin pelattu arvo (6→5→4→3→2→A)
  // Ylä-pinon huippu = suurin pelattu arvo (8→9→10→J→Q→K)
  const CARD_H = 30;
  const CARD_W = 48;

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 620, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <TurnPrompt show={isMyTurn} action={t('ui.turn.ristiseiska')} />
      <AdviceBubble text={advice?.text} onDismiss={() => setAdvice(null)} />

      {/* Viesti */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, color: C.gold }}>♣</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* AI-kädet — viuhka */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 8 }}>
          {G.players.filter((_, i) => allBots || i !== 0).map(p => {
            const isActive = G.activePlayer === p.id;
            const isDone   = G.finished.includes(p.id);
            const rank     = isDone ? G.finished.indexOf(p.id) + 1 : null;
            const count = p.hand.length;
            const cw = 20, ch = 30, ov = 10;
            const fanW = count > 0 ? cw + Math.max(0, count - 1) * ov : cw;
            const canHighlight = allBots && isActive && G.phase === 'play' && !isDone;
            const playableSet = canHighlight ? new Set(p.hand.filter(c => isPlayable(c, G.rows)).map(c => c.id)) : null;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 10, background: isActive ? `${C.gold}08` : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? C.gold + '55' : C.panelBorder}`, opacity: isDone ? 0.45 : 1 }}>
                <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: isActive ? C.gold : C.dim, minWidth: 70, flexShrink: 0 }}>
                  {isActive ? '► ' : '🤖 '}{truncName(p.name)}
                  {isDone && <span style={{ color: C.gold, marginLeft: 4 }}>({rank}.)</span>}
                </span>
                {revealAll ? (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {sortHand(p.hand).map(c => {
                      const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                      const isPlayable_ = playableSet?.has(c.id);
                      return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]}
                        selected={isIntended}
                        highlight={!isIntended && !!isPlayable_}
                        dim={!isIntended && playableSet !== null && !isPlayable_}
                      />;
                    })}
                  </div>
                ) : isDone ? null : count === 0 ? null : (
                  <div style={{ position: 'relative', width: fanW, height: ch, flexShrink: 0 }}>
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} style={{ position: 'absolute', left: i * ov, top: 0, width: cw, height: ch, borderRadius: 3, background: BACKS[cardBack].bg, border: `1px solid ${BACKS[cardBack].border}`, zIndex: i, boxShadow: i === count - 1 ? '0 1px 4px rgba(0,0,0,0.4)' : 'none' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pöytä: pinot */}
      <PoytaPanel isMobile={isMobile} minHeight={null}
        title={<span>{t('games.ristiseiska.ui.towers')} · {t('games.ristiseiska.ui.lowerShort')} [6→A] &nbsp;·&nbsp; [7] &nbsp;·&nbsp; {t('games.ristiseiska.ui.upperShort')} [8→K]</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 6 : 16 }}>
          {SUITS.map(s => <StackRow key={s} suit={s} G={G} isMobile={isMobile} cardBack={cardBack} t={t} />)}
        </div>
      </PoytaPanel>

      {/* Viimeisin lyönti -badge — kiinteä 36px wrapper, ei nytkähtelyä */}
      <div style={{ position: 'relative', height: 0 }}>
        {showLastPlay && lastPlay && (
          <div key={lastPlay.card.id}
            style={{
              position: 'absolute', bottom: 4, left: 0, zIndex: 5,
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(13,22,18,0.95)',
              border: `1px solid ${lastPlay.isHuman ? C.gold + '66' : C.panelBorder}`,
              borderRadius: 12, padding: '5px 14px',
              animation: 'lastPlayFade 1.9s ease forwards',
              pointerEvents: 'none',
            }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: lastPlay.isHuman ? C.gold : C.dim }}>
              {lastPlay.name}
            </span>
            <span style={{
              background: C.card, borderRadius: 4, padding: '1px 6px',
              fontSize: 13, fontWeight: 700, fontFamily: 'Georgia,serif',
              color: suitColor(lastPlay.card.s),
            }}>
              {lastPlay.card.r}{lastPlay.card.s}
            </span>
          </div>
        )}
      </div>


      {!allBots && (<>
      {/* Oma käsi */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${isMyTurn || isGiving ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '8px 10px' : '12px 14px', marginBottom: isMobile ? 6 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: isMyTurn || isGiving ? C.gold : C.dim, marginBottom: 8 }}>
          👤 Hero{human.hand.length === 0 ? ` · ${t('ui.shared.emptyHandWin')}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const isSel    = selCard?.id === c.id;
            const playable = (isMyTurn || isBonusTurn) && isPlayable(c, G.rows);
            const hl       = isGiving ? !isSel : (playable && !isSel);
            const isAdv    = !isSel && !!advice?.cardIds?.includes(c.id);
            // Mestarin neuvo päällä: kaikki muu himmenee, jotta osoitettu kortti erottuu
            const dimmed   = advice?.cardIds?.length
              ? !isAdv
              : isGiving ? false : ((isMyTurn || isBonusTurn) && !playable && !isSel);
            const onClick  = isGiving
              ? () => setSel(prev => prev?.id === c.id ? null : c)
              : (isMyTurn || isBonusTurn) ? () => humanSelect(c) : undefined;
            return (
              <Card key={c.id} card={c} small={!isMobile} xsmall={isMobile}
                selected={isSel}
                highlight={!!hl}
                advice={isAdv}
                dim={!!dimmed}
                onClick={onClick}
                backStyle={BACKS[cardBack]}
              />
            );
          })}
        </div>
      </div>
      </>)}

      {/* Toiminnot */}
      <div style={{ minHeight: isMobile ? 36 : 52, display: 'flex', gap: 8, marginBottom: isMobile ? 6 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {(isMyTurn || isBonusTurn) && !isGiving && (
          <>
            <button onClick={humanPlay} disabled={!selCard}
              style={{ background: selCard ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selCard ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selCard ? '#0d2118' : C.dim, fontSize: 13, cursor: selCard ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              {t('ui.action.play')} {selCard ? lbl(selCard) : ''}
            </button>
            {!isBonusTurn && (
              <button onClick={humanPass} disabled={iCanPlay}
                style={{ background: iCanPass ? 'rgba(224,92,59,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${iCanPass ? C.red + '55' : C.panelBorder}`, borderRadius: 10, padding: '10px 18px', color: iCanPass ? C.red : C.dim, fontSize: 13, cursor: iCanPass ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
                {t('ui.action.pass')}
              </button>
            )}
            {isBonusTurn && (
              <button onClick={humanEndBonusTurn} style={{ background: 'transparent', border: `1px solid ${C.dim}55`, borderRadius: 10, padding: '10px 16px', color: C.dim, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>{t('games.ristiseiska.ui.dontContinue')}</button>
            )}
            {selCard && (
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {isGiving && (
          <>
            <button onClick={humanGiveCard} disabled={!selCard}
              style={{ background: selCard ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selCard ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selCard ? '#0d2118' : C.dim, fontSize: 13, cursor: selCard ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              {t('ui.action.give')} {selCard ? lbl(selCard) : t('ui.action.card')}
            </button>
            {selCard && (
              <button onClick={() => setSel(null)} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {(isMyTurn || isGiving) && <AdviceButton onClick={askAdvice} />}
      </div>

      {/* Tilapalkki */}
      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
      >
        <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('ui.shared.firstOutWins')} · {t('games.ristiseiska.ui.openings')} {SUITS.filter(s => G.rows[s].active).length}/4
      </GameStatusBar>

      {allBots && G?.phase !== 'gameover' && (
        <BotBattleBar paused={paused} onTogglePause={togglePause} aiDelayMs={aiDelayMs}
          onDelayChange={v => { setAiDelayMs(v); aiDelayRef.current = v; }} isMobile={isMobile} />
      )}


      {/* Loki */}
      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)} />

    </div>
  );
}
