import { computeCollectionStats, computeTaskStats, lastNDays, localDay, streaks } from './stats.util';
import type { NfRecord } from '../entities/mapping';

const NOW = new Date('2026-10-22T10:00:00Z');
const rec = (p: Partial<NfRecord>): NfRecord => ({
  id: 'x', url: '', title: 't', status: null, priority: null, due: null, done: null, progress: null, amount: null,
  relatedIds: [], notes: null, created: '2026-10-01T00:00:00Z', lastEdited: '2026-10-01T00:00:00Z', unsupported: [], ...p,
});

describe('stats util', () => {
  it('builds the last days oldest-first', () => {
    expect(lastNDays(3, 0, NOW)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22']);
  });
  it('applies timezone to timestamps', () => {
    expect(localDay('2026-10-21T22:30:00Z', 180)).toBe('2026-10-22'); // Addis Ababa is UTC+3
    expect(localDay('2026-10-21T22:30:00Z', 0)).toBe('2026-10-21');
    expect(localDay('2026-10-21', 180)).toBe('2026-10-21');
  });
  it('computes streaks', () => {
    const s = new Set(['2026-10-22', '2026-10-21', '2026-10-20', '2026-10-10', '2026-10-09']);
    expect(streaks(s, '2026-10-22')).toEqual({ current: 3, longest: 3 });
    expect(streaks(new Set(['2026-10-21']), '2026-10-22').current).toBe(1); // today not done yet
    expect(streaks(new Set(), '2026-10-22')).toEqual({ current: 0, longest: 0 });
  });
  it('summarizes tasks', () => {
    const items = [
      rec({ done: true, lastEdited: '2026-10-22T08:00:00Z' }),
      rec({ done: true, lastEdited: '2026-10-21T08:00:00Z' }),
      rec({ done: false, due: '2026-10-01' }),
      rec({ done: false, due: '2026-12-01' }),
    ];
    const s = computeTaskStats(items, 7, 0, NOW);
    expect(s).toMatchObject({ total: 4, done: 2, open: 2, overdue: 1, completionRate: 50, last7: 2, prev7: 0, currentStreak: 2 });
    expect(s.completedByDay).toHaveLength(7);
  });
  it('summarizes a custom collection with amounts', () => {
    const items = [
      rec({ due: '2026-10-22', amount: 10, progress: 50 }),
      rec({ due: '2026-10-21', amount: 5, progress: 100 }),
      rec({ due: '2025-01-01', amount: 99 }),
    ];
    const s = computeCollectionStats({ key: 'quran', label: 'Quran' }, items, 7, 0, false, NOW);
    expect(s).toMatchObject({ total: 3, hasAmount: true, amountInRange: 15, entriesInRange: 2, avgProgress: 75 });
  });
});
