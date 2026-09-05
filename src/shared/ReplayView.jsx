// Replay-näkymä ja sen mini-kortti. Siirretty App.jsx:stä 5.9.2026
// (kompositioauditointi H8): nämä kaksi komponenttia eivät lue mitään App:n tilasta vaan
// saavat kehykset propsina, joten ne asuivat siellä sijainnin eivätkä rakenteen takia.
import { useState, useEffect } from 'react';
import { C, SUIT_COLOR } from './colors.js';
import { useT } from './i18n.jsx';

// ── Replay: mini-kortti ──────────────────────────────────────────────────────
function MiniCard({ card }) {
  if (!card) return (
    <span style={{ display:'inline-block', background:'rgba(255,255,255,0.15)', borderRadius:3, padding:'0 3px', fontSize:11, fontFamily:'sans-serif', fontWeight:700, margin:1, border:'1px solid rgba(255,255,255,0.2)', lineHeight:'18px', minWidth:20, textAlign:'center', color:'#888' }}>?</span>
  );
  const color = SUIT_COLOR[card.s] ?? '#ccc';
  return (
    <span style={{ display:'inline-block', background:'rgba(255,255,255,0.9)', color, borderRadius:3, padding:'0 4px', fontSize:11, fontFamily:'sans-serif', fontWeight:700, margin:1, border:'1px solid rgba(0,0,0,0.15)', lineHeight:'18px', minWidth:20, textAlign:'center' }}>
      {card.r}{card.s}
    </span>
  );
}

// ── Replay: askelnavigointinäkymä ────────────────────────────────────────────
export default function ReplayView({ frames, onClose, isMobile }) {
  const t = useT();
  const [idx, setIdx] = useState(frames.length - 1);
  const safeIdx = Math.min(Math.max(idx, 0), frames.length - 1);
  const frame   = frames[safeIdx];

  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(frames.length - 1, i + 1));
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [frames.length, onClose]);

  if (!frame) return null;

  const navBtn = disabled => ({
    background: disabled ? 'transparent' : `${C.gold}22`,
    border: `1px solid ${disabled ? C.panelBorder : C.gold}`,
    color: disabled ? C.panelBorder : C.gold,
    borderRadius: 8, padding: '7px 16px',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'sans-serif', fontSize: 16, fontWeight: 700,
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:800, background:C.bg, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* Navigaatiopalkki */}
      <div style={{
        position:'sticky', top:0, zIndex:10, background:'rgba(13,33,24,0.97)',
        borderBottom:`1px solid ${C.panelBorder}`,
        padding: isMobile ? '8px 10px' : '10px 16px',
        display:'flex', alignItems:'center', gap:8,
      }}>
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0} style={navBtn(safeIdx === 0)}>←</button>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
          <div style={{ textAlign:'center', fontFamily:'sans-serif', fontSize:11, color:C.dim }}>
            {safeIdx + 1} / {frames.length}
          </div>
          <input type="range" min={0} max={frames.length - 1} value={safeIdx}
            onChange={e => setIdx(Number(e.target.value))}
            style={{ width:'100%', cursor:'pointer', accentColor:C.gold }}
          />
        </div>
        <button onClick={() => setIdx(i => Math.min(frames.length - 1, i + 1))} disabled={safeIdx === frames.length - 1} style={navBtn(safeIdx === frames.length - 1)}>→</button>
        <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${C.panelBorder}`, color:C.dim, borderRadius:8, padding:'7px 12px', cursor:'pointer', fontFamily:'sans-serif', fontSize:13 }}>✕</button>
      </div>

      {/* Sisältö */}
      <div style={{ padding: isMobile ? '12px 10px' : '16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        {/* Lokiteksti — logText voi olla HTML-string tai React-node */}
        {typeof frame.logText === 'string'
          ? <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.panelBorder}`, borderRadius:10, padding:'12px 14px', fontFamily:'sans-serif', fontSize: isMobile ? 13 : 14, color:C.text, lineHeight:1.5 }}
              dangerouslySetInnerHTML={{ __html: frame.logText }} />
          : <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.panelBorder}`, borderRadius:10, padding:'12px 14px', fontFamily:'sans-serif', fontSize: isMobile ? 13 : 14, color:C.text, lineHeight:1.5 }}>
              {frame.logText}
            </div>
        }

        {/* Pelaajat + käsikortit */}
        {frame.players.map(p => (
          <div key={p.name} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`, borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'flex-start', gap:10, flexWrap:'wrap' }}>
            <div style={{ minWidth:72, flexShrink:0 }}>
              <div style={{ fontFamily:'sans-serif', fontSize:12, color: p.isHuman ? C.gold : C.dim, fontWeight: p.isHuman ? 700 : 400 }}>{p.name}</div>
              {p.score !== null && <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, opacity:0.8 }}>{p.score} {t('ui.replay.pts')}</div>}
              <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.dim, opacity:0.5 }}>({p.cardCount}k)</div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:2, flex:1, alignContent:'flex-start' }}>
              {p.hand.length > 0
                ? p.hand.map((c, ci) => <MiniCard key={ci} card={c} />)
                : <span style={{ color:C.dim, fontSize:11, fontFamily:'sans-serif', opacity:0.4 }}>—</span>
              }
            </div>
          </div>
        ))}

        {/* Pöytäkortit */}
        {frame.tableCards?.length > 0 && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${C.panelBorder}`, borderRadius:8, padding:'8px 12px' }}>
            <div style={{ fontFamily:'sans-serif', fontSize:10, color:C.gold, letterSpacing:1.5, opacity:0.8, marginBottom:6, textTransform:'uppercase' }}>{t('ui.replay.table')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:2 }}>
              {frame.tableCards.map((c, ci) => <MiniCard key={ci} card={c} />)}
            </div>
          </div>
        )}

        {/* Extrateksti */}
        {frame.extraText && (
          <div style={{ textAlign:'center', fontFamily:'sans-serif', fontSize:12, color:C.dim, opacity:0.7 }}>{frame.extraText}</div>
        )}
      </div>
    </div>
  );
}
