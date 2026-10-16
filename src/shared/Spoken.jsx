import { spokenSuits, spokenHtml, hasSuit } from './helpers.js';

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
const EMOJI = /(?![♠♥♦♣])\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;

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
    const suit = hasSuit(children), emoji = hasEmoji(children);
    if (!suit && !emoji) return children;
    say = withoutEmoji(suit ? spokenSuits(children) : children);
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
 * @property {boolean} [gameMessage]  pelin viestirivi: kohdistettava kääre, johon turvaverkko
 *                                    vie kohdistuksen oman siirron jälkeen (focusRescue.js)
 */
/** @param {SpokenHtmlProps} props */
export function SpokenHtml({ html, as: Tag = 'span', style, gameMessage = false }) {
  const said = typeof html === 'string' && hasSuit(html) ? spokenHtml(html) : null;
  const content = (
    <>
      {said && <span className="sr-only">{said}</span>}
      <Tag aria-hidden={said ? 'true' : undefined} style={style} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
  return gameMessage ? <div data-game-message="" tabIndex={-1}>{content}</div> : content;
}
