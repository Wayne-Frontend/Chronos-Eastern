import { describe, expect, it } from 'vitest'

import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
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

  it('世纪闰年规则：2100 年没有 2 月 29 日', () => {
    expect(getDateInfo('2100-02-28')).toMatchObject({ ok: true })
    expect(getDateInfo('2100-02-29')).toMatchObject({ ok: false, code: 'INVALID_DATE' })
    expect(getDateInfo('1901-02-29')).toMatchObject({ ok: false, code: 'INVALID_DATE' })
    expect(SUPPORTED_YEAR_MIN).toBe(1901)
    expect(SUPPORTED_YEAR_MAX).toBe(2100)
  })
})
