import {
  toLocalDateString,
  addDays,
  getPriorPeriod,
  formatTime,
} from '../src/lib/dates';

describe('toLocalDateString', () => {
  test('formats date correctly', () => {
    const d = new Date(2024, 9, 26); // Oct 26, 2024 local
    expect(toLocalDateString(d)).toBe('2024-10-26');
  });
  test('pads month and day', () => {
    const d = new Date(2024, 0, 5); // Jan 5
    expect(toLocalDateString(d)).toBe('2024-01-05');
  });
});

describe('addDays', () => {
  test('adds positive days', () => expect(addDays('2024-10-26', 3)).toBe('2024-10-29'));
  test('handles month rollover', () => expect(addDays('2024-10-31', 1)).toBe('2024-11-01'));
  test('subtracts days', () => expect(addDays('2024-10-05', -1)).toBe('2024-10-04'));
});

describe('getPriorPeriod', () => {
  test('7-day period shifts back 7 days', () => {
    const range = { startDia: '2024-10-20', endDia: '2024-10-26' };
    const prior = getPriorPeriod(range);
    expect(prior.endDia).toBe('2024-10-19');
    expect(prior.startDia).toBe('2024-10-13');
  });
  test('1-day period shifts back 1 day', () => {
    const range = { startDia: '2024-10-26', endDia: '2024-10-26' };
    const prior = getPriorPeriod(range);
    expect(prior.startDia).toBe('2024-10-25');
    expect(prior.endDia).toBe('2024-10-25');
  });
});

describe('formatTime', () => {
  test('formats epoch to HH:MM', () => {
    // Create a specific timestamp: 14:30 on Oct 26 2024 in local time
    const d = new Date(2024, 9, 26, 14, 30, 0);
    expect(formatTime(d.getTime())).toBe('14:30');
  });
});
