import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseScheduleDays,
  formatScheduleDaysDisplay,
  parseTimeToMinutes,
  formatMinutesToTime,
  formatTo12Hour,
  parseTimeRange,
  DAY_MAP_AR,
  DAY_MAP_EN,
  COURSE_CARD_PALETTES
} from '../src/lib/schedule-utils';

describe('Schedule Utilities Tests', () => {
  describe('parseScheduleDays & formatScheduleDaysDisplay', () => {
    it('handles Arabic day string properly', () => {
      const sch = { days: 'الثلاثاء' };
      assert.deepEqual(parseScheduleDays(sch), ['الثلاثاء']);
      assert.equal(formatScheduleDaysDisplay(sch), 'الثلاثاء');
    });

    it('handles sch.days when daysString is missing (the reported bug)', () => {
      const sch = {
        room: '2168',
        building: '312',
        days: 'الثلاثاء',
        timeRange: '08:25 - 09:15',
        type: 'محاضرة (حضوري)'
      };
      assert.equal(formatScheduleDaysDisplay(sch), 'الثلاثاء');
    });

    it('handles array of Arabic days', () => {
      const sch = { days: ['الأحد', 'الثلاثاء'] };
      assert.deepEqual(parseScheduleDays(sch), ['الأحد', 'الثلاثاء']);
      assert.equal(formatScheduleDaysDisplay(sch), 'الأحد، الثلاثاء');
    });

    it('handles JSON string array of days', () => {
      const sch = { days: '["الأربعاء"]' };
      assert.deepEqual(parseScheduleDays(sch), ['الأربعاء']);
      assert.equal(formatScheduleDaysDisplay(sch), 'الأربعاء');
    });

    it('handles English day names and abbreviations', () => {
      assert.deepEqual(parseScheduleDays({ days: 'Mon, Thu' }), ['الاثنين', 'الخميس']);
      assert.deepEqual(parseScheduleDays({ days: 'MWF' }), ['الاثنين', 'الأربعاء', 'الجمعة']);
      assert.deepEqual(parseScheduleDays({ days: 'TR' }), ['الثلاثاء', 'الخميس']);
    });

    it('handles Arabic single-letter abbreviations (ح، ث)', () => {
      assert.deepEqual(parseScheduleDays({ days: 'ح، ث' }), ['الأحد', 'الثلاثاء']);
      assert.deepEqual(parseScheduleDays({ days: 'ن، خ' }), ['الاثنين', 'الخميس']);
    });

    it('handles Arabic conjunction "و" (الأحد والثلاثاء)', () => {
      assert.deepEqual(parseScheduleDays({ days: 'الأحد والثلاثاء' }), ['الأحد', 'الثلاثاء']);
    });

    it('falls back to "الأيام غير محددة" when no days present', () => {
      assert.equal(formatScheduleDaysDisplay(null), 'الأيام غير محددة');
      assert.equal(formatScheduleDaysDisplay({}), 'الأيام غير محددة');
      assert.equal(formatScheduleDaysDisplay({ days: '' }), 'الأيام غير محددة');
    });
  });

  describe('parseTimeToMinutes & formatMinutesToTime', () => {
    it('parses morning 12h times', () => {
      assert.equal(parseTimeToMinutes('08:25 am'), 8 * 60 + 25);
      assert.equal(parseTimeToMinutes('8:25 ص'), 8 * 60 + 25);
      assert.equal(formatMinutesToTime(505, true), '08:25 ص');
      assert.equal(formatMinutesToTime(505, false), '08:25 am');
    });

    it('parses 24h morning times like "08:25"', () => {
      assert.equal(parseTimeToMinutes('08:25'), 8 * 60 + 25);
    });

    it('parses 24h afternoon times like "13:25" and "14:20"', () => {
      assert.equal(parseTimeToMinutes('13:25'), 13 * 60 + 25);
      assert.equal(parseTimeToMinutes('14:20'), 14 * 60 + 20);
      assert.equal(formatMinutesToTime(13 * 60 + 25, true), '01:25 م');
      assert.equal(formatMinutesToTime(14 * 60 + 20, false), '02:20 pm');
    });

    it('handles Saudi daytime heuristic for plain single-digit afternoon hours', () => {
      // 01:25 without AM/PM is daytime PM (1:25 PM)
      assert.equal(parseTimeToMinutes('01:25'), 13 * 60 + 25);
      assert.equal(parseTimeToMinutes('03:40'), 15 * 60 + 40);
    });

    it('normalizes times with formatTo12Hour', () => {
      assert.equal(formatTo12Hour('08:25'), '08:25 am');
      assert.equal(formatTo12Hour('09:20'), '09:20 am');
      assert.equal(formatTo12Hour('13:25'), '01:25 pm');
      assert.equal(formatTo12Hour('14:20'), '02:20 pm');
      assert.equal(formatTo12Hour('15:40'), '03:40 pm');
      assert.equal(formatTo12Hour('17:30'), '05:30 pm');
    });
  });

  describe('parseTimeRange', () => {
    it('parses 24h format range with standard hyphen', () => {
      const res = parseTimeRange('08:25 - 09:15');
      assert.equal(res.startTime, '08:25 am');
      assert.equal(res.endTime, '09:15 am');
      assert.equal(res.startMinutes, 505);
      assert.equal(res.endMinutes, 555);
    });

    it('parses 24h format range with en-dash (–)', () => {
      const res = parseTimeRange('13:25 – 14:15');
      assert.equal(res.startTime, '01:25 pm');
      assert.equal(res.endTime, '02:15 pm');
      assert.equal(res.startMinutes, 805);
      assert.equal(res.endMinutes, 855);
    });

    it('falls back safely when timeRange is empty', () => {
      const res = parseTimeRange(null);
      assert.equal(res.startTime, '08:00 am');
      assert.equal(res.endTime, '09:50 am');
    });
  });

  describe('COURSE_CARD_PALETTES', () => {
    it('provides 6 distinct themed color palettes', () => {
      assert.equal(COURSE_CARD_PALETTES.length, 6);
    });

    it('each palette includes all required card, dot, gradient, and box color classes', () => {
      COURSE_CARD_PALETTES.forEach((palette, idx) => {
        assert.ok(palette.bg, `Palette ${idx} should have bg`);
        assert.ok(palette.border, `Palette ${idx} should have border`);
        assert.ok(palette.accent, `Palette ${idx} should have accent`);
        assert.ok(palette.badge, `Palette ${idx} should have badge`);
        assert.ok(palette.dot, `Palette ${idx} should have dot`);
        assert.ok(palette.gradient, `Palette ${idx} should have gradient`);
        assert.ok(palette.boxBorder, `Palette ${idx} should have boxBorder`);
        assert.ok(palette.boxBg, `Palette ${idx} should have boxBg`);
      });
    });

    it('synchronizes palette indexing between schedule sections and registered courses list', () => {
      const effectiveSections = [
        { crn: '26175', courseCode: 'CS101' },
        { crn: '26176', courseCode: 'MATH101' },
        { crn: '26177', courseCode: 'IS101' }
      ];

      const registeredCourse = { crn: '26176', courseCode: 'MATH101', courseName: 'حساب التفاضل' };
      const matchingSecIdx = effectiveSections.findIndex(
        s => (registeredCourse.crn && s.crn === registeredCourse.crn) || s.courseCode === registeredCourse.courseCode
      );

      assert.equal(matchingSecIdx, 1);
      const palette = COURSE_CARD_PALETTES[matchingSecIdx % COURSE_CARD_PALETTES.length];
      assert.ok(palette.boxBorder.includes('sky'), 'MATH101 at index 1 should match sky palette');
    });
  });
});
