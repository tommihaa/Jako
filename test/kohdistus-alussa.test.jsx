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
import { SpokenHtml } from '../src/shared/Spoken.jsx';
import { installFocusRescue, rescueTarget } from '../src/shared/focusRescue.js';
import { useState } from 'react';
import App from '../src/App.jsx';

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

// Turvaverkko: kun painettu nappi katoaa, kohdistus siirtyy pelin viestiriville. Ilman
// viestiriviä oman käden pienimpään valittavaan korttiin, muuten pienimpään korttiin ja
// tyhjällä kädellä pelin nimeen (Tommin päätökset 16.10.2026).
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
    expect(t?.getAttribute('aria-label')).toBe('pata viisi');
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
    expect(document.activeElement?.getAttribute('aria-label')).toBe('pata neljä');
    uninstall();
  });

  // Tommin toinen valinta 16.10.2026: viestirivi kertoo tilanteen, kortti ei.
  it('vie kohdistuksen viestiriville kun sellainen on', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [played, setPlayed] = useState(false);
      return (
        <div>
          <SpokenHtml as="p" html={played ? 'Hero: 4.' : 'Vuorossa Hero.'} gameMessage />
          <Card mine card={card('4', 4)} />
          {!played && <button onClick={() => setPlayed(true)}>Pelaa</button>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    const btn = /** @type {HTMLElement} */ (r.getByText('Pelaa'));
    btn.focus();
    await act(async () => { fireEvent.click(btn); });
    // Ennen toista siirtoa (J-43), joka vie kohdistuksen rivin sisällä puhuttuun tekstiin.
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.activeElement?.hasAttribute('data-game-message')).toBe(true);
    // Kohdistettu rivi jäätyy ruudunlukijalle (J-22): puhuttu muoto on sr-only-tekstissä.
    expect(document.activeElement?.querySelector('.sr-only')?.textContent).toBe('Hero: 4.');
    uninstall();
  });

  // J-43: sivu siirsi kohdistuksen viestiriville, mutta Chrome ilmoitti siitä TalkBackille vain
  // osan kerroista, ja TalkBack luki muuten koko sivun (Moska, Pixel 8a 24.10.2026). Toinen
  // siirto rivin sisällä 300 ms:n kohdalla antaa Chromelle uuden ilmoitettavan siirron.
  it('siirtää kohdistuksen toisen kerran rivin sisällä', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [played, setPlayed] = useState(false);
      return (
        <div>
          <SpokenHtml as="p" html={played ? 'Vortumna puolustaa.' : 'Vuorossa Hero.'} gameMessage />
          <Card mine card={card('4', 4)} onClick={() => {}} />
          {!played && <button onClick={() => setPlayed(true)}>Ohita</button>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    await act(async () => { fireEvent.click(r.getByText('Ohita')); });
    const row = /** @type {HTMLElement} */ (document.querySelector('[data-game-message]'));
    act(() => { vi.advanceTimersByTime(299); });
    expect(document.activeElement).toBe(row);
    act(() => { vi.advanceTimersByTime(1); });
    const said = row.querySelector(':scope > .sr-only');
    expect(document.activeElement).toBe(said);
    expect(said?.textContent).toBe('Vortumna puolustaa.');
    // Siirtoja on yksi, ei toistuvaa.
    act(() => { vi.runAllTimers(); });
    expect(document.activeElement).toBe(said);
    uninstall();
  });

  // Kierroksen lopun pitkä viesti katkesi, kun toinen siirto haki rivin uuden tekstin, ja
  // nostetut kortit jäivät kuulematta (Moska, Pixel 8a 25.10.2026).
  it('toinen siirto pitää jäätyneen tekstin, vaikka viesti vaihtui', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [step, setStep] = useState(0);
      return (
        <div>
          <SpokenHtml as="p" html={['Vuorossa Hero.', 'Hero nosti 1 kortin: hertta viisi.', 'Sari hyökkää.'][step]} gameMessage />
          <Card mine card={card('4', 4)} onClick={() => {}} />
          {step === 0 && <button onClick={() => setStep(1)}>Seuraava kierros</button>}
          <button onClick={() => setStep(2)}>Botti</button>
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    await act(async () => { fireEvent.click(r.getByText('Seuraava kierros')); });
    const row = /** @type {HTMLElement} */ (document.querySelector('[data-game-message]'));
    expect(document.activeElement).toBe(row);
    // Botti ehtii vaihtaa viestin ennen toista siirtoa. Klikkaus ilman kohdistusta, kuten botti.
    act(() => { r.getByText('Botti').click(); });
    act(() => { vi.advanceTimersByTime(300); });
    const said = row.querySelector(':scope > .sr-only');
    expect(document.activeElement).toBe(said);
    expect(said?.textContent).toBe('Hero nosti 1 kortin: hertta viisi.');
    uninstall();
  });

  it('ei vie toisella siirrolla kohdistusta pois, jos pelaaja on jo muualla', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [played, setPlayed] = useState(false);
      return (
        <div>
          <SpokenHtml as="p" html={played ? 'Vortumna puolustaa.' : 'Vuorossa Hero.'} gameMessage />
          <Card mine card={card('4', 4)} onClick={() => {}} />
          {!played && <button onClick={() => setPlayed(true)}>Ohita</button>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    await act(async () => { fireEvent.click(r.getByText('Ohita')); });
    act(() => { vi.advanceTimersByTime(100); });
    const kortti = /** @type {HTMLElement} */ (document.querySelector('[data-mine]'));
    act(() => { kortti.focus(); });
    act(() => { vi.runAllTimers(); });
    expect(document.activeElement).toBe(kortti);
    uninstall();
  });

  // J-42: Ristiseiskan Lyö-nappi katosi 27 ms painalluksen jälkeen, ja kohdistus oli 54 ms
  // sivun juuressa ennen siirtoa. TalkBack ehti sanoa "verkkonäkymä" (Pixel 8a 23.10.2026).
  it('siirtää kohdistuksen heti eikä jätä sitä sivun juureen', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [played, setPlayed] = useState(false);
      return (
        <div>
          <SpokenHtml as="p" html={played ? 'Vuorossa Sune.' : 'Vuorossa Hero.'} gameMessage />
          <Card mine card={card('4', 4)} />
          {!played && <button onClick={() => setTimeout(() => setPlayed(true), 27)}>Lyö</button>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    const btn = /** @type {HTMLElement} */ (r.getByText('Lyö'));
    btn.focus();
    await act(async () => { fireEvent.click(btn); });
    // Nappi katoaa, mutta viivästetty tarkistus (50 ms) ei ole vielä ajanut.
    await act(async () => { vi.advanceTimersByTime(30); });
    expect(r.queryByText('Lyö')).toBeNull();
    expect(document.activeElement?.hasAttribute('data-game-message')).toBe(true);
    uninstall();
  });

  // TalkBack painaa napin ACTION_CLICKillä, eikä Chrome siirrä DOM-kohdistusta nappiin. Moskassa
  // kohdistus jäi viestiriville, ja Ota kortit, Ohita ja Seuraava kierros veivät TalkBackin
  // sivun juureen, josta se luki koko sivun (Pixel 8a 24.10.2026). Chrome ilmoittaa vain
  // siirrosta toiseen elementtiin, joten jo kohdistettu rivi antaa sen puhutulle tekstilleen.
  it('siirtää kohdistuksen, kun painettu nappi katoaa ilman DOM-kohdistusta', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [step, setStep] = useState(0);
      return (
        <div>
          <SpokenHtml as="p" html={`Viesti ${step}.`} gameMessage />
          <Card mine card={card('4', 4)} />
          <button onClick={() => setStep(s => s + 1)}>Kortti {step}</button>
          {step < 2 && <button key={step} onClick={() => setStep(s => s + 1)}>Ota kortit</button>}
        </div>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    const row = /** @type {HTMLElement} */ (document.querySelector('[data-game-message]'));
    // Rivillä on kohdistus aiemmasta siirrosta.
    act(() => { row.focus(); });
    await act(async () => { fireEvent.click(r.getByText('Ota kortit')); });
    const said = row.querySelector(':scope > .sr-only');
    expect(document.activeElement).toBe(said);
    // Rivi pysyy jäätyneenä, vaikka kohdistus siirtyi sen sisällä.
    expect(said?.textContent).toBe('Viesti 1.');
    act(() => { vi.advanceTimersByTime(100); });
    expect(document.activeElement).toBe(said);
    // Seuraavalla kerralla kohdistus on rivin tekstissä, joten se menee takaisin riviin.
    await act(async () => { fireEvent.click(r.getByText('Ota kortit')); });
    expect(document.activeElement).toBe(row);
    uninstall();
  });

  // Aloitusnäytön oma siirto pelin nimeen tehdään seuraavassa tahdissa. Turvaverkko ei saa
  // ehtiä ensin viestiriville, koska silloin kohdistus kuuluisi kahdesti.
  it('ei ohita aloitusnäytön siirtoa pelin nimeen', async () => {
    vi.useFakeTimers();
    function Peli() {
      const [started, setStarted] = useState(false);
      return (
        <LangProvider>
          <h1 id={GAME_TITLE_ID} tabIndex={-1}>Peli</h1>
          {started
            ? <SpokenHtml as="p" html="Peli alkaa." gameMessage />
            : <GameStartScreen title="PELI" counts={[2, 3, 4]} value={4} onCountChange={() => {}}
                onStart={() => setStarted(true)} onBotBattle={() => {}} botBattleSub="" />}
        </LangProvider>
      );
    }
    const uninstall = installFocusRescue();
    const r = render(<Peli />);
    /** @type {string[]} */
    const focused = [];
    const onFocus = (/** @type {FocusEvent} */ e) => {
      const el = /** @type {HTMLElement} */ (e.target);
      focused.push(el.id || (el.hasAttribute('data-game-message') ? 'viesti' : el.tagName));
    };
    document.addEventListener('focusin', onFocus, true);
    const button = /** @type {HTMLElement} */ ([...r.container.querySelectorAll('button')]
      .find(b => /Aloita/.test(b.textContent ?? '')));
    button.focus();
    await act(async () => { fireEvent.click(button); });
    act(() => { vi.runAllTimers(); });
    document.removeEventListener('focusin', onFocus, true);
    expect(focused).toEqual([GAME_TITLE_ID]);
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

// Paluu valikkoon vie kohdistuksen sen pelin ruutuun, josta palattiin (J-15, Tommin valinta
// 16.10.2026). Ennen tätä ← Valikko katosi pelin mukana ja TalkBack luki koko valikon.
describe('kohdistus valikkoon palatessa', () => {
  it('menee pelin omaan ruutuun', async () => {
    let utils;
    await act(async () => { utils = render(<LangProvider><App /></LangProvider>); });
    const tile = /** @type {HTMLElement} */ (utils.container.querySelector('[data-game-tile="maija"]'));
    await act(async () => { fireEvent.click(tile); });
    const back = await utils.findByText('← Valikko', {}, { timeout: 10_000 });
    await act(async () => { fireEvent.click(back); });
    expect(document.activeElement?.getAttribute('data-game-tile')).toBe('maija');
  }, 20_000);
});
