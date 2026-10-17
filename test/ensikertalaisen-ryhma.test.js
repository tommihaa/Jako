import { describe, it, expect } from 'vitest';
import { firstVisitGroup, POOL_BY_GROUP } from '../src/shared/playerGroups.js';

// Ensikertalaisen nimiryhmä kielen mukaan (Tommin päätös 17.10.2026).
describe('firstVisitGroup', () => {
  it('suomeksi porukka', () => {
    expect(firstVisitGroup('fi')).toBe('porukka');
  });
  it('muilla kielillä Meme-jengi', () => {
    for (const lang of ['en', 'sv', 'de', 'krl', 'se']) expect(firstVisitGroup(lang)).toBe('meme');
  });
  it('molemmat ovat olemassa olevia ryhmiä', () => {
    expect(POOL_BY_GROUP[firstVisitGroup('fi')]).toBeDefined();
    expect(POOL_BY_GROUP[firstVisitGroup('en')]).toBeDefined();
  });
});
