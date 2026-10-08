// @vitest-environment node
// Esitallennuslista (scripts/precache.mjs): SW tallentaa tämän listan, joten listalta puuttuva
// peli ei toimi ilman verkkoa. 8.10.2026 tablettiajossa julkaisun jälkeen avattu peli antoi
// offline-tilassa tyhjän ruudun, koska vain avatut pelit olivat tallessa.
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { listPublic, precacheFiles } from '../scripts/precache.mjs';

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

describe('precacheFiles', () => {
  it('ottaa bundlen tiedostot ilman lähdekarttoja ja index.html:ää, ja alkaa juuresta', () => {
    const list = precacheFiles(
      ['index.html', 'assets/index-a.js', 'assets/index-a.js.map', 'assets/Seiska-b.js', 'assets/fi-c.js'],
      [],
    );
    expect(list).toEqual(['/', '/assets/Seiska-b.js', '/assets/fi-c.js', '/assets/index-a.js']);
  });

  it('ottaa public/-tiedostot paitsi SW:n itsensä, robotsin ja lisenssin', () => {
    const list = precacheFiles([], listPublic(PUBLIC));
    expect(list).toContain('/manifest.json');
    expect(list).toContain('/icon.svg');
    expect(list).toContain('/sfx/kantele-low.wav');
    expect(list).not.toContain('/sw.js');
    expect(list).not.toContain('/robots.txt');
    expect(list).not.toContain('/sfx/CREDITS.md');
  });

  it('ei tallenna omaa listaansa', () => {
    expect(precacheFiles(['precache.json'], [])).toEqual(['/']);
  });
});
