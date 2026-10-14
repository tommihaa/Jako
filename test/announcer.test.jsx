// @vitest-environment jsdom
//
// Ruudunlukijan live-alue. Vika 14.10.2026: alue luki App:n siirtorekisteriä, jota
// täytetään vain Bottien Taistelussa, joten tavallisessa pelissä ruudunlukija ei
// kuullut yhtään tapahtumaa. Nämä testit vaativat että ihmisen oma peli ilmoittaa.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import Announcer, { announce } from '../src/shared/Announcer.jsx';
import Ristiseiska from '../src/games/Ristiseiska.jsx';

/** @param {HTMLElement} container */
const liveText = container => container.querySelector('[aria-live]')?.textContent ?? '';

describe('Announcer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('kokoaa samassa tahdissa syntyneet viestit yhdeksi ilmoitukseksi', () => {
    const { container } = render(<Announcer />);
    act(() => {
      announce('Hero: <b>7♣</b>');
      announce('Vuorossa AFK.');
      vi.runOnlyPendingTimers();
    });
    expect(liveText(container)).toBe('Hero: risti 7 Vuorossa AFK.');
  });

  it('kirjoittaa maasymbolit sanoiksi, koska TalkBack lukee ne emojeina', () => {
    const { container } = render(<Announcer />);
    act(() => {
      announce('Hero aloittaa 7♣:llä. NPC: Q♥, 10♦️. Avattu ♠');
      vi.runOnlyPendingTimers();
    });
    expect(liveText(container)).toBe('Hero aloittaa risti 7:llä. NPC: hertta rouva, ruutu 10. Avattu pata');
  });

  it('toistaa saman viestin muuttamalla aluetta', () => {
    const { container } = render(<Announcer />);
    act(() => { announce('Vuorossa Hero.'); vi.runOnlyPendingTimers(); });
    const first = liveText(container);
    act(() => { announce('Vuorossa Hero.'); vi.runOnlyPendingTimers(); });
    expect(liveText(container)).not.toBe(first);
    expect(liveText(container).trim()).toBe('Vuorossa Hero.');
  });

  it('ohittaa React-nodet ja tyhjät viestit', () => {
    const { container } = render(<Announcer />);
    act(() => { announce(<span>x</span>); announce(''); vi.runOnlyPendingTimers(); });
    expect(liveText(container)).toBe('');
  });

  it('ilmoittaa tavallisen pelin tapahtumat, ei vain Bottien Taistelua', () => {
    // Propsit joita testi ei tarvitse mutta joita tyyppitarkistus vaatii
    // (ks. CLAUDE.md, Tyyppitarkistus).
    const props = {
      onResult: () => {},
      playerCount: 4,
      onSnapshot: undefined,
      playerNames: undefined,
      playerGroup: undefined,
      onAiLevelChange: () => {},
      onPlayerGroupChange: () => {},
      onSoundOnChange: () => {},
      onSeeAllChange: () => {},
      onShowLogChange: () => {},
    };
    const { container, getByText } = render(
      <LangProvider>
        <Announcer />
        <Ristiseiska {...props} />
      </LangProvider>
    );
    act(() => { fireEvent.click(getByText('Aloita →')); });
    act(() => { vi.advanceTimersByTime(5000); });
    expect(liveText(container)).not.toBe('');
  });
});
