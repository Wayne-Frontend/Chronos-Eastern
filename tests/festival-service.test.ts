import { describe, expect, it } from 'vitest'

import { FESTIVALS } from '../miniprogram/data/festivals'
import { SOURCES } from '../miniprogram/data/sources'
import { getDateInfo } from '../miniprogram/services/calendar-service'
import { matchFestivals } from '../miniprogram/services/festival-service'
import type { DateInfo } from '../miniprogram/types/calendar'
import { addDaysToDateKey } from '../miniprogram/utils/date-key'

function getInfo(dateKey: string): DateInfo {
  const result = getDateInfo(dateKey)

  expect(result.ok).toBe(true)

  if (!result.ok) {
    throw new Error(`日期服务计算失败：${dateKey}`)
  }

  return result.value
}

function match(dateKey: string): string[] {
  const nextDayKey = addDaysToDateKey(dateKey, 1)

  return matchFestivals(getInfo(dateKey), nextDayKey ? safeInfo(nextDayKey) : null).map(
    (festival) => festival.name,
  )
}

function safeInfo(dateKey: string): DateInfo | null {
  const result = getDateInfo(dateKey)

  return result.ok ? result.value : null
}

// 日期期望值取自香港天文台 2026 年文本历表。
describe('matchFestivals', () => {
  it.each([
    ['2026-02-17', ['春节']],
    ['2026-03-03', ['元宵节']],
    ['2026-04-05', ['清明节']],
    ['2026-06-19', ['端午节']],
    ['2026-08-19', ['七夕节']],
    ['2026-08-27', ['中元节']],
    ['2026-09-25', ['中秋节']],
    ['2026-10-18', ['重阳节']],
    ['2027-01-15', ['腊八节']],
    ['2026-12-22', ['冬至']],
  ])('%s 匹配到 %j', (dateKey, expected) => {
    expect(match(dateKey)).toEqual(expected)
  })

  it('除夕按次日是否为正月初一判断，腊月只有廿九时同样成立', () => {
    expect(match('2026-02-16')).toEqual(['除夕'])
    expect(getInfo('2026-02-16').lunar.dayName).toBe('廿九')
    expect(match('2026-02-15')).toEqual([])
  })

  it('腊月只有廿九的年份同样能判断除夕', () => {
    expect(match('2028-01-25')).toEqual(['除夕'])
  })

  it('同日多个节日按传统节日在前排序', () => {
    // 2020-10-01 同时是八月十五（中秋）与国庆节，HKO 历表确认为十五
    expect(match('2020-10-01')).toEqual(['中秋节', '国庆节'])
  })

  it('闰月不匹配农历固定节日', () => {
    // 2025 年闰六月，闰六月十五不应匹配中元节
    expect(match('2025-08-08')).toEqual([])
  })

  it('每条节日都带可查证的来源，且来源表里存在', () => {
    const sourceIds = new Set(SOURCES.map((source) => source.id))

    for (const festival of FESTIVALS) {
      expect(festival.sourceIds.length, festival.name).toBeGreaterThan(0)

      for (const sourceId of festival.sourceIds) {
        expect(sourceIds.has(sourceId), `${festival.name} → ${sourceId}`).toBe(true)
      }
    }
  })
})
