import { afterEach, describe, expect, it, vi } from 'vitest'

import { getLunarDateFacts } from '../miniprogram/adapters/lunar-adapter'
import { parseDateKey } from '../miniprogram/utils/date-key'
import { getGregorianWeekday } from '../miniprogram/utils/util'
import { CALENDAR_AUTHORITY_FIXTURES } from './fixtures/calendar-authority'
import {
  SOLAR_TERM_AUTHORITY,
  type SolarTermAuthorityEntry,
} from './fixtures/solar-terms-authority'

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

/** 取权威样本中的一条；缺时刻时直接抛错，避免断言被静默跳过。 */
function authorityTerm(
  year: number,
  name: string,
): SolarTermAuthorityEntry & {
  hour: number
  minute: number
} {
  const entry = SOLAR_TERM_AUTHORITY.find((item) => item.year === year)?.terms.find(
    (term) => term.name === name,
  )

  if (!entry || entry.hour === null || entry.minute === null) {
    throw new Error(`权威样本缺失或未公布时刻：${year} ${name}`)
  }

  return { ...entry, hour: entry.hour, minute: entry.minute }
}

/** 从 ISO 时刻取出当日的秒数。秒位来自历法库自身输出，按项目约定不作期望值。 */
function instantSeconds(instant: string): number {
  const match = /T(\d{2}):(\d{2}):(\d{2})\+08:00$/.exec(instant)

  if (!match) {
    throw new Error(`交节时刻格式异常：${instant}`)
  }

  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
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

  it('交节当天整日切换年、月干支（按日口径）', () => {
    const liChunDay = getFacts('2026-02-04')
    const afterLiChun = getFacts('2026-02-05')

    expect(liChunDay.solarTerm?.name).toBe('立春')
    expect(liChunDay.ganzhi.yearLunarNewYear).toBe('乙巳')
    expect(liChunDay.ganzhi.yearLiChun).toBe('丙午')
    expect(liChunDay.ganzhi.yearLiChun).toBe(afterLiChun.ganzhi.yearLiChun)
    // 建寅：立春日起月支为寅；丙年正月月干为庚（五虎遁，见《协纪辨方书》卷一）。
    expect(liChunDay.ganzhi.monthJieQi).toBe('庚寅')
    expect(liChunDay.ganzhi.monthJieQi).toBe(afterLiChun.ganzhi.monthJieQi)
    expect(getFacts('2026-02-03').ganzhi.monthJieQi).toBe('己丑')

    const jingZheDay = getFacts('2026-03-05')

    expect(jingZheDay.solarTerm?.name).toBe('惊蛰')
    expect(jingZheDay.ganzhi.monthJieQi).toBe('辛卯')
    expect(jingZheDay.ganzhi.monthJieQi).toBe(getFacts('2026-03-06').ganzhi.monthJieQi)
  })

  it.each(CALENDAR_AUTHORITY_FIXTURES)('星期与公历推算一致 $dateKey', ({ dateKey }) => {
    const { year, month, day, weekday } = getFacts(dateKey).solar

    expect(weekday).toBe(getGregorianWeekday(year, month, day))
  })

  it('返回节气名称、北京时间时刻及下一节气', () => {
    const facts = getFacts('2026-10-08')
    const hanLu = authorityTerm(2026, '寒露')
    const shuangJiang = authorityTerm(2026, '霜降')

    // 时刻只与来源比对到「分钟级 ± 取整」：来源（紫金山《日历资料》，编制标准 GB/T 33661—2017）
    // 只公布到分钟，秒位是历法库自身输出，按评估文档「不得拿库自身输出当期望值」不作断言。
    // 2026 霜降即落在取整边界上：来源作 17:38，库算得 17:37:57。
    expect(facts.solarTerm).toMatchObject({ name: hanLu.name, localDate: hanLu.dateKey })
    expect(facts.nextSolarTerm).toMatchObject({
      name: shuangJiang.name,
      localDate: shuangJiang.dateKey,
    })

    for (const [instant, term] of [
      [facts.solarTerm?.instant ?? '', hanLu],
      [facts.nextSolarTerm?.instant ?? '', shuangJiang],
    ] as const) {
      const delta = Math.abs(instantSeconds(instant) - (term.hour * 3600 + term.minute * 60))

      expect(delta, `${term.dateKey} ${term.name}`).toBeLessThanOrEqual(60)
    }
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
