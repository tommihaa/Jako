import { C } from './colors.js';
import { useT } from './i18n.jsx';

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
 */
/** @param {GameStatusBarProps} props */
export default function GameStatusBar({
  children, extras, soundOn, onSoundToggle, revealAll, onRevealToggle,
  accent = C.gold, isMobile = false, borderTop = true,
}) {
  const t = useT();
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
      <span style={{ fontFamily: 'sans-serif', fontSize: 10, color: C.dim, flex: 1 }}>{children}</span>
      {/* Napit omassa kääreessään, jotta ne pysyvät yhdessä kun rivi katkeaa. */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {extras}
        <button onClick={onSoundToggle} style={btn(soundOn, C.panelBorder)}>
          {soundOn ? '🔊' : '🔇'} {t('ui.shared.sound')}
        </button>
        <button onClick={onRevealToggle} style={btn(revealAll, '#2a4a32')}>
          {revealAll ? '🙈' : '🔍'} {t('ui.shared.openCards')}
        </button>
      </div>
    </div>
  );
}
