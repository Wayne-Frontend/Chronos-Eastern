import type { DateInfo } from '../types/calendar'
import type { RuleDefinition, RulePack } from '../types/rule'
import { getJianChu, splitGanzhi, type GanzhiParts } from '../utils/ganzhi'

export interface DateFacts {
  dateKey: string
  /** 建除十二神；月支或日支无法解析时为 null。 */
  jianChu: string | null
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

    if (value === null || condition.operator !== 'in') {
      return 'unknown'
    }

    if (!condition.value.includes(value)) {
      return 'not_matched'
    }
  }

  return 'matched'
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
