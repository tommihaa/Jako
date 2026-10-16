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
