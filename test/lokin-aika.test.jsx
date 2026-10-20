// @vitest-environment jsdom
//
// Lokin kellonaika on vain näkevälle. NVDA:n Microsoft Heidi luki muodon 18.11.05
// päivämääränä (Tommin kuuntelu 20.10.2026), ja tapahtuma kuului jo ilmoitusalueesta.

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { LangProvider } from '../src/shared/i18n.jsx';
import GameLog from '../src/shared/GameLog.jsx';

afterEach(cleanup);

describe('GameLog', () => {
  it('piilottaa kellonajan ruudunlukijalta mutta näyttää sen', () => {
    const { container } = render(
      <LangProvider>
        <GameLog log={[{ t: '18.11.05', m: 'Vuorossa Hero.' }]} open onToggle={() => {}} />
      </LangProvider>,
    );
    const aika = [...container.querySelectorAll('span')].find(s => s.textContent === '18.11.05');
    expect(aika).toBeTruthy();
    expect(aika?.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toContain('Vuorossa Hero.');
  });
});
