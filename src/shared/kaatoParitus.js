// Ihmisen kaatotapa Maijassa ja Moskassa (Tommin päätös 23.10.2026, MAIJA.md ja MOSKA.md ›
// Ihmisen kaatotapa). Puolustaja valitsee kaatavat kortit kerralla, ja tämä funktio parittaa
// ne pöydän kortteihin. Säännöt järjestyksessä:
//   1. kaadetaan niin monta pöydän korttia kuin valinnalla voi
//   2. tasatilanteessa pienin pöydän kortti kaatuu ensin (nostettavaksi jäävät suuret)
//   3. kaatoon käytetään mieluiten pienimmät valitut kortit, loput jäävät käteen
// Kumpikin valinta on transversaalimatroidin ahne valinta: kohde tai kortti otetaan mukaan,
// jos joukko on yhä kokonaan paritettavissa. Ahne järjestys antaa siksi sekä suurimman
// määrän että halutun etusijan. Pöydässä on enintään kuusi korttia, joten Kuhnin
// lisäyspolkuhaku riittää.

/**
 * @template A, D
 * @param {A[]} targets   kaatamattomat pöydän kortit
 * @param {D[]} cards     pelaajan valitsemat kortit
 * @param {(target: A, card: D) => boolean} canBeat
 * @param {(c: A | D) => number} value  järjestysarvo (valtti suurempi kuin muut)
 * @returns {{ pairs: { target: A, card: D }[], unused: D[] }}
 */
export function kaatoParitus(targets, cards, canBeat, value) {
  const tOrder = [...targets.keys()].sort((a, b) => value(targets[a]) - value(targets[b]));
  const cOrder = [...cards.keys()].sort((a, b) => value(cards[a]) - value(cards[b]));

  // Paritus kohdejoukolle T korttijoukosta C, tai null jos kaikkia ei voi parittaa.
  // Palauttaa kartan kohdeindeksi → korttiindeksi.
  function match(T, C) {
    /** @type {Map<number, number>} */
    const cardOwner = new Map(); // korttiindeksi → kohdeindeksi
    function tryAssign(ti, seen) {
      for (const ci of C) {
        if (seen.has(ci) || !canBeat(targets[ti], cards[ci])) continue;
        seen.add(ci);
        const owner = cardOwner.get(ci);
        if (owner === undefined || tryAssign(owner, seen)) { cardOwner.set(ci, ti); return true; }
      }
      return false;
    }
    for (const ti of T) if (!tryAssign(ti, new Set())) return null;
    return new Map([...cardOwner].map(([ci, ti]) => [ti, ci]));
  }

  const T = [];
  for (const ti of tOrder) if (match([...T, ti], cOrder)) T.push(ti);

  // Korttien etusija: pienin ensin. Kortti otetaan, jos valittu korttijoukko yhä peittää
  // jonkin T:n osajoukon täysin, eli sille löytyy paritus kohteisiin T.
  const used = [];
  for (const ci of cOrder) {
    if (used.length === T.length) break;
    if (matchCards([...used, ci])) used.push(ci);
  }
  function matchCards(C) {
    // Sama haku käännettynä: jokainen kortti C:stä saa eri kohteen T:stä.
    /** @type {Map<number, number>} */
    const targetOwner = new Map();
    function tryAssign(ci, seen) {
      for (const ti of T) {
        if (seen.has(ti) || !canBeat(targets[ti], cards[ci])) continue;
        seen.add(ti);
        const owner = targetOwner.get(ti);
        if (owner === undefined || tryAssign(owner, seen)) { targetOwner.set(ti, ci); return true; }
      }
      return false;
    }
    return C.every(ci => tryAssign(ci, new Set()));
  }

  const final = match(T, used) ?? new Map();
  const usedSet = new Set(final.values());
  return {
    pairs: T.map(ti => ({ target: targets[ti], card: cards[/** @type {number} */ (final.get(ti))] })),
    unused: cards.filter((_, ci) => !usedSet.has(ci)),
  };
}
