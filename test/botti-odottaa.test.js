// Asetus "Botti odottaa ilmoitukset" (Tommin valinta 23.10.2026): bottisiirron viiveeseen
// lisätään jonossa olevien ilmoitusten arvioitu lukuaika, Ville Lammisen AccessibleBridgen
// tapaan (Jako/docs/VERTAILU-ACCESSIBLEBRIDGE.md › Opittavaa Jakoon, kohta 1).
//
// Asetus pois: lisäys on nolla, joten näkijän peli ei hidastu. Uusi peli tyhjentää jonon,
// eikä edellisen pelin ilmoitus saa viivästyttää seuraavan pelin bottia.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { announce, clearAnnouncements, pendingSpeechMs, setWaitForSpeech } from '../src/shared/Announcer.jsx';

beforeEach(() => { vi.useFakeTimers(); clearAnnouncements(); });
afterEach(() => { setWaitForSpeech(false); clearAnnouncements(); vi.useRealTimers(); });

describe('botti odottaa ilmoitukset', () => {
  it('asetus pois: ei lisäystä', () => {
    setWaitForSpeech(false);
    announce('Fortuna: risti seitsemän, kahdeksan.');
    expect(pendingSpeechMs()).toBe(0);
  });

  it('asetus päällä: lisäys kattaa jonon ja kuluu puheen mukana', () => {
    setWaitForSpeech(true);
    announce('Fortuna: risti seitsemän, kahdeksan.');
    announce('Vuorossa Loki.');
    const alussa = pendingSpeechMs();
    // Kaksi viestiä: kumpikin vähintään sekunnin puheaika ja tauko.
    expect(alussa).toBeGreaterThan(2 * (1000 + 700));
    vi.advanceTimersByTime(1500);
    expect(pendingSpeechMs()).toBeLessThan(alussa);
    vi.advanceTimersByTime(20000);
    expect(pendingSpeechMs()).toBe(0);
  });

  it('uusi peli tyhjentää odotuksen', () => {
    setWaitForSpeech(true);
    announce('Fortuna: risti seitsemän, kahdeksan.');
    clearAnnouncements();
    expect(pendingSpeechMs()).toBe(0);
  });
});
