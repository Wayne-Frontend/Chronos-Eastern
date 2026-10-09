import { describe, expect, it } from 'vitest'

import { findVerifiedRulePack, RULE_PACKS } from '../miniprogram/data/rules/manifest'
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
    ['2026-10-02', '建日兼王日', 'pass', ['xjbf-travel-0001', 'xjbf-travel-0026']],
    [
      '2026-05-05',
      '开日兼月恩兼四相，日支卯又为灾煞',
      'unresolved',
      ['xjbf-travel-0002', 'xjbf-travel-0013', 'xjbf-travel-0023', 'xjbf-travel-0017'],
    ],
    ['2026-06-03', '平日兼四相', 'unresolved', ['xjbf-travel-0023', 'xjbf-travel-0003']],
    ['2026-10-12', '收日', 'excluded', ['xjbf-travel-0004']],
    ['2026-09-07', '闭日', 'excluded', ['xjbf-travel-0005']],
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
    ['2026-10-19', '月德（戌月丙）遇月厌', 'unresolved', ['xjbf-travel-0010', 'xjbf-travel-0029']],
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
    ['2026-02-13', '时德（寅月午）', 'pass', ['xjbf-travel-0014']],
    ['2026-03-23', '劫煞兼四相', 'unresolved', ['xjbf-travel-0023', 'xjbf-travel-0015']],
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
    expect(result.matchedRuleIds).toEqual(['xjbf-travel-0001'])
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
      matchedRuleIds: ['xjbf-travel-0010'],
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

  it('七条卷六月神逐月等于「正月起某、逆行四孟／四仲／四季／十二辰」的顺推结果（驿马为吉神，同样按此表）', () => {
    // 卷六《劫煞》：「李鼎祚曰正月起亥，逆行四孟。」四孟＝寅申巳亥，逆推即 亥申巳寅 循环。
    // 卷六《天吏》：「历例曰天吏者正月起酉，逆行四仲。」四仲＝子午卯酉，逆推即 酉午卯子 循环。
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
    ]

    for (const { id, cycle, label } of cases) {
      const rule = ruleOf(id)

      for (let month = 0; month < MONTH_COUNT; month++) {
        expect(monthGodValue(rule, month), `${label}第 ${month + 1} 月`).toBe(
          cycle.length === MONTH_COUNT ? cycle[month] : cycle[month % 4],
        )
      }
    }
  })

  it('劫煞与天吏命中同一日、或与宜项同日时都不由程序裁决', () => {
    // 2026-03-11 为卯月甲申：劫煞在申（忌），同日日干甲又是卯月月德（宜）。
    expect(evaluate('2026-03-11')).toMatchObject({
      status: 'unresolved',
      matchedRuleIds: ['xjbf-travel-0010'],
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

  it('所有 month-indexed 条件的表长都必须是 12，否则规则不得入库', () => {
    for (const pack of RULE_PACKS) {
      for (const rule of pack.rules) {
        for (const condition of rule.when.all) {
          if (condition.operator === 'month-indexed') {
            expect(condition.value.length, `${rule.id} → ${condition.fact}`).toBe(MONTH_COUNT)
          }
        }
      }
    }
  })

  it('每条规则的 locator 都指向其 sourceIds 中的卷次，不留悬空引用', () => {
    const volumePrefix: Record<string, string> = {
      'src-xjbf-vol4-scan': '卷四',
      'src-xjbf-vol5-scan': '卷五',
      'src-xjbf-vol6-scan': '卷六',
      'src-xjbf-vol11-scan': '卷十一',
    }

    for (const rule of TRAVEL_RULE_PACK.rules) {
      for (const sourceId of rule.sourceIds) {
        expect(rule.locator, `${rule.id} → ${sourceId}`).toContain(volumePrefix[sourceId])
      }
    }
  })
})
