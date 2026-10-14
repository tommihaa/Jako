import { useState, useEffect } from 'react';
import { cardName, suitName } from './helpers.js';

// Visuaalisesti piilotettu live-alue. Ilmoittaa ruudunlukijalle pelin tapahtumat
// sitä mukaa kuin ne syntyvät. Aina läsnä, riippumatta siitä onko näkyvä
// tapahtumaloki auki vai kiinni.
//
// Peli ilmoittaa `announce`-funktiolla (useGameLog kutsuu sitä jokaisesta
// lokirivistä). Ennen 14.10.2026 alue luki App:n siirtorekisteriä, jota täytetään
// vain Bottien Taistelussa, joten tavallisessa pelissä ruudunlukija ei kuullut
// mitään (todettu Näkövammaisten liiton vastauksen jälkeen).

/** @type {Set<(text: string) => void>} */
const listeners = new Set();
/** @type {string[]} */
let pending = [];
let flushScheduled = false;

// Lokiteksti voi olla HTML-string tai React-node. Ilmoitetaan vain string-viestit.
// Maasymbolit kirjoitetaan sanoiksi samoin kuin korttien nimet (`cardName`), koska
// TalkBack lukee ♣:n emojina eikä maana (Tommin kuuntelu Pixelillä 14.10.2026).
/** @param {unknown} message */
function toPlain(message) {
  if (typeof message !== 'string') return '';
  return message
    .replace(/<[^>]*>/g, '')
    .replace(/️/g, '')
    .replace(/(10|[2-9AJQK])([♠♥♦♣])/g, (_, r, s) => cardName({ r, s }))
    .replace(/[♠♥♦♣]/g, s => suitName(s))
    .replace(/\s+/g, ' ')
    .trim();
}

// Samassa tahdissa syntyneet viestit (esim. siirto ja sitä seuraava "Vuorossa X.")
// kootaan yhdeksi ilmoitukseksi, koska React näyttäisi niistä vain viimeisen.
/** @param {unknown} message */
export function announce(message) {
  const plain = toPlain(message);
  if (!plain) return;
  pending.push(plain);
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(() => {
    const text = pending.join(' ');
    pending = [];
    flushScheduled = false;
    listeners.forEach(l => l(text));
  }, 0);
}

export default function Announcer() {
  const [text, setText] = useState('');
  useEffect(() => {
    // Sama teksti kahdesti peräkkäin ei muuttaisi aluetta, jolloin ruudunlukija
    // vaikenisi. Vuorotteleva sitova välilyönti tekee toistosta muutoksen.
    /** @param {string} t */
    const l = t => setText(prev => (prev === t ? t + ' ' : t));
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}
    >
      {text}
    </div>
  );
}
