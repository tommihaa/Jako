// @vitest-environment jsdom
//
// Ruudunlukijan live-alue. Vika 14.10.2026: alue luki App:n siirtorekisteriä, jota
// täytetään vain Bottien Taistelussa, joten tavallisessa pelissä ruudunlukija ei
// kuullut yhtään tapahtumaa. Samana päivänä Tommin kuuntelu Pixelillä toi kolme
// tarkennusta: maat sanoina, viestit yksi kerrallaan tauon kanssa ja vastustajien
// nimet pelin alkuun.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import Announcer, { announce, clearAnnouncements } from '../src/shared/Announcer.jsx';
import { GameMessageRow } from '../src/shared/Spoken.jsx';
import { opponentsInTurnOrder } from '../src/shared/helpers.js';

import Paskahousu from '../src/games/Paskahousu.jsx';
import Koputus from '../src/games/Koputus.jsx';
import Kultakala from '../src/games/Kultakala.jsx';
import Lapsy from '../src/games/Lapsy.jsx';
import Maija from '../src/games/Maija.jsx';
import Moska from '../src/games/Moska.jsx';
import Seiska from '../src/games/Seiska.jsx';
import Ristiseiska from '../src/games/Ristiseiska.jsx';
import Kasino from '../src/games/Kasino.jsx';

/** @param {HTMLElement} container */
const liveText = container => container.querySelector('[aria-live]')?.textContent ?? '';

describe('Announcer', () => {
  beforeEach(() => { vi.useFakeTimers(); clearAnnouncements(); });
  afterEach(() => { cleanup(); clearAnnouncements(); vi.useRealTimers(); });

  it('ilmoittaa viestit yksi kerrallaan ja odottaa puheajan ennen seuraavaa', () => {
    const { container } = render(<Announcer />);
    act(() => {
      announce('Random: <b>7♥</b> (avaa maan)');
      announce('Vuorossa Troll.');
      vi.advanceTimersByTime(150);
    });
    expect(liveText(container)).toBe('Random: hertta seitsemän (avaa maan).');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(liveText(container)).toBe('Random: hertta seitsemän (avaa maan).');
    act(() => { vi.advanceTimersByTime(2700); });
    expect(liveText(container)).toBe('Vuorossa Troll.');
  });

  it('kirjoittaa maasymbolit sanoiksi, koska TalkBack lukee ne emojeina', () => {
    const { container } = render(<Announcer />);
    act(() => {
      announce('Hero aloittaa 7♣:llä. NPC: Q♥, 10♦️. Avattu ♠');
      vi.advanceTimersByTime(150);
    });
    expect(liveText(container)).toBe('Hero aloittaa risti 7:llä. NPC: hertta rouva, ruutu kymmenen. Avattu pata.');
  });

  it('sanoo murtoluvun sanoina, koska "0/2" kuuluu numeroina (J-19)', () => {
    const { container } = render(<Announcer />);
    act(() => {
      announce('Rane kaataa 0/2 ja nostaa 2 korttia.');
      vi.advanceTimersByTime(150);
    });
    expect(liveText(container)).toBe('Rane kaataa nolla kahdesta ja nostaa 2 korttia.');
  });

  it('toistaa saman viestin, koska alue tyhjenee välissä', () => {
    const { container } = render(<Announcer />);
    act(() => { announce('Vuorossa Hero.'); vi.advanceTimersByTime(150); });
    expect(liveText(container)).toBe('Vuorossa Hero.');
    act(() => { announce('Vuorossa Hero.'); vi.advanceTimersByTime(1050); });
    expect(liveText(container)).toBe('');
    act(() => { vi.advanceTimersByTime(900); });
    expect(liveText(container).trim()).toBe('Vuorossa Hero.');
  });

  it('ohittaa React-nodet ja tyhjät viestit', () => {
    const { container } = render(<Announcer />);
    act(() => { announce(<span>x</span>); announce(''); vi.advanceTimersByTime(10000); });
    expect(liveText(container)).toBe('');
  });

  it('uusi peli tyhjentää edellisen pelin kuulumattomat viestit', () => {
    const { container } = render(<Announcer />);
    act(() => {
      announce('Vanha 1.'); announce('Vanha 2.');
      vi.advanceTimersByTime(150);
      clearAnnouncements();
      announce('Uusi peli.');
      vi.advanceTimersByTime(150);
    });
    expect(liveText(container)).toBe('Uusi peli.');
    act(() => { vi.advanceTimersByTime(10000); });
    expect(liveText(container)).toBe('');
  });

  // J-9: viimeisin ilmoitus jäi alueeseen ja pyyhkäisy luki sen toiseen kertaan.
  it('tyhjentää alueen puheajan jälkeen', () => {
    const { container } = render(<Announcer />);
    act(() => { announce('Vastustajat vuorojärjestyksessä: A, B.'); vi.advanceTimersByTime(150); });
    expect(liveText(container)).toBe('Vastustajat vuorojärjestyksessä: A, B.');
    act(() => { vi.advanceTimersByTime(38 * 75); });
    expect(liveText(container)).toBe('');
  });

  // J-22: kohdistettu viestirivi sanoo oman siirron, joten live-alue ohittaa sen, mutta
  // myöhemmät viestit kuuluvat, koska TalkBack ei lue rivin jokaista muutosta.
  it('rivin kohdistus ohittaa jonon ja jäädyttää rivin, myöhemmät viestit kuuluvat', () => {
    const view = msg => <><Announcer /><GameMessageRow said={msg}>{msg}</GameMessageRow></>;
    const { container, rerender } = render(view('Hero: risti neljä'));
    const row = /** @type {HTMLElement} */ (container.querySelector('[data-game-message]'));
    act(() => { announce('Hero: 4♣'); row.focus(); vi.advanceTimersByTime(150); });
    expect(liveText(container)).toBe('');
    expect(row.querySelector('.sr-only')?.textContent).toBe('Hero: risti neljä');
    rerender(view('Vuorossa Hero.'));
    expect(row.querySelector('.sr-only')?.textContent).toBe('Hero: risti neljä');
    expect(row.querySelector('[aria-hidden="true"]')?.textContent).toBe('Vuorossa Hero.');
    act(() => { announce('Vuorossa Hero.'); vi.advanceTimersByTime(150); });
    expect(liveText(container)).toBe('Vuorossa Hero.');
  });
});

describe('opponentsInTurnOrder', () => {
  it('aloittaa ihmisestä seuraavasta ja kiertää ympäri', () => {
    const players = [
      { name: 'A', isHuman: false }, { name: 'Hero', isHuman: true },
      { name: 'B', isHuman: false }, { name: 'C', isHuman: false },
    ];
    expect(opponentsInTurnOrder(players)).toEqual(['B', 'C', 'A']);
  });
});

// Propsit joita testi ei tarvitse mutta joita tyyppitarkistus vaatii
// (ks. CLAUDE.md, Tyyppitarkistus). Kasino tarvitsee lisäksi `game`-propin.
/** @type {any} */
const PROPS = {
  onResult: () => {}, playerCount: 4, onSnapshot: undefined,
  playerNames: undefined, playerGroup: undefined, game: { id: 'kasino', minPlayers: 2 },
  onAiLevelChange: () => {}, onPlayerGroupChange: () => {}, onSoundOnChange: () => {},
  onSeeAllChange: () => {}, onShowLogChange: () => {},
};

/** @type {Array<[string, any]>} */
const GAMES = [
  ['Paskahousu', Paskahousu], ['Koputus', Koputus], ['Kultakala', Kultakala],
  ['Lapsy', Lapsy], ['Maija', Maija], ['Moska', Moska], ['Seiska', Seiska],
  ['Ristiseiska', Ristiseiska], ['Kasino', Kasino],
];

describe('tavallinen peli ilmoittaa ruudunlukijalle', () => {
  beforeEach(() => { vi.useFakeTimers(); clearAnnouncements(); });
  afterEach(() => { cleanup(); clearAnnouncements(); vi.useRealTimers(); });

  it.each(GAMES)('%s: ensin vastustajat vuorojärjestyksessä, sitten pelin tapahtumat', (_name, Game) => {
    const { container, getByText } = render(
      <LangProvider>
        <Announcer />
        <Game {...PROPS} />
      </LangProvider>
    );
    act(() => { fireEvent.click(getByText('Aloita →')); });
    /** @type {string[]} */
    const heard = [];
    for (let i = 0; i < 120 && heard.length < 2; i++) {
      act(() => { vi.advanceTimersByTime(100); });
      const t = liveText(container).trim();
      if (t && t !== heard[heard.length - 1]) heard.push(t);
    }
    expect(heard[0]).toMatch(/^Vastustajat vuorojärjestyksessä: [^.]+\.$/);
    expect(heard[0]).not.toContain('Hero');
    expect(heard.length).toBe(2);
  });
});
