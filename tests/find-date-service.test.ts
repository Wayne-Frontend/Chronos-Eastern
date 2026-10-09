import { describe, expect, it, vi } from 'vitest'

import * as calendarService from '../miniprogram/services/calendar-service'

// 让一个特定日期计算失败，用于验证 partial 语义（当前适配器对合法日期不会失败）。
const FAILING_DATE = '2026-10-05'

vi.mock('../miniprogram/services/calendar-service', async (importOriginal) => {
  const actual = await importOriginal<typeof calendarService>()

  return {
    ...actual,
    getDateInfo: vi.fn((dateKey: string) =>
      dateKey === FAILING_DATE
        ? {
            ok: false as const,
            code: 'CALENDAR_COMPUTE_FAILED' as const,
            message: '构造的失败用例',
            retryable: false,
            context: { dateKey },
          }
        : actual.getDateInfo(dateKey),
    ),
  }
})

const { describeRangeIssue, findDates } = await import('../miniprogram/services/find-date-service')

function query(startDate: string, endDate: string, eventType = 'travel') {
  return findDates({ eventType, startDate, endDate })
}

describe('findDates 输入校验', () => {
  it('未开放的事项禁止查询', async () => {
    expect(await query('2026-10-01', '2026-10-30', 'relocation')).toMatchObject({
      ok: false,
      code: 'RULE_PACK_MISSING',
    })
    expect(await query('2026-10-01', '2026-10-30', 'moving-in')).toMatchObject({
      ok: false,
      code: 'RULE_PACK_MISSING',
    })
    expect(await query('2026-10-01', '2026-10-30', 'funeral')).toMatchObject({
      ok: false,
      code: 'RULE_PACK_MISSING',
    })
  })

  it('limited 事项允许查询', async () => {
    const result = await query('2026-10-03', '2026-10-04')

    expect(result.ok).toBe(true)
    expect(result.ok && result.value.results.map((item) => item.dateKey)).toEqual([
      '2026-10-03',
      '2026-10-04',
    ])
  })

  it('未知事项禁止查询', async () => {
    expect(await query('2026-10-01', '2026-10-30', 'unknown')).toMatchObject({
      ok: false,
      code: 'RULE_PACK_MISSING',
    })
  })

  it.each([
    ['2026-10-31', '2026-10-01', '结束早于开始'],
    ['2026-10-01', '2026-10-01', '单日合法'],
  ])('%s → %s（%s）', async (start, end, label) => {
    const result = await query(start, end)

    if (label === '单日合法') {
      expect(result.ok).toBe(true)
    } else {
      expect(result).toMatchObject({ ok: false, code: 'INVALID_RANGE' })
    }
  })

  it('超过 90 天拒绝查询', async () => {
    expect(await query('2026-10-01', '2027-01-01')).toMatchObject({
      ok: false,
      code: 'INVALID_RANGE',
    })
    expect((await query('2026-10-01', '2026-12-29')).ok).toBe(true)
  })

  it('非法日期与超范围年份拒绝查询', async () => {
    expect(await query('2026-10-32', '2026-11-01')).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
    expect(await query('1900-12-01', '1900-12-30')).toMatchObject({
      ok: false,
      code: 'CALENDAR_OUT_OF_RANGE',
    })
  })
})

describe('findDates 筛选结果', () => {
  it('按日期升序返回通过的日子，并给出规则说明', async () => {
    const result = await query('2026-10-03', '2026-10-04')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.status).toBe('complete')
    expect(result.value.results.map((item) => item.dateKey)).toEqual(['2026-10-03', '2026-10-04'])
    expect(result.value.results[0]).toMatchObject({
      weekdayText: '星期六',
      lunarText: '农历八月廿三',
      tagText: '',
      matchedCount: 2,
    })
    expect(result.value.results[0].ruleTexts[0]).toContain('吉期')
    expect(result.value.results[1].ruleTexts[0]).toContain('驿马')
  })

  it('结果严格按日期升序，重复查询结果一致', async () => {
    const first = await query('2026-10-01', '2026-11-30')
    const second = await query('2026-10-01', '2026-11-30')

    expect(first.ok && second.ok).toBe(true)

    if (!first.ok || !second.ok) {
      return
    }

    const keys = first.value.results.map((item) => item.dateKey)

    expect([...keys].sort()).toEqual(keys)
    expect(second.value.results).toEqual(first.value.results)
  })

  it('汇总计数覆盖全部被检查的日子', async () => {
    const result = await query('2026-10-01', '2026-10-31')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    const { summary } = result.value

    expect(summary.checkedDays).toBe(31)
    expect(
      summary.passedDays +
        summary.excludedDays +
        summary.conflictDays +
        summary.notMatchedDays +
        summary.unknownDays +
        summary.errorDays,
    ).toBe(summary.checkedDays)
    expect(summary.passedDays).toBe(result.value.results.length)
  })

  it('纳入与排除同级命中的日子记入冲突计数、不进入结果', async () => {
    // 巳月巳日中，05-07、05-19 既是建日（宜）又是巳日（忌）；
    // 巳月为四月，月德在庚、月德合在乙，另有两日因月神与忌项同日而冲突。
    const result = await query('2026-05-05', '2026-05-20')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.summary.conflictDays).toBe(12)
    expect(result.value.results.map((item) => item.dateKey)).not.toContain('2026-05-07')
    // 冲突日期必须连同计数一起返回，页面才能逐日说明，而不是让日期凭空消失。
    expect(result.value.conflictDates).toHaveLength(12)
    expect(result.value.conflictDates).toContain('2026-05-07')
    expect([...result.value.conflictDates].sort()).toEqual(result.value.conflictDates)
  })

  it('无冲突时冲突日期为空数组，不制造空占位', async () => {
    // 10-03 为除日兼月德、10-04 为驿马，两日均只命中宜项。
    const result = await query('2026-10-03', '2026-10-04')

    expect(result.ok && result.value.conflictDates).toEqual([])
    expect(result.ok && result.value.summary.conflictDays).toBe(0)
  })

  it('任一日期计算失败时整次查询标为 partial，并保留错误计数', async () => {
    const result = await query(FAILING_DATE, '2026-10-08')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.status).toBe('partial')
    expect(result.value.summary.errorDays).toBe(1)
  })

  it('携带规则包版本、覆盖范围与完整性，供页面展示', async () => {
    const result = await query('2026-10-01', '2026-10-03')

    expect(result.ok && result.value.rulePack).toMatchObject({
      id: 'xjbf-travel',
      version: '1.17.1',
      completeness: 'partial',
    })
    expect(result.ok && result.value.rulePack.coverage.length).toBeGreaterThan(0)
  })

  it('90 天范围分批计算并上报进度', async () => {
    const progress: number[] = []
    const result = await findDates(
      { eventType: 'travel', startDate: '2026-10-01', endDate: '2026-12-29' },
      { onProgress: (checked) => progress.push(checked) },
    )

    expect(result.ok).toBe(true)
    expect(progress[progress.length - 1]).toBe(90)
    expect(progress.length).toBeGreaterThan(1)
  })

  it('历法换算也按批执行，首次上报进度前不预计算完整 90 天', async () => {
    const callCountsAtProgress: number[] = []

    vi.mocked(calendarService.getDateInfo).mockClear()

    await findDates(
      { eventType: 'travel', startDate: '2027-01-01', endDate: '2027-03-31' },
      {
        onProgress: () => {
          callCountsAtProgress.push(vi.mocked(calendarService.getDateInfo).mock.calls.length)
        },
      },
    )

    expect(callCountsAtProgress[0]).toBeLessThanOrEqual(13)
  })
})

describe('describeRangeIssue', () => {
  it('合法范围返回空串，含正好达到上限的边界', () => {
    expect(describeRangeIssue('2026-10-11', '2026-10-11', 90)).toBe('')
    expect(describeRangeIssue('2026-10-11', '2027-01-08', 90)).toBe('')
  })

  it('起始日晚于结束日时提示不能早于', () => {
    expect(describeRangeIssue('2026-11-20', '2026-10-11', 90)).toBe('结束日期不能早于开始日期')
  })

  it('超过上限时同时说明上限与当前选择的天数', () => {
    expect(describeRangeIssue('2026-10-11', '2027-01-09', 90)).toBe(
      '查询范围最长 90 天，当前选择了 91 天',
    )
    expect(describeRangeIssue('2026-10-11', '2027-03-01', 90)).toBe(
      '查询范围最长 90 天，当前选择了 142 天',
    )
  })

  it('判据与查询失败时的 INVALID_RANGE 文案同源，页面与结果不会各说各话', async () => {
    const result = await query('2026-10-11', '2027-03-01')

    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_RANGE',
      message: describeRangeIssue('2026-10-11', '2027-03-01', 90),
    })
  })
})
