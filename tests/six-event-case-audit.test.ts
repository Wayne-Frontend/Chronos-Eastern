import { describe, expect, it } from 'vitest'

import { RULE_PACKS } from '../miniprogram/data/rules/manifest'
import { getDateInfo } from '../miniprogram/services/calendar-service'
import { buildDateFacts, evaluateDay } from '../miniprogram/services/rule-engine'
import type { DayEvaluation } from '../miniprogram/services/rule-engine'
import type { RulePack } from '../miniprogram/types/rule'

const eventIds = ['travel', 'opening', 'relocation', 'marriage', 'engagement', 'proposal'] as const

function evaluate(eventType: (typeof eventIds)[number], dateKey: string): DayEvaluation {
  const pack = RULE_PACKS.find((item) => item.eventType === eventType)
  const info = getDateInfo(dateKey)

  if (!pack || !info.ok) {
    throw new Error(`案例无法计算：${eventType}／${dateKey}`)
  }

  return evaluateDay(pack, buildDateFacts(info.value))
}

function namesOf(pack: RulePack, ids: readonly string[]): string[] {
  return ids.map((id) => {
    const name = pack.rules.find((rule) => rule.id === id)?.name

    if (!name) {
      throw new Error(`案例规则不存在：${pack.eventType}／${id}`)
    }

    return name
  })
}

function ruleNames(eventType: (typeof eventIds)[number], dateKey: string) {
  const pack = RULE_PACKS.find((item) => item.eventType === eventType)

  if (!pack) {
    throw new Error(`案例规则包不存在：${eventType}`)
  }

  const result = evaluate(eventType, dateKey)

  return {
    include: namesOf(pack, result.matchedRuleIds),
    exclude: namesOf(pack, result.excludeRuleIds),
    lifted: namesOf(pack, result.adjudicatedRuleIds),
  }
}

describe('六事项独立日期案例', () => {
  /**
   * 同一日期必须按卷十一各自的用事条目判断；状态表来自 docs/six-event-case-audit.md 的
   * 建除、月神和卷十裁决逐项核对，不能把某个事项的判定复制给其余事项。
   */
  it.each([
    [
      '2026-01-01',
      ['unresolved', 'excluded', 'unresolved', 'excluded', 'unresolved', 'unresolved'],
    ],
    ['2026-01-03', ['pass', 'not_matched', 'pass', 'pass', 'pass', 'pass']],
    ['2026-01-04', ['pass', 'pass', 'unresolved', 'not_matched', 'unresolved', 'unresolved']],
    [
      '2026-01-05',
      ['excluded', 'unresolved', 'unresolved', 'unresolved', 'unresolved', 'unresolved'],
    ],
    ['2026-01-21', ['excluded', 'excluded', 'excluded', 'excluded', 'excluded', 'excluded']],
    ['2026-02-06', ['pass', 'pass', 'pass', 'unresolved', 'pass', 'pass']],
  ] as const)('%s 的六事项结论各自成立', (dateKey, expected) => {
    expect(eventIds.map((eventType) => evaluate(eventType, dateKey).status)).toEqual(expected)
  })

  it('嫁娶、结婚姻、纳采问名在同一天保留各自的宜项', () => {
    const dateKey = '2026-01-03' // 子月丁丑，卷十一三条目的宜项不同。

    expect(ruleNames('marriage', dateKey).include).toContain('不将')
    expect(ruleNames('engagement', dateKey).include).toContain('六合')
    expect(ruleNames('proposal', dateKey).include).not.toContain('六合')
    expect(ruleNames('opening', dateKey)).toEqual({ include: [], exclude: [], lifted: [] })
  })

  it('归忌只作用于般移；五合只作用于结婚姻', () => {
    const dateKey = '2026-01-04' // 子月戊寅：仲月归忌在寅，寅日亦为五合。

    expect(ruleNames('relocation', dateKey).exclude).toContain('归忌')
    expect(ruleNames('travel', dateKey).exclude).not.toContain('归忌')
    expect(ruleNames('engagement', dateKey).include).toContain('五合')
    expect(ruleNames('proposal', dateKey).include).not.toContain('五合')
  })

  it('月破即使与德神同日，也使六事项都明确排除', () => {
    const dateKey = '2026-01-21' // 丑月乙未：未冲丑，为破日。

    for (const eventType of eventIds) {
      expect(ruleNames(eventType, dateKey).exclude, eventType).toContain('月破')
    }
    expect(ruleNames('marriage', dateKey).include).toContain('天德合')
  })

  it('开市的五富宜项不能压过午月小耗与劫煞并见的定忌', () => {
    const dateKey = '2026-06-06' // 午月辛亥；卷十《小耗》明言四仲月与劫煞并仍忌。
    const result = evaluate('opening', dateKey)
    const names = ruleNames('opening', dateKey)

    expect(result.status).toBe('excluded')
    expect(names.include).toContain('五富')
    expect(names.exclude).toEqual(['小耗', '劫煞'])
    expect(result.adjudications).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: '小耗', outcome: 'exclude' })]),
    )
  })

  it('卷十解除只移除相应忌项；嫁娶自带亥日仍保持未决', () => {
    const dateKey = '2026-02-06' // 寅月辛亥：收日、劫煞可解除；嫁娶另忌亥日。

    for (const eventType of eventIds) {
      expect(ruleNames(eventType, dateKey).lifted, eventType).toEqual(['收日', '劫煞'])
    }
    expect(evaluate('marriage', dateKey).status).toBe('unresolved')
    expect(ruleNames('marriage', dateKey).exclude).toContain('亥日')
    expect(ruleNames('engagement', dateKey).exclude).not.toContain('亥日')
  })

  it('立春交节当日六事项统一切换到寅月，各自仍按原条目取值', () => {
    const before = getDateInfo('2026-02-03')
    const onTerm = getDateInfo('2026-02-04')

    if (!before.ok || !onTerm.ok) {
      throw new Error('立春案例日期计算失败')
    }

    expect(before.value.ganzhi.monthJieQi).toBe('己丑')
    expect(onTerm.value.ganzhi.monthJieQi).toBe('庚寅')
    expect(onTerm.value.solarTerm?.name).toBe('立春')
    for (const eventType of eventIds) {
      expect(ruleNames(eventType, '2026-02-04').exclude, eventType).toContain('天吏')
    }
  })
})
