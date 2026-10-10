import type { DateInfo } from '../types/calendar'
import type { RuleCondition, RuleDefinition, RulePack } from '../types/rule'
import { splitGanzhi, type GanzhiParts } from '../utils/ganzhi'
import {
  getJianChu,
  getSeason,
  getBranchElement,
  getStemElement,
  resolveMonthIndexed,
  resolveMonthIndexedSet,
  type Element,
  type Season,
} from './rule-facts'

export interface DateFacts {
  dateKey: string
  /** 建除十二神；月支或日支无法解析时为 null。 */
  jianChu: string | null
  /** 节令月所属季节；供卷五季节性条款读取，月支无法解析时为 null。 */
  season: Season | null
  /** 日干五行；供「春丙丁」这类成对天干的条款读取，日干无法解析时为 null。 */
  stemElement: Element | null
  /** 日支五行；供「干支俱绝」型条款（如四废）与日干五行合用，日支无法解析时为 null。 */
  branchElement: Element | null
  /** 日柱（日干＋日支，两字），供「八专」「阴阳不将」这类按完整日柱取值的条款读取。 */
  dayPillar: string | null
  ganzhi: {
    yearLunarNewYear: GanzhiParts | null
    yearLiChun: GanzhiParts | null
    monthJieQi: GanzhiParts | null
    dayCivil: GanzhiParts | null
  }
  lunar: {
    month: number
    day: number
    isLeapMonth: boolean
  }
  solarTerm: string | null
}

export type RuleEvaluation = 'matched' | 'not_matched' | 'unknown'

export type DayStatus = 'pass' | 'excluded' | 'unresolved' | 'not_matched' | 'unknown'

export interface DayEvaluation {
  status: DayStatus
  matchedRuleIds: readonly string[]
  excludeRuleIds: readonly string[]
  /** 因缺输入无法判定、从而阻止该日进入结果的规则。 */
  unknownRuleIds: readonly string[]
}

/** 把日期信息转换成规则可读取的事实；缺字段一律留 null，不填默认值。 */
export function buildDateFacts(info: DateInfo): DateFacts {
  const monthParts = splitGanzhi(info.ganzhi.monthJieQi)
  const dayParts = splitGanzhi(info.ganzhi.dayCivil)

  return {
    dateKey: info.dateKey,
    jianChu: monthParts && dayParts ? getJianChu(monthParts.branch, dayParts.branch) : null,
    season: monthParts ? getSeason(monthParts.branch) : null,
    stemElement: dayParts ? getStemElement(dayParts.stem) : null,
    branchElement: dayParts ? getBranchElement(dayParts.branch) : null,
    dayPillar: dayParts ? `${dayParts.stem}${dayParts.branch}` : null,
    ganzhi: {
      yearLunarNewYear: splitGanzhi(info.ganzhi.yearLunarNewYear),
      yearLiChun: splitGanzhi(info.ganzhi.yearLiChun),
      monthJieQi: monthParts,
      dayCivil: dayParts,
    },
    lunar: {
      month: info.lunar.month,
      day: info.lunar.day,
      isLeapMonth: info.lunar.isLeapMonth,
    },
    solarTerm: info.solarTerm?.name ?? null,
  }
}

/**
 * 求值单条规则。
 * 原因：未知字段路径或未实现的算子按缺输入处理，不得当作未命中。
 * 边界：只支持已声明算子；规则状态由 `evaluateDay` 统一过滤。
 */
export function evaluateRule(rule: RuleDefinition, facts: DateFacts): RuleEvaluation {
  for (const condition of rule.when.all) {
    const value = readFact(facts, condition.fact)

    if (value === null) {
      return 'unknown'
    }

    const matched = matchCondition(condition, value, facts)

    if (matched === null) {
      return 'unknown'
    }

    if (!matched) {
      return 'not_matched'
    }
  }

  return 'matched'
}

/** 返回 null 表示缺输入或算子未实现，一律按未知处理，不得当作未命中。 */
function matchCondition(condition: RuleCondition, value: string, facts: DateFacts): boolean | null {
  switch (condition.operator) {
    case 'in':
      return condition.value.includes(value)
    case 'month-indexed': {
      const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null

      if (monthBranch === null) {
        return null
      }

      const target = resolveMonthIndexed(condition.value, monthBranch)

      return target === null ? null : target === value
    }
    case 'month-indexed-set': {
      const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null

      if (monthBranch === null) {
        return null
      }

      const target = resolveMonthIndexedSet(condition.value, monthBranch)

      // 空串项切成 ['']，与任何真实取值都不相等，本月即判为不命中。
      return target === null ? null : target.includes(value)
    }
    default:
      return null
  }
}

/**
 * 合并一日的规则求值结果。
 * 语义（方案 6.7）：只有 verified 规则参与；同级纳入与排除同时命中且无来源裁决时返回 unresolved；
 * 缺输入返回 unknown；命中排除为 excluded；命中纳入为 pass；一条未中为 not_matched。
 * 边界：priority 目前全部为 null，来源未记录优先关系时不实现裁决，程序不得自行补值。
 */
export function evaluateDay(pack: RulePack, facts: DateFacts): DayEvaluation {
  const matchedRuleIds: string[] = []
  const excludeRuleIds: string[] = []
  const unknownRuleIds: string[] = []

  for (const rule of pack.rules) {
    if (rule.status !== 'verified') {
      continue
    }

    const evaluation = evaluateRule(rule, facts)

    if (evaluation === 'unknown') {
      unknownRuleIds.push(rule.id)
      continue
    }

    if (evaluation === 'matched') {
      if (rule.effect === 'include') {
        matchedRuleIds.push(rule.id)
      } else {
        excludeRuleIds.push(rule.id)
      }
    }
  }

  const base = { matchedRuleIds, excludeRuleIds, unknownRuleIds }

  if (unknownRuleIds.length > 0) {
    return { status: 'unknown', ...base }
  }

  if (matchedRuleIds.length > 0 && excludeRuleIds.length > 0) {
    return { status: 'unresolved', ...base }
  }

  if (excludeRuleIds.length > 0) {
    return { status: 'excluded', ...base }
  }

  if (matchedRuleIds.length > 0) {
    return { status: 'pass', ...base }
  }

  return { status: 'not_matched', ...base }
}

function readFact(facts: DateFacts, path: string): string | null {
  let cursor: unknown = facts

  for (const segment of path.split('.')) {
    if (typeof cursor !== 'object' || cursor === null) {
      return null
    }

    cursor = (cursor as Record<string, unknown>)[segment]
  }

  return typeof cursor === 'string' ? cursor : null
}
