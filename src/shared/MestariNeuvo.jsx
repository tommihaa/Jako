import { useEffect, useRef, useState } from 'react';
import { C } from './colors.js';
import { useT } from './i18n.jsx';

// Kysy Mestarilta neuvoa: pillinappi + vastauskupla. Neuvo lasketaan pelikohtaisella
// puhtaalla getAdvice-funktiolla (aina 'hard'-taso, vain julkista tietoa — botit eivät
// kurki, joten sama logiikka toimii reilusti Heron näkökulmasta). Violetti = Mestarin väri.

export function AdviceButton({ onClick }) {
  const t = useT();
  return (
    <button onClick={onClick}
      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${C.botMode}66`,
        background: 'transparent', color: C.botMode, cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0 }}>
      🧙 {t('ui.advice.ask')}
    </button>
  );
}

export function AdviceBubble({ text, onDismiss }) {
  const t = useT();
  if (!text) return null;
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        margin: '0 auto 8px', padding: '7px 14px', maxWidth: 420,
        border: `1px solid ${C.botMode}66`, borderRadius: 10, background: `${C.botMode}14`,
        fontFamily: 'sans-serif', fontSize: 13, color: C.botMode, textAlign: 'center', lineHeight: 1.35,
      }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0 }}>🧙</span>
      <span><strong style={{ fontWeight: 700 }}>{t('ui.advice.from')}</strong> {text}</span>
      <button onClick={onDismiss} aria-label={t('ui.info.close')}
        style={{ background: 'transparent', border: 'none', color: C.botMode, cursor: 'pointer',
          fontSize: 13, padding: '0 2px', flexShrink: 0, fontFamily: 'sans-serif' }}>
        ✕
      </button>
    </div>
  );
}

// ── Mestarin opastus (docs/MESTARIN_OPASTUS.md, päätös 11.9.2026) ─────────────────────
// Neuvon toinen muoto opetteluun: sama getAdvice, sama kupla, mutta ilman korostusta.
// Pelaaja päättelee siirron itse, ja palaute tulee vasta valinnan jälkeen. Vertailu tehdään
// avaimella, jonka sekä neuvo että pelaajan käsittelijä muodostavat opastusAvaimella.

// Auktoriteettivaraus: pelit joissa Botbench ei näytä Mestarin porrasta Kisälliin.
// Lähde docs/BOTBENCH.md, mittaukset 4.9. ja 8.9.2026 (pari hard vs normal, z alle 2).
// Päivitetään kun kartta mitataan uudelleen, ei muistista.
export const OPASTUS_VARAUS = new Set(['seiska', 'paskahousu']);

// Palautteen kesto millisekunteina. Neuvo vanhenee jokaisesta tilamuutoksesta, mutta
// palaute ei saa kadota bottien siirtoihin, joten sillä on oma ajastin.
const PALAUTE_MS = 8000;

export const opastusAvain = (act, ids = []) => act + ':' + [...ids].map(String).sort().join(',');

export function GuideButton({ onClick }) {
  const t = useT();
  return (
    <button onClick={onClick}
      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px dashed ${C.botMode}66`,
        background: 'transparent', color: C.botMode, cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0 }}>
      🎓 {t('ui.advice.guide')}
    </button>
  );
}

/**
 * @param {string} gameId
 * @param {any} G pelitila; opastus vanhenee siitä kuten neuvo
 * @returns {{ text: string|null, hl: any, ask: (a: any) => void, answer: (key: string) => void, dismiss: () => void }}
 *   text: kuplan teksti (odottava opastus tai palaute), hl: korostettava kohde palautteessa
 *   (sama muoto kuin neuvon tila, vain kun valinta erosi), ask: aloita opastus neuvo-oliolla
 *   jossa on `key`, answer: pelaajan valinnan avain.
 */
export function useOpastus(gameId, G) {
  const t = useT();
  const [pending, setPending] = useState(null);
  const [result, setResult] = useState(null);
  const pendingRef = useRef(null);
  pendingRef.current = pending;

  useEffect(() => { setPending(null); }, [G]);
  useEffect(() => {
    if (!result) return undefined;
    const id = setTimeout(() => setResult(null), PALAUTE_MS);
    return () => clearTimeout(id);
  }, [result]);

  function ask(a) {
    if (!a) return;
    setResult(null);
    setPending(a);
  }
  function answer(key) {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    setPending(null);
    const hit = p.key === key;
    setResult(hit ? { hit, text: t('ui.advice.hit') } : { ...p, hit, text: t('ui.advice.miss') + ' ' + p.text });
  }
  function dismiss() { setPending(null); setResult(null); }

  const varaus = OPASTUS_VARAUS.has(gameId) ? ' ' + t('ui.advice.flat') : '';
  const text = result ? result.text : pending ? pending.text + varaus : null;
  const hl = result && !result.hit ? result : null;
  return { text, hl, ask, answer, dismiss };
}
