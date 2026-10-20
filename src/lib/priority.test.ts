import { describe, expect, it } from 'vitest';
import { fishOfPriority, PRIORITIES, priorityOfFish } from './priority';

describe('categorías y peces', () => {
  it('cada categoría tiene su pez, y la tararira es el favorcito', () => {
    expect(PRIORITIES.map((p) => p.key)).toEqual(['iu', 'inu', 'uni', 'fav']);
    expect(priorityOfFish('tararira')).toBe('fav');
    expect(priorityOfFish('dorado')).toBe('iu');
    expect(fishOfPriority('inu')).toBe('koi');
    expect(fishOfPriority('uni')).toBe('mojarrita');
    expect(priorityOfFish('surubi')).toBeNull();
    expect(new Set(PRIORITIES.map((p) => p.fish)).size).toBe(4);
  });
});
