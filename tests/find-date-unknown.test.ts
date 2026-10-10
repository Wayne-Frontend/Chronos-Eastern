import { describe, expect, it, vi } from 'vitest'

import * as calendarService from '../miniprogram/services/calendar-service'

// 让一个特定日期的干支字段残缺，用于验证未知态（unknown）的端到端语义。
// 原因：当前适配器对合法日期不会算不出干支，unknown 分支只能用构造输入触发。
const BROKEN_DATE = '2026-10-05'

vi.mock('../miniprogram/services/calendar-service', async (importOriginal) => {
  const actual = await importOriginal<typeof calendarService>()

  return {
    ...actual,
    getDateInfo: (dateKey: string) => {
      const info = actual.getDateInfo(dateKey)

      if (dateKey !== BROKEN_DATE || !info.ok) {
        return info
      }

      return {
        ok: true as const,
        value: {
          ...info.value,
          ganzhi: { ...info.value.ganzhi, monthJieQi: '', dayCivil: '' },
        },
      }
    },
  }
})

const { findDates } = await import('../miniprogram/services/find-date-service')

describe('未知态（缺输入）的端到端语义', () => {
  it('缺输入的日期计入 unknownDays，既不算通过也不算排除，更不进冲突列表', async () => {
    // 10-04 为除日兼月德，是已知的通过日；10-05 为构造的缺输入日。
    const result = await findDates({
      eventType: 'travel',
      startDate: '2026-10-04',
      endDate: BROKEN_DATE,
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.summary.checkedDays).toBe(2)
    expect(result.value.summary.unknownDays).toBe(1)
    expect(result.value.summary.passedDays).toBe(1)
    expect(result.value.summary.excludedDays).toBe(0)
    expect(result.value.summary.notMatchedDays).toBe(0)
    expect(result.value.results.map((item) => item.dateKey)).toEqual(['2026-10-04'])
    expect(result.value.conflictDates).not.toContain(BROKEN_DATE)
    // 缺输入不是计算失败：整次查询仍算完整，不得报 partial。
    expect(result.value.summary.errorDays).toBe(0)
    expect(result.value.status).toBe('complete')
  })
})
