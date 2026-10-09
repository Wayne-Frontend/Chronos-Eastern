import { describe, expect, it } from 'vitest'

import { getLunarDateFacts } from '../miniprogram/adapters/lunar-adapter'
import type { DateKey } from '../miniprogram/types/calendar'
import { parseDateKey } from '../miniprogram/utils/date-key'
import { getGregorianMonthDays } from '../miniprogram/utils/util'
import { SOLAR_TERM_AUTHORITY } from './fixtures/solar-terms-authority'

interface ScannedTerm {
  name: string
  instant: string
}

const yearCache = new Map<number, Map<DateKey, ScannedTerm>>()

/** 全年逐日扫描适配器输出，收集被判定为节气日的日期。 */
function scanYear(year: number): Map<DateKey, ScannedTerm> {
  const cached = yearCache.get(year)

  if (cached) {
    return cached
  }

  const found = new Map<DateKey, ScannedTerm>()

  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= getGregorianMonthDays(year, month); day++) {
      const facts = getLunarDateFacts({ year, month, day })

      if (!facts.ok) {
        throw new Error(`适配器计算失败：${year}-${month}-${day}`)
      }

      const term = facts.value.solarTerm

      if (!term) {
        continue
      }

      const queried = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      expect(term.localDate).toBe(queried)
      found.set(term.localDate, { name: term.name, instant: term.instant })
    }
  }

  yearCache.set(year, found)

  return found
}

function instantSeconds(instant: string): number {
  const match = /T(\d{2}):(\d{2}):(\d{2})\+08:00$/.exec(instant)

  if (!match) {
    throw new Error(`交节时刻格式异常：${instant}`)
  }

  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

describe('二十四节气与权威资料比对', () => {
  it.each(SOLAR_TERM_AUTHORITY)(
    '$year 年全年 24 个节气日期与 $source.name 完全一致',
    ({ year, terms }) => {
      const scanned = scanYear(year)
      const expected = new Map<DateKey, string>(
        terms.map((term) => [term.dateKey, term.name] as const),
      )

      expect(scanned.size).toBe(24)
      expect([...scanned.entries()].map(([dateKey, term]) => [dateKey, term.name]).sort()).toEqual(
        [...expected.entries()].sort(),
      )
    },
  )

  it.each(SOLAR_TERM_AUTHORITY.filter((item) => item.source.publishesTime))(
    '$year 年交节时刻与 $source.name 在分钟级一致',
    ({ terms }) => {
      for (const term of terms) {
        const parsed = parseDateKey(term.dateKey)

        expect(parsed.ok).toBe(true)

        if (!parsed.ok || term.hour === null || term.minute === null) {
          continue
        }

        const info = getLunarDateFacts(parsed.value)

        expect(info.ok).toBe(true)

        if (!info.ok || !info.value.solarTerm) {
          throw new Error(`节气日未返回节气：${term.dateKey}`)
        }

        // 来源只公布到分钟，允许 1 分钟取整差；实测最大偏差 31 秒。
        const delta = Math.abs(
          instantSeconds(info.value.solarTerm.instant) - (term.hour * 3600 + term.minute * 60),
        )

        expect(delta, `${term.dateKey} ${term.name}`).toBeLessThanOrEqual(60)
      }
    },
  )
})
