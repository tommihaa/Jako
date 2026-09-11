import { useState, useRef, useEffect } from 'react';
import { C, SUIT_COLOR } from '../shared/colors.js';
import GameStartScreen from '../shared/GameStartScreen.jsx';
import TurnPrompt from '../shared/TurnPrompt.jsx';
import { BACKS } from '../shared/BACKS.jsx';
import { SFX } from '../shared/audio.js';
import { lbl, korttia, kortin, SUITS, aiShouldFumble, sortHand as sortHandBy, shuffledAINames, lblColored, newDeck, BOT_RESULT_DELAY } from '../shared/helpers.js';
import Card from '../shared/Card.jsx';
import ShuffleOverlay from '../shared/ShuffleOverlay.jsx';
import BotBattleBar from '../shared/BotBattleBar.jsx';
import GameLog from '../shared/GameLog.jsx';
import GameStatusBar from '../shared/GameStatusBar.jsx';
import PakkaCount from '../shared/PakkaCount.jsx';
import PoytaPanel from '../shared/PoytaPanel.jsx';
import { useAIScheduler } from '../shared/useAIScheduler.js';
import { useGameLog } from '../shared/useGameLog.js';
import { useGameState } from '../shared/useGameState.js';

// ── Moska (Durak) ─────────────────────────────────────────────
// A=14 kaikissa taisteluvertailuissa
const MV = c => c.r === 'A' ? 14 : c.v;

function canBeat(atk, def, ts) {
  if (def.s === atk.s) return MV(def) > MV(atk);
  return def.s === ts && atk.s !== ts;
}

function drawFrom(deck, tc, n) {
  const drawn = []; let d = [...deck], t = tc;
  for (let i = 0; i < n; i++) {
    if (d.length > 0) drawn.push(d.shift());
    else if (t) { drawn.push(t); t = null; }
    else break;
  }
  return { drawn, deck: d, trumpCard: t };
}

function nextActive(players, from) {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (players[idx].rank === null) return idx;
  }
  return from;
}


// ── Alustus ───────────────────────────────────────────────────
function initGame(nP, pool, allBots = false) {
  const aiNames = shuffledAINames(pool);
  const raw = newDeck();
  const trumpCard = raw.pop();
  const ts = trumpCard.s;
  const deck = [...raw];

  const players = Array.from({ length: nP }, (_, i) => ({
    id: i, name: i === 0 ? (allBots ? aiNames[aiNames.length - 1] || 'Nemesis' : 'Hero') : aiNames[i - 1],
    isHuman: allBots ? false : i === 0, hand: [], rank: null,
  }));
  players.forEach(p => { p.hand = deck.splice(0, 6); });

  // Valttikakkosen automaattinen vaihto
  let tc = { ...trumpCard };
  let exchangeMsg = null;
  if (tc.r !== '2') {
    const own = players.find(p => p.hand.some(c => c.r === '2' && c.s === ts));
    if (own) {
      const t2 = own.hand.find(c => c.r === '2' && c.s === ts);
      own.hand = [...own.hand.filter(c => c.id !== t2.id), { ...trumpCard }];
      tc = { ...t2 };
      exchangeMsg = tr('games.moska.msg.trumpExchange', { name: own.name, ts, card: lblColored(trumpCard) });
    }
  }

  // Ensimmäinen hyökkääjä: pienin valttikortti
  let lowestV = Infinity, firstAtk = 0;
  players.forEach((p, i) => p.hand.forEach(c => {
    if (c.s === ts && MV(c) < lowestV) { lowestV = MV(c); firstAtk = i; }
  }));
  const def = nextActive(players, firstAtk);

  return {
    players, deck, trumpCard: tc, ts,
    table: [],          // [{atk, def:null|card, atkBy:idx}]
    primaryAtk: firstAtk,
    defender: def,
    attackers: [firstAtk],
    phase: /** @type {Vaihe} */ ('attack'),
    rankings: [],
    passChain: [],      // puolustajat jotka ovat siirtäneet
    addQueue: [],       // pelaajat jotka voivat lisätä
    exchangeMsg,
  };
}

const sortHand = hand => sortHandBy(hand, MV);

// ── AI-logiikka ───────────────────────────────────────────────
function aiPickAttack(p, defenderHandSize, ts) {
  const byRank = {};
  p.hand.forEach(c => { (byRank[c.r] = byRank[c.r] || []).push(c); });
  const groups = Object.values(byRank).sort((a, b) => {
    const aT = a[0].s === ts, bT = b[0].s === ts;
    if (aT !== bT) return aT ? 1 : -1;
    return MV(a[0]) - MV(b[0]);
  });
  if (!groups.length) return [];
  return [groups[0][0]]; // yksi kortti per hyökkäys
}

function aiPickDefense(atk, hand, ts) {
  const valid = hand.filter(c => canBeat(atk, c, ts));
  if (!valid.length) return null;
  return valid.sort((a, b) => {
    const aT = a.s === ts, bT = b.s === ts;
    if (aT !== bT) return aT ? 1 : -1;
    return MV(a) - MV(b);
  })[0];
}

function getAddable(g, playerIdx) {
  const def = g.players[g.defender];
  const tableRanks = new Set(g.table.flatMap(t => [t.atk.r, t.def?.r].filter(Boolean)));
  const unbeaten = g.table.filter(t => !t.def).length;
  const byDefHand = def.hand.length - unbeaten;
  const byLimit   = 6 - g.table.length;           // hyökkäyskortteja enintään 6 yhteensä
  const maxAdd = Math.min(byDefHand, byLimit);
  if (maxAdd <= 0 || !tableRanks.size) return [];
  return g.players[playerIdx].hand.filter(c => tableRanks.has(c.r));
}

function getMaxAdd(g) {
  const def = g.players[g.defender];
  const unbeaten = g.table.filter(t => !t.def).length;
  return Math.min(def.hand.length - unbeaten, 6 - g.table.length);
}

// Super Natural -hyökkäys: suosii arvoja joista moni kopio on jo poissa pelistä
// → vähemmän riskiä että vastustajalla on sama arvo sivustalyöntiin
function aiPickAttackSN(p, ts, removed, opts = {}) {
  const byRank = {};
  p.hand.forEach(c => { (byRank[c.r] = byRank[c.r] || []).push(c); });
  const groups = Object.values(byRank).map(cards => {
    const r = cards[0].r;
    const goneCount = SUITS.filter(s => removed.has(`${r}${s}`)).length;
    return { cards, isTrump: cards[0].s === ts, goneCount };
  }).sort((a, b) => {
    if (a.isTrump !== b.isTrump) return a.isTrump ? 1 : -1;
    if (b.goneCount !== a.goneCount) return b.goneCount - a.goneCount;
    return MV(a.cards[0]) - MV(b.cards[0]);
  });
  if (!groups.length) return [];
  const best = groups[0].cards;

  // Vaiheen vaihtuminen: pakan loputtua käsi ei enää täydenny, joten koko
  // samanarvoinen ryhmä kannattaa lyödä kerralla. Niin kauan kuin käsi täydentyy,
  // yksi kortti riittää. MOSKA.md rivi 12 sallii useamman saman vahvuisen kortin ja
  // rivi 13 rajaa määrän puolustajan käteen; doAttack ei valvo kumpaakaan rajaa vaan
  // luottaa kutsujaan, joten ne ovat tässä. Samat rajat kuin ihmisellä
  // (humanConfirmAttack: enintään kuusi ja enintään puolustajan käden verran).
  if (!opts.deckGone) return [best[0]];
  const limit = Math.min(6, opts.defenderHandSize ?? 1);
  return limit > 1 ? best.slice(0, limit) : [best[0]];
}

// Pienin pariton ei-valtti ensin — kaatuu eniten "roskakortin" logiikkaan
function aiPickAddCard(addable, hand, ts) {
  const sorted = [...addable].sort((a, b) => {
    const aT = a.s === ts, bT = b.s === ts;
    if (aT !== bT) return aT ? 1 : -1;
    return MV(a) - MV(b);
  });
  const rankCount = {};
  hand.forEach(c => { rankCount[c.r] = (rankCount[c.r] || 0) + 1; });
  const unpaired = sorted.filter(c => rankCount[c.r] === 1);
  return unpaired.length ? unpaired[0] : sorted[0];
}

// Kuka ottaa passin vastaan, tai null jos kukaan ei voi. Sama haku kuin doPassissa,
// jotta passausehto ei koskaan tarjoa siirtoa jonka doPass hylkää.
function moskaNextDefender(g) {
  let nextDef = nextActive(g.players, g.defender);
  while (g.attackers.includes(nextDef) && nextDef !== g.defender) {
    nextDef = nextActive(g.players, nextDef);
  }
  if (nextDef === g.defender || nextDef === g.primaryAtk || g.passChain.includes(nextDef)) return null;
  return nextDef;
}

// Passauksen ehdot yhdessä paikassa: sama sääntö ajaa botin, Mestarin neuvon ja ihmisen
// napin. Ennen 18.8.2026 ehdot oli kirjoitettu kolmesti eivätkä versiot vastanneet
// toisiaan: boteilla oli passiketjun pituusraja jota ihmisellä ei ollut, ja koodin oma
// kommentti väitti ehtojen olevan samat. Yhtenäistys tehtiin ihmisen ehtoihin.
// Export sauman takia: kuusikohtainen ehtoluettelo (MOSKA.md › Siirtämisen ehdot)
// on kiinnitetty testissä test/moska-passaus.test.js.
export function moskaCanPass(g, playerIdx) {
  if (!g || g.defender !== playerIdx) return false;
  if (!g.table.length || g.table.some(t => t.def)) return false;           // yhtään ei kaadettu
  const ranks = new Set(g.table.map(t => t.atk.r));
  if (ranks.size !== 1) return false;                                      // pöytä yhtä vahvuutta
  if (!g.players[playerIdx].hand.some(c => ranks.has(c.r))) return false;  // oma kortti samaa vahvuutta
  if (g.passChain.includes(playerIdx)) return false;                       // ei kahdesti samalla
  if (g.players.filter(pl => pl.rank === null).length <= 2) return false;  // aktiivisia yli 2
  return moskaNextDefender(g) !== null;
}

// Puolustajan passauskortti: pienin sopiva, valttia säästetään. Valtti kelpaa sääntönä,
// joten siihen mennään jos muuta samaa vahvuutta ei ole (ihmisellä on sama vapaus).
// Portitus tehdään kutsupaikassa moskaCanPassilla; tämä valitsee vain kortin.
// Palauttaa kortit taulukkona: kaikki samanarvoiset ei-valtit kerralla (sama vapaus kuin
// ihmisellä, Tommin päätös 8.9.2026, MOSKA.md ehto 3), tai yksi valtti jos muuta ei ole.
function aiPickPass(table, hand, ts) {
  const atkRanks = new Set(table.map(t => t.atk.r));
  const same = hand.filter(c => atkRanks.has(c.r));
  const byValue = cs => [...cs].sort((a, b) => MV(a) - MV(b));
  const nonTrump = byValue(same.filter(c => c.s !== ts));
  if (nonTrump.length) return nonTrump;
  const trump = byValue(same)[0];
  return trump ? [trump] : null;
}

// Puolustajan siirtosuunnitelma yhdessä paikassa: sama funktio ajaa botin ja Mestarin
// neuvon (kompositioauditointi H7, 5.9.2026). Ennen tätä ahne kaatosilmukka oli
// kirjoitettu kahdesti eikä mikään sitonut versioita toisiinsa. Tasoporras on tässä
// eikä säännössä: `moskaCanPass` on kaikille sama, ja Aloittelija vain jättää sen väliin.
// `fumble` on Aloittelijan virhe (valtti vaikka ei-valtti riittäisi); neuvo kutsuu ilman.
// Palauttaa { kind: 'pass', cards } | { kind: 'beat', beats } | { kind: 'take' }.
// Siirtokortit (taulukko) tai null. Aloittelija ei siirrä, muut siirtävät aina kun sääntö sallii.
function moskaPlanPass(g, playerIdx, level) {
  if (level === 'beginner' || !moskaCanPass(g, playerIdx)) return null;
  // Pienin sopiva kortti, valttia säästäen
  return aiPickPass(g.table, g.players[playerIdx].hand, g.ts);
}

// Ahne kaatosuunnitelma: pienin voittava per pöytäkortti, tai otto jos yksikin jää.
// Kaksi funktiota yhden sijaan, jotta Aloittelijan virhearpa nostetaan vasta kun siirto on
// pois laskuista; yhtenä funktiona arpa kuluisi myös siirtopolulla ja siemennetty ajo
// eriytyisi. Palauttaa { kind: 'beat', beats } | { kind: 'take' }.
function moskaPlanBeats(g, playerIdx, fumble = false) {
  const { players, ts, table } = g;
  let hand = [...players[playerIdx].hand];
  const beats = [];
  for (const slot of table.filter(t => !t.def)) {
    let dc = aiPickDefense(slot.atk, hand, ts);
    // Ei pysty täydelliseen puolustukseen — ottaa ilman osittaisia paljastuksia
    if (!dc) return { kind: 'take', beats: [] };
    if (fumble && dc.s !== ts) {
      const trumpBeaters = hand.filter(c => c.s === ts && canBeat(slot.atk, c, ts));
      if (trumpBeaters.length) dc = trumpBeaters.sort((a, b) => MV(a) - MV(b))[0];
    }
    beats.push({ slot, card: dc });
    hand = hand.filter(c => c.id !== dc.id);
  }
  return { kind: 'beat', beats };
}

// Koko puolustussuunnitelma yhtenä kutsuna: siirto ensin, sitten kaato tai otto.
function moskaPlanDefense(g, playerIdx, level, fumble = false) {
  const passCards = moskaPlanPass(g, playerIdx, level);
  if (passCards) return { kind: 'pass', cards: passCards, beats: [] };
  return moskaPlanBeats(g, playerIdx, fumble);
}

// Lisäysvaiheen kynnys tasoittain, yhdessä paikassa samasta syystä kuin yllä: kynnys
// `def.hand.length >= 2 && table.length < 5` oli kovakoodattuna sekä botissa että neuvossa.
function moskaShouldAdd(g, level) {
  const def = g.players[g.defender];
  if (level === 'beginner') return g.table.length <= 1 && def.hand.length >= 5;
  if (level === 'hard') return def.hand.length >= 2 && g.table.length < 5;
  return def.hand.length >= 3 || g.table.length <= 2;
}

// Mestarin neuvo Herolle (pelaaja 0): sama hard-tason logiikka kuin botilla, vain
// julkista tietoa (oma käsi, pöytä, poistuneet kortit removed). Palauttaa
// { type, cards?/card?, target? } — type vastaa games.moska.advice.* -avainta.
export function getAdvice(g, removed) {
  if (!g) return null;
  const { phase, primaryAtk, defender, players, ts } = g;

  if (phase === 'attack' && primaryAtk === 0) {
    const cards = aiPickAttackSN(players[0], ts, removed || new Set(), {
      deckGone: g.deck.length === 0 && g.trumpCard === null,
      defenderHandSize: players[defender].hand.length,
    });
    if (!cards.length) return null;
    // Yhden kortin perustelu ei päde ryhmään, joten monikorttihyökkäyksellä on oma teksti.
    return { type: cards.length > 1 ? 'attackMulti' : 'attack', cards };
  }

  if (phase === 'defend' && defender === 0) {
    // Sama suunnitelma kuin Mestari-botilla: siirto ensin, sitten ahne kaato, muuten otto
    const plan = moskaPlanDefense(g, 0, 'hard');
    if (plan.kind === 'pass') return { type: 'pass', cards: plan.cards };
    if (plan.kind === 'take') return { type: 'take' };
    if (!plan.beats.length) return null;
    const first = plan.beats[0];
    return { type: 'beat', card: first.card, target: first.slot.atk };
  }

  if (phase === 'add' && g.addQueue?.[0] === 0) {
    const addable = getAddable(g, 0);
    // Ei lyötävää lainkaan ≠ päätös säästää kortteja: eri neuvo.
    if (!addable.length) return { type: 'noAdd' };
    if (!moskaShouldAdd(g, 'hard')) return { type: 'skipAdd' };
    return { type: 'add', card: aiPickAddCard(addable, players[0].hand, ts) };
  }

  return null;
}

// ── Komponentti ───────────────────────────────────────────────
import { useT, tr } from '../shared/i18n.jsx';
import { AdviceButton, AdviceBubble, GuideButton, useOpastus, opastusAvain } from '../shared/MestariNeuvo.jsx';

// Suljettu arvojoukko: vaihe jota tässä ei ole, ei käänny (käännösaikainen portti).
/** @typedef {'attack'|'defend'|'add'|'gameover'} Vaihe */
/** @typedef {{phase: Vaihe, [k: string]: any}} PeliTila Vain vaihe on kiinnitetty; muut kentät vapaita. */

export default function Moska({ onResult, showLog = true, soundOn = false, seeAll = false, onSoundOnChange, onSeeAllChange, onShowLogChange, showLastPlay = true, showNextBtn = true, showIntention: initShowIntention = true, isMobile = false, playerCount = 4, playerNames, aiLevel = 'normal', botLevels = null, onAiLevelChange, onSnapshot, playerGroup, onPlayerGroupChange }) {
  const t = useT();
  const [screen, setScreen] = useState('select');
  const [nP, setNP] = useState(playerCount);
  const cardBack = 'ilves';
  const { G, gRef, setGS } = useGameState(/** @type {PeliTila|null} */ (null));
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

  const [justPlacedIds, setJustPlaced] = useState(new Set());

  // Ihmispelaajan valintatila
  const [selAtk, setSelAtk] = useState([]);        // hyökkäysvalinta
  const [selDefTarget, setSelDefTarget] = useState(null); // pöytäkortti jota kaataa
  const [selPass, setSelPass] = useState([]);      // siirtokortti
  const [selAdd, setSelAdd] = useState([]);        // lisäyskortti
  const [awaitingPlayerContinue, setAwaitingPlayerContinue] = useState(false); // odottaa seuraavaa kierrosta
  const [pendingDraw, setPendingDraw] = useState(null); // odottaa nostojen tekemistä

  const [lastPlay, setLastPlay] = useState(null);
  const [intention, setIntention]         = useState(null); // { playerIdx, cards } | null
  const [advice, setAdvice]               = useState(null); // { text, cardIds, targetId } | null

  const removedRef = useRef(new Set()); // korttien rs-avaimet ("A♠") jotka ovat poistuneet pelistä
  const sndRef         = useRef(soundOn);
  const aiLevelRef     = useRef(aiLevel);
  useEffect(() => { aiLevelRef.current = aiLevel; }, [aiLevel]);
  // botLevels: istuinkohtainen taso (benchmark-käyttö); null = normaali käytös
  const botLevelsRef = useRef(botLevels);
  useEffect(() => { botLevelsRef.current = botLevels; }, [botLevels]);
  const prevDeckRef    = useRef(null);
  const lastPlayTmr    = useRef(null);
  const showNextBtnRef = useRef(showNextBtn);
  const { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedMove, schedAI, paused, setPaused, aiDelayMs, setAiDelayMs, togglePause, allBots, setAllBots, enterBotBattle } =
    useAIScheduler({ extraTimerRefs: [lastPlayTmr] });
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { showNextBtnRef.current = showNextBtn; }, [showNextBtn]);
  useEffect(() => { setAdvice(null); }, [G]); // neuvo vanhenee jokaisesta tilamuutoksesta
  const opastus = useOpastus('moska', G);
  const adv = advice || opastus.hl; // korostettava: neuvo tai opastuksen palaute

  // Neuvo ja opastus laskevat saman olion; ero on siinä mitä UI näyttää ja milloin.
  function computeAdvice() {
    const g = gRef.current;
    if (!g) return null;
    const a = getAdvice(g, removedRef.current);
    if (!a) return null;
    const card = a.card || a.cards?.[0];
    const params = {
      cards: a.cards ? a.cards.map(lbl).join(', ') : undefined,
      card:  card ? lbl(card) : undefined,
      target: a.target ? lbl(a.target) : undefined,
    };
    const cardIds = a.card ? [a.card.id] : (a.cards ? a.cards.map(c => c.id) : []);
    const key = a.type === 'take' ? opastusAvain('take')
      : a.type === 'pass' ? opastusAvain('pass', cardIds)
      : (a.type === 'noAdd' || a.type === 'skipAdd') ? opastusAvain('skip')
      : opastusAvain('play', cardIds);
    return {
      text: t('games.moska.advice.' + a.type, params),
      cardIds,
      targetId: a.target ? a.target.id : null,
      key,
    };
  }
  // Opastuksen päällä neuvo näyttää vain korostuksen; sääntöteksti on jo opastuskuplassa.
  function askAdvice() { const a = computeAdvice(); setAdvice(a && opastus.pending ? { ...a, text: null } : a); }
  function askGuide() { opastus.ask(computeAdvice()); }
  // Auto-advance kun showNextBtn=false ja kierros odottaa jatkoa
  useEffect(() => {
    if (awaitingPlayerContinue && !showNextBtnRef.current) {
      const id = tm(() => continueToNextRound(), 600);
      return () => clearTimeout(id);
    }
  }, [awaitingPlayerContinue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!G) { prevDeckRef.current = null; return; }
    const total = G.deck.length + (G.trumpCard ? 1 : 0);
    if (prevDeckRef.current !== null && prevDeckRef.current > 0 && total === 0) setPakaAnim(true);
    prevDeckRef.current = total;
  }, [G?.deck?.length, G?.trumpCard]);

  // Kielioppiapuri: Hero = 2. persoona, AI = nimi + 3. persoona

  const { log, logRef, addLog, commit, resetLog } = useGameLog({
    setGS,
    onMessage: setMsg_, onSnapshot,
    isBotBattle: () => allBotsRef.current,
    snapshot: () => {
      const g = gRef.current; if (!g) return null;
      return {
        players: g.players.map(p => ({ name: p.name, isHuman: p.isHuman, hand: p.hand ?? [], cardCount: p.hand?.length ?? 0, score: null })),
        tableCards: (g.table ?? []).flatMap(tt => [tt.atk, tt.def].filter(Boolean)),
        // Kääntämätön suomi, kirjattu H4:ään; avainta ei lisätä tässä muutoksessa.
        extraText: g.ts ? `Valtti: ${g.ts}` : null,
      };
    },
  });

  const M = {
    gameStart:      (trump, att, def) => t('games.moska.msg.gameStart', { trump, att, def }),
    defenderWon:    (name, table) => t('games.moska.msg.defenderWon', { name, table }),
    defenderTook:   (name, count, table) => t('games.moska.msg.defenderTook', { name, count, table }),
    playerDrew:     (name, count) => t('games.moska.msg.playerDrew', { name, count }),
    won:            name => t('games.moska.msg.won', { name }),
    out:            name => t('games.moska.msg.out', { name }),
    lost:           name => t('games.moska.msg.lost', { name }),
    nextRound:      (att, def) => t('games.moska.msg.nextRound', { att, def }),
    attack:         (name, cards) => t('games.moska.msg.attack', { name, cards }),
    beat:           (defName, defCard, atkCard, status) => t('games.moska.msg.beat', { defName, defCard, atkCard, status }),
    cannotPass:     t('games.moska.msg.cannotPass'),
    pass:           (name, cards, nextName) => t('games.moska.msg.pass', { name, cards, nextName }),
    add:            (name, cards) => t('games.moska.msg.add', { name, cards }),
    defendHuman:    (unbeaten, cards, beaten) => unbeaten > 0
      ? t('games.moska.msg.defendHumanCards', { cards, beaten, unbeaten })
      : t('games.moska.msg.defendHuman'),
    defendAI:       (name, unbeaten, cards) => unbeaten > 0
      ? t('games.moska.msg.defendAICards', { name, cards })
      : t('games.moska.msg.defendAI', { name }),
    addPhase:       cards => t('games.moska.msg.addPhase', { cards }),
    canAdd:         (name, cards) => t('games.moska.msg.canAdd', { name, cards }),
    aiCanAdd:       (name, cards) => t('games.moska.msg.aiCanAdd', { name, cards }),
    aiSkips:        name => t('games.moska.msg.aiSkips', { name }),
    badSameRank:    t('games.moska.msg.badSameRank'),
    tooManyCards:   t('games.moska.msg.tooManyCards'),
    tooManyVsDef:   count => t('games.moska.msg.tooManyVsDef', { count }),
    cantBeat:       (card, target) => t('games.moska.msg.cantBeat', { card, target }),
    noPassAfterBeat:t('games.moska.msg.noPassAfterBeat'),
    badPassCard:    card => t('games.moska.msg.badPassCard', { card }),
  };


  // ── Pelin aloitus ─────────────────────────────────────────
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
    removedRef.current = new Set();
    const g = initGame(count, playerNames, allBotsMode);
    resetLog();
    setSelAtk([]); setSelDefTarget(null); setSelPass([]); setSelAdd([]); setPakaAnim(false);
    setAwaitingPlayerContinue(false); setPendingDraw(null);
    commit(g);
    if (g.exchangeMsg) addLog(g.exchangeMsg);
    const trumpSpan = `<span style="color:${SUIT_COLOR[g.ts]}">${g.ts}</span>`;
    addLog(M.gameStart(trumpSpan, g.players[g.primaryAtk].name, g.players[g.defender].name));
    setScreen('game');
    setShuffling(true);
    if (!g.players[g.primaryAtk].isHuman) {
      schedAI(() => runAI(gRef.current), 3300);
    }
  }

  function startBotBattle() {
    enterBotBattle(aiLevel, onAiLevelChange, aiLevelRef);
    startGame(nP, true);
  }


  // ── Kierroksen ratkaisu ───────────────────────────────────
  function resolveRound(g, defWon) {
    const defPlayer = g.players[g.defender];
    let players = g.players.map(p => ({ ...p }));
    // Kierroksen lokirivit odottavat tilaa: ne kirjoitetaan vasta kun uusi tila on
    // committoitu, jotta katselutilan frame ei kuvaa edellistä kierrosta
    // (kompositioauditointi H4).
    const lines = /** @type {string[]} */ ([]);

    // Kuvaa pöydän tilanne kun kierros päättyi
    const tableDesc = g.table.map(t =>
      t.def ? `${lblColored(t.atk)}→${lblColored(t.def)}` : `${lblColored(t.atk)}❌`
    ).join(', ');

    if (defWon) {
      // Kaadetut kortit poistuvat pelistä — Super Natural muistaa ne
      g.table.forEach(t => {
        removedRef.current.add(`${t.atk.r}${t.atk.s}`);
        if (t.def) removedRef.current.add(`${t.def.r}${t.def.s}`);
      });
      lines.push(M.defenderWon(defPlayer.name, tableDesc));
      if (sndRef.current) SFX.capture();
    } else {
      const taken = g.table.flatMap(t => [t.atk, t.def].filter(Boolean));
      players[g.defender] = { ...players[g.defender], hand: [...players[g.defender].hand, ...taken] };
      lines.push(M.defenderTook(defPlayer.name, kortin(taken.length), tableDesc));
      if (sndRef.current) SFX.leave();
    }

    // Nosto: hyökkääjät ensin, puolustaja viimeisenä (vain jos voitti)
    // Mutta älä tee sitä heti, jos ihminen on osallisena - anna hänen katsoa kierroksen tulosta ensin
    const drawOrder = defWon
      ? [...g.attackers, g.defender]
      : [...g.attackers];
    let deck = [...g.deck], tc = g.trumpCard;

    const playerWasInvolved = !allBotsRef.current && (g.attackers.includes(0) || g.defender === 0 || (g.addQueue && g.addQueue.includes(0)));

    // Jos ihminen ei ollut osallisena, tee nosto heti
    if (!playerWasInvolved) {
      for (const idx of drawOrder) {
        if (players[idx].rank !== null) continue;
        const need = Math.max(0, 6 - players[idx].hand.length);
        if (need > 0) {
          const { drawn, deck: d2, trumpCard: t2 } = drawFrom(deck, tc, need);
          if (drawn.length) {
            players[idx] = { ...players[idx], hand: [...players[idx].hand, ...drawn] };
            lines.push(M.playerDrew(players[idx].name, kortin(drawn.length)));
          }
          deck = d2; tc = t2;
        }
      }
    }

    // Tarkista valmistuneet (pakkaa ei enää, käsi tyhjä)
    const deckGone = deck.length === 0 && tc === null;
    let rankings = [...g.rankings];
    players.forEach((p, i) => {
      if (p.rank === null && p.hand.length === 0 && deckGone) {
        const rank = rankings.length + 1;
        players[i] = { ...p, rank };
        rankings = [...rankings, i];
        // Eri viesti riippuen sijoituksesta
        if (rank === 1) {
          lines.push(M.won(p.name));
        } else {
          lines.push(M.out(p.name));
        }
      }
    });

    // Tarkista pelin loppu (≤1 aktiivia)
    const active = players.filter(p => p.rank === null);
    if (active.length <= 1) {
      active.forEach(p => {
        if (p.rank === null) {
          const rank = rankings.length + 1;
          players[p.id] = { ...p, rank };
          rankings = [...rankings, p.id];
          lines.push(M.lost(p.name));
        }
      });
      const ranking = rankings.map((id, pos) => ({
        name: players[id].name, place: pos + 1, isHuman: players[id].isHuman,
      }));
      if (allBotsRef.current) { tm(() => onResult?.({ ranking }), BOT_RESULT_DELAY); }
      else { onResult?.({ ranking }); }
      const g2 = { ...g, players, deck, trumpCard: tc, rankings, table: [], phase: 'gameover' };
      commit(g2);
      lines.forEach(addLog);
      return;
    }

    // Seuraava hyökkääjä & puolustaja
    let nextAtk;
    if (defWon) {
      nextAtk = g.defender;
      while (players[nextAtk].rank !== null) nextAtk = nextActive(players, nextAtk);
    } else {
      nextAtk = nextActive(players, g.defender);
    }
    const nextDef = nextActive(players, nextAtk);

    const g2 = {
      ...g, players, deck, trumpCard: tc, rankings, table: [],
      primaryAtk: nextAtk, defender: nextDef, attackers: [nextAtk],
      phase: /** @type {Vaihe} */ ('attack'), passChain: [], addQueue: [],
    };

    if (playerWasInvolved) {
      // Odota ihmisen jatkamista ennen seuraavaa kierrosta ja nosto
      // Päivitä pelaajat ja ranking, mutta pidä pöytä näkyvissä
      // Tyhjennä addQueue ja passChain jotta myTurn tulee falseksi (ei näytetä interaktio-elementtejä)
      const gShowResults = { ...g, players, rankings, addQueue: [], passChain: [] };
      commit(gShowResults);
      lines.forEach(addLog);

      // Jos ihminen puolusti, näytä puolustuksen tulos Viesti-kentässä (älä näytä vielä seuraavan kierroksen tietoja)
      if (g.defender === 0) {
        if (defWon) {
          setMsg_(t('games.moska.ui.defOk'));
        } else {
          setMsg_(t('games.moska.ui.defFail'));
        }
      } else {
        // Ihminen hyökkäsi — näytä kierroksen tulos ennen seuraavaa kierrosta
        const defName = players[g.defender].name;
        if (defWon) {
          setMsg_(t('games.moska.ui.defBeatAll', { name: defName }));
        } else {
          setMsg_(t('games.moska.ui.atkOk', { name: defName }));
        }
      }

      setPendingDraw({ drawOrder, deck, tc, players, nextAtk, nextDef, g2 });
      setAwaitingPlayerContinue(true);
    } else {
      // Ihminen ei ollut osallisena - päivitä pelitilanteen ja jatka
      commit(g2);
      lines.forEach(addLog);
      addLog(M.nextRound(players[nextAtk].name, players[nextDef].name));
      if (!players[nextAtk].isHuman) {
        // AI hyökkää seuraavaksi
        schedAI(() => runAI(gRef.current), 1600);
      }
    }
  }

  // ── Ydinsiirrot ───────────────────────────────────────────
  function doAttack(g, atkIdx, cards) {
    const p = g.players[atkIdx];
    const newHand = p.hand.filter(c => !cards.find(a => a.id === c.id));
    const newTable = cards.map(c => ({ atk: c, def: null, atkBy: atkIdx }));
    const players = g.players.map((pl, i) => i === atkIdx ? { ...pl, hand: newHand } : pl);
    flashLastPlay(p.name, cards, p.isHuman);
    if (sndRef.current) SFX.leave();
    const ids = new Set(cards.map(c => c.id));
    setJustPlaced(ids);
    tm(() => setJustPlaced(new Set()), 1800);
    const g2 = { ...g, players, table: newTable, attackers: [atkIdx], phase: 'defend' };
    commit(g2, M.attack(p.name, cards.map(lblColored).join(', ')));
    goDefend(g2);
  }

  // Palauttaa uuden tilan committoimatta sitä, koska botti kaataa monta korttia peräkkäin
  // ja kutsuja kirjoittaa tilan kerran. Siksi lokirivi menee `lines`-listaan, jonka
  // kutsuja purkaa vasta commitin jälkeen (kompositioauditointi H4).
  function doBeat(g, atkId, defCard, lines = /** @type {string[]} */ ([])) {
    const def = g.players[g.defender];
    const newHand = def.hand.filter(c => c.id !== defCard.id);
    const atkCard = g.table.find(t => t.atk.id === atkId)?.atk;
    const newTable = g.table.map(t => t.atk.id === atkId ? { ...t, def: defCard } : t);
    const players = g.players.map((p, i) => i === g.defender ? { ...p, hand: newHand } : p);

    // Laske pöydän tila: kaadetut/kaatamatta jääneet
    const unbeaten = newTable.filter(t => !t.def).length;
    const beaten = newTable.filter(t => t.def).length;
    const statusMsg = unbeaten > 0 ? t('games.moska.msg.statusOnTable', { beaten, unbeaten }) : t('games.moska.msg.statusAllBeaten');

    lines.push(M.beat(def.name, lblColored(defCard), lblColored(atkCard), statusMsg));
    flashLastPlay(def.name, defCard, def.isHuman);
    if (sndRef.current) SFX.beat();
    return { ...g, players, table: newTable };
  }

  function doPass(g, passCards) {
    const def = g.players[g.defender];
    // Seuraava aktiivinen pelaaja joka ei ole hyökkääjä (sama haku kuin passausehdossa)
    const nextDef = moskaNextDefender(g);
    if (nextDef === null) {
      addLog(M.cannotPass);
      return;
    }
    const newHand = def.hand.filter(c => !passCards.find(pc => pc.id === c.id));
    const newTable = [...g.table, ...passCards.map(c => ({ atk: c, def: null, atkBy: g.defender }))];
    const players = g.players.map((p, i) => i === g.defender ? { ...p, hand: newHand } : p);
    const g2 = {
      ...g, players, table: newTable, defender: nextDef,
      passChain: [...g.passChain, g.defender],
      attackers: [...new Set([...g.attackers, g.defender])],
      phase: 'defend',
    };
    commit(g2, M.pass(def.name, passCards.map(lblColored).join(','), g.players[nextDef].name));
    goDefend(g2);
  }

  function doAdd(g, playerIdx, cards) {
    const p = g.players[playerIdx];
    const newHand = p.hand.filter(c => !cards.find(a => a.id === c.id));
    const newTable = [...g.table, ...cards.map(c => ({ atk: c, def: null, atkBy: playerIdx }))];
    const players = g.players.map((pl, i) => i === playerIdx ? { ...pl, hand: newHand } : pl);
    const ids = new Set(cards.map(c => c.id));
    setJustPlaced(ids);
    tm(() => setJustPlaced(new Set()), 1800);
    const rest = (g.addQueue || []).slice(1);
    const g2 = {
      ...g, players, table: newTable,
      attackers: [...new Set([...g.attackers, playerIdx])],
      addQueue: rest, phase: 'add',
    };
    commit(g2, M.add(p.name, cards.map(lblColored).join(', ')));
    // Jatka lisäysvaiheen jonoa seuraavalle pelaajalle (phase pysyy 'add')
    schedMove(() => processAddQueue(gRef.current), 600);
  }

  // ── Puolustuskierros ──────────────────────────────────────
  function goDefend(g) {
    const def = g.players[g.defender];
    const unbeaten = g.table.filter(t => !t.def).length;
    const unbeatenCards = g.table.filter(t => !t.def).map(t => lblColored(t.atk));
    const beaten = g.table.filter(t => t.def).length;

    if (def.isHuman) {
      addLog(M.defendHuman(unbeaten, unbeatenCards.join(', '), beaten));
    } else {
      addLog(M.defendAI(def.name, unbeaten, unbeatenCards.join(', ')));
      schedAI(() => runAI(gRef.current), 1400);
    }
  }

  // ── Lisäysvaihe ───────────────────────────────────────────
  function startAddPhase(g) {
    const queue = [];
    const nPl = g.players.length;
    for (let i = 0; i < nPl; i++) {
      const idx = (g.primaryAtk + i) % nPl;
      if (idx === g.defender) continue;
      if (g.players[idx].rank !== null) continue;
      if (getAddable(g, idx).length > 0) queue.push(idx);
    }
    // Jos ei ole ketään joka voi lisätä (tai lisää ei-sallittu)
    if (!queue.length) {
      const unbeaten = g.table.filter(t => !t.def).length;
      // Jos puolustajalla on vielä lyömättömiä kortteja, anna hänelle vuoro kaataa ne
      if (unbeaten > 0) {
        const g2 = { ...g, phase: 'defend' };
        commit(g2);
        goDefend(g2);
        return;
      }
      // Kaikki kaadettu - kierros onnistui
      resolveRound(g, true);
      return;
    }

    // Näytä lisäysvaiheen alku
    const tableCards = g.table.map(t => lblColored(t.atk)).join(', ');
    const g2 = { ...g, phase: 'add', addQueue: queue };
    commit(g2, M.addPhase(tableCards));
    processAddQueue(g2);
  }

  function processAddQueue(g) {
    // Kun lisäysvaiheen jono on tyhjä, tarkista onko kaikki pöydän kortit kaadettu
    if (!g.addQueue?.length) {
      const unbeaten = g.table.filter(t => !t.def).length;
      // Jos puolustajalla on vielä lyömättömiä kortteja, anna hänelle vuoro kaataa ne
      if (unbeaten > 0) {
        const g2 = { ...g, phase: 'defend' };
        commit(g2);
        goDefend(g2);
        return;
      }
      // Kaikki kaadettu - kierros onnistui
      resolveRound(g, true);
      return;
    }
    const next = g.addQueue[0];
    const p = g.players[next];
    const addable = getAddable(g, next);
    if (!addable.length) {
      const rest = g.addQueue.slice(1);
      const g2 = { ...g, addQueue: rest };
      commit(g2);
      schedMove(() => processAddQueue(g2), 200);
      return;
    }
    if (p.isHuman) {
      addLog(M.canAdd(p.name, addable.map(lblColored).join(', ')));
      setSelAdd([]);
    } else {
      // AI lisää sivusta — aggressiivisuus riippuu tasosta, korttivalinta suosii pieniä parittomia
      const lvl = botLevelsRef.current?.[next] ?? aiLevelRef.current;
      if (moskaShouldAdd(g, lvl)) {
        const card = aiPickAddCard(addable, p.hand, g.ts);
        addLog(M.aiCanAdd(p.name, addable.map(lblColored).join(', ')));
        if (initShowIntention) {
          const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
          setIntention({ playerIdx: next, cards: [card] });
          schedMove(() => { setIntention(null); doAdd(gRef.current, next, [card]); }, intentionMs);
        } else {
          schedMove(() => { doAdd(gRef.current, next, [card]); }, 900 + Math.random() * 300);
        }
      } else {
        const rest = g.addQueue.slice(1);
        const g2 = { ...g, addQueue: rest };
        commit(g2, M.aiSkips(p.name));
        schedMove(() => processAddQueue(g2), 600);
      }
    }
  }

  // ── AI-pääsilmukka ────────────────────────────────────────
  function runAI(g) {
    if (!g) g = gRef.current;
    if (!g || g.phase === 'gameover') return;
    const { phase, primaryAtk, defender, players, ts } = g;

    if (phase === 'attack') {
      const p = players[primaryAtk];
      if (p.isHuman) return;
      const lvlA = botLevelsRef.current?.[primaryAtk] ?? aiLevelRef.current;
      let cards;
      if (lvlA === 'hard') {
        cards = aiPickAttackSN(p, ts, removedRef.current, {
          deckGone: g.deck.length === 0 && g.trumpCard === null,
          defenderHandSize: players[defender].hand.length,
        });
      } else {
        cards = aiPickAttack(p, players[defender].hand.length, ts);
        // Aloittelija-virhe: hyökkää suurimmalla kortilla eikä pienimmällä
        if (cards.length && aiShouldFumble(lvlA)) {
          const nonTrumps = p.hand.filter(c => c.s !== ts);
          const pool = nonTrumps.length ? nonTrumps : p.hand;
          cards = [[...pool].sort((a, b) => MV(b) - MV(a))[0]];
        }
      }
      if (!cards.length) { resolveRound(g, true); return; }
      if (initShowIntention) {
        const intentionMs = Math.min(1600, Math.max(600, aiDelayRef.current * 0.5));
        setIntention({ playerIdx: primaryAtk, cards });
        schedMove(() => { setIntention(null); doAttack(gRef.current, primaryAtk, cards); }, intentionMs);
        return;
      }
      doAttack(g, primaryAtk, cards);
    }

    if (phase === 'defend') {
      const p = players[defender];
      if (p.isHuman) return;

      // Suunnitelma tulee samasta funktiosta kuin Mestarin neuvo (kompositioauditointi H7).
      // Aloittelija-virhe (valtti vaikka ei-valtti riittäisi) annetaan sille parametrina.
      const lvl = botLevelsRef.current?.[defender] ?? aiLevelRef.current;
      const isSN = lvl === 'hard';

      const passCards = moskaPlanPass(g, defender, lvl);
      if (passCards) {
        schedMove(() => {
          doPass(gRef.current, passCards);
        }, 1000);
        return;
      }
      const plan = moskaPlanBeats(g, defender, aiShouldFumble(lvl));
      if (plan.kind === 'beat') {
        schedMove(() => {
          let cur = gRef.current;
          const beatLines = /** @type {string[]} */ ([]);
          for (const { slot, card } of plan.beats) {
            cur = doBeat(cur, slot.atk.id, card, beatLines);
          }
          commit(cur);
          beatLines.forEach(addLog);
          schedMove(() => startAddPhase(cur), isSN ? 400 : 700);
        }, isSN ? 450 : 900);
      } else {
        // Ei pysty täydelliseen puolustukseen — ottaa heti ilman osittaisia paljastuksia
        schedMove(() => {
          resolveRound(gRef.current, false);
        }, isSN ? 300 : 900 + Math.random() * 300);
      }
    }
  }

  // ── Ihmispelaajan toiminnot ───────────────────────────────
  function humanToggleAtk(card) {
    if (!G || G.phase !== 'attack' || G.primaryAtk !== 0) return;
    setSelAtk(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length > 0 && prev[0].r !== card.r) {
        addLog(M.badSameRank);
        return prev;
      }
      return [...prev, card];
    });
  }

  function humanConfirmAttack() {
    if (!selAtk.length) return;
    const g = gRef.current;
    if (selAtk.length > 6) {
      addLog(M.tooManyCards);
      return;
    }
    if (selAtk.length > g.players[g.defender].hand.length) {
      addLog(M.tooManyVsDef(korttia(g.players[g.defender].hand.length)));
      return;
    }
    const cards = [...selAtk];
    setSelAtk([]);
    opastus.answer(opastusAvain('play', cards.map(c => c.id)));
    doAttack(g, 0, cards);
  }

  function humanSelectTarget(slot) {
    if (!G || G.phase !== 'defend' || G.defender !== 0) return;
    setSelDefTarget(prev => prev?.atk.id === slot.atk.id ? null : slot);
    setSelPass([]);
  }

  function humanBeatWithCard(card) {
    if (!G || G.phase !== 'defend' || G.defender !== 0 || !selDefTarget) return;
    if (!canBeat(selDefTarget.atk, card, G.ts)) {
      addLog(M.cantBeat(lblColored(card), lblColored(selDefTarget.atk)));
      return;
    }
    const g = gRef.current;
    opastus.answer(opastusAvain('play', [card.id]));
    const beatLines = /** @type {string[]} */ ([]);
    let g2 = doBeat(g, selDefTarget.atk.id, card, beatLines);
    setSelDefTarget(null);
    const stillUnbeaten = g2.table.filter(t => !t.def).length;
    commit(g2);
    beatLines.forEach(addLog);
    if (stillUnbeaten === 0) {
      schedMove(() => startAddPhase(gRef.current), 500);
    }
  }

  function humanTake() {
    if (!G || G.phase !== 'defend' || G.defender !== 0) return;
    setSelDefTarget(null); setSelPass([]);
    opastus.answer(opastusAvain('take'));
    resolveRound(gRef.current, false);
  }

  function humanTogglePass(card) {
    if (!G || G.phase !== 'defend' || G.defender !== 0) return;
    if (G.table.some(t => t.def)) { addLog(M.noPassAfterBeat); return; }
    const atkRanks = new Set(G.table.map(t => t.atk.r));
    if (!atkRanks.has(card.r)) { addLog(M.badPassCard(lblColored(card))); return; }
    setSelPass(prev => {
      const has = prev.find(c => c.id === card.id);
      return has ? prev.filter(c => c.id !== card.id) : [...prev, card];
    });
    setSelDefTarget(null);
  }

  function humanConfirmPass() {
    if (!selPass.length) return;
    const cards = [...selPass];
    setSelPass([]);
    opastus.answer(opastusAvain('pass', cards.map(c => c.id)));
    doPass(G, cards);
  }

  function humanToggleAdd(card) {
    if (!G || G.phase !== 'add' || G.addQueue?.[0] !== 0) return;
    const g = gRef.current;
    const addable = getAddable(g, 0);
    if (!addable.find(c => c.id === card.id)) return;
    const maxAdd = getMaxAdd(g);
    setSelAdd(prev => {
      const has = prev.find(c => c.id === card.id);
      if (has) return prev.filter(c => c.id !== card.id);
      if (prev.length >= maxAdd) return prev;
      return [...prev, card];
    });
  }

  function humanConfirmAdd() {
    if (!selAdd.length) { humanSkipAdd(); return; }
    const cards = [...selAdd];
    setSelAdd([]);
    opastus.answer(opastusAvain('play', cards.map(c => c.id)));
    doAdd(gRef.current, 0, cards);
  }

  function humanSkipAdd() {
    const g = gRef.current;
    opastus.answer(opastusAvain('skip'));
    const rest = (g.addQueue || []).slice(1);
    const g2 = { ...g, addQueue: rest };
    commit(g2);
    processAddQueue(g2);
  }

  function continueToNextRound() {
    setAwaitingPlayerContinue(false);

    if (pendingDraw) {
      // Tee nostojen jäljelle jääneet logiikka
      const { drawOrder, deck: initialDeck, tc: initialTc, players, nextAtk, g2 } = pendingDraw;
      let deck = initialDeck, tc = initialTc;
      // Lokirivit odottavat tilaa, ks. resolveRound (kompositioauditointi H4).
      const lines = /** @type {string[]} */ ([]);

      // Tee nosto
      for (const idx of drawOrder) {
        if (players[idx].rank !== null) continue;
        const need = Math.max(0, 6 - players[idx].hand.length);
        if (need > 0) {
          const { drawn, deck: d2, trumpCard: t2 } = drawFrom(deck, tc, need);
          if (drawn.length) {
            players[idx] = { ...players[idx], hand: [...players[idx].hand, ...drawn] };
            lines.push(M.playerDrew(players[idx].name, kortin(drawn.length)));
          }
          deck = d2; tc = t2;
        }
      }

      // Tarkista valmistuneet (pakka voi ehtyä juuri tämän noston aikana —
      // sama tarkistus kuin heti-nosto-polulla, jotta 0-kortin pelaaja ei jää aktiiviseksi)
      const deckGone = deck.length === 0 && tc === null;
      let rankings = [...g2.rankings];
      players.forEach((p, i) => {
        if (p.rank === null && p.hand.length === 0 && deckGone) {
          const rank = rankings.length + 1;
          players[i] = { ...p, rank };
          rankings = [...rankings, i];
          lines.push(rank === 1 ? M.won(p.name) : M.out(p.name));
        }
      });

      const active = players.filter(p => p.rank === null);
      if (active.length <= 1) {
        active.forEach(p => {
          const rank = rankings.length + 1;
          players[p.id] = { ...p, rank };
          rankings = [...rankings, p.id];
          lines.push(M.lost(p.name));
        });
        const ranking = rankings.map((id, pos) => ({
          name: players[id].name, place: pos + 1, isHuman: players[id].isHuman,
        }));
        if (allBotsRef.current) { tm(() => onResult?.({ ranking }), BOT_RESULT_DELAY); }
        else { onResult?.({ ranking }); }
        commit({ ...g2, players, deck, trumpCard: tc, rankings, table: [], phase: 'gameover' });
        lines.forEach(addLog);
        setPendingDraw(null);
        return;
      }

      // Jos noston aikana valmistunut pelaaja oli jo valittu seuraavaksi hyökkääjäksi/puolustajaksi,
      // valitse tilalle seuraava aktiivinen pelaaja
      let finalAtk = nextAtk, finalDef = g2.defender;
      if (players[finalAtk].rank !== null) finalAtk = nextActive(players, finalAtk);
      if (finalDef === finalAtk || players[finalDef].rank !== null) finalDef = nextActive(players, finalAtk);

      // Päivitä g2:n deck ja tc
      const g2Updated = {
        ...g2, players, deck, trumpCard: tc, rankings,
        primaryAtk: finalAtk, defender: finalDef, attackers: [finalAtk],
      };
      commit(g2Updated);
      lines.forEach(addLog);
      setPendingDraw(null);

      // Näytä seuraavan kierroksen viesti
      addLog(M.nextRound(players[finalAtk].name, players[finalDef].name));

      // Aloita seuraava kierros
      if (!g2Updated.players[g2Updated.primaryAtk].isHuman) {
        schedAI(() => runAI(gRef.current), 1600);
      }
    } else {
      const g = gRef.current;
      if (!g || g.phase !== 'attack') return;
      // Aloita seuraava kierros
      if (!g.players[g.primaryAtk].isHuman) {
        schedAI(() => runAI(gRef.current), 1600);
      }
    }
  }

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  // ── Näkymät ───────────────────────────────────────────────
  if (screen === 'select') return (
    <GameStartScreen
      icon={'⚔️'}
      title="MOSKA"
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
  // M-1 (8.9.2026): kierroksen tulosta odottaessa pöytä ja käsi eivät ole klikattavia.
  const isMyAtk  = G.phase === 'attack'  && G.primaryAtk === 0 && !allBots && !awaitingPlayerContinue;
  const isMyDef  = G.phase === 'defend'  && G.defender === 0 && !allBots && !awaitingPlayerContinue;
  const isMyAdd  = G.phase === 'add'     && G.addQueue?.[0] === 0 && !allBots && !awaitingPlayerContinue;
  const myTurn   = isMyAtk || isMyDef || isMyAdd;

  const unbeatenSlots = G.table.filter(t => !t.def);
  const defBeaten     = G.table.filter(t => t.def).length;

  // Voiko siirtää: ehdot ovat moskaCanPassissa, samat ihmiselle ja botille
  const passableRanks = new Set(G.table.map(t => t.atk.r));
  const canPassNow = isMyDef && moskaCanPass(G, 0);

  const humanAddable = isMyAdd ? getAddable(G, 0) : [];

  return (
    <div style={{ background: C.bg, fontFamily: 'Georgia,serif', color: C.text, padding: isMobile ? '6px 8px' : '14px 16px', maxWidth: 580, margin: '0 auto', paddingBottom: isMobile ? 8 : 32, overflowX: 'hidden' }}>

      <ShuffleOverlay visible={shuffling} onDone={() => setShuffling(false)} />

      <TurnPrompt show={myTurn} action={t(isMyDef ? 'ui.turn.moskaDefend' : 'ui.turn.moskaAttack')} />
      <AdviceBubble text={advice?.text || opastus.text} onDismiss={() => { setAdvice(null); opastus.dismiss(); }} />

      {/* Viestikupla */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 10px' : '12px 16px', marginBottom: isMobile ? 6 : 12, minHeight: isMobile ? 44 : 60, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>⚔️</span>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.55, color: C.text }} dangerouslySetInnerHTML={{ __html: msg }}></p>
      </div>

      {/* Yläpalkki: valtti */}
      <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 4 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.trump}55`, background: `${C.trump}0d` }}>
          <span style={{ fontFamily: 'sans-serif', fontSize: 11, color: C.dim }}>{t('ui.shared.trump')}</span>
          <span style={{ fontSize: 18, color: SUIT_COLOR[G.ts], fontWeight: 700 }}>{G.ts}</span>
          {G.trumpCard && <Card card={G.trumpCard} small backStyle={BACKS[cardBack]} />}
        </div>
      </div>

      {/* AI-pelaajien kädet */}
      {G.players.filter((_, i) => allBots || i !== 0).length > 0 && (
        allBots
          ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: isMobile ? 4 : 10 }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => {
                const isAttacking = G.phase === 'attack' && p.id === G.primaryAtk && p.rank === null;
                const isDefending = G.phase === 'defend' && p.id === G.defender && p.rank === null;
                const isAdding    = G.phase === 'add' && G.addQueue?.[0] === p.id && p.rank === null;
                const isActive    = isAttacking || isDefending || isAdding;
                let playableSet = null;
                if (isActive) {
                  if (isAttacking) {
                    const tableRanks = new Set(G.table.flatMap(t => [t.atk.r, t.def?.r].filter(Boolean)));
                    playableSet = new Set(G.table.length === 0
                      ? p.hand.map(c => c.id)
                      : p.hand.filter(c => tableRanks.has(c.r)).map(c => c.id));
                  } else if (isDefending) {
                    const unbeaten = G.table.filter(t => !t.def);
                    playableSet = new Set(p.hand.filter(c => unbeaten.some(s => canBeat(s.atk, c, G.ts))).map(c => c.id));
                  } else if (isAdding) {
                    playableSet = new Set(getAddable(G, p.id).map(c => c.id));
                  }
                }
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.id === G.defender ? C.blue + '55' : p.id === G.primaryAtk ? '#e05c3b55' : C.panelBorder}`, borderRadius: 8, padding: '4px 8px', opacity: p.rank !== null ? 0.35 : 1 }}>
                    <span style={{ minWidth: 64, flexShrink: 0, fontFamily: 'sans-serif', fontSize: 11, color: p.id === G.primaryAtk ? C.red : p.id === G.defender ? C.blue : C.dim }}>
                      {p.id === G.primaryAtk ? '⚔' : p.id === G.defender ? '🛡' : '🤖'} {p.name.slice(0, 8)}{p.rank !== null ? ` ${p.rank}.` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
                      {sortHand(p.hand).map(c => {
                        const isIntended = intention?.playerIdx === p.id && intention.cards?.some(ic => ic.id === c.id);
                        const isPlayable = playableSet?.has(c.id);
                        return <Card key={c.id} card={c} xsmall backStyle={BACKS[cardBack]}
                          selected={isIntended}
                          highlight={!isIntended && isActive && !!isPlayable}
                          dim={!isIntended && isActive && !isPlayable}
                        />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )
          : (
            <div style={{ display: 'flex', gap: 8, marginBottom: isMobile ? 4 : 10, flexWrap: 'wrap' }}>
              {G.players.filter((_, i) => allBots || i !== 0).map(p => (
                <div key={p.id} style={{ flex: 1, minWidth: 80, background: 'rgba(255,255,255,0.03)', border: `1px solid ${p.id === G.defender ? C.blue + '55' : p.id === G.primaryAtk ? '#e05c3b55' : C.panelBorder}`, borderRadius: 10, padding: isMobile ? '5px 8px' : '7px 10px', textAlign: 'center', opacity: p.rank !== null ? 0.35 : 1 }}>
                  <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: p.id === G.primaryAtk ? C.red : p.id === G.defender ? C.blue : C.dim, marginBottom: 4 }}>
                    {p.id === G.primaryAtk ? '⚔' : p.id === G.defender ? '🛡' : '🤖'} {p.name}
                    {p.rank !== null ? ` · sija ${p.rank}` : ''}
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
              ))}
            </div>
          )
      )}

      {/* Pöytä */}
      <PoytaPanel isMobile={isMobile}
        minHeight={{ m: 130, t: 200 }}
        border={G.table.length > 0 ? '#e05c3b33' : C.panelBorder}
        title={<span>{t('ui.shared.tableLabel')} · {G.table.length === 0 ? t('ui.shared.emptyLower') : t('games.moska.ui.pairs', { n: G.table.length })}
          {defBeaten > 0 && <span style={{ color: C.tikki, marginLeft: 8 }}>{t('games.moska.ui.beaten', { n: defBeaten })}</span>}
          {unbeatenSlots.length > 0 && <span style={{ color: C.red, marginLeft: 8 }}>{t('games.moska.ui.unbeaten', { n: unbeatenSlots.length })}</span>}
        </span>}
        right={<PakkaCount count={G.deck.length} flash={pakaAnim} />}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {G.table.map((slot, si) => {
            const isTargeted = selDefTarget?.atk.id === slot.atk.id;
            const cantTarget  = isMyDef && !!selDefTarget && !isTargeted && !slot.def;
            return (
              <div key={si} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <Card card={slot.atk} small                   justPlaced={justPlacedIds.has(slot.atk.id)}
                  highlight={isMyDef && !slot.def && !isTargeted}
                  advice={adv?.targetId === slot.atk.id}
                  selected={isTargeted}
                  dim={cantTarget}
                  onClick={isMyDef && !slot.def ? () => humanSelectTarget(slot) : undefined}
                  backStyle={BACKS[cardBack]}
                />
                {slot.def
                  ? <Card card={slot.def} small backStyle={BACKS[cardBack]} />
                  : <div style={{ width: 50, height: 68, borderRadius: 7, border: '1.5px dashed #1a3a22', opacity: 0.25 }} />
                }
              </div>
            );
          })}
          {G.table.length === 0 && (
            <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, opacity: 0.5, padding: '24px 0' }}>{t('ui.shared.tableEmpty')}</div>
          )}
        </div>
      </PoytaPanel>

      {/* Ohje */}
      {myTurn && (
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: C.dim, marginBottom: 8, fontStyle: 'italic' }}>
          {isMyAtk && t('games.moska.ui.hintAttack')}
          {isMyDef && !selDefTarget && !selPass.length && (canPassNow
            ? t('games.moska.ui.hintDefendCanPass')
            : t('games.moska.ui.hintDefend'))}
          {isMyDef && selDefTarget && <span dangerouslySetInnerHTML={{ __html: t('games.moska.ui.hintDefendTarget', { card: lblColored(selDefTarget.atk) }) }} />}
          {isMyDef && selPass.length > 0 && t('games.moska.ui.hintPass', { cards: selPass.map(lbl).join(',') })}
        </div>
      )}

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
      {/* Pelaaja 0 (ihminen tai botti katselutilassa) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `2px solid ${myTurn ? C.gold + '44' : C.panelBorder}`, borderRadius: 14, padding: isMobile ? '6px 8px' : '12px 14px', marginBottom: isMobile ? 4 : 10, transition: 'border-color 0.2s' }}>
        <div style={{ fontFamily: 'sans-serif', fontSize: 12, color: myTurn ? C.gold : C.dim, marginBottom: 8 }}>
          {allBots ? '🤖' : '👤'} {human.name} {G.primaryAtk === 0 ? '⚔' : G.defender === 0 ? '🛡' : ''}
          {human.rank !== null ? <span style={{ color: C.gold, marginLeft: 6 }}>{t('ui.result.place', { n: human.rank })}</span> : ` · ${t('ui.action.cards', { n: human.hand.length })} ${t('ui.shared.inHand')}`}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sortHand(human.hand).map(c => {
            const isAtkSel      = !!selAtk.find(s => s.id === c.id);
            const isPassSel     = !!selPass.find(s => s.id === c.id);
            const isAddSel      = !!selAdd.find(s => s.id === c.id);
            const canPassCard   = isMyDef && canPassNow && passableRanks.has(c.r);
            const isAddable     = isMyAdd && !!humanAddable.find(a => a.id === c.id);
            const canBeatTarget = isMyDef && !!selDefTarget && canBeat(selDefTarget.atk, c, G.ts);
            const canDef        = isMyDef && !selDefTarget && unbeatenSlots.some(s => canBeat(s.atk, c, G.ts));
            const hlght = !isAtkSel && !isPassSel && !isAddSel && (
              selDefTarget ? canBeatTarget : (canDef || isMyAtk || isAddable || canPassCard)
            );
            const isAdv  = !isAtkSel && !isPassSel && !isAddSel && !!adv?.cardIds?.includes(c.id);
            // Mestarin neuvo päällä: kaikki muu himmenee, jotta osoitettu kortti erottuu
            const dimmed = adv?.cardIds?.length
              ? !isAdv
              : (isMyAdd && !isAddable && !isAddSel)
                || (isMyDef && !!selDefTarget && !canBeatTarget && !isPassSel)
                || (isMyAtk && selAtk.length > 0 && selAtk[0].r !== c.r);
            return (
              <Card key={c.id} card={c} large={!isMobile} small={isMobile}                 selected={!!(isAtkSel || isPassSel || isAddSel)}
                highlight={!!hlght}
                advice={isAdv}
                dim={!!dimmed}
                onClick={
                  isMyAtk ? () => humanToggleAtk(c)
                  : isMyDef ? () => (selDefTarget ? humanBeatWithCard(c) : canPassCard ? humanTogglePass(c) : undefined)
                  : isMyAdd ? () => humanToggleAdd(c)
                  : undefined
                }
                backStyle={BACKS[cardBack]}
              />
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

      {/* Katselutila: pending result overlay */}

      {/* Toimintopainikkeet */}
      <div style={{ minHeight: allBots ? 0 : (isMobile ? 36 : 52), display: 'flex', gap: 8, marginBottom: isMobile ? 6 : 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!allBots && isMyAtk && (
          <>
            <button onClick={humanConfirmAttack} disabled={!selAtk.length}
              style={{ background: selAtk.length ? `linear-gradient(135deg,${C.red},#b83020)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selAtk.length ? C.red : C.panelBorder}`, borderRadius: 10, padding: '10px 20px', color: selAtk.length ? '#fff' : C.dim, fontSize: 13, cursor: selAtk.length ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              {t('games.moska.ui.attack')} {selAtk.length > 0 ? `(${selAtk.map(lbl).join(',')})` : ''}
            </button>
            {selAtk.length > 0 && (
              <button onClick={() => setSelAtk([])} style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {!allBots && isMyDef && (
          <>
            {selPass.length > 0 && (
              <button onClick={humanConfirmPass}
                style={{ background: `rgba(201,168,76,0.12)`, border: `1px solid ${C.gold}55`, borderRadius: 10, padding: '10px 18px', color: C.gold, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                {t('games.moska.ui.passOn')} ({selPass.map(lbl).join(',')}) →
              </button>
            )}
            {!awaitingPlayerContinue && (
              <button onClick={humanTake}
                style={{ background: 'rgba(224,92,59,0.1)', border: `1px solid #e05c3b55`, borderRadius: 10, padding: '10px 18px', color: C.red, fontSize: 13, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
                {t('games.moska.ui.takeCards', { n: G.table.length })}
              </button>
            )}
            {(selDefTarget || selPass.length > 0) && (
              <button onClick={() => { setSelDefTarget(null); setSelPass([]); }}
                style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 12px', color: C.dim, fontSize: 12, cursor: 'pointer' }}>✕</button>
            )}
          </>
        )}
        {!allBots && isMyAdd && (
          <>
            <button onClick={humanConfirmAdd} disabled={!selAdd.length}
              style={{ background: selAdd.length ? `linear-gradient(135deg,${C.gold},#a07830)` : 'rgba(255,255,255,0.04)', border: `1px solid ${selAdd.length ? C.gold : C.panelBorder}`, borderRadius: 10, padding: '10px 18px', color: selAdd.length ? '#0d2118' : C.dim, fontSize: 13, cursor: selAdd.length ? 'pointer' : 'default', fontFamily: 'Georgia,serif' }}>
              {t('games.moska.ui.addSide')} {selAdd.length > 0 ? `(${selAdd.map(lbl).join(',')})` : ''}
            </button>
            <button onClick={humanSkipAdd}
              style={{ background: 'transparent', border: `1px solid ${C.dim}44`, borderRadius: 9, padding: '10px 14px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>
              {t('ui.action.skip')}
            </button>
          </>
        )}

        {!allBots && myTurn && !awaitingPlayerContinue && <><AdviceButton onClick={askAdvice} /><GuideButton onClick={askGuide} /></>}

        {/* Seuraavaan kierrokseen -nappi */}
        {awaitingPlayerContinue && showNextBtn && (
          <button onClick={continueToNextRound}
            style={{ background: `linear-gradient(135deg,${C.gold},#a07830)`, border: 'none', borderRadius: 10, padding: '12px 24px', color: '#0d2118', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Georgia,serif', alignSelf: 'stretch', marginTop: 8 }}>
            Seuraava kierros →
          </button>
        )}
      </div>

      {/* Tilarivi */}
      <GameStatusBar
        soundOn={soundOn} onSoundToggle={() => onSoundOnChange?.(!soundOn)}
        revealAll={revealAll} onRevealToggle={() => { const v = !revealAll; setRevealAll(v); onSeeAllChange?.(v); }}
        isMobile={isMobile}
      >
        <span style={{ color: C.gold, fontWeight: 700 }}>{t('ui.shared.goal')}</span> {t('games.moska.ui.goal')}
      </GameStatusBar>

      {/* Loki */}
      <GameLog log={log} open={logOpen} onToggle={() => onShowLogChange?.(!showLog)}
        accentBg="rgba(224,92,59,0.04)" firstColor="#e8d0c8" />
      <style>{`
        @keyframes slotFlash{0%{box-shadow:0 0 0 3px rgba(201,168,76,0.9),0 0 20px rgba(201,168,76,0.6)}60%{box-shadow:0 0 0 2px rgba(201,168,76,0.5),0 0 10px rgba(201,168,76,0.3)}100%{box-shadow:0 2px 6px rgba(0,0,0,0.3)}}
      `}</style>
    </div>
  );
}
