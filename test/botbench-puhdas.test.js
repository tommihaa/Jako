// Botbench, puhdas sauma — vain Ristiseiska.
//
// Sama mittaus kuin `botbench.test.jsx`, mutta kuljettajana `ristiseiskaEngine.js`:n
// `runHeadless` eikä React-komponentti. Peli maksaa noin 0,1 ms sekuntien sijaan, joten
// otos voi olla satakertainen: N=100000 per pari ajautuu 27 sekunnissa.
//
// MIKSI TÄMÄ ON ERI TIEDOSTO. Komponenttisauma on se jota pelaaja pelaa, joten se on
// mittarin totuus. Tämä on tarkkuusinstrumentti sen rinnalla: se kertoo mihin lukuun
// komponenttisauman pitäisi suppeta, ja sen ainoa peli on Ristiseiska koska muilla
// kahdeksalla ei ole puhdasta saumaa.
//
// RAJOITE JOTA EI PEITETÄ. `test/ristiseiska-saumapari.test.jsx` pitää saumat samaa
// mieltä vain Mestari-tasolla, koska `aiNoise('hard')` on 0 ja peli on silloin tilan
// funktio. Oppipojan ja Kisällin virhearvonta voi haarauttaa saumat, eli parit joissa
// on beginner tai normal EIVÄT ole todennetusti samoja. Ero näiden lukujen ja
// komponenttisauman välillä on siis löydös eikä virhe.
//
// EI aja osana `npm test` -ajoa: suite skipataan ilman PUHDAS-ympäristömuuttujaa.
// Ajo (PowerShell):
//   $env:PUHDAS='1'; npx vitest run test/botbench-puhdas.test.js; Remove-Item Env:PUHDAS
// Valinnaiset: PUHDAS_N (pelejä/pari, oletus 100000), PUHDAS_OUT (JSON-rivien tulostiedosto).

import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { runHeadless } from '../src/games/ristiseiskaEngine.js';

const RUN = !!process.env.PUHDAS;
const N   = parseInt(process.env.PUHDAS_N || '100000', 10);
const OUT = process.env.PUHDAS_OUT || null;

// Eri nimi joka istuimelle, samasta syystä kuin komponenttisaumassa: istuin luetaan
// tuloksen nimestä. Ks. `botbench.test.jsx` NIMET.
const NIMET = ['Alfa', 'Beeta', 'Gamma', 'Delta', 'Epsilon'];
const PAIRS = [['hard', 'beginner'], ['hard', 'normal'], ['normal', 'beginner']];

// Siemennetty PRNG, sama kuin komponenttisaumassa (mulberry32 + FNV-1a).
function strSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let t0 = seed >>> 0;
  return function () {
    let t = (t0 += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(RUN ? describe : describe.skip)('botbench puhdas sauma — Ristiseiska', () => {
  it(`kolme tasoparia (${N} peliä/pari)`, () => {
    for (const [A, B] of PAIRS) {
      let winsA = 0, winsB = 0, ties = 0, stalled = 0;
      let sumA = 0, cntA = 0, sumB = 0, cntB = 0;
      for (let r = 0; r < N; r++) {
        // ABAB / BABA — tasaa istuma- ja aloitusedun, kuten komponenttisaumassa.
        const levels = Array.from({ length: 4 }, (_, i) => ((i + r) % 2 === 0 ? A : B));
        const orig = Math.random;
        Math.random = mulberry32(strSeed(`Ristiseiska|${A}:${B}|${r}`));
        let out;
        try { out = runHeadless({ nP: 4, pool: NIMET, levels }); }
        finally { Math.random = orig; }
        if (!out.ranking) { stalled++; continue; }
        const seatNames = out.g.players.map(p => p.name);
        const lvl = e => levels[seatNames.indexOf(e.name)];
        for (const e of out.ranking) {
          if (lvl(e) === A) { sumA += e.place; cntA++; } else { sumB += e.place; cntB++; }
        }
        const voittajat = new Set(out.ranking.filter(e => e.place === 1).map(lvl));
        if (voittajat.size > 1) ties++;
        else if (voittajat.has(A)) winsA++;
        else winsB++;
      }
      const n = N - stalled;
      const p = (winsA + ties / 2) / n;
      const rec = {
        game: 'Ristiseiska', sauma: 'puhdas', a: A, b: B, n, winsA, winsB, ties, stalled,
        pct: +(100 * p).toFixed(2),
        z: +((p - 0.5) / Math.sqrt(0.25 / n)).toFixed(2),
        meanA: +(sumA / cntA).toFixed(3), meanB: +(sumB / cntB).toFixed(3),
      };
      console.log(`PUHDAS ${A}:${B}  ${rec.pct} %  z=${rec.z}  n=${n}`);
      if (OUT) { try { appendFileSync(OUT, JSON.stringify(rec) + '\n'); } catch { /* ei kaadeta ajoa */ } }
    }
  }, 3_600_000);
});
