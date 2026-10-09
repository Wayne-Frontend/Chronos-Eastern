import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  countDaysBetween,
  dateKeyFromTimestampUtc8,
  getTodayDateKey,
  parseDateKey,
  shiftDateKeyToMonth,
} from '../miniprogram/utils/date-key'

describe('parseDateKey', () => {
  it('解析合法日期键', () => {
    expect(parseDateKey('2026-10-08')).toEqual({
      ok: true,
      value: {
        dateKey: '2026-10-08',
        year: 2026,
        month: 10,
        day: 8,
      },
    })
  })

  it('接受公历闰年的 2 月 29 日', () => {
    expect(parseDateKey('2000-02-29').ok).toBe(true)
  })

  it('拒绝非闰年的 2 月 29 日', () => {
    expect(parseDateKey('2100-02-29')).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
  })

  it('拒绝非标准格式，避免隐式日期解析', () => {
    expect(parseDateKey('2026-1-8')).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
  })
})

describe('dateKeyFromTimestampUtc8', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('按 UTC+8 归属民用日，跨过北京时间午夜才换日', () => {
    // 2026-10-08T15:59:59Z = 北京时间 23:59:59；16:00:00Z = 次日 00:00:00
    expect(dateKeyFromTimestampUtc8(Date.UTC(2026, 9, 8, 15, 59, 59))).toBe('2026-10-08')
    expect(dateKeyFromTimestampUtc8(Date.UTC(2026, 9, 8, 16, 0, 0))).toBe('2026-10-09')
  })

  it.each(['Asia/Shanghai', 'UTC', 'America/Los_Angeles'])('不受宿主时区 %s 影响', (timezone) => {
    vi.stubEnv('TZ', timezone)

    expect(dateKeyFromTimestampUtc8(Date.UTC(2026, 0, 1, 0, 0, 0))).toBe('2026-01-01')
    expect(dateKeyFromTimestampUtc8(Date.UTC(2025, 11, 31, 16, 30, 0))).toBe('2026-01-01')
  })

  it('以设备当前时刻生成今天', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T16:00:00Z'))

    expect(getTodayDateKey()).toBe('2026-10-09')
  })
})

describe('shiftDateKeyToMonth', () => {
  it.each([
    ['2026-10-09', 2026, 11, '2026-11-09'],
    ['2026-12-31', 2027, 1, '2027-01-31'],
    ['2026-01-31', 2026, 2, '2026-02-28'],
    ['2024-01-31', 2024, 2, '2024-02-29'],
    ['2026-03-31', 2026, 4, '2026-04-30'],
  ])('%s 切到 %i-%i → %s', (selectedDateKey, year, month, expected) => {
    expect(shiftDateKeyToMonth(selectedDateKey, year, month)).toBe(expected)
  })

  it('无效选中日时退回该月 1 日', () => {
    expect(shiftDateKeyToMonth('', 2026, 11)).toBe('2026-11-01')
    expect(shiftDateKeyToMonth('2026-02-30', 2026, 11)).toBe('2026-11-01')
  })
})

describe('countDaysBetween', () => {
  it.each([
    ['2026-10-08', '2026-10-08', 0],
    ['2026-10-08', '2026-10-23', 15],
    ['2026-12-31', '2027-01-01', 1],
    ['2026-02-28', '2026-03-01', 1],
    ['2024-02-28', '2024-03-01', 2],
  ])('%s 到 %s 相差 %i 天', (start, end, expected) => {
    expect(countDaysBetween(start, end)).toBe(expected)
  })

  it('任一日期无效时返回 null，不给出猜测值', () => {
    expect(countDaysBetween('2026-10-08', '2026-10-32')).toBeNull()
    expect(countDaysBetween('', '2026-10-08')).toBeNull()
  })
})
