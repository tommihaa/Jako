import { GAME_TITLE_ID } from './GameStartScreen.jsx';

// Kohdistuksen turvaverkko (auditointi J-9, Tommin päätös 16.10.2026).
//
// Kun painettu nappi katoaa ruudulta (Pelaa, Nosta kasa, pelattu kortti), kohdistus putoaa
// sivun juureen, ja TalkBack lukee koko sivun yhtenä pötkönä emojeineen. Mitattu Pixel
// 8a:lla: pelin alussa näin kävi Aloita-napille, ja Tommin kuuntelussa 1.2.237:llä sama
// toistui ensimmäisen pelatun kortin jälkeen.
//
// Tommin valinta paikasta: oman käden pienin valittava kortti. Jos yhtäkään ei voi valita
// (heti oman siirron jälkeen on vastustajien vuoro), käden pienin kortti. Jos omia
// näkyviä kortteja ei ole (tyhjä käsi, Kultakala ja Koputus kuvapuoli alas, Läpsy),
// pelin nimi otsikkorivillä. Pienin luetaan pelin omasta järjestyksestä (`mineValue`):
// Maijassa ja Moskassa valtti on viimeinen, koska pieni valttikin on arvokas (Tommin
// kuuntelu 16.10.2026).

/** @param {ParentNode} [root] */
export function rescueTarget(root = document) {
  const mine = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('[data-mine]')]);
  if (mine.length) {
    const selectable = mine.filter(el => el.getAttribute('role') === 'button'
      && el.getAttribute('aria-disabled') !== 'true');
    const pool = selectable.length ? selectable : mine;
    return pool.reduce((a, b) => Number(b.dataset.value) < Number(a.dataset.value) ? b : a);
  }
  return document.getElementById(GAME_TITLE_ID);
}

// Viive ennen tarkistusta, jotta tarkoituksellinen siirto ehtii ensin (GameStartScreen vie
// kohdistuksen pelin nimeen 0 ms:n ajastimella). Turvaverkko ei ohita sitä.
const RESCUE_DELAY_MS = 50;

/** @param {EventTarget | null} t */
const interactive = t => t instanceof Element
  ? /** @type {HTMLElement} */ (t.closest('button,[role="button"],a,[tabindex]') ?? t)
  : null;

// Paneelin avaaja (tarkistus 16.10.2026 ennen J-14:n kuuntelua). Asetusten, Mestarin kuplan
// ja muiden paneelien sulkunappi katoaa paneelin mukana, ja ilman tätä kohdistus meni
// pienimpään korttiin. APG:n disclosure- ja dialogimallissa kohdistus palaa avaajaan.
// Napautuksen samassa tahdissa lisätyt solmut muistavat napautetun elementin. Irrotetun
// solmun vanhempiketju säilyy irrotettuun juureen asti, joten avaaja löytyy vielä katoamisen
// jälkeen. Pelin tilasta ilmestyneillä napeilla (Nosta kasa) avaajaa ei ole, ja pelatun
// kortin avaama Pelaa-nappi löytää avaajan, joka on itse kadonnut.
/** @type {WeakMap<Node, HTMLElement>} */
const openers = new WeakMap();

/** @param {Node | null} n */
function openerOf(n) {
  for (; n; n = n.parentNode) {
    const o = openers.get(n);
    if (o) return o.isConnected ? o : null;
  }
  return null;
}

// Asentaa kuuntelijat kerran; palauttaa purkufunktion. Viimeisin napautettu tai kohdistettu
// elementti muistetaan, koska TalkBackin kaksoisnapautus ei aina anna DOM-kohdistusta.
export function installFocusRescue() {
  /** @type {HTMLElement | null} */
  let last = null;
  /** @type {HTMLElement | null} */
  let clicked = null;
  /** @param {Event} e */
  const note = e => { last = interactive(e.target); };
  /** @param {Event} e */
  const noteClick = e => {
    note(e);
    clicked = last;
    // React piirtää napautuksen seuraukset saman tapahtuman aikana, ja MutationObserver
    // ilmoittaa ne mikrotehtävänä ennen tätä ajastinta.
    setTimeout(() => { clicked = null; }, 0);
  };
  document.addEventListener('focusin', note, true);
  document.addEventListener('click', noteClick, true);
  const mo = new MutationObserver(records => {
    if (clicked) {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (!n.contains(clicked)) openers.set(n, /** @type {HTMLElement} */ (clicked));
        }
      }
    }
    if (!last || last.isConnected) return;
    const opener = openerOf(last);
    last = null;
    setTimeout(() => {
      const a = document.activeElement;
      if (a && a !== document.body && a.isConnected) return;
      (opener?.isConnected ? opener : rescueTarget())?.focus({ preventScroll: true });
    }, RESCUE_DELAY_MS);
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => {
    document.removeEventListener('focusin', note, true);
    document.removeEventListener('click', noteClick, true);
    mo.disconnect();
  };
}
