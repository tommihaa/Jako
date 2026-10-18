// Ruudunlukijalle päätyvät maasymbolit, emojit ja erotinmerkit. Jaettu pelikohtaisen
// vahdin (ruudunlukija-maat.test.jsx) ja App-tason näkymien vahdin
// (ruudunlukija-app.test.jsx) kesken, jotta molemmat tarkistavat saman säännön.
//
// Sallittu muoto on `Spoken` (symboli `aria-hidden`, sana `sr-only`), `Sep`, `aria-hidden`
// tai napin `aria-label`, jossa maa on sanana.

export const SUIT = /[♠♥♦♣]/;
// Rooli tai elementti, jonka nimi tulee `aria-label`ista sisällön sijaan.
const NAMED_BY_LABEL = /^(button|img|link|checkbox|switch|radio|tab|menuitem|option)$/;

/** @param {Element} el */
const labelReplacesContent = el => el.hasAttribute('aria-label')
  && (NAMED_BY_LABEL.test(el.getAttribute('role') ?? '') || ['BUTTON', 'A', 'IMG', 'INPUT', 'SELECT'].includes(el.tagName));

// Kortit yhdeksi muodoksi, jotta sama kohta eri korteilla raportoituu kerran.
/** @param {string} t */
const norm = t => t.replace(/(10|[2-9AJQK])[♠♥♦♣]/g, 'X♠').replace(/\d+/g, 'n').slice(0, 70);

// Kuvamerkki-emoji. Maasymbolit ovat samaa luokkaa, mutta niillä on oma tarkistuksensa yllä.
const EMOJI = /(?![♠♥♦♣])\p{Extended_Pictographic}/u;
// Erotin tai suuntamerkki: TalkBack luki ·:n "rivinkeskinen piste" (J-13 ryhmä 4). Sallittu
// muoto on `Sep`, `Spoken` tai `aria-hidden`.
const SYMBOL = /[·←→›✓×]/;

/** Elementin teksti ilman aria-hidden-haaroja. @param {Element} el */
function spokenText(el) {
  const c = /** @type {Element} */ (el.cloneNode(true));
  c.querySelectorAll('[aria-hidden="true"]').forEach(x => x.remove());
  // Nimetty kuva (kielilistan ✓ "natiivi") kuuluu nimellään eikä merkkinä.
  c.querySelectorAll('[role="img"][aria-label]').forEach(x => { x.textContent = x.getAttribute('aria-label'); });
  return c.textContent ?? '';
}

/** Ruudunlukijalle päätyvät maasymbolit. @param {HTMLElement} root */
export function suitLeaks(root) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const suit = SUIT.test(n.nodeValue ?? ''), emoji = EMOJI.test(n.nodeValue ?? ''), symbol = SYMBOL.test(n.nodeValue ?? '');
    if (!suit && !emoji && !symbol) continue;
    let hidden = false;
    for (let el = n.parentElement; el && el !== root; el = el.parentElement) {
      if (el.getAttribute('aria-hidden') === 'true' || el.tagName === 'STYLE' || labelReplacesContent(el)) { hidden = true; break; }
    }
    // Emoji muussa kuin napissa: pelaajarivien 🤖/👤, vuoron ja roolin merkit ja viestirivin
    // pelikuvake kuuluivat puheessa (J-13, kartoitus 18.10.2026). Nappi tarkistetaan alla.
    const where = (n.parentElement?.closest('button,[role=button]') ?? n.parentElement)?.textContent ?? '';
    const inButton = !!n.parentElement?.closest('button,[role=button]');
    if (!hidden && suit) out.push(`teksti "${norm(where)}"`);
    else if (!hidden && emoji && !inButton) out.push(`emoji tekstissä "${norm(where)}"`);
    else if (!hidden && symbol && !inButton) out.push(`merkki tekstissä "${norm(where)}"`);
  }
  // Chrome Android tekee aria-pressed-elementistä ToggleButtonin ja pudottaa silloin
  // aria-labelin, joten nimi katoaa TalkBackilta (Pixel 8a 15.10.2026, J-12).
  root.querySelectorAll('[aria-pressed][aria-label]').forEach(el => {
    out.push(`aria-pressed ja aria-label samassa "${norm(el.getAttribute('aria-label') ?? '')}"`);
  });
  // Pelkkä ✕ tai muu merkki ilman aria-labelia: TalkBack lukee merkin nimen eikä toimintoa
  // (J-16, 16.10.2026). Näkyvässä tekstissä pitää olla kirjain tai numero.
  // Napin emoji kuuluu puheessa nimenä ("velho"), eikä sitä tarvitse lausua (J-13, Tommin
  // kuuntelu 16.10.2026). Emoji on aria-hidden-kääreessä tai nimi tulee aria-labelista.
  root.querySelectorAll('button,[role=button]').forEach(el => {
    if (el.closest('[aria-hidden="true"]')) return;
    if (el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')) {
      const v = el.getAttribute('aria-label') ?? '';
      if (EMOJI.test(v)) out.push(`emoji napin nimessä "${norm(v)}"`);
      return;
    }
    const text = spokenText(el);
    if (!/[\p{L}\p{N}]/u.test(text)) out.push(`nimetön nappi "${text.trim()}"`);
    else if (EMOJI.test(text)) out.push(`emoji napin puheessa "${norm(text.trim())}"`);
    else if (SYMBOL.test(text)) out.push(`merkki napin puheessa "${norm(text.trim())}"`);
  });
  root.querySelectorAll('[aria-label],[alt],[title]').forEach(el => {
    if (el.closest('[aria-hidden="true"]')) return;
    for (const a of ['aria-label', 'alt', 'title']) {
      const v = el.getAttribute(a);
      if (v && SUIT.test(v)) out.push(`${a} "${norm(v)}"`);
    }
  });
  return out;
}

