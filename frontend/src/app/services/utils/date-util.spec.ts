import { TestBed } from '@angular/core/testing';
import { DateUtil } from './date-util';

describe('DateUtil', () => {
  let service: DateUtil;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateUtil);
  });

  it('インスタンスが作成されること', () => {
    expect(service).toBeTruthy();
  });

  describe('getFormattedDate()', () => {
    it('YYYY-MM-DD 形式の文字列を返すこと', () => {
      const date = new Date(2026, 2, 8); // ローカル時刻の2026-03-08
      expect(DateUtil.getFormattedDate(date)).toBe('2026-03-08');
    });

    it('深夜の時間帯でもローカルの日付を正しく返すこと（タイムゾーンのズレ防止）', () => {
      // 日本時間 (UTC+9) で 3月1日 01:00 の場合、UTC では 2月28日 16:00
      // 以前の toISOString().substring(0, 10) だと "2026-02-28" になっていたバグの確認
      const date = new Date(2026, 2, 1, 1, 0, 0); 
      expect(DateUtil.getFormattedDate(date)).toBe('2026-03-01');
    });

    it('一桁の月日が 0 埋めされること', () => {
      const date = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01
      expect(DateUtil.getFormattedDate(date)).toBe('2026-01-01');
    });
  });

  describe('addDays()', () => {
    it('指定した日数が加算されること', () => {
      const date = new Date(2026, 2, 8);
      const newDate = DateUtil.addDays(date, 5);
      expect(newDate.getDate()).toBe(13);
    });

    it('月を跨ぐ加算が正しく行われること', () => {
      const date = new Date(2026, 2, 30); // 3月30日
      const newDate = DateUtil.addDays(date, 2);
      expect(newDate.getMonth()).toBe(3); // 4月 (0-indexed なので 3)
      expect(newDate.getDate()).toBe(1);
    });

    it('負の値を指定すると日数が減算されること', () => {
      const date = new Date(2026, 3, 1); // 4月1日
      const newDate = DateUtil.addDays(date, -1);
      expect(newDate.getMonth()).toBe(2); // 3月
      expect(newDate.getDate()).toBe(31);
    });

    it('年を跨ぐ加算が正しく行われること', () => {
      const date = new Date(2025, 11, 31);
      const newDate = DateUtil.addDays(date, 1);
      expect(newDate.getFullYear()).toBe(2026);
      expect(newDate.getMonth()).toBe(0);
      expect(newDate.getDate()).toBe(1);
    });
  });

  describe('addMonths()', () => {
    it('指定した月数が加算されること', () => {
      const date = new Date(2026, 2, 8); // 3月
      const newDate = DateUtil.addMonths(date, 2);
      expect(newDate.getMonth()).toBe(4); // 5月
    });

    it('年を跨ぐ月加算が正しく行われること', () => {
      const date = new Date(2025, 10, 1); // 11月
      const newDate = DateUtil.addMonths(date, 3);
      expect(newDate.getFullYear()).toBe(2026);
      expect(newDate.getMonth()).toBe(1); // 2月
    });

    it('負の値を指定すると月数が減算されること', () => {
      const date = new Date(2026, 1, 1); // 2月1日
      const newDate = DateUtil.addMonths(date, -2);
      expect(newDate.getFullYear()).toBe(2025);
      expect(newDate.getMonth()).toBe(11); // 12月
    });
  });
});
