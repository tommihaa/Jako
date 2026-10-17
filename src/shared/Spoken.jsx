import { useState } from 'react';
import { skipAnnouncements } from './Announcer.jsx';
import { spokenSuits, spokenFractions, spokenHtml, needsSpoken, EMOJI } from './helpers.js';

// Näkyvä teksti jossa on maasymboli: symboli näkyy, ruudunlukija kuulee sanan.
// TalkBack lukee ♠:n emojina eikä maana (auditointi J-8, Tommin kuuntelu 15.10.2026).
// Kortti itse sanoo nimensä `Card`issa; tämä on muuta tekstiä varten: napit, pöydän
// rivit, valttimaa ja sääntövalinnat.
//
// Kaksi muotoa:
//   <Spoken>{'Pelaa (2♠)'}</Spoken>      merkkijono, puhuttu muoto johdetaan siitä
//   <Spoken say="pata 2">{<värikäs/>}</Spoken>  JSX, puhuttu muoto annetaan
// Merkkijono ilman maata ja emojia renderöityy sellaisenaan.
//
// Emoji näkyy mutta ei kuulu: napin "🧙 Kysy Mestarilta" TalkBack luki "velho, Kysy
// Mestarilta" (auditointi J-13, Tommin kuuntelu 16.10.2026: emojia ei tarvitse lausua).
// Maasymbolit ovat samaa Unicode-luokkaa, mutta ne sanotaan sanoina eikä poisteta.
// Säännöllinen lauseke on `helpers.js`:ssä, koska peliviestin puhuttu muoto käyttää samaa.

/** @param {string} s */
export const hasEmoji = s => s.replace(/[♠♥♦♣]/g, '').search(EMOJI) >= 0;

/** Teksti ilman emojeja, välit siistittyinä. @param {string} s */
export const withoutEmoji = s => s.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();

/**
 * @typedef {object} SpokenProps
 * @property {any} children   Näkyvä sisältö
 * @property {string} [say]   Ruudunlukijan teksti; oletuksena lapsi-merkkijonosta johdettu
 */
/** @param {SpokenProps} props */
export default function Spoken({ children, say }) {
  if (say === undefined) {
    if (typeof children !== 'string') return children;
    const spoken = needsSpoken(children), emoji = hasEmoji(children);
    if (!spoken && !emoji) return children;
    say = withoutEmoji(spoken ? spokenFractions(spokenSuits(children)) : children);
  }
  return (
    <>
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{say}</span>
    </>
  );
}

// HTML-viesti (`lblColored`in värilliset kortit) samalla periaatteella: näkyvä HTML on
// `aria-hidden` ja ruudunlukija saa tagittoman tekstin maat sanoina. Viesti ilman maata
// renderöityy sellaisenaan. Pelien viestilaatikko ja loki käyttävät tätä.
/**
 * @typedef {object} SpokenHtmlProps
 * @property {string} html
 * @property {any} [as]       Elementti, oletuksena span
 * @property {object} [style]
 * @property {boolean} [gameMessage]  pelin viestirivi (`GameMessageRow`)
 */
/** @param {SpokenHtmlProps} props */
export function SpokenHtml({ html, as: Tag = 'span', style, gameMessage = false }) {
  const said = typeof html === 'string' && needsSpoken(html) ? spokenHtml(html) : null;
  const content = (
    <>
      {said && <span className="sr-only">{said}</span>}
      <Tag aria-hidden={said ? 'true' : undefined} style={style} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
  if (!gameMessage) return content;
  return <GameMessageRow said={typeof html === 'string' ? spokenHtml(html) : ''}>{content}</GameMessageRow>;
}

// Pelin viestirivi, johon turvaverkko vie kohdistuksen oman siirron jälkeen (focusRescue.js).
// Kohdistuksen saadessaan rivi jäätyy ruudunlukijalle: se sanoo jonossa odottaneet viestit
// (oma siirto ja sen seuraukset, J-26) tai ilman niitä nykyisen viestin kerran ja pysyy
// samana, vaikka näkyvä viesti vaihtuu. TalkBack lukee kohdistetun kohdan uudelleen sen
// muuttuessa, mutta vain osan muutoksista, joten myöhemmät viestit kuuluvat live-alueelta
// (Tommin valinta 16.10.2026, auditointi J-22).
/**
 * @typedef {object} GameMessageRowProps
 * @property {string} said    rivin puhuttu muoto nyt
 * @property {any} children   näkyvä sisältö
 * @property {any} [as]       elementti, oletuksena div
 * @property {object} [style]
 */
/** @param {GameMessageRowProps} props */
export function GameMessageRow({ said, children, as: Tag = 'div', style }) {
  const [frozen, setFrozen] = useState(/** @type {string | null} */ (null));
  // Kääre ei saa rikkoa sisäkkäisyyttä: <p>:n sisällä span, muuten div (lapsena voi olla <p>).
  const Wrap = Tag === 'p' ? 'span' : 'div';
  return (
    <Tag data-game-message="" tabIndex={-1} style={style}
      onFocus={() => { const pending = skipAnnouncements(); setFrozen(pending.length ? pending.join(' ') : said); }}
      onBlur={() => setFrozen(null)}>
      {frozen !== null && <span className="sr-only">{frozen}</span>}
      <Wrap aria-hidden={frozen !== null ? 'true' : undefined}>{children}</Wrap>
    </Tag>
  );
}
