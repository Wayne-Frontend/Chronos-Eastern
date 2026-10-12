import { describe, expect, it } from 'vitest'

import { ADJUDICATION_CLAUSES } from '../miniprogram/data/rules/adjudication'
import { OPENING_RULE_PACK } from '../miniprogram/data/rules/opening.v1'
import { getDateInfo } from '../miniprogram/services/calendar-service'
import {
  applyAdjudication,
  findApplicableClause,
  isShenshaPresent,
} from '../miniprogram/services/rule-adjudication'
import { buildDateFacts, evaluateDay, evaluateRule } from '../miniprogram/services/rule-engine'
import type { DateFacts } from '../miniprogram/services/rule-engine'

function factsOf(dateKey: string): DateFacts {
  const info = getDateInfo(dateKey)

  if (!info.ok) {
    throw new Error(`日期服务计算失败：${dateKey}（${info.code}）`)
  }

  return buildDateFacts(info.value)
}

function ruleOf(name: string) {
  const rule = OPENING_RULE_PACK.rules.find((item) => item.name === name)

  if (!rule) {
    throw new Error(`规则不存在：${name}`)
  }

  return rule
}

/**
 * 卷十裁决条款（只含「解除忌项」的两种结论：「併則不忌」与「止忌…餘皆不忌」）。
 * 用例守四件事：德神当值判定取自正典月表、条款只在其月支内生效、
 * 残余忌项清单按事项判断、未覆盖的情形一律维持常例——最后一件是这套机制偏保守的底线。
 */
describe('卷十裁决条款', () => {
  it('德神当值判定取自正典月表：卯月的月德在甲日，四仲月的天德不存在', () => {
    const jiaDay = factsOf('2026-03-11')

    expect(jiaDay.ganzhi.monthJieQi?.branch).toBe('卯')
    expect(jiaDay.ganzhi.dayCivil?.stem).toBe('甲')
    expect(isShenshaPresent('月德', jiaDay)).toBe(true)
    // 二月、五月、八月、十一月的天德是空串哨兵，永不等于任何日干（判定不折算卦位）。
    expect(isShenshaPresent('天德', jiaDay)).toBe(false)
    // 未登记的神煞返回 null（不可判），调用方不得当作满足。
    expect(isShenshaPresent('不存在的德神', jiaDay)).toBeNull()
  })

  it('九空条在寅月满日遇月德时生效，无德神的日子不生效', () => {
    const withDeity = factsOf('2026-02-11')
    const withoutDeity = factsOf('2026-02-23')

    for (const facts of [withDeity, withoutDeity]) {
      expect(evaluateRule(ruleOf('九空'), facts)).toBe('matched')
      expect(evaluateRule(ruleOf('满日'), facts)).toBe('matched')
    }

    // 接入后：遇月德的一日由「慎」改判为「宜」，并把解除的那条忌记进 adjudicatedRuleIds；
    // 无德神的一日仍按常例不出结论。
    const lifted = evaluateDay(OPENING_RULE_PACK, withDeity)

    expect(lifted.status).toBe('pass')
    expect(lifted.adjudicatedRuleIds).toHaveLength(1)
    expect(evaluateDay(OPENING_RULE_PACK, withoutDeity).status).toBe('unresolved')

    expect(isShenshaPresent('月德', withDeity)).toBe(true)
    expect(findApplicableClause('九空', withDeity, 'opening')?.outcome).toBe('lift')
    expect(findApplicableClause('九空', withoutDeity, 'opening')).toBeNull()
  })

  it('灾煞条：寅申巳亥月值开日、辰戌丑未月值满日，遇德神即解除', () => {
    const facts = factsOf('2026-12-01')

    expect(evaluateRule(ruleOf('灾煞'), facts)).toBe('matched')
    expect(findApplicableClause('灾煞', facts, 'opening')?.outcome).toBe('lift')
  })

  it('劫煞条：寅申月值收日遇六合即解除，不要求德神', () => {
    const facts = factsOf('2026-09-04')

    expect(facts.ganzhi.monthJieQi?.branch).toBe('申')
    expect(evaluateRule(ruleOf('劫煞'), facts)).toBe('matched')
    expect(isShenshaPresent('六合', facts)).toBe(true)
    expect(findApplicableClause('劫煞', facts, 'opening')?.outcome).toBe('lift')
  })

  it('四耗条按「月支 ＋ 指定德神」逐组解除，三合按月取集合判断', () => {
    // 2026-02-07 为寅月四耗日、天德合当值；辰戌丑未月的四耗日则要「与三合并」。
    const yinShen = factsOf('2026-02-07')

    expect(evaluateRule(ruleOf('四耗'), yinShen)).toBe('matched')
    expect(findApplicableClause('四耗', yinShen, 'opening')).not.toBeNull()

    const chenXu = factsOf('2026-10-11')

    expect(evaluateRule(ruleOf('四耗'), chenXu)).toBe('matched')
    expect(isShenshaPresent('三合', chenXu)).toBe(true)
    expect(findApplicableClause('四耗', chenXu, 'opening')).not.toBeNull()
  })

  it('四穷条只在正月（寅月）乙亥日与天愿同日时解除', () => {
    // 四穷在寅月的值日正是乙亥（春乙亥），本用例即取该日。
    const facts = factsOf('2026-03-02')

    expect(evaluateRule(ruleOf('四穷'), facts)).toBe('matched')
    expect(facts.ganzhi.dayCivil?.stem).toBe('乙')
    expect(facts.ganzhi.dayCivil?.branch).toBe('亥')
    expect(findApplicableClause('四穷', facts, 'opening')?.outcome).toBe('lift')
  })

  it('条款只覆盖列明的月支：辰戌丑未月的九空日仍按常例', () => {
    // 2026-04-06 为辰月九空日（建除为破），原书此处的处置是「从月破论」，本批未编码。
    const facts = factsOf('2026-04-06')

    expect(evaluateRule(ruleOf('九空'), facts)).toBe('matched')
    expect(facts.jianChu).toBe('破')
    expect(findApplicableClause('九空', facts, 'opening')).toBeNull()
  })

  it('月厌条的残余忌项清单精确挡住五个事项，只对不在清单内的事项解除', () => {
    // 卷十月厌条的「止忌」清单含行幸遣使、般移、結婚姻、納采問名、嫁娶——
    // 即出行、搬家、订婚、提亲、婚嫁五个事项仍在忌中，只有开业等不在清单内的事项解除。
    const facts = factsOf('2026-02-17')

    expect(evaluateRule(ruleOf('月厌'), facts)).toBe('matched')
    expect(findApplicableClause('月厌', facts, 'opening')).not.toBeNull()
    expect(findApplicableClause('月厌', facts, 'travel')).toBeNull()
    expect(findApplicableClause('月厌', facts, 'relocation')).toBeNull()
    expect(findApplicableClause('月厌', facts, 'marriage')).toBeNull()
    expect(findApplicableClause('月厌', facts, 'engagement')).toBeNull()
    expect(findApplicableClause('月厌', facts, 'proposal')).toBeNull()
  })

  it('条款表的字段自洽：结论合法、转致有目标、残余清单是已开放事项的子集', () => {
    const matterIds = ['travel', 'relocation', 'opening', 'marriage', 'engagement', 'proposal']

    for (const clause of ADJUDICATION_CLAUSES) {
      const label = `${clause.shensha} ${clause.monthBranches.join('')}`

      expect(['lift', 'exclude', 'normal', 'delegate'], label).toContain(clause.outcome)

      if (clause.outcome === 'delegate') {
        expect(clause.delegateShensha, label).toBeTruthy()
      }

      // 残余清单只在「止忌…余皆不忌」的条款上出现，且必须是已开放事项的 id。
      if (clause.outcome !== 'lift') {
        expect(clause.residualEventTypes, label).toEqual([])
      }

      for (const eventType of clause.residualEventTypes) {
        expect(matterIds, `${label} → ${eventType}`).toContain(eventType)
      }
    }
  })

  it('applyAdjudication 只解除条款覆盖的忌项，其余原样保留', () => {
    const facts = factsOf('2026-02-11')
    const evaluation = evaluateDay(OPENING_RULE_PACK, facts)
    const outcome = applyAdjudication(OPENING_RULE_PACK, facts, evaluation.excludeRuleIds)

    expect(outcome.liftedRuleIds).toHaveLength(1)
    expect(outcome.remainingExcludeRuleIds).toHaveLength(0)
    expect(outcome.appliedClauses[0]?.shensha).toBe('九空')

    const plainFacts = factsOf('2026-02-23')
    const plainEvaluation = evaluateDay(OPENING_RULE_PACK, plainFacts)
    const plainOutcome = applyAdjudication(
      OPENING_RULE_PACK,
      plainFacts,
      plainEvaluation.excludeRuleIds,
    )

    expect(plainOutcome.liftedRuleIds).toHaveLength(0)
    expect(plainOutcome.remainingExcludeRuleIds).toEqual(plainEvaluation.excludeRuleIds)
  })
})
