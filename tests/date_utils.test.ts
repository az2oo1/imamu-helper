import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  parseDate, 
  formatDate, 
  formatHijriDate, 
  getCountdown, 
  calculateMokafaaDate, 
  calculateProgressPercent, 
  getEventCategoryMeta 
} from '../src/lib/date-utils';

describe('Unified Date Utilities (date-utils.ts)', () => {

  describe('parseDate()', () => {
    it('should parse YYYY-MM-DD correctly', () => {
      const d = parseDate('2026-09-23');
      assert.ok(d instanceof Date);
      assert.equal(d.getFullYear(), 2026);
      assert.equal(d.getMonth(), 8); // 0-indexed month (September = 8)
      assert.equal(d.getDate(), 23);
    });

    it('should parse DD/MM/YYYY correctly', () => {
      const d = parseDate('23/09/2026');
      assert.ok(d instanceof Date);
      assert.equal(d.getFullYear(), 2026);
      assert.equal(d.getMonth(), 8);
      assert.equal(d.getDate(), 23);
    });

    it('should parse ISO timestamp string', () => {
      const d = parseDate('2026-09-23T15:45:00.000Z');
      assert.ok(d instanceof Date);
      assert.equal(isNaN(d.getTime()), false);
    });

    it('should return Date instance as-is if valid', () => {
      const dateInst = new Date(2026, 8, 23);
      assert.equal(parseDate(dateInst), dateInst);
    });

    it('should parse numeric timestamps', () => {
      const ts = 1790179200000;
      const d = parseDate(ts);
      assert.ok(d instanceof Date);
      assert.equal(d.getTime(), ts);
    });

    it('should return null for null, undefined, empty string or invalid input', () => {
      assert.equal(parseDate(null), null);
      assert.equal(parseDate(undefined), null);
      assert.equal(parseDate(''), null);
      assert.equal(parseDate('   '), null);
      assert.equal(parseDate('invalid-date-string'), null);
    });
  });

  describe('formatDate()', () => {
    const sampleDate = new Date(2026, 8, 23, 15, 45, 0); // 2026-09-23 15:45

    it('should format iso-date preset', () => {
      assert.equal(formatDate(sampleDate, 'iso-date'), '2026-09-23');
    });

    it('should format ar-display preset', () => {
      const formatted = formatDate(sampleDate, 'ar-display');
      assert.ok(typeof formatted === 'string' && formatted.length > 0);
    });

    it('should format ics preset', () => {
      const formatted = formatDate(sampleDate, 'ics');
      assert.equal(formatted.startsWith('20260923T'), true);
      assert.equal(formatted.endsWith('Z'), true);
    });

    it('should return "-" for invalid date input', () => {
      assert.equal(formatDate(null), '-');
      assert.equal(formatDate('invalid'), '-');
    });
  });

  describe('formatHijriDate()', () => {
    it('should format Hijri date correctly with هـ suffix', () => {
      const sampleDate = new Date(2026, 8, 23);
      const hijriStr = formatHijriDate(sampleDate);
      assert.ok(hijriStr.includes('هـ'));
    });
  });

  describe('getCountdown()', () => {
    it('should calculate future countdown correctly', () => {
      const now = new Date(2026, 8, 20, 10, 0, 0);
      const target = new Date(2026, 8, 23, 12, 30, 15);
      const cd = getCountdown(target, now);
      assert.equal(cd.isPast, false);
      assert.equal(cd.days, 3);
      assert.equal(cd.hours, 2);
      assert.equal(cd.minutes, 30);
      assert.equal(cd.seconds, 15);
    });

    it('should mark past target date correctly', () => {
      const now = new Date(2026, 8, 24);
      const target = new Date(2026, 8, 20);
      const cd = getCountdown(target, now);
      assert.equal(cd.isPast, true);
      assert.equal(cd.days, 0);
    });

    it('should detect isToday accurately', () => {
      const now = new Date(2026, 8, 23, 10, 0, 0);
      const target = new Date(2026, 8, 23, 18, 0, 0);
      const cd = getCountdown(target, now);
      assert.equal(cd.isToday, true);
    });
  });

  describe('calculateMokafaaDate()', () => {
    it('should keep 27th when 27th is a weekday (e.g. Wednesday 27 May 2026)', () => {
      // May 27, 2026 is a Wednesday (getDay() === 3)
      const d = calculateMokafaaDate(2026, 4); // May (month 4)
      assert.equal(d.getDate(), 27);
    });

    it('should adjust Friday 27th to Thursday 26th', () => {
      // November 27, 2026 is a Friday (getDay() === 5)
      const d = calculateMokafaaDate(2026, 10); // Nov (month 10)
      assert.equal(d.getDate(), 26);
    });

    it('should adjust Saturday 27th to Sunday 28th', () => {
      // June 27, 2026 is a Saturday (getDay() === 6)
      const d = calculateMokafaaDate(2026, 5); // June (month 5)
      assert.equal(d.getDate(), 28);
    });
  });

  describe('calculateProgressPercent()', () => {
    it('should calculate 50% correctly', () => {
      const start = new Date(2026, 8, 1);
      const end = new Date(2026, 8, 11);
      const now = new Date(2026, 8, 6);
      assert.equal(calculateProgressPercent(start, end, now), 50);
    });

    it('should clamp percent between 0 and 100', () => {
      const start = new Date(2026, 8, 1);
      const end = new Date(2026, 8, 10);
      
      const beforeStart = new Date(2026, 7, 25);
      assert.equal(calculateProgressPercent(start, end, beforeStart), 0);

      const afterEnd = new Date(2026, 8, 20);
      assert.equal(calculateProgressPercent(start, end, afterEnd), 100);
    });
  });

  describe('getEventCategoryMeta()', () => {
    it('should return metadata for semester start', () => {
      const meta = getEventCategoryMeta({ isSemesterStart: true });
      assert.ok(meta);
      assert.ok(meta.label.includes('بداية الفصل'));
    });

    it('should return metadata for holiday', () => {
      const meta = getEventCategoryMeta({ isHoliday: true });
      assert.ok(meta);
      assert.ok(meta.label.includes('إجازة'));
    });

    it('should return metadata for Eid', () => {
      const meta = getEventCategoryMeta({ isEid: true });
      assert.ok(meta);
      assert.ok(meta.label.includes('العيد'));
    });

    it('should return null when no flags are active', () => {
      assert.equal(getEventCategoryMeta({}), null);
    });
  });

});
