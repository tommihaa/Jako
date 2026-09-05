// Botti ja Mestarin neuvo kutsuvat samaa valintafunktiota (kompositioauditointi H7).
// Auditointi mittasi 3.9.2026 että väite piti seitsemässä pelissä yhdeksästä: Kasinon
// `getAdvice` oli 48 rivin peilikuva `runAI`n Mestari-haarasta omalla
// prioriteettijärjestyksellään, ja Moskan puolustussilmukka oli kopio. Korjaus 5.9.2026
// nosti valinnan omiksi moduulitason funktioikseen, ja tämä testi estää paluun.
//
// Testi lukee lähdetekstiä eikä aja peliä. Syy on sama kuin taukovahdilla: kopio ei ole
// väärä vastaus vaan sama vastaus kahdesta paikasta, joten ajamalla sen näkisi vasta kun
// kopiot ovat jo eriytyneet. Silloin havainto olisi bugi eikä rakennevirhe.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const GAMES_DIR = resolve(process.cwd(), 'src/games');
const lue = peli => readFileSync(join(GAMES_DIR, peli), 'utf-8');
// Kommenttirivi ei kelpaa kynnyksen osumaksi. Se selittää kynnyksen eikä aja sitä.
const koodirivit = src => src.split('\n').filter(r => !r.trimStart().startsWith('//'));

// `export function getAdvice` ensimmäiseen sarakkeen 0 sulkevaan aaltosulkeeseen asti.
function adviceBody(src) {
  const alku = src.indexOf('export function getAdvice');
  expect(alku).toBeGreaterThan(-1);
  const loppu = src.indexOf('\n}', alku);
  expect(loppu).toBeGreaterThan(alku);
  return src.slice(alku, loppu);
}

describe('neuvon ja botin yhteinen sauma (kompositioauditointi H7)', () => {
  it('Kasinon neuvo kutsuu valintafunktiota eikä laske siirtoa itse', () => {
    const body = adviceBody(lue('Kasino.jsx'));
    expect(body).toContain('kasinoChooseMove(');
    // Nämä ovat valinnan osia. Jos jokin niistä ilmestyy neuvoon, prioriteettijärjestys
    // on kirjoitettu toiseen kertaan ja voi ajautua botista erilleen.
    for (const osa of ['findBestCapture(', 'findAIBuild(', 'findTableBonus(', 'pAnyOpponentHas(', 'pickTrail(']) {
      expect(body).not.toContain(osa);
    }
  });

  it('Kasinon rakennuskynnys on kirjoitettu yhteen paikkaan', () => {
    const src = lue('Kasino.jsx');
    const osumat = koodirivit(src).filter(r => r.includes('<= 0.5'));
    expect(osumat).toHaveLength(1);
  });

  it('Moskan neuvo kutsuu samaa puolustus- ja lisäyssuunnitelmaa kuin botti', () => {
    const body = adviceBody(lue('Moska.jsx'));
    expect(body).toContain('moskaPlanDefense(');
    expect(body).toContain('moskaShouldAdd(');
    // Puolustussilmukan ja lisäyskynnyksen osat eivät saa palata neuvoon.
    for (const osa of ['aiPickDefense(', 'aiPickPass(', 'moskaCanPass(']) {
      expect(body).not.toContain(osa);
    }
  });

  it('Moskan lisäyskynnys on kirjoitettu yhteen paikkaan', () => {
    const src = lue('Moska.jsx');
    const osumat = koodirivit(src).filter(r => r.includes('def.hand.length >= 2'));
    expect(osumat).toHaveLength(1);
  });

  it('Kasinon ja Moskan botti ajaa saman funktion kuin neuvo', () => {
    // Kuljettajan on kutsuttava valintaa, ei toistettava sitä. Ilman tätä edellinen
    // tarkistus menisi läpi myös silloin kun kopio siirtyy neuvosta bottiin.
    expect(lue('Kasino.jsx')).toContain('kasinoChooseMove(g, playerIdx, buildCap, level)');
    const moska = lue('Moska.jsx');
    expect(moska).toContain('moskaPlanPass(g, defender, lvl)');
    expect(moska).toContain('moskaPlanBeats(g, defender, aiShouldFumble(lvl))');
    expect(moska).toContain('moskaShouldAdd(g, lvl)');
  });
});
