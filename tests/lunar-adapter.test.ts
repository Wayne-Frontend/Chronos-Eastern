import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLunarDateFacts } from '../miniprogram/adapters/lunar-adapter'
import { parseDateKey } from '../miniprogram/utils/date-key'
import { CALENDAR_AUTHORITY_FIXTURES } from './fixtures/calendar-authority'

function getFacts(dateKey: string) {
  const parsed = parseDateKey(dateKey)
  expect(parsed.ok).toBe(true)

  if (!parsed.ok) {
    throw new Error(`测试夹具日期无效：${dateKey}`)
  }

  const result = getLunarDateFacts(parsed.value)
  expect(result.ok).toBe(true)

  if (!result.ok) {
    throw new Error(`候选历法库计算失败：${dateKey}`)
  }

  return result.value
}

describe('getLunarDateFacts', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(CALENDAR_AUTHORITY_FIXTURES)('匹配权威公农历样本 $dateKey', ({ dateKey, expected }) => {
    expect(getFacts(dateKey).lunar).toEqual(expected)
  })

  it('同时保留春节与立春两种年干支口径', () => {
    const facts = getFacts('2024-02-09')

    expect(facts.ganzhi).toMatchObject({
      yearLunarNewYear: '癸卯',
      yearLiChun: '甲辰',
    })
  })

  it('返回节气名称、北京时间时刻及下一节气', () => {
    const facts = getFacts('2026-10-08')

    expect(facts.solarTerm).toEqual({
      name: '寒露',
      instant: '2026-10-08T14:29:17+08:00',
      localDate: '2026-10-08',
    })
    expect(facts.nextSolarTerm).toEqual({
      name: '霜降',
      instant: '2026-10-23T17:37:57+08:00',
      localDate: '2026-10-23',
    })
  })

  it.each([
    ['2025-12-21', '冬至'],
    ['2026-01-02', null],
    ['2026-01-05', '小寒'],
  ])('覆盖公开节气风险样本 %s', (dateKey, expectedSolarTerm) => {
    expect(getFacts(dateKey).solarTerm?.name ?? null).toBe(expectedSolarTerm)
  })

  it.each(['Asia/Shanghai', 'UTC', 'America/Los_Angeles'])('不受宿主时区 %s 影响', (timezone) => {
    vi.stubEnv('TZ', timezone)

    expect(getFacts('2026-10-08')).toMatchObject({
      dateKey: '2026-10-08',
      lunar: {
        year: 2026,
        month: 8,
        day: 28,
      },
      solarTerm: {
        name: '寒露',
        localDate: '2026-10-08',
      },
    })
  })

  it('拒绝无效公历字段，不把库异常暴露给调用方', () => {
    expect(getLunarDateFacts({ year: 2024, month: 13, day: 1 })).toMatchObject({
      ok: false,
      code: 'CALENDAR_COMPUTE_FAILED',
      retryable: false,
    })
  })
})
