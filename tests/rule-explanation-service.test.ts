import { describe, expect, it } from 'vitest'

import { getDateRuleExplanation } from '../miniprogram/services/rule-explanation-service'

describe('getDateRuleExplanation', () => {
  it('返回命中规则的完整解释、出处与规则包覆盖范围', () => {
    const result = getDateRuleExplanation('2026-10-02', 'travel')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value).toMatchObject({
      dateKey: '2026-10-02',
      eventType: 'travel',
      eventName: '出行',
      status: 'pass',
      rulePack: {
        id: 'xjbf-travel',
        version: '1.15.0',
      },
    })
    expect(result.value.rulePack.completeness).toBe('partial')
    expect(result.value.rulePack.coverage).toContain('宜项 16 条中收录 15 条')
    expect(result.value.matchedRules).toHaveLength(2)
    expect(result.value.matchedRules[0]).toMatchObject({
      id: 'xjbf-travel-0001',
      effect: 'include',
      status: 'verified',
      explanation: '建日为月建当日，出行条目列为宜。',
    })
    expect(result.value.unknownRules).toEqual([])
    expect(result.value.matchedRules[0].locator).toContain('卷十一')
    expect(result.value.matchedRules[0].sources[0]).toMatchObject({
      id: 'src-xjbf-vol11-scan',
      kind: 'classic-scan',
    })
  })

  it('规则同级冲突时同时返回纳入与排除依据，不替用户裁决', () => {
    const result = getDateRuleExplanation('2026-05-07', 'travel')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value.status).toBe('unresolved')
    expect(result.value.matchedRules.map((rule) => rule.effect).sort()).toEqual([
      'exclude',
      'include',
    ])
  })

  it('拒绝未开放事项和无效日期', () => {
    expect(getDateRuleExplanation('2026-10-02', 'relocation')).toMatchObject({
      ok: false,
      code: 'RULE_PACK_MISSING',
    })
    expect(getDateRuleExplanation('2026-10-02', 'funeral')).toMatchObject({
      ok: false,
      code: 'RULE_PACK_MISSING',
    })
    expect(getDateRuleExplanation('2026-10-32', 'travel')).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
  })
})
