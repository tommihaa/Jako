import { useState, useEffect } from 'react';
import { spokenHtml } from './helpers.js';

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

// Viestit kuuluvat yksi kerrallaan. Ennen ne koottiin samasta tahdista yhdeksi
// ilmoitukseksi, ja pelin alku kuului TalkBackilla yhtenä virtana (Tommin kuuntelu
// Pixelillä 14.10.2026). Seuraava viesti odottaa arvioidun puheajan ja tauon, koska
// live-alue ei kerro milloin ruudunlukija on lopettanut.
const MS_PER_CHAR = 75;
const MIN_SPEECH_MS = 1000;
const GAP_MS = 700;
// Ensimmäinen viesti odottaa, että turvaverkko (focusRescue.js, 50 ms) on ehtinyt viedä
// kohdistuksen viestiriville, jotta alla oleva vaikeneminen näkee sen.
const FIRST_MS = 150;

// Kun kohdistus on pelin viestirivillä, rivi lukee jokaisen uuden viestin itse, koska
// TalkBack lukee kohdistetun kohdan uudelleen sen tekstin vaihtuessa. Live-alue vaikenee,
// muuten viesti kuului kahdesti tai kolmesti (Paskahousu: "Hero risti 4" kolmesti, Tommin
// kuuntelu ja puhetuloste Pixelillä 16.10.2026, auditointi J-22; Tommin valinta).
const rowHasFocus = () => !!document.activeElement?.closest?.('[data-game-message]');

/** @type {string[]} */
let queue = [];
let busy = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let timer = null;

function pump() {
  if (busy || queue.length === 0) return;
  busy = true;
  // Ensimmäinenkin viesti lähtee ajastimella, jottei ilmoitus päivitä Announceria
  // kesken toisen komponentin päivityksen, ja jotta kohdistus ehtii viestiriville.
  timer = setTimeout(() => {
    if (rowHasFocus()) { queue = []; busy = false; timer = null; return; }
    const next = /** @type {string} */ (queue.shift());
    listeners.forEach(l => l(next));
    // Puheajan jälkeen alue tyhjenee. Muuten viimeisin ilmoitus jää saavutettavuuspuuhun
    // ja sivun läpi pyyhkäisy luki sen toiseen kertaan ("Vastustajat vuorojärjestyksessä"
    // kuului kahdesti, auditointi J-9). Tyhjennystä ruudunlukija ei sano.
    timer = setTimeout(() => {
      listeners.forEach(l => l(''));
      timer = setTimeout(() => { busy = false; timer = null; pump(); }, GAP_MS);
    }, Math.max(MIN_SPEECH_MS, next.length * MS_PER_CHAR));
  }, FIRST_MS);
}

// Uusi peli tyhjentää edellisen pelin kuulumattomat viestit (useGameLog.resetLog).
export function clearAnnouncements() {
  queue = [];
  if (timer) clearTimeout(timer);
  timer = null;
  busy = false;
}

// Sitova välilyönti (U+00A0) koodina, koska näkymätöntä merkkiä ei erota lähdekoodista.
const NBSP = String.fromCharCode(0xa0);

// Lokiteksti voi olla HTML-string tai React-node. Ilmoitetaan vain string-viestit.
// Maasymbolit kirjoitetaan sanoiksi (`spokenHtml`), koska TalkBack lukee ♣:n emojina
// eikä maana (Tommin kuuntelu Pixelillä 14.10.2026).
/** @param {unknown} message */
function toPlain(message) {
  if (typeof message !== 'string') return '';
  return spokenHtml(message);
}

// Jokainen viesti päättyy välimerkkiin, jotta puhe laskee sävelkorkeuden ja
// pysähtyy myös silloin kun lokirivi ei itse pääty pisteeseen ("(avaa maan)").
/** @param {unknown} message */
export function announce(message) {
  const plain = toPlain(message);
  if (!plain || rowHasFocus()) return;
  queue.push(/[.!?…]$/.test(plain) ? plain : plain + '.');
  pump();
}

export default function Announcer() {
  const [text, setText] = useState('');
  useEffect(() => {
    // Sama teksti kahdesti peräkkäin ei muuttaisi aluetta, jolloin ruudunlukija
    // vaikenisi. Vuorotteleva sitova välilyönti tekee toistosta muutoksen.
    /** @param {string} t */
    const l = t => setText(prev => (prev === t ? t + NBSP : t));
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
