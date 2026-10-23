// @vitest-environment jsdom
//
// Valittu kortti sanoo tilan nimessään (J-41, Tommin valinta 23.10.2026). Chrome Androidilla
// TalkBack lukee kortin uudelleen kaksoisnapautuksen jälkeen ja keskeyttää tilailmoituksen,
// joten tila on oltava siinä mitä uudelleenluku sanoo. Valitsematon kortti ei sano tilaa.

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Card from '../src/shared/Card.jsx';

afterEach(cleanup);

const nimi = (/** @type {boolean} */ selected) => {
  const { container } = render(<Card card={{ r: '3', s: '♣' }} onClick={() => {}} selected={selected} />);
  return container.querySelector('.sr-only')?.textContent;
};

describe('kortin valinta nimessä', () => {
  it('valittu kortti sanoo tilan', () => {
    expect(nimi(true)).toBe('risti kolme, valittu');
  });
  it('valitsematon kortti ei sano tilaa', () => {
    expect(nimi(false)).toBe('risti kolme');
  });
});
