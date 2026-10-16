import { useEffect, useRef } from 'react';
import { C } from './colors.js';
import { useT } from './i18n.jsx';
import { announce, clearAnnouncements } from './Announcer.jsx';

// Pelinäkymän tilarivi: vasemmalla tavoiteteksti, oikealla äänikytkin ja
// avoimet kortit -kytkin.
//
// Oli yhdeksänä kopiona (kompositioauditointi H1). Erot olivat Läpsyn punainen
// korostus, Kasinon lisänappi ja se ettei Kasinolla ole tavoitetekstiä lainkaan.
// Ne ovat nyt propseja; tavoiteteksti tulee lapsina, koska Seiskassa se on rikas
// rivi jossa on pakan tila ja vaadittu maa.
/**
 * @typedef {object} GameStatusBarProps
 * @property {any} [children]              Vasen puoli, tavoiteteksti
 * @property {any} [extras]                Lisänapit ennen äänikytkintä (Kasino)
 * @property {boolean} soundOn
 * @property {() => void} onSoundToggle
 * @property {boolean} revealAll
 * @property {() => void} onRevealToggle
 * @property {string} [accent]             Korostusväri (Läpsy käyttää punaista)
 * @property {boolean} [isMobile]
 * @property {boolean} [borderTop]         Läpsyssä ei yläviivaa
 * @property {() => string} [status]       Tilanne ruudunlukijalle (a11yStatus.js)
 */
/** @param {GameStatusBarProps} props */
export default function GameStatusBar({
  children, extras, soundOn, onSoundToggle, revealAll, onRevealToggle,
  accent = C.gold, isMobile = false, borderTop = true, status,
}) {
  const t = useT();
  // Tilanne-komento (Tommin kuittaus 14.10.2026): ruudunlukijalle näkyvä nappi ja
  // H-näppäin. Tilanne vanhenee heti, joten se korvaa jonon eikä odota sitä.
  const statusRef = useRef(status);
  statusRef.current = status;
  const speak = () => {
    const text = statusRef.current?.();
    if (!text) return;
    clearAnnouncements();
    announce(text);
  };
  useEffect(() => {
    if (!status) return undefined;
    /** @param {KeyboardEvent} e */
    const onKey = e => {
      if (e.key !== 'h' && e.key !== 'H') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = /** @type {HTMLElement | null} */ (e.target)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      speak();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [!!status]);
  const btn = (on, border) => ({
    fontSize: 11, padding: '5px 10px', borderRadius: 12,
    border: `1px solid ${on ? accent + '55' : border}`,
    background: 'transparent', color: on ? accent : C.dim,
    cursor: 'pointer', fontFamily: 'sans-serif',
  });
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
      paddingTop: borderTop ? (isMobile ? 4 : 10) : 0,
      borderTop: borderTop ? `1px solid ${C.panelBorder}` : undefined,
      marginBottom: isMobile ? 4 : 10,
    }}>
      {status && (
        <button className="sr-only sr-focusable" title="H" onClick={speak}
          style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, border: `1px solid ${C.panelBorder}`, background: 'transparent', color: accent, fontFamily: 'sans-serif' }}>
          {t('ui.a11y.statusButton')}
        </button>
      )}
      <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}>{children}</span>
      {/* Napit omassa kääreessään, jotta ne pysyvät yhdessä kun rivi katkeaa. */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {extras}
        {/* Emoji kantoi tilan, joten vaiettu emoji korvataan aria-pressedillä (J-13). */}
        <button onClick={onSoundToggle} aria-pressed={!!soundOn} style={btn(soundOn, C.panelBorder)}>
          <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span> {t('ui.shared.sound')}
        </button>
        <button onClick={onRevealToggle} aria-pressed={!!revealAll} style={btn(revealAll, '#2a4a32')}>
          <span aria-hidden="true">{revealAll ? '🙈' : '🔍'}</span> {t('ui.shared.openCards')}
        </button>
      </div>
    </div>
  );
}
