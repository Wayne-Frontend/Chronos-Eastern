import { describe, expect, it } from 'vitest'

import { findVerifiedRulePack, RULE_PACKS } from '../miniprogram/data/rules/manifest'
import { MARRIAGE_RULE_PACK } from '../miniprogram/data/rules/marriage.v1'
import { MONTH_GOD_TABLES } from '../miniprogram/data/rules/month-gods'
import { OPENING_RULE_PACK } from '../miniprogram/data/rules/opening.v1'
import { RELOCATION_RULE_PACK } from '../miniprogram/data/rules/relocation.v1'
import { TRAVEL_RULE_PACK } from '../miniprogram/data/rules/travel.v1'
import { SOURCES } from '../miniprogram/data/sources'
import { getDateInfo } from '../miniprogram/services/calendar-service'
import {
  getJianChu,
  getBranchElement,
  getMonthIndex,
  getSeason,
  getStemElement,
  MONTH_COUNT,
} from '../miniprogram/services/rule-facts'
import { buildDateFacts, evaluateDay, evaluateRule } from '../miniprogram/services/rule-engine'
import type { DateFacts } from '../miniprogram/services/rule-engine'
import type { RuleDefinition } from '../miniprogram/types/rule'
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../miniprogram/utils/ganzhi'

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
    name: '测试用',
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
    expect(facts.dayPillar).toBe('丙辰')
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

  it('month-indexed 按节令月取值：命中与不命中', () => {
    // 表按「正月起」排列，第 8 项（戌月）取「破」，其余月份不可能取到。
    const table = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '破', '癸', '甲', '乙']
    const rule = syntheticRule({
      when: { all: [{ fact: 'jianChu', operator: 'month-indexed', value: table }] },
    })

    // 2026-10-09 为戌月破日，表第 8 项命中。
    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('matched')
    // 2026-10-02 为建日，本月表项为「破」，不命中。
    expect(evaluateRule(rule, factsOf('2026-10-02'))).toBe('not_matched')
  })

  it('month-indexed 表长不是 12 时按缺输入处理，不当作未命中', () => {
    const rule = syntheticRule({
      when: { all: [{ fact: 'jianChu', operator: 'month-indexed', value: ['甲', '乙'] }] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('unknown')
  })

  it('month-indexed-set 按节令月取多项：本月集合内的值命中，集合外不命中', () => {
    // 表按「正月起」排列，第 8 项（戌月）取「建|破」两项。
    const table = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '建|破', '甲', '乙', '丙']
    const rule = syntheticRule({
      when: { all: [{ fact: 'jianChu', operator: 'month-indexed-set', value: table }] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('matched')
    expect(evaluateRule(rule, factsOf('2026-10-02'))).toBe('not_matched')
  })

  it('month-indexed-set 的日柱条件按两字日柱取值', () => {
    // 2026-10-09 的日柱为丙辰（见 buildDateFacts 用例）。
    const table = [
      '甲子',
      '甲子',
      '甲子',
      '甲子',
      '甲子',
      '甲子',
      '甲子',
      '甲子',
      '丙辰|戊午',
      '甲子',
      '甲子',
      '甲子',
    ]
    const rule = syntheticRule({
      when: { all: [{ fact: 'dayPillar', operator: 'month-indexed-set', value: table }] },
    })

    expect(factsOf('2026-10-09').dayPillar).toBe('丙辰')
    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('matched')
    expect(evaluateRule(rule, factsOf('2026-10-10'))).toBe('not_matched')
  })

  it('month-indexed-set 的空串项表示本月无取值，判为不命中而非缺输入', () => {
    // 与 month-indexed 的既定哨兵一致：天德在四仲月留空串，永不等于任何真实取值。
    const table = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '', '甲', '乙', '丙']
    const rule = syntheticRule({
      when: { all: [{ fact: 'jianChu', operator: 'month-indexed-set', value: table }] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('not_matched')
  })

  it('month-indexed-set 表长不是 12 时按缺输入处理', () => {
    const rule = syntheticRule({
      when: { all: [{ fact: 'jianChu', operator: 'month-indexed-set', value: ['建|破'] }] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('unknown')
  })

  it('dayPillar 是按完整日柱取值的入口，供八专这类条款读取', () => {
    const rule = syntheticRule({
      when: { all: [{ fact: 'dayPillar', operator: 'in', value: ['丙辰'] }] },
    })

    expect(evaluateRule(rule, factsOf('2026-10-09'))).toBe('matched')
    expect(evaluateRule(rule, factsOf('2026-10-10'))).toBe('not_matched')
  })

  it('交节当天整日按新月取值', () => {
    // 寒露在 2026-10-08（紫金山样本），戌月自此开始；交节当日即按新月取表。
    expect(factsOf('2026-10-07').ganzhi.monthJieQi).toEqual({ stem: '丁', branch: '酉' })
    expect(factsOf('2026-10-08').ganzhi.monthJieQi).toEqual({ stem: '戊', branch: '戌' })
    expect(factsOf('2026-10-09').ganzhi.monthJieQi).toEqual({ stem: '戊', branch: '戌' })

    // 立春在 2026-02-04，交节当日即由丑月（冬）整日改为寅月（春）。
    expect(factsOf('2026-02-03').season).toBe('冬')
    expect(factsOf('2026-02-04').season).toBe('春')
  })

  it('season 是独立的派生事实，可供季节性条款用 in 算子读取', () => {
    const rule = syntheticRule({
      when: { all: [{ fact: 'season', operator: 'in', value: ['春'] }] },
    })

    expect(evaluateRule(rule, factsOf('2026-02-04'))).toBe('matched')
    expect(evaluateRule(rule, factsOf('2026-02-03'))).toBe('not_matched')
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
    [
      '2026-10-02',
      '建日兼王日（酉月己酉）遇月刑（酉月自刑，月刑亦在酉）',
      'unresolved',
      ['xjbf-travel-0001', 'xjbf-travel-0026', 'xjbf-travel-0031'],
    ],
    [
      '2026-05-05',
      '开日兼月恩兼四相，日支卯又为灾煞',
      'unresolved',
      ['xjbf-travel-0002', 'xjbf-travel-0013', 'xjbf-travel-0023', 'xjbf-travel-0017'],
    ],
    [
      '2026-06-03',
      '平日兼四相遇月刑',
      'unresolved',
      ['xjbf-travel-0023', 'xjbf-travel-0003', 'xjbf-travel-0031'],
    ],
    ['2026-10-12', '收日兼月刑', 'excluded', ['xjbf-travel-0004', 'xjbf-travel-0031']],
    [
      '2026-09-07',
      '闭日（酉月甲申）遇天马',
      'unresolved',
      ['xjbf-travel-0030', 'xjbf-travel-0005'],
    ],
    [
      '2026-09-26',
      '月破兼灾煞兼月恩兼四相遇月厌',
      'unresolved',
      [
        'xjbf-travel-0013',
        'xjbf-travel-0023',
        'xjbf-travel-0006',
        'xjbf-travel-0017',
        'xjbf-travel-0029',
      ],
    ],
    ['2026-10-03', '吉期兼月德', 'pass', ['xjbf-travel-0008', 'xjbf-travel-0010']],
    ['2026-10-11', '天喜（成日）', 'pass', ['xjbf-travel-0009']],
    [
      '2026-10-19',
      '月德（戌月丙）兼天德（戌月丙）遇月厌',
      'unresolved',
      ['xjbf-travel-0010', 'xjbf-travel-0032', 'xjbf-travel-0029'],
    ],
    [
      '2026-11-11',
      '月德合（亥月己）遇月厌',
      'unresolved',
      ['xjbf-travel-0011', 'xjbf-travel-0029'],
    ],
    [
      '2026-05-04',
      '天赦（春戊寅）兼开日兼驿马',
      'pass',
      ['xjbf-travel-0002', 'xjbf-travel-0012', 'xjbf-travel-0025'],
    ],
    [
      '2026-05-20',
      '天赦兼吉期兼王日遇大时',
      'unresolved',
      ['xjbf-travel-0008', 'xjbf-travel-0012', 'xjbf-travel-0026', 'xjbf-travel-0019'],
    ],
    [
      '2026-12-16',
      '天赦兼建日兼月恩兼四相兼王日遇月厌',
      'unresolved',
      [
        'xjbf-travel-0001',
        'xjbf-travel-0012',
        'xjbf-travel-0013',
        'xjbf-travel-0023',
        'xjbf-travel-0026',
        'xjbf-travel-0029',
      ],
    ],
    ['2026-04-03', '月恩兼四相', 'pass', ['xjbf-travel-0013', 'xjbf-travel-0023']],
    ['2026-02-13', '时德（寅月午）兼天马', 'pass', ['xjbf-travel-0014', 'xjbf-travel-0030']],
    [
      '2026-03-23',
      '劫煞兼四相兼天马',
      'unresolved',
      ['xjbf-travel-0023', 'xjbf-travel-0030', 'xjbf-travel-0015'],
    ],
    ['2026-02-04', '天吏（寅月酉）', 'excluded', ['xjbf-travel-0016']],
    ['2026-07-10', '灾煞（未月酉）', 'excluded', ['xjbf-travel-0017']],
    ['2026-06-08', '月煞（午月丑）', 'excluded', ['xjbf-travel-0018']],
    ['2026-07-13', '大时兼四相', 'unresolved', ['xjbf-travel-0023', 'xjbf-travel-0019']],
    [
      '2026-08-13',
      '天贼兼闭日兼月煞',
      'excluded',
      ['xjbf-travel-0005', 'xjbf-travel-0018', 'xjbf-travel-0020'],
    ],
    [
      '2026-06-10',
      '往亡兼收日兼大时',
      'excluded',
      ['xjbf-travel-0004', 'xjbf-travel-0019', 'xjbf-travel-0021'],
    ],
    ['2026-01-10', '四相（丑月甲乙）', 'pass', ['xjbf-travel-0023']],
    ['2026-10-04', '驿马（酉月亥）', 'pass', ['xjbf-travel-0025']],
    [
      '2026-01-11',
      '天德合兼天喜兼月德合兼四相',
      'pass',
      ['xjbf-travel-0009', 'xjbf-travel-0011', 'xjbf-travel-0022', 'xjbf-travel-0023'],
    ],
    [
      '2026-03-02',
      '天愿（正月乙亥）遇收日与劫煞',
      'unresolved',
      ['xjbf-travel-0024', 'xjbf-travel-0004', 'xjbf-travel-0015'],
    ],
  ])('%s（%s）判定为 %s', (dateKey, _label, status, ruleIds) => {
    const result = evaluate(dateKey)

    expect(result.status).toBe(status)

    const hit = [...result.matchedRuleIds, ...result.excludeRuleIds]

    expect(hit).toEqual(ruleIds)
  })

  it('未命中任何已收录条款的日子不进入结果，也不算异常', () => {
    // 11-13 为亥月辛卯定日，已收录的宜忌条款均未命中。
    expect(evaluate('2026-11-13')).toMatchObject({
      status: 'not_matched',
      matchedRuleIds: [],
      excludeRuleIds: [],
    })
  })

  it('纳入与排除同级命中且无来源裁决时返回 unresolved', () => {
    // 2026-05-07 为巳月巳日：既是建日（宜）又是巳日（忌）
    const result = evaluate('2026-05-07')

    expect(result.status).toBe('unresolved')
    expect(result.matchedRuleIds).toEqual(['xjbf-travel-0001', 'xjbf-travel-0032'])
    expect(result.excludeRuleIds).toEqual(['xjbf-travel-0007'])
  })

  it('新收录的宜项与巳日同日时同样返回 unresolved，不得由程序自行裁决', () => {
    // 2026-09-28 在酉月中为乙巳日：成日（天喜）与月德合（酉月在乙）两条纳入同时命中，
    // 当日日支又是巳（忌），同级冲突，交由人工核对而不进入结果。
    const result = evaluate('2026-09-28')

    expect(result.status).toBe('unresolved')
    expect(result.matchedRuleIds).toEqual(['xjbf-travel-0009', 'xjbf-travel-0011'])
    expect(result.excludeRuleIds).toEqual(['xjbf-travel-0007'])
  })

  it('月德与月德合同级命中排除规则时返回 unresolved', () => {
    // 2026-10-09 为戌月丙辰：月德在丙（宜），同日又是月破与往亡（忌）。
    expect(evaluate('2026-10-09')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0010', 'xjbf-travel-0032'],
      excludeRuleIds: ['xjbf-travel-0006', 'xjbf-travel-0021'],
    })

    // 2026-02-06 为寅月辛亥：月德合在辛（宜），同日又是收日与劫煞（忌）。
    expect(evaluate('2026-02-06')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0011'],
      excludeRuleIds: ['xjbf-travel-0004', 'xjbf-travel-0015'],
    })
  })

  it('天赦取完整日柱，同一个戊寅在冬季不算天赦、在春季才算', () => {
    // 2026-01-04 与 2026-03-05 相距六十日，日柱同为戊寅。
    // 前者在子月（冬，取甲子），后者在卯月（春，取戊寅）——只有后者命中。
    expect(factsOf('2026-01-04').ganzhi.dayCivil).toEqual({ stem: '戊', branch: '寅' })
    expect(factsOf('2026-03-05').ganzhi.dayCivil).toEqual({ stem: '戊', branch: '寅' })
    expect(factsOf('2026-01-04').season).toBe('冬')
    expect(factsOf('2026-03-05').season).toBe('春')

    expect(evaluate('2026-01-04').matchedRuleIds).not.toContain('xjbf-travel-0012')
    expect(evaluate('2026-03-05').matchedRuleIds).toEqual(['xjbf-travel-0012'])
  })

  it('天赦与忌项同日时返回 unresolved', () => {
    // 2026-03-05 为卯月戊寅：天赦（宜），同日又是闭日（忌）。
    expect(evaluate('2026-03-05')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0012'],
      excludeRuleIds: ['xjbf-travel-0005'],
    })
  })

  it('月恩与时德遇忌项同样返回 unresolved', () => {
    // 2026-01-07 为丑月辛巳：月恩在辛（宜），同日日支为巳（忌）。
    expect(evaluate('2026-01-07')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0013'],
      excludeRuleIds: ['xjbf-travel-0007'],
    })

    // 2026-03-09 为卯月壬午：时德在午（宜），同日又是平日与天吏（忌）。
    expect(evaluate('2026-03-09')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0014'],
      excludeRuleIds: ['xjbf-travel-0003', 'xjbf-travel-0016'],
    })
  })

  it('月神表同样按节令月取值，交节当天即改用新月', () => {
    // 寒露 2026-10-08 交节，当日日干为乙：酉月（八月）月德合在乙，戌月（九月）在辛。
    // 引擎取新月，故当日不判为月德合。
    expect(factsOf('2026-10-08').ganzhi.dayCivil?.stem).toBe('乙')
    expect(factsOf('2026-10-08').ganzhi.monthJieQi?.branch).toBe('戌')
    expect(evaluate('2026-10-08').matchedRuleIds).not.toContain('xjbf-travel-0011')
  })

  it('月德在相邻两月的取值确实不同，上一条不是恒真', () => {
    // 戌月（九月）月德在丙：10-19 为丙日，命中。
    expect(evaluate('2026-10-19').matchedRuleIds).toContain('xjbf-travel-0010')
    // 亥月（十月）月德在甲：11-16 为甲日命中，而 10-17 同为甲日却在戌月，不命中。
    expect(evaluate('2026-11-16').matchedRuleIds).toContain('xjbf-travel-0010')
    expect(evaluate('2026-10-17').matchedRuleIds).not.toContain('xjbf-travel-0010')
  })

  it('吉期与天喜按节令月取建除，交节当天即改用新月', () => {
    // 寒露在 2026-10-08 交节，戌月自此整日开始。
    expect(factsOf('2026-10-07').ganzhi.monthJieQi?.branch).toBe('酉')
    expect(factsOf('2026-10-08').ganzhi.monthJieQi?.branch).toBe('戌')
    // 同一个卯日：按新月（戌）为执，按旧月（酉）则为破；引擎取新月。
    expect(getJianChu('戌', '卯')).toBe('执')
    expect(getJianChu('酉', '卯')).toBe('破')
    expect(factsOf('2026-10-08').jianChu).toBe('执')
  })

  it('每个规则包自身完整：全部 verified、优先关系留空、来源可在台账中查到', () => {
    const sourceIds = new Set(SOURCES.map((source) => source.id))

    for (const pack of RULE_PACKS) {
      expect(pack.status, pack.id).toBe('verified')
      expect(pack.rules.length, pack.id).toBeGreaterThan(0)

      for (const rule of pack.rules) {
        expect(rule.status, rule.id).toBe('verified')
        expect(rule.priority, rule.id).toBeNull()
        expect(rule.conflictGroup, rule.id).toBe(pack.conflictGroup)
        expect(rule.eventType, rule.id).toBe(pack.eventType)
        expect(rule.sourceIds.length, rule.id).toBeGreaterThan(0)
        expect(rule.locator.length, rule.id).toBeGreaterThan(0)

        for (const sourceId of rule.sourceIds) {
          expect(sourceIds.has(sourceId), `${rule.id} → ${sourceId}`).toBe(true)
        }
      }
    }
  })

  it('只返回 verified 的规则包，未登记的包名一律为 null', () => {
    expect(findVerifiedRulePack('travel')?.id).toBe('xjbf-travel')
    // 未登记或未开放的包名不得命中；已登记的包逐个在此点名，防漏登记。
    expect(findVerifiedRulePack('moving-in')).toBeNull()
    expect(findVerifiedRulePack('funeral')).toBeNull()
    expect(findVerifiedRulePack('not-a-pack')).toBeNull()
  })
})

describe('来源精度', () => {
  const ruleOf = (id: string): RuleDefinition => {
    const rule = TRAVEL_RULE_PACK.rules.find((item) => item.id === id)

    if (!rule) {
      throw new Error(`规则不存在：${id}`)
    }

    return rule
  }

  /** 取月神规则 12 项表里的第 month 项；0 对应正月（寅月）。 */
  const monthGodValue = (rule: RuleDefinition, month: number): string => {
    const condition = rule.when.all[0]

    if (!condition) {
      throw new Error(`规则没有条件：${rule.id}`)
    }

    const value = condition.value[month]

    if (value === undefined) {
      throw new Error(`规则缺少第 ${month + 1} 月取值：${rule.id}`)
    }

    return value
  }

  it('建除类条款同时引卷十一的事项列项与卷四的起例', () => {
    for (const id of [
      'xjbf-travel-0001',
      'xjbf-travel-0002',
      'xjbf-travel-0003',
      'xjbf-travel-0004',
      'xjbf-travel-0005',
      'xjbf-travel-0006',
      'xjbf-travel-0008',
      'xjbf-travel-0009',
    ]) {
      expect(ruleOf(id).sourceIds, id).toEqual(['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'])
    }
  })

  it('「巳日」只引卷十一，不把卷四列为依据', () => {
    expect(ruleOf('xjbf-travel-0007').sourceIds).toEqual(['src-xjbf-vol11-scan'])
  })

  it('月神类条款同时引卷十一的事项列项与卷五的起例定义', () => {
    for (const id of ['xjbf-travel-0010', 'xjbf-travel-0011']) {
      expect(ruleOf(id).sourceIds, id).toEqual(['src-xjbf-vol11-scan', 'src-xjbf-vol5-scan'])
    }
  })

  it('月神表与卷五历例逐月一致', () => {
    // 卷五《月德》：「正五九月在丙，二六十月在甲，三七十一月在壬，四八十二月在庚。」
    const 月德ByMonth = ['丙', '甲', '壬', '庚']

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(monthGodValue(ruleOf('xjbf-travel-0010'), month), `月德第 ${month + 1} 月`).toBe(
        月德ByMonth[month % 4],
      )
    }

    // 卷五《月德合》：月德所合之干（甲己、丙辛、丁壬、乙庚）。
    const 合 = { 丙: '辛', 甲: '己', 壬: '丁', 庚: '乙' } as const

    for (let month = 0; month < MONTH_COUNT; month++) {
      const 月德 = 月德ByMonth[month % 4] as keyof typeof 合

      expect(monthGodValue(ruleOf('xjbf-travel-0011'), month), `月德合第 ${month + 1} 月`).toBe(
        合[月德],
      )
    }
  })

  it('时德逐月等于「春午夏辰秋子冬寅」，按节令月所属季节取值', () => {
    const bySeason: Record<string, string> = { 春: '午', 夏: '辰', 秋: '子', 冬: '寅' }
    const rule = ruleOf('xjbf-travel-0014')

    for (const branch of EARTHLY_BRANCHES) {
      const monthIndex = getMonthIndex(branch)
      const season = getSeason(branch)

      if (monthIndex === null || season === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(monthGodValue(rule, monthIndex), `${branch}月（${season}）`).toBe(bySeason[season])
    }
  })

  it('月恩逐月等于卷五历例所载序列', () => {
    // 卷五《月恩》：「正月丙，二月丁，三月庚，四月己，五月戊，六月辛，
    // 七月壬，八月癸，九月庚，十月乙，十一月甲，十二月辛。」
    const byMonth = ['丙', '丁', '庚', '己', '戊', '辛', '壬', '癸', '庚', '乙', '甲', '辛']
    const rule = ruleOf('xjbf-travel-0013')

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(monthGodValue(rule, month), `月恩第 ${month + 1} 月`).toBe(byMonth[month])
    }
  })

  it('十条卷六月神逐月等于各自起例的循环顺推结果', () => {
    // 卷六各条起例都是「正月起某」+ 位组（四孟／四仲／四季／六阳辰／十二辰），展开即若干月一循环。
    // 卷六《劫煞》：「李鼎祚曰正月起亥，逆行四孟。」四孟＝寅申巳亥，逆推即 亥申巳寅 循环。
    // 卷六《天吏》：「历例曰天吏者正月起酉，逆行四仲。」四仲＝子午卯酉，逆推即 酉午卯子 循环。
    // 卷六《天马》：「李鼎祚曰天马者正月起午，顺行六阳辰。」六阳辰＝子寅辰午申戌，即 午申戌子寅辰 循环。
    const cases = [
      { id: 'xjbf-travel-0015', cycle: ['亥', '申', '巳', '寅'], label: '劫煞' },
      { id: 'xjbf-travel-0016', cycle: ['酉', '午', '卯', '子'], label: '天吏' },
      { id: 'xjbf-travel-0017', cycle: ['子', '酉', '午', '卯'], label: '灾煞' },
      { id: 'xjbf-travel-0018', cycle: ['丑', '戌', '未', '辰'], label: '月煞' },
      { id: 'xjbf-travel-0019', cycle: ['卯', '子', '酉', '午'], label: '大时' },
      {
        id: 'xjbf-travel-0020',
        cycle: ['丑', '子', '亥', '戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅'],
        label: '天贼',
      },
      {
        id: 'xjbf-travel-0021',
        cycle: ['寅', '巳', '申', '亥', '卯', '午', '酉', '子', '辰', '未', '戌', '丑'],
        label: '往亡',
      },
      { id: 'xjbf-travel-0025', cycle: ['申', '巳', '寅', '亥'], label: '驿马' },
      { id: 'xjbf-travel-0030', cycle: ['午', '申', '戌', '子', '寅', '辰'], label: '天马' },
      {
        // 卷六《月刑》只说「与岁刑同」，起例取自卷三《岁刑》曾门经，
        // 辰午酉亥四个月为自刑、与月建同支。
        id: 'xjbf-travel-0031',
        cycle: ['巳', '子', '辰', '申', '午', '丑', '寅', '酉', '未', '亥', '卯', '戌'],
        label: '月刑',
      },
    ]

    for (const { id, cycle, label } of cases) {
      const rule = ruleOf(id)

      for (let month = 0; month < MONTH_COUNT; month++) {
        expect(monthGodValue(rule, month), `${label}第 ${month + 1} 月`).toBe(
          cycle[month % cycle.length],
        )
      }
    }
  })

  it('劫煞与天吏命中同一日、或与宜项同日时都不由程序裁决', () => {
    // 2026-03-11 为卯月甲申：劫煞与天马同在申，前者忌、后者宜，同日日干甲又是卯月月德。
    expect(evaluate('2026-03-11')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0010', 'xjbf-travel-0030'],
      excludeRuleIds: ['xjbf-travel-0015'],
    })

    // 2026-03-21 为卯月甲午：天吏在午（忌），同日又是卯月月德与四时之午（时德）。
    expect(evaluate('2026-03-21')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0010', 'xjbf-travel-0014'],
      excludeRuleIds: ['xjbf-travel-0003', 'xjbf-travel-0016'],
    })
  })

  it('天德合在四仲月不作值日，哨兵值不会误判', () => {
    const rule = ruleOf('xjbf-travel-0022')

    for (const branch of ['卯', '午', '酉', '子']) {
      const month = getMonthIndex(branch)

      if (month === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(monthGodValue(rule, month), `${branch}月`).toBe('')
    }

    // 哨兵是空串，而日干永远是真实天干，故这四个月永不命中。
    for (const stem of HEAVENLY_STEMS) {
      expect(stem, '天干不应为空串').not.toBe('')
    }
  })

  it('天德四仲月不判值日，哨兵值不会误判', () => {
    const rule = ruleOf('xjbf-travel-0032')

    // 四仲月（卯午酉子月）历例给的是乾坤艮巽四维之卦，不是天干，本包不折算为地支。
    for (const branch of ['卯', '午', '酉', '子']) {
      const month = getMonthIndex(branch)

      if (month === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(monthGodValue(rule, month), `${branch}月`).toBe('')
    }

    // 其余八个月逐月等于卷五历例所载天干。
    const stemsByMonth = ['丁', '壬', '辛', '甲', '癸', '丙', '乙', '庚']
    const months = [0, 2, 3, 5, 6, 8, 9, 11]

    for (const [index, month] of months.entries()) {
      expect(monthGodValue(rule, month), `第 ${month + 1} 月`).toBe(stemsByMonth[index])
    }

    // 哨兵是空串，而日干永远是真实天干，故这四个月永不命中。
    for (const stem of HEAVENLY_STEMS) {
      expect(stem, '天干不应为空串').not.toBe('')
    }
  })

  it('四相逐月等于「春丙丁、夏戊己、秋壬癸、冬甲乙」对应的五行', () => {
    const rule = ruleOf('xjbf-travel-0023')
    const elementBySeason: Record<string, string> = { 春: '火', 夏: '土', 秋: '水', 冬: '木' }

    for (const branch of EARTHLY_BRANCHES) {
      const month = getMonthIndex(branch)
      const season = getSeason(branch)

      if (month === null || season === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(monthGodValue(rule, month), `${branch}月（${season}）`).toBe(elementBySeason[season])
    }
  })

  it('天愿的干支两表合起来等于编者订正后的十二月日柱', () => {
    const [stemCondition, branchCondition] = ruleOf('xjbf-travel-0024').when.all
    // 卷五第 51 帧编者订正起例：「二十四字中误十三字焉」后的定本。
    const pillars = [
      '乙亥',
      '甲戌',
      '乙酉',
      '丙申',
      '丁未',
      '戊午',
      '己巳',
      '庚辰',
      '辛卯',
      '壬寅',
      '癸丑',
      '甲子',
    ]

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(
        `${stemCondition?.value[month]}${branchCondition?.value[month]}`,
        `第 ${month + 1} 月`,
      ).toBe(pillars[month])
    }
  })

  it('四废的五行表与历例所举的四季日柱一致', () => {
    const [stemCondition, branchCondition] = ruleOf('xjbf-travel-0028').when.all

    // 卷五《四废》：「春庚申辛酉，夏壬子癸亥，秋甲寅乙卯，冬丙午丁巳。」
    const seasons = [
      { months: ['寅', '卯', '辰'], pillars: ['庚申', '辛酉'] },
      { months: ['巳', '午', '未'], pillars: ['壬子', '癸亥'] },
      { months: ['申', '酉', '戌'], pillars: ['甲寅', '乙卯'] },
      { months: ['亥', '子', '丑'], pillars: ['丙午', '丁巳'] },
    ]

    for (const { months, pillars } of seasons) {
      for (const branch of months) {
        const month = getMonthIndex(branch)

        if (month === null) {
          throw new Error(`无法解析月支：${branch}`)
        }

        for (const pillar of pillars) {
          expect(getStemElement(pillar[0]), pillar).toBe(stemCondition?.value[month])
          expect(getBranchElement(pillar[1]), pillar).toBe(branchCondition?.value[month])
        }
      }
    }
  })

  it('五墓的干支两表合起来等于历例所载的四季日柱', () => {
    const [stemCondition, branchCondition] = ruleOf('xjbf-travel-0027').when.all
    const byMonth = [
      '乙未',
      '乙未',
      '戊辰',
      '丙戌',
      '丙戌',
      '戊辰',
      '辛丑',
      '辛丑',
      '戊辰',
      '壬辰',
      '壬辰',
      '戊辰',
    ]

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(
        `${stemCondition?.value[month]}${branchCondition?.value[month]}`,
        `第 ${month + 1} 月`,
      ).toBe(byMonth[month])
    }
  })

  it('天赦的干表与支表合起来等于历例的四季四日', () => {
    const [stemCondition, branchCondition] = ruleOf('xjbf-travel-0012').when.all

    expect(stemCondition?.operator).toBe('month-indexed')
    expect(branchCondition?.operator).toBe('month-indexed')

    // 卷五《天赦》：「历例曰春戊寅，夏甲午，秋戊申，冬甲子是也。」
    const seasons = [
      { months: ['寅', '卯', '辰'], pillar: { stem: '戊', branch: '寅' } },
      { months: ['巳', '午', '未'], pillar: { stem: '甲', branch: '午' } },
      { months: ['申', '酉', '戌'], pillar: { stem: '戊', branch: '申' } },
      { months: ['亥', '子', '丑'], pillar: { stem: '甲', branch: '子' } },
    ]

    for (const { months, pillar } of seasons) {
      for (const monthBranch of months) {
        const monthIndex = getMonthIndex(monthBranch)

        if (monthIndex === null) {
          throw new Error(`无法解析月支：${monthBranch}`)
        }

        expect(stemCondition?.value[monthIndex], `${monthBranch}月的日干`).toBe(pillar.stem)
        expect(branchCondition?.value[monthIndex], `${monthBranch}月的日支`).toBe(pillar.branch)
      }
    }
  })

  it('「月破」的逐字出处归在卷四《建除同位异名》「破〈大耗〉」，不写作《建除十二神》', () => {
    const { locator } = ruleOf('xjbf-travel-0006')

    expect(locator).toContain('建除同位异名')
    expect(locator).toContain('破〈大耗〉')
    expect(locator).toContain('月破者月建所冲之日也')
    // 卷四「对七为冲，冲则破也」是《建除十二神》引《洞源经》的另一句，不得拿来替换本条出处。
    expect(locator).not.toContain('对七为冲')
  })

  it('所有按月取值的条件，表长都必须是 12，否则规则不得入库', () => {
    for (const pack of RULE_PACKS) {
      for (const rule of pack.rules) {
        for (const condition of rule.when.all) {
          if (
            condition.operator === 'month-indexed' ||
            condition.operator === 'month-indexed-set'
          ) {
            expect(condition.value.length, `${rule.id} → ${condition.fact}`).toBe(MONTH_COUNT)
          }
        }
      }
    }
  })

  it('每条规则的 locator 都指向其 sourceIds 中的卷次，不留悬空引用', () => {
    const volumePrefix: Record<string, string> = {
      'src-xjbf-vol3-scan': '卷三',
      'src-xjbf-vol4-scan': '卷四',
      'src-xjbf-vol5-scan': '卷五',
      'src-xjbf-vol6-scan': '卷六',
      'src-xjbf-vol11-scan': '卷十一',
    }

    for (const pack of RULE_PACKS) {
      for (const rule of pack.rules) {
        for (const sourceId of rule.sourceIds) {
          expect(rule.locator, `${rule.id} → ${sourceId}`).toContain(volumePrefix[sourceId])
        }
      }
    }
  })

  it('locator 点名的篇名必须被同卷来源标题覆盖，只对到卷次不算数', () => {
    const volumeOfSource: Record<string, string> = {
      'src-xjbf-vol3-scan': '卷三',
      'src-xjbf-vol4-scan': '卷四',
      'src-xjbf-vol5-scan': '卷五',
      'src-xjbf-vol6-scan': '卷六',
      'src-xjbf-vol11-scan': '卷十一',
    }

    for (const pack of RULE_PACKS) {
      for (const rule of pack.rules) {
        // 只取「卷N《篇名》」这种带卷次的引用；「引《考原》」等别书名与同卷续引「及《…》」不在此列。
        for (const match of rule.locator.matchAll(/卷(四|五|六|十一)《([^》]+)》/g)) {
          const volumeText = match[1]
          const section = match[2]

          if (volumeText === undefined || section === undefined) {
            throw new Error(`无法解析 locator 的卷次或篇名：${rule.id}`)
          }

          const volume = `卷${volumeText}`
          const source = rule.sourceIds
            .map((sourceId) => SOURCES.find((entry) => entry.id === sourceId))
            .find((entry) => entry !== undefined && volumeOfSource[entry.id] === volume)

          if (!source) {
            throw new Error(`${rule.id} 引 ${volume}《${section}》，却没有挂 ${volume} 的来源`)
          }

          // 标题要么点名这一篇，要么用「等」声明只举其例。否则详情页上
          // 「来源：卷四（义例二：建除十二神）」与「定位：卷四《月厌》」会被读成对不上。
          expect(
            source.title.includes(section) || source.title.includes('等'),
            `${rule.id}：${volume}《${section}》未被来源标题「${source.title}」覆盖`,
          ).toBe(true)
        }
      }
    }
  })

  it('每条规则都有条目名，且该名字就出现在自己的 locator 里', () => {
    // name 是摘要界面（首页）直接展示的文本，不能与 locator 各说各话。
    for (const pack of RULE_PACKS) {
      for (const rule of pack.rules) {
        expect(rule.name, `${rule.id} 缺少条目名`).not.toBe('')
        expect(rule.locator, `${rule.id} 的 locator 未点名「${rule.name}」`).toContain(
          `「${rule.name}」`,
        )
      }
    }
  })
})

describe('开市规则包', () => {
  const openingRuleOf = (id: string): RuleDefinition => {
    const rule = OPENING_RULE_PACK.rules.find((item) => item.id === id)

    if (!rule) {
      throw new Error(`规则不存在：${id}`)
    }

    return rule
  }

  /** 取某条规则第 index 个条件的 12 项月表；0 对应正月（寅月）。 */
  const tableOf = (id: string, index = 0): readonly string[] => {
    const condition = openingRuleOf(id).when.all[index]

    if (!condition) {
      throw new Error(`规则缺少第 ${index + 1} 个条件：${id}`)
    }

    return condition.value
  }

  it('卷十一「开市」的宜六项、忌十九项全部落地，且大耗已并入月破', () => {
    const includes = OPENING_RULE_PACK.rules.filter((rule) => rule.effect === 'include')
    const excludes = OPENING_RULE_PACK.rules.filter((rule) => rule.effect === 'exclude')

    expect(includes.map((rule) => rule.name)).toEqual([
      '满日',
      '成日',
      '开日',
      '天愿',
      '民日',
      '五富',
    ])
    // 原文忌项列 19 个名目，其中「大耗」与「月破」同为破日，合并为一条，故规则数为 18。
    expect(excludes).toHaveLength(18)
    expect(excludes.map((rule) => rule.name)).toContain('月破')
    expect(excludes.map((rule) => rule.name)).not.toContain('大耗')
    expect(OPENING_RULE_PACK.coverage).toContain('大耗')

    expect(findVerifiedRulePack('opening')?.id).toBe('xjbf-opening')
  })

  it('破日只由「月破」一条规则承接，包内不存在第二条按破日取值的规则', () => {
    const 破Rules = OPENING_RULE_PACK.rules.filter((rule) =>
      rule.when.all.some(
        (condition) =>
          condition.fact === 'jianChu' &&
          condition.operator === 'in' &&
          condition.value.includes('破'),
      ),
    )

    expect(破Rules.map((rule) => rule.name)).toEqual(['月破'])
  })

  it('「小耗」取建除之执日，与卷四「常居月建前五辰」同值', () => {
    const rule = openingRuleOf('xjbf-opening-0011')

    expect(rule.when.all).toEqual([{ fact: 'jianChu', operator: 'in', value: ['执'] }])

    // 卷四《小耗》：「历例曰小耗者常居月建前五辰」——逐月核对执日正是月建前五辰。
    for (const branch of EARTHLY_BRANCHES) {
      const 月建前五辰 = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf(branch) + 5) % 12]

      expect(getJianChu(branch, 月建前五辰), `${branch}月`).toBe('执')
    }
  })

  it('五富逐月等于卷六历例「正月起亥，顺行四孟」的顺推结果', () => {
    // 四孟＝寅巳申亥；自亥顺行四孟即 亥寅巳申 四个月一循环。
    const 四孟自亥起 = ['亥', '寅', '巳', '申']

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(tableOf('xjbf-opening-0006')[month], `五富第 ${month + 1} 月`).toBe(
        四孟自亥起[month % 4],
      )
    }
  })

  it('月害逐月等于卷六历例「正月起巳，逆行十二辰」，并与六害取值逐月吻合', () => {
    for (let month = 0; month < MONTH_COUNT; month++) {
      const expected = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf('巳') - month + 12) % 12]

      expect(tableOf('xjbf-opening-0016')[month], `月害第 ${month + 1} 月`).toBe(expected)
    }

    // 曹震圭以六害立说（卯辰相害、寅巳相害……），与逐月逆行一支应逐项一致。
    const 六害: Record<string, string> = {
      子: '未',
      未: '子',
      丑: '午',
      午: '丑',
      寅: '巳',
      巳: '寅',
      卯: '辰',
      辰: '卯',
      申: '亥',
      亥: '申',
      酉: '戌',
      戌: '酉',
    }

    for (const branch of EARTHLY_BRANCHES) {
      const monthIndex = getMonthIndex(branch)

      if (monthIndex === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(tableOf('xjbf-opening-0016')[monthIndex], `${branch}月六害`).toBe(六害[branch])
    }
  })

  it('九空逐月等于卷五历例「正月在辰，逆行四季」的逆推结果', () => {
    // 四季＝辰戌丑未；自辰逆行四季即 辰丑戌未，每月退三支。
    const 四季自辰逆行 = ['辰', '丑', '戌', '未']

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(tableOf('xjbf-opening-0024')[month], `九空第 ${month + 1} 月`).toBe(
        四季自辰逆行[month % 4],
      )
    }
  })

  it('民日逐季等于卷五《王官守相民日》「春午夏酉秋子冬卯」', () => {
    const bySeason: Record<string, string> = { 春: '午', 夏: '酉', 秋: '子', 冬: '卯' }

    for (const branch of EARTHLY_BRANCHES) {
      const monthIndex = getMonthIndex(branch)
      const season = getSeason(branch)

      if (monthIndex === null || season === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(tableOf('xjbf-opening-0005')[monthIndex], `${branch}月（${season}）`).toBe(
        bySeason[season],
      )
    }
  })

  it('四耗、四穷的干支两表合起来等于历例所载的四季日柱', () => {
    const 四耗 = [
      ['壬', '子'],
      ['乙', '卯'],
      ['戊', '午'],
      ['辛', '酉'],
    ]
    const 四穷 = [
      ['乙', '亥'],
      ['丁', '亥'],
      ['辛', '亥'],
      ['癸', '亥'],
    ]
    const 季 = ['春', '夏', '秋', '冬']

    for (let season = 0; season < 4; season++) {
      for (let offset = 0; offset < 3; offset++) {
        const month = season * 3 + offset
        const label = `${季[season]}第 ${offset + 1} 月`

        expect(tableOf('xjbf-opening-0020', 0)[month], `四耗${label}干`).toBe(四耗[season][0])
        expect(tableOf('xjbf-opening-0020', 1)[month], `四耗${label}支`).toBe(四耗[season][1])
        expect(tableOf('xjbf-opening-0022', 0)[month], `四穷${label}干`).toBe(四穷[season][0])
        expect(tableOf('xjbf-opening-0022', 1)[month], `四穷${label}支`).toBe(四穷[season][1])
      }
    }
  })

  it('破日在出行与开市两个包里都命中「月破」，且两包各自只有一条月破规则', () => {
    // 遍历一个月找出真实破日，不把某一日的建除写死在用例里。
    const 破日 = Array.from(
      { length: 28 },
      (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`,
    )
      .map((dateKey) => ({ dateKey, facts: factsOf(dateKey) }))
      .filter((item) => item.facts.jianChu === '破')

    expect(破日.length, '2026 年 10 月应至少出现一个破日').toBeGreaterThan(0)

    for (const { dateKey, facts } of 破日) {
      for (const pack of [TRAVEL_RULE_PACK, OPENING_RULE_PACK]) {
        const 月破 = pack.rules.filter((rule) => rule.name === '月破')
        const rule = 月破[0]

        expect(月破, `${pack.id}／${dateKey}`).toHaveLength(1)

        if (!rule) {
          throw new Error(`${pack.id} 缺少月破规则`)
        }

        expect(evaluateRule(rule, facts), `${pack.id}／${dateKey}`).toBe('matched')
      }
    }
  })

  it('开市与出行各自成包，冲突组互不相同，不跨包合并', () => {
    expect(OPENING_RULE_PACK.id).not.toBe(TRAVEL_RULE_PACK.id)
    expect(OPENING_RULE_PACK.conflictGroup).not.toBe(TRAVEL_RULE_PACK.conflictGroup)
    expect(OPENING_RULE_PACK.eventType).toBe('opening')
  })
})

describe('搬家规则包', () => {
  const relocationRuleOf = (id: string): RuleDefinition => {
    const rule = RELOCATION_RULE_PACK.rules.find((item) => item.id === id)

    if (!rule) {
      throw new Error(`规则不存在：${id}`)
    }

    return rule
  }

  it('卷十一「般移（移徙同）」的宜十四项、忌十五项全部落地', () => {
    const includes = RELOCATION_RULE_PACK.rules.filter((rule) => rule.effect === 'include')
    const excludes = RELOCATION_RULE_PACK.rules.filter((rule) => rule.effect === 'exclude')

    expect(includes.map((rule) => rule.name)).toEqual([
      '天德',
      '月德',
      '天德合',
      '月德合',
      '天赦',
      '天愿',
      '月恩',
      '四相',
      '时德',
      '民日',
      '驿马',
      '天马',
      '成日',
      '开日',
    ])
    expect(excludes.map((rule) => rule.name)).toEqual([
      '月破',
      '平日',
      '收日',
      '闭日',
      '劫煞',
      '灾煞',
      '月煞',
      '月刑',
      '月厌',
      '大时',
      '天吏',
      '四废',
      '五墓',
      '归忌',
      '往亡',
    ])

    expect(findVerifiedRulePack('relocation')?.id).toBe('xjbf-relocation')
  })

  it('般移与嫁娶同卷相邻两页，忌项并不相同，不得互相套用', () => {
    // 卷十一第 29 帧（嫁娶）与第 30 帧（般移）逐字比对：般移收「月厌」而不收「月害」，
    // 嫁娶独有「厌对」「四忌」「八专」「亥日」，般移一概没有。
    const names = new Set(RELOCATION_RULE_PACK.rules.map((rule) => rule.name))

    expect(names.has('月厌')).toBe(true)
    expect(names.has('月害')).toBe(false)
    expect(names.has('厌对')).toBe(false)
    expect(names.has('四忌')).toBe(false)
    expect(names.has('八专')).toBe(false)
    expect(names.has('亥日')).toBe(false)
  })

  it('归忌逐月等于卷六历例「孟月丑、仲月寅、季月子」', () => {
    const 孟仲季 = ['丑', '寅', '子']

    for (let month = 0; month < MONTH_COUNT; month++) {
      const condition = relocationRuleOf('xjbf-relocation-0028').when.all[0]

      expect(condition?.value[month], `归忌第 ${month + 1} 月`).toBe(孟仲季[month % 3])
    }
  })

  it('搬家与出行各自成包，冲突组互不相同', () => {
    expect(RELOCATION_RULE_PACK.conflictGroup).not.toBe(TRAVEL_RULE_PACK.conflictGroup)
    expect(RELOCATION_RULE_PACK.eventType).toBe('relocation')
  })
})

describe('嫁娶规则包', () => {
  const marriageRuleOf = (id: string): RuleDefinition => {
    const rule = MARRIAGE_RULE_PACK.rules.find((item) => item.id === id)

    if (!rule) {
      throw new Error(`规则不存在：${id}`)
    }

    return rule
  }

  const conditionTableOf = (id: string, index = 0): readonly string[] => {
    const condition = marriageRuleOf(id).when.all[index]

    if (!condition) {
      throw new Error(`规则缺少第 ${index + 1} 个条件：${id}`)
    }

    return condition.value
  }

  it('卷十一「嫁娶」的宜十项、忌二十项全部落地', () => {
    const includes = MARRIAGE_RULE_PACK.rules.filter((rule) => rule.effect === 'include')
    const excludes = MARRIAGE_RULE_PACK.rules.filter((rule) => rule.effect === 'exclude')

    expect(includes.map((rule) => rule.name)).toEqual([
      '天德',
      '月德',
      '天德合',
      '月德合',
      '天赦',
      '天愿',
      '三合',
      '天喜',
      '六合',
      '不将',
    ])
    expect(excludes.map((rule) => rule.name)).toEqual([
      '月破',
      '平日',
      '收日',
      '闭日',
      '劫煞',
      '灾煞',
      '月煞',
      '月刑',
      '月害',
      '月厌',
      '厌对',
      '大时',
      '天吏',
      '四废',
      '四忌',
      '四穷',
      '五墓',
      '往亡',
      '八专',
      '亥日',
    ])

    expect(findVerifiedRulePack('marriage')?.id).toBe('xjbf-marriage')
  })

  it('三合逐月等于卷六历例，且每月两项正是月建三合局的另外两支', () => {
    const 三合局: Record<string, readonly string[]> = {
      寅: ['寅', '午', '戌'],
      午: ['寅', '午', '戌'],
      戌: ['寅', '午', '戌'],
      亥: ['亥', '卯', '未'],
      卯: ['亥', '卯', '未'],
      未: ['亥', '卯', '未'],
      申: ['申', '子', '辰'],
      子: ['申', '子', '辰'],
      辰: ['申', '子', '辰'],
      巳: ['巳', '酉', '丑'],
      酉: ['巳', '酉', '丑'],
      丑: ['巳', '酉', '丑'],
    }
    // 卷六《三合》历例（影印本第 10 帧）：「正月在午戌，二月在未亥，三月在子申，四月在丑酉，
    // 五月在寅戌，六月在卯亥，七月在子辰，八月在丑巳，九月在寅午，十月在卯未，
    // 十一月在辰申，十二月在丑巳。」底本十二月与八月（酉月）一项全同，系「酉」误作「丑」；
    // 本表按同条曾门经「巳酉丑金之三合」与《考原》「各与其月建会成三合局」取「巳酉」。
    const byMonth = [
      '午|戌',
      '未|亥',
      '子|申',
      '丑|酉',
      '寅|戌',
      '卯|亥',
      '子|辰',
      '丑|巳',
      '寅|午',
      '卯|未',
      '辰|申',
      '巳|酉',
    ]
    const table = conditionTableOf('xjbf-marriage-0007')

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(table[month], `三合第 ${month + 1} 月`).toBe(byMonth[month])
    }

    // 节令月支：正月起寅，表第 0 项即寅月。十二月改正后，十二个月一律等于「月建三合局的另外两支」。
    for (let month = 0; month < MONTH_COUNT; month++) {
      const 月建 = EARTHLY_BRANCHES[(2 + month) % 12] as string
      const 另外两支 = (三合局[月建] ?? []).filter((branch) => branch !== 月建)
      const 实际 = (table[month] ?? '').split('|').sort()

      expect(实际, `${月建}月三合局`).toEqual([...另外两支].sort())
    }

    // 偏离底本字面必须留在面向用户的限制里：底本印作什么、本条取了什么，两句都要在。
    const limitation = marriageRuleOf('xjbf-marriage-0007').limitations.join('')

    expect(limitation).toContain('丑巳')
    expect(limitation).toContain('巳酉')
  })

  it('六合逐月与月建六合一致', () => {
    const 六合: Record<string, string> = {
      寅: '亥',
      卯: '戌',
      辰: '酉',
      巳: '申',
      午: '未',
      未: '午',
      申: '巳',
      酉: '辰',
      戌: '卯',
      亥: '寅',
      子: '丑',
      丑: '子',
    }
    const table = conditionTableOf('xjbf-marriage-0009')

    for (const branch of EARTHLY_BRANCHES) {
      const monthIndex = getMonthIndex(branch)

      if (monthIndex === null) {
        throw new Error(`无法解析月支：${branch}`)
      }

      expect(table[monthIndex], `${branch}月六合`).toBe(六合[branch])
    }
  })

  it('厌对逐月等于月厌所冲之辰，直接由月厌表推出', () => {
    const 月厌 = MONTH_GOD_TABLES.月厌
    const 厌对 = conditionTableOf('xjbf-marriage-0021')

    for (let month = 0; month < MONTH_COUNT; month++) {
      const 厌 = 月厌[month] ?? ''
      const 冲 = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf(厌) + 6) % 12]

      expect(厌对[month], `厌对第 ${month + 1} 月`).toBe(冲)
    }
  })

  it('阴阳不将的两个结构特征：日支恰在月厌后五辰内，戊己只在夏秋／春冬出现', () => {
    // 卷四《阴阳不将》历例（影印本第 107 帧）。以下两条是表的自校验，不是新规则：
    // ① 与同条「必干支与厌全不相涉者始为吉日」「分于卯酉，会于子午」相合；
    // ② 与同条「经曰春冬己不将，秋夏戊不将」相合。
    const table = conditionTableOf('xjbf-marriage-0010')
    const 月厌 = MONTH_GOD_TABLES.月厌
    const 夏秋 = new Set([3, 4, 5, 6, 7, 8])

    for (let month = 0; month < MONTH_COUNT; month++) {
      const 厌支 = 月厌[month] ?? ''
      const 厌下标 = EARTHLY_BRANCHES.indexOf(厌支)
      const 后五辰 = new Set(
        Array.from({ length: 5 }, (_, step) => EARTHLY_BRANCHES[(厌下标 + 1 + step) % 12]),
      )
      const pillars = (table[month] ?? '').split('|')

      expect(pillars.length, `不将第 ${month + 1} 月条数`).toBeGreaterThan(0)

      for (const pillar of pillars) {
        const 干 = pillar.slice(0, 1)
        const 支 = pillar.slice(1)

        expect(pillar, `不将第 ${month + 1} 月「${pillar}」应为两字日柱`).toHaveLength(2)
        expect(后五辰.has(支), `不将第 ${month + 1} 月「${pillar}」日支应在月厌后五辰内`).toBe(true)
        expect(支 === 厌支, `不将第 ${month + 1} 月不得含月厌本支`).toBe(false)

        if (干 === '戊') {
          expect(夏秋.has(month), `戊只应出现在夏秋月：不将第 ${month + 1} 月`).toBe(true)
        }

        if (干 === '己') {
          expect(夏秋.has(month), `己只应出现在春冬月：不将第 ${month + 1} 月`).toBe(false)
        }
      }
    }
  })

  it('不将按卷四按语剔除六月戊午（逐阵不可用），并在限制里写明', () => {
    const table = conditionTableOf('xjbf-marriage-0010')

    // 六月是表第 6 项（正月起数）。
    expect(table[5]).not.toContain('戊午')
    expect(marriageRuleOf('xjbf-marriage-0010').limitations.join('')).toContain('戊午')
  })

  it('八专取《曾门经》所列的五日，与卷五按语「十干所寄止于八支」相合', () => {
    const rule = marriageRuleOf('xjbf-marriage-0029')

    expect(rule.when.all).toEqual([
      { fact: 'dayPillar', operator: 'in', value: ['丁未', '己未', '庚申', '甲寅', '癸丑'] },
    ])

    // 天干寄宫：甲寅、乙辰、丙巳、丁未、戊巳、己未、庚申、辛戌、壬亥、癸丑。
    // 「十干所寄止于八支，不居子午卯酉」，且「六甲循环干支相见」，故日柱两字必互为寄宫。
    const 寄宫: Record<string, string> = {
      甲: '寅',
      乙: '辰',
      丙: '巳',
      丁: '未',
      戊: '巳',
      己: '未',
      庚: '申',
      辛: '戌',
      壬: '亥',
      癸: '丑',
    }
    const 八支 = new Set(['丑', '寅', '辰', '巳', '未', '申', '戌', '亥'])
    const 阳干 = new Set(['甲', '丙', '戊', '庚', '壬'])
    const 阳支 = new Set(['子', '寅', '辰', '午', '申', '戌'])
    const 自算 = HEAVENLY_STEMS.flatMap((stem) => {
      const branch = 寄宫[stem]

      if (branch === undefined || !八支.has(branch)) {
        return []
      }

      // 六十甲子只以阳干配阳支、阴干配阴支；不合此律的组合（乙辰、丙巳、戊巳、辛戌、壬亥）
      // 本就不在循环内，故「六甲循环干支相见」后只剩五日。
      return 阳干.has(stem) === 阳支.has(branch) ? [`${stem}${branch}`] : []
    })

    expect(自算.sort()).toEqual([...(rule.when.all[0]?.value ?? [])].sort())
  })

  it('四忌取本令阳干临子，与卷五按语「以本令阳干加于辰首」一致', () => {
    const rule = marriageRuleOf('xjbf-marriage-0025')
    const 本令阳干 = ['甲', '丙', '庚', '壬']

    expect(rule.when.all[0]?.fact).toBe('ganzhi.dayCivil.stem')
    expect(rule.when.all[1]).toEqual({
      fact: 'ganzhi.dayCivil.branch',
      operator: 'in',
      value: ['子'],
    })

    for (let month = 0; month < MONTH_COUNT; month++) {
      expect(rule.when.all[0]?.value[month], `四忌第 ${month + 1} 月`).toBe(
        本令阳干[Math.floor(month / 3)],
      )
    }
  })

  it('结婚姻与纳采问名各自成条，不并入嫁娶：五合、五离两处差异都在', () => {
    // 卷十一第 28 帧（纳采问名）与第 29 帧（嫁娶）逐字比对：
    // 结婚姻、纳采问名两条例「五合」为宜，且都不收「不将」「往亡」「厌对」「亥日」。
    const names = new Set(MARRIAGE_RULE_PACK.rules.map((rule) => rule.name))

    expect(names.has('五合')).toBe(false)
    expect(names.has('五离')).toBe(false)
    expect(names.has('不将')).toBe(true)
    expect(MARRIAGE_RULE_PACK.coverage).toContain('结婚姻')
    expect(MARRIAGE_RULE_PACK.coverage).toContain('纳采问名')
  })

  it('嫁娶与出行各自成包，冲突组互不相同', () => {
    expect(MARRIAGE_RULE_PACK.conflictGroup).not.toBe(TRAVEL_RULE_PACK.conflictGroup)
    expect(MARRIAGE_RULE_PACK.eventType).toBe('marriage')
  })
})
