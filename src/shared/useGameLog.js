import { useState, useRef, useCallback } from 'react';
import { LOG_MAX } from './helpers.js';

// Tapahtumaloki ja katselutilan snapshot yhdessä paikassa.
//
// Oli ennen yhdeksänä kopiona (kompositioauditointi H1): sama aikaleima, sama
// LOG_MAX-leikkaus, sama snapshot-kutsu ja sama kenttäjoukko. Kopioista erosi vain
// se, mitkä kentät kustakin pelitilasta luetaan, ja se on nyt `snapshot`-optio.
//
// Snapshot on tarkoituksella lokin sivuvaikutus, kuten ennenkin. Kutsujärjestys
// (addLog ennen setGS:ää vai sen jälkeen) on eri kysymys ja kuuluu H4:ään; tämä hook
// ei korjaa sitä eikä pahenna sitä.
//
//   onMessage   — pelin oma viestikupla (setMsg_); ajetaan aina, myös tyhjällä
//   skipEmpty   — tyhjä viesti ei tuota lokiriviä (Koputus)
//   onSnapshot  — App:n snapshot-props; ilman sitä snapshotia ei muodosteta
//   isBotBattle — palauttaa true kun ollaan katselutilassa
//   snapshot    — () => ({ players, tableCards, extraText? }) pelin omasta tilasta,
//                 tai null jos tilaa ei vielä ole. Hook lisää step- ja logText-kentät.
/**
 * @param {{ onMessage?: (m: string) => void, skipEmpty?: boolean,
 *           onSnapshot?: (frame: any) => void, isBotBattle?: () => boolean,
 *           snapshot?: () => any }} opts
 */
export function useGameLog({ onMessage, skipEmpty = false, onSnapshot, isBotBattle, snapshot } = {}) {
  const [log, setLog] = useState(/** @type {Array<{t: string, m: string}>} */ ([]));
  const logRef = useRef(/** @type {Array<{t: string, m: string}>} */ ([]));

  // Optiot refin takana, jotta addLog pysyy samana funktiona koko elinkaaren ajan.
  // Läpsy antaa sen useEffectin riippuvuuslistalle, ja uusi identiteetti joka
  // renderillä ajaisi efektin uudelleen.
  const optsRef = useRef({ onMessage, skipEmpty, onSnapshot, isBotBattle, snapshot });
  optsRef.current = { onMessage, skipEmpty, onSnapshot, isBotBattle, snapshot };

  const addLog = useCallback(m => {
    const o = optsRef.current;
    o.onMessage?.(m);
    if (o.skipEmpty && !m) return;
    const t = new Date().toLocaleTimeString('fi', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    logRef.current = [{ t, m }, ...logRef.current].slice(0, LOG_MAX);
    setLog([...logRef.current]);
    if (!o.onSnapshot || !o.isBotBattle?.()) return;
    const fields = o.snapshot?.();
    if (!fields) return;
    o.onSnapshot({ step: logRef.current.length, logText: m, extraText: null, ...fields });
  }, []);

  const resetLog = useCallback(() => { logRef.current = []; setLog([]); }, []);

  return { log, logRef, addLog, resetLog };
}
