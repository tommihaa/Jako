import { cardName, groupedCardNames, suitName, RANKS } from './helpers.js';
import { tr } from './i18n.jsx';

// Tilanne-komento ruudunlukijalle (Tommin kuittaus 14.10.2026, Kaanon/docs/
// YHTEYDENOTTO_NKL.md › Grillaus). Näkövammaisten liiton Ville Lammisen kohta 4: koko
// pöytä yhdellä komennolla niin kuin näkevä näkee sen silmäyksellä, kunhan siitä ei saa
// pelillistä etua. Siksi kukin peli antaa tähän vain sen, minkä se näyttää ihmiselle:
// Koputuksessa muistetut kortit ovat "muistissa" eikä niiden arvoa sanota, koska
// näkevänkin on muistettava ne itse.
//
// Peli antaa osat, ja tämä kokoaa niistä yhden lauseen. Järjestys on aina sama:
// vuoro (tai hyökkääjä ja puolustaja), oma käsi, pöytä, muut pinot ja korttimäärät. Puuttuva osa jää pois.

/**
 * @typedef {{ r: string, s: string }} Kortti
 * @typedef {object} StatusParts
 * @property {string} [roles]                      Hyökkääjä ja puolustaja valmiiksi sanottuna (Maija, Moska)
 * @property {string} [turn]                       Vuorossa olevan nimi
 * @property {Kortti[]} [hand]                     Oma käsi, kaikki näkyvissä
 * @property {string[]} [slots]                    Oma rivi paikoittain, valmiiksi sanottuna
 * @property {Kortti} [holding]                    Nostettu kortti joka odottaa päätöstä
 * @property {string[]} [table]                    Pöydän kohteet valmiiksi sanottuna
 * @property {Kortti} [top]                        Poistopakan tai kasan päällimmäinen
 * @property {string} [trump]                      Valttimaan symboli
 * @property {string} [suitReq]                    Vaadittu maa (Seiska)
 * @property {number} [deck]                       Nostopakan koko
 * @property {number} [pile]                       Kasan koko (Paskahousu, Läpsy)
 * @property {{ name: string, n: number }[]} [counts]  Muiden korttimäärät
 */

/**
 * Yksi kortti puhuttuna, esim. "risti seitsemän". Yksiparametrinen, koska sitä käytetään
 * `.map`in kutsuna eikä indeksi saa mennä `cardName`in optioksi.
 * @param {any} c
 */
export const spokenCard = c => cardName(c);

/** Korttilista, saman maan peräkkäiset yhdellä maan nimellä (`groupedCardNames`). @param {Kortti[]} cards */
export const spokenCards = cards => groupedCardNames(cards);

/** Ristiseiskan rivi: maa ja arvoväli, esim. "risti 5–9". @param {string} s @param {number} lo @param {number} hi */
export const spokenRange = (s, lo, hi) => {
  const rank = v => cardName({ r: RANKS[v - 1], s: '' });
  return lo === hi ? `${suitName(s)} ${rank(lo)}` : `${suitName(s)} ${rank(lo)}–${rank(hi)}`;
};

/** @param {StatusParts} p */
export function statusText(p) {
  const out = [];
  if (p.roles) out.push(p.roles);
  if (p.turn) out.push(tr('ui.a11y.turn', { name: p.turn }));
  if (p.hand) out.push(tr('ui.a11y.hand', { cards: p.hand.length ? spokenCards(p.hand) : tr('ui.a11y.none') }));
  if (p.slots) out.push(tr('ui.a11y.slots', { list: p.slots.join(', ') }));
  if (p.holding) out.push(tr('ui.a11y.holding', { card: cardName(p.holding) }));
  if (p.table) out.push(p.table.length ? tr('ui.a11y.table', { cards: p.table.join('; ') }) : `${tr('ui.shared.tableEmpty')}.`);
  if (p.top) out.push(tr('ui.a11y.top', { card: cardName(p.top) }));
  if (p.trump) out.push(tr('ui.a11y.trump', { suit: suitName(p.trump) }));
  if (p.suitReq) out.push(tr('ui.a11y.suitReq', { suit: suitName(p.suitReq) }));
  if (p.deck !== undefined) out.push(tr('ui.a11y.deck', { n: p.deck }));
  if (p.pile !== undefined) out.push(tr('ui.a11y.pile', { n: p.pile }));
  if (p.counts?.length) out.push(tr('ui.a11y.counts', { list: p.counts.map(c => `${c.name} ${c.n}`).join(', ') }));
  return out.join(' ');
}
