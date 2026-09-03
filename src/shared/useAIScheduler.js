import { useRef, useEffect, useState } from 'react';

// Jaettu AI-vuoron ajastin-primitiivi kaikille peleille.
// Kapseloi ajastimen tila + siivous yhteen paikkaan; peli saa kahvan sen
// helpereihin (tm, schedAI) ja refeihin (pausedRef, allBotsRef, aiDelayRef).
//
// Refit palautetaan sellaisenaan, koska pelit kirjoittavat .current jatkuvasti
// (pausedRef.current = next togglePausessa, allBotsRef.current = mode Replayssa).
//
// useState-parit ja togglePause siirtyivät tänne 3.9.2026 (kompositioauditointi H1).
// Ne olivat yhdeksänä kopiona, ja hookin vanha kommentti perusteli jäämistä
// "pelikohtaisella logiikalla" jota oli vain Seiskassa. Se on nyt onResume-optio.
//
//   defaultDelay      — perusviive ja aiDelayMs:n alkuarvo (Seiska 1200, muut 2000)
//   jitter            — satunnaislisä viiveeseen (Paskahousu 300, muut 400)
//   extraTimerRefs    — pelikohtaiset lisä-setTimeout-refit siivottavaksi (esim. [lastPlayTmr])
//   extraIntervalRefs — pelikohtaiset setInterval-refit siivottavaksi (esim. [reactInt])
//   onResume          — ajetaan kun tauko vapautetaan (Seiska jatkaa odottavan siirron)
/**
 * @param {{ defaultDelay?: number, jitter?: number,
 *           extraTimerRefs?: Array<{current: any}>, extraIntervalRefs?: Array<{current: any}>,
 *           onResume?: () => void }} [opts]
 */
export function useAIScheduler({
  defaultDelay = 2000,
  jitter = 400,
  extraTimerRefs = [],
  extraIntervalRefs = [],
  onResume,
} = {}) {
  const aiTmr      = useRef(null);
  const tmrs       = useRef(new Set());
  const pausedRef  = useRef(false);
  const allBotsRef = useRef(false);
  const aiDelayRef = useRef(defaultDelay);

  // Renderiä ohjaavat parit. Refit yllä ovat ajastinlogiikan totuus, nämä ovat sama
  // tieto näytölle; pari pidetään synkassa kirjoittamalla molemmat samassa lauseessa.
  const [paused, setPaused]       = useState(false);
  const [allBots, setAllBots]     = useState(false);
  const [aiDelayMs, setAiDelayMs] = useState(defaultDelay);

  const onResumeRef = useRef(onResume); onResumeRef.current = onResume;
  function togglePause() {
    const next = !pausedRef.current;
    pausedRef.current = next; setPaused(next);
    if (!next) onResumeRef.current?.();
  }

  // Vahditon UI-ajastin — ei pysähdy Tauko-tilassa. Rekisteröi id:n siivousta varten.
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };

  // Kietoo funktion pause-vahtiin: Tauko-tilassa odottaa (recursive wait) ja
  // ajaa fn:n vasta kun tauko vapautetaan. Käytä kun kutsuja hoitaa itse viiveen
  // (aiTmr.current = tm(guard(fn), <oma viive>)) — säilyttää tarkan ajoituksen,
  // toisin kuin schedAI joka laskee viiveen + jitterin itse.
  const guard = fn => () => {
    if (pausedRef.current) { const w = () => { if (!pausedRef.current) fn(); else tm(w, 300); }; w(); return; }
    fn();
  };

  // AI-siirtoajastin — pysähtyy Tauko-tilassa ja skaalautuu bottikamppailun
  // (allBots) säädettävään viiveeseen. Laskee viiveen + jitterin itse.
  const schedAI = (fn, base) => {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    aiTmr.current = tm(guard(fn), d + Math.random() * jitter);
  };

  // Katselutilan aloitus: taso lukitaan ajoksi, ilmoitetaan App:lle (tilastot) ja viive
  // hidastetaan katsottavaksi. Oli yhdeksänä kopiona, ja kolmessa oli lisäksi turha
  // allBotsRef-asetus jonka startGame teki heti perään (kompositioauditointi H1).
  const enterBotBattle = (level, onLevelChange, levelRef, delay = 2000) => {
    if (levelRef) levelRef.current = level;
    onLevelChange?.(level);
    aiDelayRef.current = delay; setAiDelayMs(delay);
  };

  // Pidä viimeisimmät lisärefit tallessa cleanupia varten (peli voi antaa uudet joka renderillä).
  const timerRefsRef    = useRef(extraTimerRefs);    timerRefsRef.current    = extraTimerRefs;
  const intervalRefsRef = useRef(extraIntervalRefs); intervalRefsRef.current = extraIntervalRefs;

  useEffect(() => () => {
    tmrs.current.forEach(clearTimeout);
    clearTimeout(aiTmr.current);
    timerRefsRef.current.forEach(r => r && clearTimeout(r.current));
    intervalRefsRef.current.forEach(r => r && clearInterval(r.current));
  }, []);

  return { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, tm, schedAI, guard,
           paused, setPaused, allBots, setAllBots, aiDelayMs, setAiDelayMs, togglePause,
           enterBotBattle };
}
