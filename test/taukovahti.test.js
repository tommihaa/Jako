// Taukovahti: "botti ei liiku tauolla" oli hookin kommentissa eikä rakenteessa
// (kompositioauditointi H7). Vahdittomalla `tm`:llä ajastettu bottisiirto ohitti
// tauon, ja Moskassa ohitus oli täydellinen: siinä ei ollut yhtään taukotarkistusta.
// Korjaus 5.9.2026 vei siirrot `schedMoven` ja `schedAI`:n taakse, ja tämä testi
// estää paluun. Se lukee lähdetekstiä eikä aja peliä, koska vika on kirjoitusmuoto:
// ajamalla sen näkisi vain jos tauko sattuu juuri oikean ajastimen kohdalle.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd(); // vitestin juuri on projektin juuri
const GAMES_DIR = resolve(ROOT, 'src/games');
const pelit = readdirSync(GAMES_DIR).filter(f => f.endsWith('.jsx'));
const RIVINVAIHTO = String.fromCharCode(10);

// Nimetyt poikkeukset. Molemmat lukevat pausedRefiä itse, ja kummallakin on syy
// joka ei ole bottisiirron ajastus:
//   Kasino  — kierrosten välinen näkymänvaihto katselutilassa, oma cleanup effectissä
//   Seiska  — oma pending-fn-mekanismi joka jatkaa vain VIIMEISIMMÄN siirron
const OMAN_VAHDIN_PELIT = new Set(['Kasino.jsx', 'Seiska.jsx']);

describe('taukovahti (kompositioauditointi H7)', () => {
  it('yksikään peli ei ajasta bottisiirtoa vahdittomaan aiTmr-kirjoitukseen', () => {
    const rikkeet = [];
    for (const peli of pelit) {
      const src = readFileSync(join(GAMES_DIR, peli), 'utf-8');
      src.split('\n').forEach((rivi, i) => {
        if (rivi.includes('aiTmr.current = tm(')) rikkeet.push(`${peli}:${i + 1}`);
      });
    }
    expect(rikkeet).toEqual([]);
  });

  it('taukotarkistus ei palaa käsin kirjoitettuna muihin peleihin', () => {
    const rikkeet = [];
    for (const peli of pelit) {
      if (OMAN_VAHDIN_PELIT.has(peli)) continue;
      const src = readFileSync(join(GAMES_DIR, peli), 'utf-8');
      src.split('\n').forEach((rivi, i) => {
        // startGamen nollaus (`pausedRef.current = false`) on eri asia kuin vahti
        if (/if \(pausedRef\.current/.test(rivi)) rikkeet.push(`${peli}:${i + 1}`);
      });
    }
    expect(rikkeet).toEqual([]);
  });

  it('ajastettu ikkuna ei tikitä tauolla: paljas setInterval vain Seiskan lappulaskurissa', () => {
    // Seiskan neljän sekunnin lappulaskuri koskee ihmisen omaa valintaa, ja efekti
    // palaa heti jos vuorossa oleva ei ole ihminen. Tauko on katselutilan nappi, jossa
    // ihmispelaajaa ei ole, joten laskuri ei voi tikittää tauolla.
    const rikkeet = [];
    for (const peli of pelit) {
      if (peli === 'Seiska.jsx') continue;
      const src = readFileSync(join(GAMES_DIR, peli), 'utf-8');
      src.split(RIVINVAIHTO).forEach((rivi, i) => {
        if (rivi.includes('setInterval(')) rikkeet.push(`${peli}:${i + 1}`);
      });
    }
    expect(rikkeet).toEqual([]);
  });

  it('hookin vahdittu ajastin on olemassa ja kirjoittaa aiTmr.currentin', () => {
    const hook = readFileSync(resolve(ROOT, 'src/shared/useAIScheduler.js'), 'utf-8');
    expect(hook).toMatch(/const schedMove = \(fn, ms\) => \{ aiTmr\.current = tm\(guard\(fn\), ms\)/);
    expect(hook).toMatch(/schedMove\(fn, d \+ Math\.random\(\) \* jitter\)/);
    expect(hook).toMatch(/const schedTick = \(fn, ms\) => setInterval\(\(\) => \{ if \(!pausedRef\.current\) fn\(\); \}, ms\)/);
  });
});
