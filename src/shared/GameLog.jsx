import { C } from './colors.js';
import { useT } from './i18n.jsx';

// Tapahtumalokin paneeli: otsikkorivi joka avaa ja sulkee, ja rivit uusin ensin.
//
// Oli yhdeksänä kopiona (kompositioauditointi H1). Kopiot erosivat vain väreistä ja
// muutamasta pikselistä, eikä eroille ollut perustelua; oletukset ovat tässä se muoto
// joka oli enemmistöllä, ja Läpsy ja Moska antavat oman korostusvärinsä propseina.
//
// Viesti renderöidään oletuksena HTML:nä, koska kahdeksan peliä rakentaa lokirivin
// lblColoredilla joka palauttaa värillisen spanin. Kasino antaa oman renderMessagen,
// koska sen viestit ovat tekstiä ja kortit väritetään säännöllisellä lausekkeella.
// Kaksi eri ratkaisua samaan ongelmaan on tiedossa; yhtenäistäminen koskisi jokaista
// viestiä yhdeksässä pelissä eikä kuulu tähän muutokseen.
/**
 * @typedef {object} GameLogProps
 * @property {Array<{t: string, m: string}>} log   Lokirivit uusin ensin
 * @property {boolean} open                        Onko paneeli auki
 * @property {() => void} onToggle                 Otsikkorivin klikkaus
 * @property {string} [headerBg]
 * @property {string} [rowBorder]
 * @property {string} [accentBg]
 * @property {string} [firstColor]
 * @property {string} [restColor]
 * @property {(m: string) => any} [renderMessage]  Ilman tätä viesti renderöidään HTML:nä
 */
/** @param {GameLogProps} props */
export default function GameLog({
  log,
  open,
  onToggle,
  headerBg   = 'rgba(255,255,255,0.02)',
  rowBorder  = '1px solid rgba(42,74,50,0.4)',
  accentBg   = 'rgba(201,168,76,0.04)',
  firstColor = '#c0d8c8',
  restColor  = '#8aaa90',
  renderMessage,
}) {
  const t = useT();
  return (
    <div style={{ border: `1px solid ${C.panelBorder}`, borderRadius: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', background: headerBg, border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: C.dim }}>
        <span style={{ fontFamily: 'sans-serif', fontSize: 10, letterSpacing: 1.5, flex: 1, textAlign: 'left' }}>{t('ui.shared.logTitle')}</span>
        <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {open && (
        <div>
          {log.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '4px 14px', borderTop: rowBorder, background: i === 0 ? accentBg : 'transparent' }}>
              <span style={{ fontSize: 10, color: C.dim, fontFamily: 'monospace', flexShrink: 0, marginTop: 1 }}>{e.t}</span>
              {renderMessage
                ? <div style={{ fontSize: 12, color: i === 0 ? firstColor : restColor, fontFamily: 'sans-serif', lineHeight: 1.5 }}>{renderMessage(e.m)}</div>
                : <span style={{ fontSize: 12, color: i === 0 ? firstColor : restColor, fontFamily: 'sans-serif', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: e.m }}></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
