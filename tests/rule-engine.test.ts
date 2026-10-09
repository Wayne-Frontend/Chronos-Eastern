import { describe, expect, it } from 'vitest'

import { findVerifiedRulePack } from '../miniprogram/data/rules/manifest'
import { TRAVEL_RULE_PACK } from '../miniprogram/data/rules/travel.v1'
import { SOURCES } from '../miniprogram/data/sources'
import { getDateInfo } from '../miniprogram/services/calendar-service'
import { buildDateFacts, evaluateDay, evaluateRule } from '../miniprogram/services/rule-engine'
import type { DateFacts } from '../miniprogram/services/rule-engine'
import type { RuleDefinition } from '../miniprogram/types/rule'

function factsOf(dateKey: string): DateFacts {
  const info = getDateInfo(dateKey)

  if (!info.ok) {
    throw new Error(`日期服务计算失败：${dateKey}（${info.code}）`)
  }

  return buildDateFacts(info.value)
}

function evaluate(dateKey: string) {
  return evaluateDay(TRAVEL_RULE_PACK, factsOf(dateKey))
}

function syntheticRule(overrides: Partial<RuleDefinition>): RuleDefinition {
  return {
    id: 'test-rule',
    traditionId: 'test',
    eventType: 'travel',
    status: 'verified',
    effect: 'include',
    conflictGroup: 'test-group',
    priority: null,
    when: { all: [{ fact: 'jianChu', operator: 'in', value: ['建'] }] },
    sourceIds: [],
    locator: '测试用',
    explanation: '测试用',
    limitations: [],
    ...overrides,
  }
}

describe('buildDateFacts', () => {
  it('拆出干支与建除，缺字段留 null', () => {
    const facts = factsOf('2026-10-09')

    expect(facts.jianChu).toBe('破')
    expect(facts.ganzhi.dayCivil).toEqual({ stem: '丙', branch: '辰' })
    expect(facts.ganzhi.monthJieQi).toEqual({ stem: '戊', branch: '戌' })
    expect(facts.solarTerm).toBeNull()
    expect(facts.lunar).toEqual({ month: 8, day: 29, isLeapMonth: false })
  })

  it('节气日带上节气名', () => {
    expect(factsOf('2026-10-08').solarTerm).toBe('寒露')
  })
})

describe('evaluateRule', () => {
  it('命中与未命中', () => {
    expect(evaluateRule(syntheticRule({}), factsOf('2026-10-02'))).toBe('matched')
    expect(evaluateRule(syntheticRule({}), factsOf('2026-10-03'))).toBe('not_matched')
  })

  it('未知字段路径按缺输入处理，不当作未命中', () => {
    const rule = syntheticRule({
      when: { all: [{ fact: 'ganzhi.dayCivil.hour', operator: 'in', value: ['子'] }] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-02'))).toBe('unknown')
  })

  it('未实现的算子按缺输入处理', () => {
    const rule = syntheticRule({
      when: { all: [{ fact: 'jianChu', operator: 'equals', value: ['建'] } as never] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-02'))).toBe('unknown')
  })

  it('只有 verified 规则参与合并', () => {
    const pack = {
      ...TRAVEL_RULE_PACK,
      rules: [
        syntheticRule({ id: 'draft-rule', status: 'draft' }),
        { ...TRAVEL_RULE_PACK.rules[0], id: 'verified-rule' },
      ],
    }

    expect(evaluateDay(pack, factsOf('2026-10-02'))).toMatchObject({
      status: 'pass',
      matchedRuleIds: ['verified-rule'],
    })
  })
})

describe('出行规则包（第一批）', () => {
  // 日期与建除均按卷四规则（建在月建、顺行十二辰）由日支与月支推出。
  it.each([
    ['2026-10-02', '建日', 'pass', ['xjbf-travel-0001']],
    ['2026-05-05', '开日', 'pass', ['xjbf-travel-0002']],
    ['2026-10-05', '平日', 'excluded', ['xjbf-travel-0003']],
    ['2026-10-12', '收日', 'excluded', ['xjbf-travel-0004']],
    ['2026-10-01', '闭日', 'excluded', ['xjbf-travel-0005']],
    ['2026-10-09', '月破', 'excluded', ['xjbf-travel-0006']],
    ['2026-10-10', '巳日', 'excluded', ['xjbf-travel-0007']],
  ])('%s（%s）判定为 %s', (dateKey, _label, status, ruleIds) => {
    const result = evaluate(dateKey)

    expect(result.status).toBe(status)

    const hit = [...result.matchedRuleIds, ...result.excludeRuleIds]

    expect(hit).toEqual(ruleIds)
  })

  it('未命中任何已收录条款的日子不进入结果，也不算异常', () => {
    expect(evaluate('2026-10-03')).toMatchObject({
      status: 'not_matched',
      matchedRuleIds: [],
      excludeRuleIds: [],
    })
  })

  it('纳入与排除同级命中且无来源裁决时返回 unresolved', () => {
    // 2026-05-07 为巳月巳日：既是建日（宜）又是巳日（忌）
    const result = evaluate('2026-05-07')

    expect(result.status).toBe('unresolved')
    expect(result.matchedRuleIds).toEqual(['xjbf-travel-0001'])
    expect(result.excludeRuleIds).toEqual(['xjbf-travel-0007'])
  })

  it('规则包自身完整：全部 verified、优先关系留空、来源可在台账中查到', () => {
    const sourceIds = new Set(SOURCES.map((source) => source.id))

    expect(TRAVEL_RULE_PACK.status).toBe('verified')
    expect(TRAVEL_RULE_PACK.rules.length).toBeGreaterThan(0)

    for (const rule of TRAVEL_RULE_PACK.rules) {
      expect(rule.status, rule.id).toBe('verified')
      expect(rule.priority, rule.id).toBeNull()
      expect(rule.conflictGroup, rule.id).toBe(TRAVEL_RULE_PACK.conflictGroup)
      expect(rule.sourceIds.length, rule.id).toBeGreaterThan(0)
      expect(rule.locator.length, rule.id).toBeGreaterThan(0)

      for (const sourceId of rule.sourceIds) {
        expect(sourceIds.has(sourceId), `${rule.id} → ${sourceId}`).toBe(true)
      }
    }
  })

  it('只返回 verified 的规则包', () => {
    expect(findVerifiedRulePack('travel')?.id).toBe('xjbf-travel')
    expect(findVerifiedRulePack('relocation')).toBeNull()
  })
})
