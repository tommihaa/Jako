export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const VAL   = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

export const isRed    = s => s === '♥' || s === '♦';
// Lyhentää nimen korttirivejä varten — estää pitkiä nimiä työntämästä kortteja ulos
export const truncName = (name, len = 8) => name && name.length > len ? name.slice(0, len) + '…' : (name || '');
export const lbl    = c => c ? `${c.r}${c.s}` : '—';
// Ruudunlukijalle: maa + arvo (esim. "pata 7" / "spades 7"). Lokalisoitu currentLangin mukaan.
import { getLang } from './i18n.jsx';
import { SUIT_COLOR } from './colors.js';
const SUIT_NAME = {
  fi: { '♠': 'pata',    '♥': 'hertta',  '♦': 'ruutu',     '♣': 'risti' },
  en: { '♠': 'spades',  '♥': 'hearts',  '♦': 'diamonds',  '♣': 'clubs' },
  sv: { '♠': 'spader',  '♥': 'hjärter', '♦': 'ruter',     '♣': 'klöver' },
  de: { '♠': 'Pik',     '♥': 'Herz',    '♦': 'Karo',      '♣': 'Kreuz' },
  no: { '♠': 'spar',    '♥': 'hjerter', '♦': 'ruter',     '♣': 'kløver' },
  da: { '♠': 'spar',    '♥': 'hjerter', '♦': 'ruder',     '♣': 'klør' },
  is: { '♠': 'spaði',   '♥': 'hjarta',  '♦': 'tígull',    '♣': 'lauf' },
  fr: { '♠': 'pique',   '♥': 'cœur',    '♦': 'carreau',   '♣': 'trèfle' },
  es: { '♠': 'picas',   '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' },
  it: { '♠': 'picche',  '♥': 'cuori',   '♦': 'quadri',    '♣': 'fiori' },
  uk: { '♠': 'піки',    '♥': 'черви',   '♦': 'бубни',     '♣': 'трефи' },
  ru: { '♠': 'пики',    '♥': 'черви',   '♦': 'бубны',     '♣': 'трефы' },
  el: { '♠': 'μπαστούνι', '♥': 'κούπα', '♦': 'καρό',      '♣': 'σπαθί' },
  pl: { '♠': 'pik',     '♥': 'kier',    '♦': 'karo',      '♣': 'trefl' },
  et: { '♠': 'poti',    '♥': 'ärtu',    '♦': 'ruutu',     '♣': 'risti' },
  pt: { '♠': 'espadas', '♥': 'copas',   '♦': 'ouros',     '♣': 'paus' },
  krl: { '♠': 'pata',   '♥': 'hertta',  '♦': 'ruutu',     '♣': 'risti' },
  se: { '♠': 'speađa',  '♥': 'váibmu',  '♦': 'ruvdu',     '♣': 'risti' },
  rom: { '♠': 'pika',   '♥': 'ilo',     '♦': 'karo',      '♣': 'treflo' },
  la: { '♠': 'pica',    '♥': 'cor',     '♦': 'rhombus',   '♣': 'trifolium' },
  cs: { '♠': 'piky',    '♥': 'srdce',   '♦': 'káry',      '♣': 'kříže' },
  hu: { '♠': 'pikk',    '♥': 'kőr',     '♦': 'káró',      '♣': 'treff' },
  ro: { '♠': 'pică',    '♥': 'cupă',    '♦': 'caro',      '♣': 'treflă' },
};
const RANK_NAME = {
  fi: { A: 'ässä', J: 'jätkä', Q: 'rouva', K: 'kuningas' },
  en: { A: 'ace',  J: 'jack',  Q: 'queen', K: 'king' },
  sv: { A: 'ess',  J: 'knekt', Q: 'dam',   K: 'kung' },
  de: { A: 'Ass',  J: 'Bube',  Q: 'Dame',  K: 'König' },
  no: { A: 'ess',  J: 'knekt', Q: 'dame',  K: 'konge' },
  da: { A: 'es',   J: 'knægt', Q: 'dame',  K: 'konge' },
  is: { A: 'ás',   J: 'gosi',  Q: 'drottning', K: 'kóngur' },
  fr: { A: 'as',   J: 'valet', Q: 'dame',  K: 'roi' },
  es: { A: 'as',   J: 'jota',  Q: 'reina', K: 'rey' },
  it: { A: 'asso', J: 'fante', Q: 'regina', K: 're' },
  uk: { A: 'туз',  J: 'валет', Q: 'дама',  K: 'король' },
  ru: { A: 'туз',  J: 'валет', Q: 'дама',  K: 'король' },
  el: { A: 'άσος', J: 'βαλές', Q: 'ντάμα', K: 'ρήγας' },
  pl: { A: 'as',   J: 'walet', Q: 'dama',  K: 'król' },
  et: { A: 'äss',  J: 'soldat', Q: 'emand', K: 'kuningas' },
  pt: { A: 'ás',   J: 'valete', Q: 'dama',  K: 'rei' },
  krl: { A: 'ässä', J: 'jätkä', Q: 'rouva', K: 'kuningas' },
  se: { A: 'áhssa', J: 'gánda', Q: 'dronnet', K: 'gonagas' },
  rom: { A: 'aso',  J: 'žandari', Q: 'krajica', K: 'kraj' },
  la: { A: 'as',    J: 'iuvenis', Q: 'regina', K: 'rex' },
  cs: { A: 'eso',   J: 'kluk',   Q: 'dáma',   K: 'král' },
  hu: { A: 'ász',   J: 'bubi',   Q: 'dáma',   K: 'király' },
  ro: { A: 'as',    J: 'valet',  Q: 'damă',   K: 'rege' },
};
const EMPTY = { fi: 'tyhjä', en: 'empty', sv: 'tomt', de: 'leer', no: 'tom', da: 'tom', is: 'tómt', fr: 'vide', es: 'vacío', it: 'vuoto', uk: 'пусто', ru: 'пусто', el: 'άδειο', pl: 'puste', et: 'tühi', pt: 'vazio', krl: 'tyhjä', se: 'gures', rom: 'nango', la: 'vacuus', cs: 'prázdné', hu: 'üres', ro: 'gol' };
// Slaavilaisten kielten 3-muotoinen monikko (1 / 2-4 / 5+).
const slavicPlural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return few;
  return many;
};
// Vastustajien nimet vuorojärjestyksessä ihmisestä seuraavana alkaen (useGameLog,
// optio `opponents`). Taulukon järjestys on istumajärjestys.
/** @param {Array<{ name: string, isHuman?: boolean }> | undefined | null} players */
export const opponentsInTurnOrder = players => {
  if (!players?.length) return [];
  const h = Math.max(0, players.findIndex(p => p.isHuman));
  return [...players.slice(h + 1), ...players.slice(0, h)].filter(p => !p.isHuman).map(p => p.name);
};
/** @param {string} s maasymboli (♠ ♥ ♦ ♣) */
export const suitName = s => SUIT_NAME[getLang()]?.[s] || SUIT_NAME.fi[s] || s;
// Suomessa numero sanotaan perusmuodossa sanana, koska TalkBack taivuttaa numeron
// ympäröivien sanojen mukaan: "ruutu 5" kuului "ruutu viiteen" ja "risti 3" "risti kolmesta"
// (Tommin kuuntelu Pixelillä 16.10.2026, auditointi J-18).
const RANK_WORD = {
  fi: { 1: 'yksi', 2: 'kaksi', 3: 'kolme', 4: 'neljä', 5: 'viisi', 6: 'kuusi', 7: 'seitsemän', 8: 'kahdeksan', 9: 'yhdeksän', 10: 'kymmenen' },
};
// Sama luvulle tekstin keskellä: "paikan 4 korttiin" kuului "paikan neljään korttiin"
// (Tommin kuuntelu 19.10.2026, auditointi J-39). Muut kielet pitävät numeron.
/** @param {number} n */
export const spokenNumber = n => RANK_WORD[getLang()]?.[n] || String(n);
/** @param {any} c kortti { r, s } @param {{ digit?: boolean }} [opts] digit: numero numerona */
export const cardName = (c, { digit = false } = {}) => {
  const L = getLang();
  if (!c) return EMPTY[L] || EMPTY.fi;
  const rank = RANK_NAME[L][c.r] || (!digit && RANK_WORD[L]?.[c.r]) || c.r;
  return `${SUIT_NAME[L][c.s] || ''} ${rank}`.trim();
};
// Emojin esitysvalitsin (U+FE0F) koodina, koska näkymätöntä merkkiä ei erota lähdekoodista.
const VS16 = new RegExp(String.fromCharCode(0xfe0f), 'g');
// Näkyvä teksti ruudunlukijan sanoiksi: kortit nimiksi ("2♠" ja "♠2" → "pata 2") ja yksinäiset
// maat sanoiksi, koska TalkBack lukee maasymbolin emojina eikä maana (Tommin kuuntelu
// Pixelillä 14. ja 15.10.2026, auditointi J-8). Live-alue (`Announcer`) ja `Spoken` käyttävät tätä.
/** @param {string} text */
export const spokenSuits = text => text
  .replace(VS16, '')
  .replace(/(10|[2-9AJQK])([♠♥♦♣])(:?)/g, (_, r, s, colon) => cardName({ r, s }, { digit: !!colon }) + colon)
  .replace(/([♠♥♦♣])(10|[2-9AJQK])(?![\p{L}\d])(:?)/gu, (_, s, r, colon) => cardName({ r, s }, { digit: !!colon }) + colon)
  .replace(/[♠♥♦♣]/g, s => suitName(s));
/** @param {string} text */
export const hasSuit = text => /[♠♥♦♣]/.test(text);
// Suomessa murtoluku sanoiksi: "kaataa 0/2" kuului numeroina, ja oikea luku on "nolla
// kahdesta" (Tommin kuuntelu Pixelillä 16.10.2026, auditointi J-19). Sanoina, koska TalkBack
// taivuttaa numeron itse (J-18). Yli kahdentoista jää numeroiksi.
const NUM_FI = ['nolla', 'yksi', 'kaksi', 'kolme', 'neljä', 'viisi', 'kuusi', 'seitsemän', 'kahdeksan', 'yhdeksän', 'kymmenen', 'yksitoista', 'kaksitoista'];
const NUM_FI_ELATIVE = [, 'yhdestä', 'kahdesta', 'kolmesta', 'neljästä', 'viidestä', 'kuudesta', 'seitsemästä', 'kahdeksasta', 'yhdeksästä', 'kymmenestä', 'yhdestätoista', 'kahdestatoista'];
const FRACTION = /(\d+)\/(\d+)/g;
/** @param {string} text */
export const spokenFractions = text => getLang() !== 'fi' ? text
  : text.replace(FRACTION, (m, a, b) => NUM_FI[+a] && NUM_FI_ELATIVE[+b] ? `${NUM_FI[+a]} ${NUM_FI_ELATIVE[+b]}` : m);
// Erottimet ja suuntamerkit (auditointi J-13 ryhmä 4, Tommin valinta 18.10.2026). TalkBack luki
// väli-·:n "rivinkeskinen piste". Sanojen välinen · tai → kuuluu pilkkuna, pelkkä suuntamerkki
// (← Valikko, Käännä →, avautuvan rivin ›) ja ✓ jäävät pois, ja "×3" kuuluu "3".
const SYMBOL = /[·←→›✓×]/;
/** @param {string} text */
export const hasSymbol = text => SYMBOL.test(text);
/** @param {string} text */
export const spokenSymbols = text => text
  .replace(/×(\d)/g, '$1')
  .replace(/(\S)[  ]*[·→][  ]*(?=\S)/g, '$1, ')
  .replace(/[·←→›✓×]/g, '')
  .replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
/** Tarvitseeko teksti erillisen puhutun muodon: maa, suomen murtoluku tai erotin. @param {string} text */
export const needsSpoken = text => hasSuit(text) || hasSymbol(text) || (getLang() === 'fi' && /\d\/\d/.test(text));
// Lokirivi (HTML-string `lblColored`ista) ruudunlukijan tekstiksi: tagit pois, maat ja
// murtoluvut sanoiksi.
/** @param {string} html */
export const spokenHtml = html => spokenSymbols(spokenFractions(spokenSuits(html.replace(VISUAL_ONLY, '').replace(/<[^>]*>/g, '').replace(EMOJI, '')))).replace(/\s+/g, ' ').trim();

// Emoji ilman maasymboleja. Peliviestin emoji näkyy mutta ei kuulu: TalkBack luki Moskan
// valttivaihdon 💫:n (Tommin kuuntelu 17.10.2026) samoin kuin napin 🧙:n (J-13).
export const EMOJI = /(?![♠♥♦♣])\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic}️?)*/gu;

// Viestin osa jolla on eri muoto silmälle ja korvalle. Näkyvä osa (nuoli, ruksi) on
// `aria-hidden` ja puhuttu `sr-only`; `spokenHtml` jättää näkyvän osan pois, joten live-alue
// ja viestirivi kuulevat vain sanat. TalkBack luki Moskan ❌:n emojina ja Seiskan
// `kortit → päällimmäinen` -rivin kortin kahdesti (Tommin kuuntelu 17.10.2026, J-27 ja J-28).
const VISUAL_ONLY = /<i data-v[^>]*>[\s\S]*?<\/i>/g;
/** @param {string} visual @param {string} spoken */
export const eyeAndEar = (visual, spoken) =>
  `<i data-v aria-hidden="true" style="font-style:normal">${visual}</i><span class="sr-only">${spoken}</span>`;
// Taivutusapurit: suomessa partitiivi/genetiivi, muissa kielissä kieliopillinen monikko
// (ruotsin "kort" muuttumaton: ett kort / två kort; saksa: 1 Karte / n Karten).
// Korttimäärä lokalisoituna. korttia = partitiivi (suomi), kortin = genetiivi (suomi);
// muissa kielissä molemmat = kieliopillinen monikko.
function cardCount(n) {
  switch (getLang()) {
    case 'en': return n === 1 ? '1 card' : `${n} cards`;
    case 'sv': return `${n} kort`;
    case 'no': return `${n} kort`;
    case 'da': return `${n} kort`;
    case 'is': return `${n} spil`;
    case 'de': return n === 1 ? '1 Karte' : `${n} Karten`;
    case 'fr': return n === 1 ? '1 carte' : `${n} cartes`;
    case 'es': return n === 1 ? '1 carta' : `${n} cartas`;
    case 'it': return n === 1 ? '1 carta' : `${n} carte`;
    case 'uk': return `${n} ${slavicPlural(n, 'карта', 'карти', 'карт')}`;
    case 'ru': return `${n} ${slavicPlural(n, 'карта', 'карты', 'карт')}`;
    case 'el': return n === 1 ? '1 χαρτί' : `${n} χαρτιά`;
    case 'pl': return `${n} ${slavicPlural(n, 'karta', 'karty', 'kart')}`;
    case 'et': return n === 1 ? '1 kaart' : `${n} kaarti`;
    case 'pt': return n === 1 ? '1 carta' : `${n} cartas`;
    case 'krl': return n === 1 ? '1 kortti' : `${n} korttie`;
    case 'se':  return n === 1 ? '1 goarta' : `${n} goartta`;
    case 'rom': return n === 1 ? '1 karta' : `${n} karti`;
    case 'la':  return n === 1 ? '1 charta' : `${n} chartae`;
    case 'cs':  return `${n} ${slavicPlural(n, 'karta', 'karty', 'karet')}`;
    case 'hu':  return `${n} kártya`;
    case 'ro':  return n === 1 ? '1 carte' : `${n} cărți`;
    default:   return null; // fi hoidetaan kutsujassa (partitiivi/genetiivi eroaa)
  }
}
export const korttia = n => cardCount(n) ?? (n === 1 ? '1 kortti' : `${n} korttia`);
export const kortin  = n => cardCount(n) ?? (n === 1 ? '1 kortin' : `${n} korttia`);

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Katselutilan tulosviive: kuinka kauan viimeinen siirto jää näkyviin ennen kuin peli
// luovuttaa tuloksen App:lle (bottibanneri). Oli ennen 600, 800, 1200 ja 1800 ilman
// perustelua; yhtenäistetty 3.9.2026 (kompositioauditointi H1).
export const BOT_RESULT_DELAY = 800;

// Lokin pituusraja. Oli ennen 40, 50 tai 60; yhtenäistetty 3.9.2026 samasta syystä.
export const LOG_MAX = 60;

// Korttimerkintä lokiin ja viestikupliin, maan värillä. Palauttaa HTML:ää, joten kutsuja
// renderöi sen dangerouslySetInnerHTML-kentässä. Lukee SUIT_COLORia kutsuhetkellä, koska
// setTwoColorDeck mutatoi paletin paikallaan (ks. colors.js).
// Kasino ei käytä tätä vaan `lbl`ää, koska sen loki on tekstiä eikä HTML:ää.
export const lblColored = c => c ? `<span style="color:${SUIT_COLOR[c.s]}">${c.r}${c.s}</span>` : '—';

// Vastustajien oletusnimet kun App ei anna nimiryhmää (testit ja suora mountti).
// Nimiryhmät ovat playerGroups.js:ssä; tämä on vain varalista.
export const AI_NAMES = ['Fortuna', 'Loki', 'Tyche'];
export const shuffledAINames = pool => shuffle(pool || AI_NAMES);

export function newDeck() {
  return shuffle(SUITS.flatMap(s => RANKS.map(r => ({ s, r, v: VAL[r], id: `${r}${s}_${Math.random()}` }))));
}

// Käden UI-järjestys: maittain (pata→hertta→ruutu→risti), saman maan sisällä val-funktion mukaan.
// val valitaan pelikohtaisesti (esim. handVal Kasinossa, RANK_VAL Ristiseiskassa).
export const SUIT_ORDER = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
export function sortHand(hand, val) {
  return [...hand].sort((a, b) => {
    const sd = SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
    return sd !== 0 ? sd : val(a) - val(b);
  });
}

// AI:n vaikeustaso: noise = todennäköisyys että AI valitsee satunnaisen sallitun
// siirron strategisen sijaan. Käytetään kaikissa peleissä yhtenäisesti.
//   beginner  — 50% virheitä, oppilaalle voitettavissa
//   normal    — 15% virheitä, ihmismäisiä möhläyksiä
//   hard      — 0% virheitä, täysi nykyinen strategia
export function aiNoise(aiLevel) {
  if (aiLevel === 'beginner') return 0.5;
  if (aiLevel === 'normal')   return 0.15;
  return 0;
}
export function aiShouldFumble(aiLevel) {
  return Math.random() < aiNoise(aiLevel);
}

// Tuntemattoman paikan odotusarvo pienimmän summan muistipeleissä. Koputus ja Kultakala
// ovat sisarpelejä: molemmissa botti vertaa varmaa hyötyä (huonoimman tunnetun korvaus)
// odotusarvohyötyyn (tuntemattoman täyttö), ja vertailun toinen puoli lepää tämän luvun
// varassa. Se oli kirjoitettu kahdesti (kompositioauditointi H8, yhtenäistetty 5.9.2026).
// Luku on kortin arvon odotusarvo kun paikasta ei tiedetä mitään.
//
// Koputuksen koputusarvio käyttää eri lukua (hard 6, muut 5) tarkoituksella, eikä sitä saa
// yhtenäistää tähän: se arvioi koko käden summaa koputuspäätöstä varten ja on
// tarkoituksella varovaisempi kuin yksittäisen paikan odotusarvo.
export const UNKNOWN_EV = 7;
