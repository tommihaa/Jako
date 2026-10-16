// @vitest-environment jsdom
//
// Pelin alkaessa kohdistus siirtyy otsikkorivin pelin nimeen (auditointi J-9). Vika
// 16.10.2026 Pixel 8a:lla: painettu Aloita-nappi katosi aloitusnäytön mukana, TalkBack
// putosi sivun juureen ja luki koko sivun yhtenä pötkönä. Pötkön alussa oli
// ilmoitusalueen vastustajarivi, joten rivi kuului kahdesti.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import GameStartScreen, { GAME_TITLE_ID } from '../src/shared/GameStartScreen.jsx';
import Card from '../src/shared/Card.jsx';
import { installFocusRescue, rescueTarget } from '../src/shared/focusRescue.js';
import { useState } from 'react';

afterEach(() => { cleanup(); vi.useRealTimers(); });

/** @param {string} label */
function renderStart(label) {
  vi.useFakeTimers();
  const onStart = vi.fn();
  const onBotBattle = vi.fn();
  const r = render(
    <LangProvider>
      <h1 id={GAME_TITLE_ID} tabIndex={-1}>Peli</h1>
      <GameStartScreen title="PELI" counts={[2, 3, 4]} value={4} onCountChange={() => {}}
        onStart={onStart} onBotBattle={onBotBattle} botBattleSub="" />
    </LangProvider>,
  );
  const button = /** @type {HTMLElement} */ ([...r.container.querySelectorAll('button')]
    .find(b => new RegExp(label).test(b.textContent ?? '')));
  return { button, onStart, onBotBattle };
}

describe('kohdistus pelin alkaessa', () => {
  it('Aloita vie kohdistuksen pelin nimeen', () => {
    const { button, onStart } = renderStart('Aloita');
    fireEvent.click(button);
    act(() => { vi.runAllTimers(); });
    expect(onStart).toHaveBeenCalledOnce();
    expect(document.activeElement?.id).toBe(GAME_TITLE_ID);
  });

  it('Bottien Taistelu vie kohdistuksen pelin nimeen', () => {
    const { button, onBotBattle } = renderStart('Bottien');
    fireEvent.click(button);
    act(() => { vi.runAllTimers(); });
    expect(onBotBattle).toHaveBeenCalledOnce();
    expect(document.activeElement?.id).toBe(GAME_TITLE_ID);
  });
});

// Turvaverkko: kun painettu nappi katoaa, kohdistus siirtyy oman käden pienimpään
// valittavaan korttiin, muuten pienimpään korttiin ja tyhjällä kädellä pelin nimeen
// (Tommin päätös 16.10.2026, kuuntelu 1.2.237:llä).
describe('kohdistuksen turvaverkko', () => {
  const card = (r, v, s = '♠') => ({ r, s, v, id: `${r}${s}` });

  it('valitsee pienimmän valittavan, muuten pienimmän', () => {
    const r = render(
      <div>
        <Card mine card={card('9', 9)} onClick={() => {}} />
        <Card mine card={card('5', 5)} />
        <Card mine card={card('7', 7)} onClick={() => {}} />
      </div>,
    );
    expect(rescueTarget(r.container)?.textContent).toContain('7');
    cleanup();
    const r2 = render(<div><Card mine card={card('9', 9)} /><Card mine card={card('5', 5)} /></div>);
    const t = rescueTarget(r2.container);
    expect(t?.getAttribute('aria-label')).toMatch(/5/);
    expect(t?.tabIndex).toBe(-1);
  });

  it('vie kohdistuksen käteen kun painettu nappi katoaa', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [played, setPlayed] = useState(false);
      return (
        <div>
          <h1 id={GAME_TITLE_ID} tabIndex={-1}>Peli</h1>
          <Card mine card={card('K', 13)} />
          <Card mine card={card('4', 4)} />
          {!played && <button onClick={() => setPlayed(true)}>Pelaa</button>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    const btn = /** @type {HTMLElement} */ (r.getByText('Pelaa'));
    btn.focus();
    // MutationObserver ilmoittaa mikrotehtävänä, joten klikkaus odotetaan ennen ajastimia.
    await act(async () => { fireEvent.click(btn); });
    act(() => { vi.runAllTimers(); });
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/4/);
    uninstall();
  });

  // Asetusten ja Mestarin kuplan sulkunappi katoaa paneelin mukana. Ennen tätä kohdistus
  // meni pienimpään korttiin eikä avausnappiin (tarkistus 16.10.2026).
  it('palauttaa kohdistuksen paneelin avaajaan kun sulkunappi katoaa', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <Card mine card={card('4', 4)} />
          <button onClick={() => setOpen(true)}>Asetukset</button>
          {open && <div><button onClick={() => setOpen(false)}>Sulje</button></div>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    const opener = /** @type {HTMLElement} */ (r.getByText('Asetukset'));
    opener.focus();
    await act(async () => { fireEvent.click(opener); });
    act(() => { vi.runAllTimers(); });
    const close = /** @type {HTMLElement} */ (r.getByText('Sulje'));
    close.focus();
    await act(async () => { fireEvent.click(close); });
    act(() => { vi.runAllTimers(); });
    expect(document.activeElement).toBe(opener);
    uninstall();
  });
});
