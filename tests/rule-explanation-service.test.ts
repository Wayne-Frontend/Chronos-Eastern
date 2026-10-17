import { describe, expect, it } from 'vitest'

import { getDateRuleExplanation } from '../miniprogram/services/rule-explanation-service'
import { RULE_PACKS } from '../miniprogram/data/rules/manifest'

describe('getDateRuleExplanation', () => {
  it.each(RULE_PACKS.map((pack) => pack.eventType))(
    '整日排除为 %s 返回独立的原因与影印出处',
    (eventType) => {
      const result = getDateRuleExplanation('2026-10-27', eventType)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.value.status).toBe('excluded')
      const evidence = result.value.adjudications[0]!
      expect(evidence).toMatchObject({
        kind: 'day-wide',
        outcome: 'exclude',
        ruleId: null,
        monthBranch: '戌',
        dayPillar: '甲戌',
      })
      expect(evidence.summary).toContain('即使命中宜项')
      expect(evidence.steps[0]?.locator).toContain('172–173 帧')
      expect(evidence.sources[0]).toMatchObject({ id: 'src-xjbf-vol10-scan', kind: 'classic-scan' })
      if (eventType === 'travel') {
        expect(result.value.matchedRules.map((rule) => rule.effect)).toEqual(['include', 'include'])
      }
    },
  )

  it('解除忌项附带真正满足的并临条件，而非笼统的吉神说明', () => {
    const result = getDateRuleExplanation('2026-02-11', 'opening')
    if (!result.ok) throw new Error(result.message)
    expect(result.value.status).toBe('pass')
    const evidence = result.value.adjudications.find((item) => item.name === '九空')!
    expect(evidence.outcome).toBe('lift')
    expect(evidence.steps[0]?.presentShensha).toEqual(['月德'])
    expect(evidence.steps[0]?.locator).toContain('198–199 帧')
    expect(result.value.matchedRules.find((rule) => rule.id === evidence.ruleId)).toMatchObject({
      adjudicated: true,
      adjudicationSummary: evidence.summary,
    })
  })

  it('转致解除保留起点和最终条款的完整出处', () => {
    const result = getDateRuleExplanation('2026-08-03', 'engagement')
    if (!result.ok) throw new Error(result.message)
    expect(result.value.status).toBe('pass')
    const evidence = result.value.adjudications.find((item) => item.name === '满日')!
    expect(evidence.outcome).toBe('lift')
    expect(evidence.steps.map((step) => step.shensha)).toEqual(['满日', '灾煞'])
    expect(evidence.steps[0]?.outcome).toBe('delegate')
    expect(evidence.steps[1]?.locator).toContain('158 帧')
    expect(evidence.summary).toContain('满日 → 灾煞')
  })

  it('犹忌裁决保留定忌依据，残余清单中的事项不误称已解除', () => {
    const excluded = getDateRuleExplanation('2026-11-17', 'travel')
    const residual = getDateRuleExplanation('2026-02-17', 'travel')
    if (!excluded.ok || !residual.ok) throw new Error('样例无法计算')
    expect(excluded.value.status).toBe('excluded')
    expect(excluded.value.adjudications[0]).toMatchObject({
      name: '往亡',
      outcome: 'exclude',
    })
    expect(excluded.value.adjudications[0]?.steps[0]?.locator).toContain('203 帧')
    expect(residual.value.status).toBe('unresolved')
    expect(residual.value.adjudications[0]?.summary).toContain('未获解除')
    expect(residual.value.matchedRules.every((rule) => !rule.adjudicated)).toBe(true)
  })

  it('普通日期不产生额外裁决依据', () => {
    const result = getDateRuleExplanation('2026-10-03', 'travel')
    expect(result.ok && result.value.adjudications).toEqual([])
  })

  it('返回命中规则的完整解释、出处与规则包覆盖范围', () => {
    const result = getDateRuleExplanation('2026-10-03', 'travel')

    expect(result.ok).toBe(true)

    if (!result.ok) {
      return
    }

    expect(result.value).toMatchObject({
      dateKey: '2026-10-03',
      eventType: 'travel',
      eventName: '出行',
      status: 'pass',
      rulePack: {
        id: 'xjbf-travel',
        version: '1.20.0',
      },
    })
    expect(result.value.rulePack.completeness).toBe('complete')
    expect(result.value.rulePack.coverage).toContain('宜项 16 条中收录 16 条')
    expect(result.value.matchedRules).toHaveLength(2)
    expect(result.value.matchedRules[0]).toMatchObject({
      id: 'xjbf-travel-0008',
      effect: 'include',
      status: 'verified',
      explanation: '吉期与建除之除日同位，常居月建前一辰，出行条目列为宜。',
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
      'include',
    ])
  })

  it('拒绝未开放事项和无效日期', () => {
    expect(getDateRuleExplanation('2026-10-02', 'moving-in')).toMatchObject({
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
