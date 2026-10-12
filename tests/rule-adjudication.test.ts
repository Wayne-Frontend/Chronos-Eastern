import { describe, expect, it } from 'vitest'

import { ADJUDICATION_CLAUSES } from '../miniprogram/data/rules/adjudication'
import { RULE_PACKS } from '../miniprogram/data/rules/manifest'
import { OPENING_RULE_PACK } from '../miniprogram/data/rules/opening.v1'
import { getDateInfo } from '../miniprogram/services/calendar-service'
import {
  applyAdjudication,
  findApplicableClause,
  isShenshaPresent,
  resolveShenshaOutcome,
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

  it('猶忌类条款定为忌：只在本条点名的德神并临时生效', () => {
    // 往亡（第 203 帧）：「與德合赦願併猶忌」。2026-11-17 为亥月乙未，天德并临 → 定为忌；
    // 十二日后的丁未日（11-29）同是往亡日，无德神，仍按常例。
    expect(resolveShenshaOutcome('往亡', factsOf('2026-11-17'), 'travel')).toBe('exclude')
    expect(resolveShenshaOutcome('往亡', factsOf('2026-11-29'), 'travel')).toBe('normal')

    // 归忌（第 202 帧）：同样的措辞。2026-04-08 为辰月壬子，天德、月德并临 → 定为忌；
    // 同月的甲子日（04-20）无德神，仍按常例。
    expect(resolveShenshaOutcome('归忌', factsOf('2026-04-08'), 'relocation')).toBe('exclude')
    expect(resolveShenshaOutcome('归忌', factsOf('2026-04-20'), 'relocation')).toBe('normal')

    // 四废（第 192 帧）：「與德合併猶忌」；与月破同日则诸事皆忌。
    // 06-07 壬子既是四废又是午月月破（走月破支路），02-16 辛酉在寅月与月德合并临（走猶忌支路）。
    expect(resolveShenshaOutcome('四废', factsOf('2026-06-07'), 'travel')).toBe('exclude')
    expect(resolveShenshaOutcome('四废', factsOf('2026-02-16'), 'travel')).toBe('exclude')
    // 辰月庚申（04-16）既非月破也无德神，按常例。
    expect(resolveShenshaOutcome('四废', factsOf('2026-04-16'), 'travel')).toBe('normal')
  })

  it('四忌与四穷同条：犹忌句同样管四忌，解除支路只属四穷', () => {
    // 《四忌四窮》是合条。酉月庚子（09-23）为四忌日，月德在庚 → 定为忌；
    // 寅月甲子（02-19）无德神，仍按常例。
    expect(resolveShenshaOutcome('四忌', factsOf('2026-09-23'), 'marriage')).toBe('exclude')
    expect(resolveShenshaOutcome('四忌', factsOf('2026-02-19'), 'marriage')).toBe('normal')

    // 「惟正月乙亥與天願併……餘皆不忌」是四穷之日：同日四穷解除、四忌仍按常例（它没有解除支路）。
    expect(resolveShenshaOutcome('四穷', factsOf('2026-03-02'), 'marriage')).toBe('lift')
    expect(resolveShenshaOutcome('四忌', factsOf('2026-03-02'), 'marriage')).toBe('normal')
  })

  it('灾煞与满日在辰戌丑未月（值满日）的处置：与德合并则解除，再由满日转致', () => {
    // 灾煞条原句是「寅申巳亥月值開日，辰戌丑未月值滿日，與德神併」，此前只写了前一个月组。
    // 2026-08-03 为未月己酉：灾煞日（满日），月德合在己 → 解除；07-10 同是未月灾煞日，无德神，如常例。
    expect(resolveShenshaOutcome('灾煞', factsOf('2026-08-03'), 'opening')).toBe('lift')
    expect(resolveShenshaOutcome('灾煞', factsOf('2026-07-10'), 'opening')).toBe('normal')

    // 满日（第 149 帧）：辰戌丑未月值灾煞，从灾煞论——同一日满日与灾煞同结论。
    expect(resolveShenshaOutcome('满日', factsOf('2026-08-03'), 'engagement')).toBe('lift')
    expect(resolveShenshaOutcome('满日', factsOf('2026-07-10'), 'engagement')).toBe('normal')

    // 巳亥月值月厌，从月厌论；月厌在这两个月的处置是如常例。
    expect(resolveShenshaOutcome('满日', factsOf('2026-05-21'), 'proposal')).toBe('normal')

    // 寅申月值守日、子午卯酉月值相日，与月德天德合月德合月恩四相并则不忌（第 149 帧）。
    // 2026-08-16 为申月壬戌：满日；申子辰月的月德与七月的月恩都在壬，两条德神并临 → 解除。
    // 同日日干壬属水、秋月四相在壬癸，故四相当值也成立——满日条新接入的两个德神之一即由此覆盖。
    expect(resolveShenshaOutcome('满日', factsOf('2026-08-16'), 'engagement')).toBe('lift')
    expect(isShenshaPresent('月德', factsOf('2026-08-16'))).toBe(true)
    expect(isShenshaPresent('月恩', factsOf('2026-08-16'))).toBe(true)
    expect(isShenshaPresent('四相', factsOf('2026-08-16'))).toBe(true)
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

  it('六事项忌项的神煞除「巳日」「亥日」外都有条款覆盖', () => {
    // 巳日、亥日是用事自带的日支忌，卷十的忌项清单里没有对应条目（审计 §5.1），
    // 其余神煞必须各有条款——否则「complete」的说法与被静默按常例处理的神煞不一致。
    const all = new Set(
      RULE_PACKS.flatMap((pack) =>
        pack.rules.filter((rule) => rule.effect === 'exclude').map((rule) => rule.name),
      ),
    )
    const uncovered = [...all]
      .filter((name) => !ADJUDICATION_CLAUSES.some((clause) => clause.shensha === name))
      .sort()

    expect(uncovered).toEqual(['亥日', '巳日'])
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
