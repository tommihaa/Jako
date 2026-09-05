import { useRef, useEffect, useState } from 'react';

// Jaettu AI-vuoron ajastin-primitiivi kaikille peleille.
// Kapseloi ajastimen tila + siivous yhteen paikkaan; peli saa kahvan sen
// helpereihin (schedMove, schedAI, tm) ja refeihin (pausedRef, allBotsRef, aiDelayRef).
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
  const [paused, setPausedState]  = useState(false);
  const [allBots, setAllBots]     = useState(false);
  const [aiDelayMs, setAiDelayMs] = useState(defaultDelay);

  // Tauolla lauenneet siirrot, ks. guard. Uusi peli nollaa jonon: startGame purkaa
  // tauon suoraan (`pausedRef.current = false; setPaused(false)`) eikä togglePausen
  // kautta, joten ilman tätä edellisen pelin siirto ajettaisiin seuraavassa tauossa.
  const pendingMoves = useRef(/** @type {Array<() => void>} */ ([]));
  const setPaused = value => { if (value === false) pendingMoves.current = []; setPausedState(value); };

  // Tauolla vietetty aika yhteensä. Reaktioaikaa mittaava peli (Läpsy) vähentää tämän
  // omasta mittauksestaan, koska seinäkello käy tauolla mutta pelaaja ei reagoi.
  // Ilman vähennystä tauko keskellä täsmäystä kirjasi lokiin 49999 ms (mitattu 5.9.2026).
  const pausedTotalMs = useRef(0);
  const pauseStartedAt = useRef(0);

  const onResumeRef = useRef(onResume); onResumeRef.current = onResume;
  function togglePause() {
    const next = !pausedRef.current;
    const odottavat = pendingMoves.current; // luettava ennen setPausedia, joka tyhjentää jonon
    pausedRef.current = next; setPaused(next);
    if (next) pauseStartedAt.current = performance.now();
    else {
      pausedTotalMs.current += performance.now() - pauseStartedAt.current;
      odottavat.forEach(fn => fn());
      onResumeRef.current?.();
    }
  }

  // Vahditon ajastin VAIN UI:lle: animaatiot, viestikuplan häivytys, korostuksen
  // nollaus. Ei pysähdy Tauko-tilassa, koska tauko pysäyttää pelin eikä ruudun.
  // Bottisiirtoa ei ajasteta tällä vaan schedMovella tai schedAI:lla, jotka
  // vievät invariantin "botti ei liiku tauolla" rakenteeseen (H7, 5.9.2026).
  // Rekisteröi id:n siivousta varten.
  const tm = (fn, ms) => { const id = setTimeout(fn, ms); tmrs.current.add(id); return id; };

  // Kietoo funktion pause-vahtiin. Tauolla lauennut siirto siirtyy jonoon ja ajetaan
  // siinä järjestyksessä kun tauko vapautetaan, eli samassa järjestyksessä kuin ilman
  // taukoa mutta yhteen hetkeen puristettuna.
  //
  // Kaksi hylättyä muotoa 5.9.2026, molemmat mitattuina. Polkeva odotus
  // (`tm(w, 300)` kunnes tauko loppuu) päästi odottajat purkautumaan eri aikoina, ja
  // Maija jumittui. Yksi odottava siirto Seiskan pendingFnRefin tapaan taas hukkasi
  // askeleen aina kun toinen ehti tauolle ennen sitä, ja Kultakala jumittui.
  // Askelta ei saa hukata, koska ketjun seuraava askel ajastetaan vasta edellisessä.
  //
  // Tauottomassa ajossa fn ajetaan heti kuten ennenkin, joten bottimittarit eivät muutu.
  // Sisäinen; pelit saavat vahdin valmiina schedMoven ja schedAI:n kautta.
  const guard = fn => () => {
    if (pausedRef.current) { pendingMoves.current.push(fn); return; }
    fn();
  };

  // Bottisiirron ajastin kun kutsuja hoitaa itse viiveen (animaation kesto,
  // vaihekohtainen tahti). Säilyttää tarkan ajoituksen, toisin kuin schedAI joka
  // laskee viiveen + jitterin itse. Kirjoittaa aiTmr.currentin, joten siirto
  // peruuntuu samalla tavalla kuin schedAI:lla.
  const schedMove = (fn, ms) => { aiTmr.current = tm(guard(fn), ms); return aiTmr.current; };

  // AI-siirtoajastin — pysähtyy Tauko-tilassa ja skaalautuu bottikamppailun
  // (allBots) säädettävään viiveeseen. Laskee viiveen + jitterin itse.
  const schedAI = (fn, base) => {
    const d = allBotsRef.current ? aiDelayRef.current : base;
    schedMove(fn, d + Math.random() * jitter);
  };

  // Vahdittu intervalli. Tauolla tikki jätetään väliin kokonaan eikä jonoon, koska
  // tikki mittaa kulunutta aikaa: jonottaminen purkaisi tauon ajan kertyneet tikit
  // yhtenä ryöppynä ja ikkuna sulkeutuisi heti. Väliin jättäminen tarkoittaa että
  // ajastettu ikkuna (Koputuksen reaktiolaskuri, Paskahousun äkkikuolema) jatkaa
  // siitä mihin jäi.
  //
  // Tarpeen syy on mitattu 5.9.2026: pelkkä bottisiirron vahtiminen ei riitä, koska
  // paljas setInterval sulki reaktioikkunan tauon aikana ja siirsi vuoron
  // vanhentuneella pelitilalla. Koputus jumittui siitä. Palauttaa saman id:n kuin
  // setInterval, joten clearInterval kutsupaikassa toimii ennallaan.
  const schedTick = (fn, ms) => setInterval(() => { if (!pausedRef.current) fn(); }, ms);

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

  return { aiTmr, tmrs, pausedRef, allBotsRef, aiDelayRef, pausedTotalMs, tm, schedMove, schedAI, schedTick, guard,
           paused, setPaused, allBots, setAllBots, aiDelayMs, setAiDelayMs, togglePause,
           enterBotBattle };
}
