import { spokenSuits, spokenHtml, hasSuit } from './helpers.js';

// Näkyvä teksti jossa on maasymboli: symboli näkyy, ruudunlukija kuulee sanan.
// TalkBack lukee ♠:n emojina eikä maana (auditointi J-8, Tommin kuuntelu 15.10.2026).
// Kortti itse sanoo nimensä `Card`issa; tämä on muuta tekstiä varten: napit, pöydän
// rivit, valttimaa ja sääntövalinnat.
//
// Kaksi muotoa:
//   <Spoken>{'Pelaa (2♠)'}</Spoken>      merkkijono, puhuttu muoto johdetaan siitä
//   <Spoken say="pata 2">{<värikäs/>}</Spoken>  JSX, puhuttu muoto annetaan
// Merkkijono ilman maata renderöityy sellaisenaan.
/**
 * @typedef {object} SpokenProps
 * @property {any} children   Näkyvä sisältö
 * @property {string} [say]   Ruudunlukijan teksti; oletuksena lapsi-merkkijonosta johdettu
 */
/** @param {SpokenProps} props */
export default function Spoken({ children, say }) {
  if (say === undefined) {
    if (typeof children !== 'string' || !hasSuit(children)) return children;
    say = spokenSuits(children);
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
 */
/** @param {SpokenHtmlProps} props */
export function SpokenHtml({ html, as: Tag = 'span', style }) {
  const said = typeof html === 'string' && hasSuit(html) ? spokenHtml(html) : null;
  return (
    <>
      {said && <span className="sr-only">{said}</span>}
      <Tag aria-hidden={said ? 'true' : undefined} style={style} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
