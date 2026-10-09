import { describe, expect, it } from 'vitest'

import {
  getDateInfo,
  getMonthGrid,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type MonthGridCell,
} from '../miniprogram/services/calendar-service'
import type { DateInfo } from '../miniprogram/types/calendar'

function getValue(dateKey: string): DateInfo {
  const result = getDateInfo(dateKey)

  expect(result.ok).toBe(true)

  if (!result.ok) {
    throw new Error(`日期服务计算失败：${dateKey}`)
  }

  return result.value
}

describe('getDateInfo', () => {
  it('支持范围两端可计算，且口径字段随结果返回', () => {
    expect(getValue('1901-01-01')).toMatchObject({
      dateKey: '1901-01-01',
      timezone: 'Asia/Shanghai',
      lunar: { year: 1900, month: 11, day: 11, monthName: '冬月' },
    })
    expect(getValue('2100-12-31')).toMatchObject({
      dateKey: '2100-12-31',
      lunar: { year: 2100, month: 12, day: 1, monthName: '腊月' },
    })
  })

  it.each(['1900-12-31', '2101-01-01'])('范围外日期拒绝计算：%s', (dateKey) => {
    expect(getDateInfo(dateKey)).toMatchObject({
      ok: false,
      code: 'CALENDAR_OUT_OF_RANGE',
      retryable: false,
      context: { dateKey },
    })
  })

  it.each(['2026-2-3', '2025-02-29', '', '2026-10-32'])('非法日期返回统一错误：%s', (dateKey) => {
    expect(getDateInfo(dateKey)).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
      context: { dateKey },
    })
  })

  it('组装农历、干支、节气与数据版本', () => {
    const value = getValue('2026-10-08')

    expect(value).toMatchObject({
      solar: { year: 2026, month: 10, day: 8, weekday: 4 },
      lunar: { month: 8, day: 28, isLeapMonth: false, dayName: '廿八' },
      ganzhi: { yearLunarNewYear: '丙午', monthJieQi: '戊戌', dayCivil: '乙卯' },
      solarTerm: { name: '寒露', localDate: '2026-10-08' },
      nextSolarTerm: { name: '霜降', localDate: '2026-10-23' },
      versions: { calendarAdapter: 'lunar-javascript@1.7.7' },
    })
  })

  it('闰月日期带出 isLeapMonth', () => {
    expect(getValue('2025-07-25')).toMatchObject({
      lunar: { year: 2025, month: 6, day: 1, isLeapMonth: true, monthName: '闰六月' },
    })
  })

  describe('getMonthGrid', () => {
    function getGrid(year: number, month: number, todayKey = '2026-10-09'): MonthGridCell[] {
      const result = getMonthGrid(year, month, todayKey)

      expect(result.ok).toBe(true)

      if (!result.ok) {
        throw new Error('月历生成失败')
      }

      return result.value
    }

    // 期望日期与农历名取自香港天文台 2026/2024 年文本历表。
    it('按周一起始生成 42 格，首尾由相邻月份补位', () => {
      const grid = getGrid(2026, 10)

      expect(grid).toHaveLength(42)
      expect(grid[0]).toMatchObject({
        dateKey: '2026-09-28',
        day: 28,
        isCurrentMonth: false,
        labelText: '十八',
      })
      expect(grid[3]).toMatchObject({
        dateKey: '2026-10-01',
        day: 1,
        isCurrentMonth: true,
        labelText: '廿一',
      })
      expect(grid[41]).toMatchObject({
        dateKey: '2026-11-08',
        isCurrentMonth: false,
        labelText: '三十',
      })
    })

    it('标签优先级：节气 > 农历初一（月名）> 农历日名', () => {
      const grid = getGrid(2026, 10)
      const cell = (dateKey: string) => grid.find((item) => item.dateKey === dateKey)

      expect(cell('2026-10-08')).toMatchObject({ labelText: '寒露', labelKind: 'solar-term' })
      expect(cell('2026-10-10')).toMatchObject({ labelText: '九月', labelKind: 'lunar-month' })
      expect(cell('2026-10-09')).toMatchObject({ labelText: '廿九', labelKind: 'lunar-day' })
    })

    it('只标记今天一格', () => {
      const grid = getGrid(2026, 10, '2026-10-09')

      expect(grid.filter((item) => item.isToday).map((item) => item.dateKey)).toEqual([
        '2026-10-09',
      ])
    })

    it('闰年 2 月包含 29 日', () => {
      const grid = getGrid(2024, 2)

      expect(grid.find((item) => item.dateKey === '2024-02-29')).toMatchObject({
        day: 29,
        isCurrentMonth: true,
        labelText: '二十',
      })
      expect(grid.filter((item) => item.isCurrentMonth)).toHaveLength(29)
    })

    it('跨年月份的补位日取相邻年份数据', () => {
      const grid = getGrid(2026, 12)

      expect(grid[0]).toMatchObject({ dateKey: '2026-11-30', labelText: '廿二' })
      expect(grid.find((item) => item.dateKey === '2027-01-01')).toMatchObject({
        labelText: '廿四',
        isCurrentMonth: false,
      })
    })

    it('范围外月份拒绝生成', () => {
      expect(getMonthGrid(1900, 12, '2026-10-09')).toMatchObject({
        ok: false,
        code: 'CALENDAR_OUT_OF_RANGE',
      })
      expect(getMonthGrid(2026, 13, '2026-10-09')).toMatchObject({
        ok: false,
        code: 'INVALID_DATE',
      })
    })
  })

  it('世纪闰年规则：2100 年没有 2 月 29 日', () => {
    expect(getDateInfo('2100-02-28')).toMatchObject({ ok: true })
    expect(getDateInfo('2100-02-29')).toMatchObject({ ok: false, code: 'INVALID_DATE' })
    expect(getDateInfo('1901-02-29')).toMatchObject({ ok: false, code: 'INVALID_DATE' })
    expect(SUPPORTED_YEAR_MIN).toBe(1901)
    expect(SUPPORTED_YEAR_MAX).toBe(2100)
  })
})
