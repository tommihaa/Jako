// Kotisääntö singleTwos (PASKAHOUSU.md, sääntövalinnat 14.9.2026): arvon 15 kakkosista
// lyödään vain yksi kerralla. Botti ja Mestarin neuvo kutsuvat samaa valintaa (aiCards),
// joten neuvo on sama pinta kuin botin siirto. Vakio (singleTwos=false) säilyttää ryhmälyönnin.
import { describe, it, expect } from 'vitest';
import { getAdvice } from '../src/games/Paskahousu.jsx';

const mk = (r, s, v) => ({ r, s, v, id: `${r}${s}` });
const RULES = { handSize: 6, hardTwos: false, faceMin: 7, singleTwos: false };

function state({ rules = RULES, hand, top = mk('9', '♣', 9), draw = 5 } = {}) {
  return {
    phase: 'play', turn: 0, finished: [], rules,
    top, pile: top ? [top] : [], draw: Array.from({ length: draw }, (_, i) => mk('5', '♥', 5)),
    allCards: null, clearedCards: [],
    players: [{ hand, name: 'Hero', isHuman: true }, { hand: [mk('K', '♦', 13)], name: 'Bot' }],
  };
}

describe('Paskahousu: kovat kakkoset kerralla vai yksi kerrallaan', () => {
  const kaksiMustaa = () => [mk('2', '♠', 15), mk('2', '♣', 15)];

  it('vakio: molemmat mustat kakkoset yhtenä ryhmänä', () => {
    const a = getAdvice(state({ hand: kaksiMustaa() }));
    expect(a.type).toBe('play');
    expect(a.cards.map(c => c.id).sort()).toEqual(['2♠', '2♣']);
  });

  it('singleTwos: vain yksi musta kakkonen', () => {
    const a = getAdvice(state({ rules: { ...RULES, singleTwos: true }, hand: kaksiMustaa() }));
    expect(a.type).toBe('play');
    expect(a.cards).toHaveLength(1);
    expect(a.cards[0].r).toBe('2');
  });

  it('singleTwos + hardTwos: neljästä kakkosesta yksi', () => {
    const hand = [mk('2', '♠', 15), mk('2', '♣', 15), mk('2', '♥', 15), mk('2', '♦', 15)];
    const a = getAdvice(state({ rules: { ...RULES, hardTwos: true, singleTwos: true }, hand }));
    expect(a.cards).toHaveLength(1);
  });

  it('singleTwos ei koske punaisia arvon 2 kakkosia tyhjälle pöydälle', () => {
    const hand = [mk('2', '♥', 2), mk('2', '♦', 2), mk('K', '♠', 13)];
    const a = getAdvice(state({ rules: { ...RULES, singleTwos: true }, hand, top: null }));
    expect(a.cards.map(c => c.id).sort()).toEqual(['2♥', '2♦']);
  });

  it('singleTwos ei koske muita ryhmiä', () => {
    const hand = [mk('9', '♠', 9), mk('9', '♥', 9)];
    const a = getAdvice(state({ rules: { ...RULES, singleTwos: true }, hand }));
    expect(a.cards).toHaveLength(2);
  });
});
