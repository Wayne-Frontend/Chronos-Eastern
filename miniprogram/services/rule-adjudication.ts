import { ADJUDICATION_CLAUSES } from '../data/rules/adjudication'
import { MONTH_GOD_TABLES } from '../data/rules/month-gods'
import type { AdjudicationClause, RulePack } from '../types/rule'
import { resolveMonthIndexed, resolveMonthIndexedSet } from './rule-facts'
import type { DateFacts } from './rule-engine'

/**
 * 可判「当日是否当值」的德神。取值一律取自 month-gods 的正典月表，与具体事项无关——
 * 卷十的条款条件（「與月德併」「與天德合併」）说的是**当日恰为这些德神之值日**，
 * 与该神煞在事项条目里是否列为宜项无关。
 * 四仲月的天德、天德合在表里是空串哨兵，永不等于任何真实天干，即这四个月不存在该德神，
 * 与天德四仲月的定案一致（见 docs/travel-rule-audit.md §8.12）。
 */
type PresenceEntry =
  | { fact: 'stem' | 'branch'; table: readonly string[] }
  /** 天愿一类的完整日柱神煞：干、支两张表都要相等。 */
  | { fact: 'stemBranch'; stemTable: readonly string[]; branchTable: readonly string[] }
  /** 三合一类的每月多值神煞：当月取值是一组地支，日支在其中即为当值。 */
  | { fact: 'branchSet'; table: readonly string[] }

const PRESENCE_TABLES: Record<string, PresenceEntry> = {
  月德: { fact: 'stem', table: MONTH_GOD_TABLES.月德 },
  月德合: { fact: 'stem', table: MONTH_GOD_TABLES.月德合 },
  天德: { fact: 'stem', table: MONTH_GOD_TABLES.天德 },
  天德合: { fact: 'stem', table: MONTH_GOD_TABLES.天德合 },
  // 卷十劫煞寅申月一条的条件是「值六合」，六合按月建取地支（正月在亥、逆行十二辰）。
  六合: { fact: 'branch', table: MONTH_GOD_TABLES.六合 },
  // 平日亥月一条要「時德六合」并临；時德按季节取辰（春午夏辰秋子冬寅）。
  時德: { fact: 'branch', table: MONTH_GOD_TABLES.时德 },
  // 月刑、月煞两条的解除条件里含天愿，天愿取完整日柱。
  天願: {
    fact: 'stemBranch',
    stemTable: MONTH_GOD_TABLES.天愿干,
    branchTable: MONTH_GOD_TABLES.天愿支,
  },
  // 四耗辰戌丑未月一条的条件是「與三合併」，三合每月取两支，按集合判断。
  三合: { fact: 'branchSet', table: MONTH_GOD_TABLES.三合 },
}

/**
 * 某德神当日是否当值。
 * 返回 null 表示缺输入（月支或日干解析不出／该神煞未登记），调用方一律按「未满足」处理，
 * 不得当作满足——否则会凭空多给日子。
 */
export function isShenshaPresent(name: string, facts: DateFacts): boolean | null {
  const entry = PRESENCE_TABLES[name]
  const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null
  const dayStem = facts.ganzhi.dayCivil?.stem ?? null
  const dayBranch = facts.ganzhi.dayCivil?.branch ?? null

  if (!entry || monthBranch === null || dayStem === null || dayBranch === null) {
    return null
  }

  if (entry.fact === 'stemBranch') {
    const targetStem = resolveMonthIndexed(entry.stemTable, monthBranch)
    const targetBranch = resolveMonthIndexed(entry.branchTable, monthBranch)

    if (targetStem === null || targetBranch === null) {
      return null
    }

    return targetStem === dayStem && targetBranch === dayBranch
  }

  if (entry.fact === 'branchSet') {
    const targetSet = resolveMonthIndexedSet(entry.table, monthBranch)

    return targetSet === null ? null : targetSet.includes(dayBranch)
  }

  const target = resolveMonthIndexed(entry.table, monthBranch)

  if (target === null) {
    return null
  }

  return target === (entry.fact === 'branch' ? dayBranch : dayStem)
}

/**
 * 取该忌神煞当日对该事项生效的裁决条款；无条款、条件未满足、或条款的残余忌项包含该事项时，
 * 一律返回 null（即维持常例）。残余清单存的是 eventType id，故必须带事项进来判断。
 */
export function findApplicableClause(
  shensha: string,
  facts: DateFacts,
  eventType: string,
): AdjudicationClause | null {
  const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null

  if (monthBranch === null) {
    return null
  }

  for (const clause of ADJUDICATION_CLAUSES) {
    if (clause.shensha !== shensha || !clause.monthBranches.includes(monthBranch)) {
      continue
    }

    if (clause.residualEventTypes.includes(eventType)) {
      continue
    }

    const satisfied =
      clause.requiresAny.length === 0 ||
      clause.requiresAny.some((name) => isShenshaPresent(name, facts) === true)

    if (satisfied) {
      return clause
    }
  }

  return null
}

export interface AdjudicationOutcome {
  /** 经条款解除的忌规则 id。 */
  liftedRuleIds: readonly string[]
  /** 条款未覆盖、维持原判的忌规则 id。 */
  remainingExcludeRuleIds: readonly string[]
  /** 实际生效的条款，供解释与测试。 */
  appliedClauses: readonly AdjudicationClause[]
}

/**
 * 对一日命中的忌规则逐条查裁决条款：命中且条件满足的按条款解除，其余原样保留。
 * 边界：只做「解除」，不做「加忌」；未编码条款、未登记德神一律不动，调用方维持 `unresolved`。
 * 调用方须先确认该日确有宜忌并见——没有冲突时不存在要裁决的对象。
 */
export function applyAdjudication(
  pack: RulePack,
  facts: DateFacts,
  excludeRuleIds: readonly string[],
): AdjudicationOutcome {
  const liftedRuleIds: string[] = []
  const remainingExcludeRuleIds: string[] = []
  const appliedClauses: AdjudicationClause[] = []

  for (const ruleId of excludeRuleIds) {
    const rule = pack.rules.find((item) => item.id === ruleId)
    const clause = rule ? findApplicableClause(rule.name, facts, pack.eventType) : null

    if (clause) {
      liftedRuleIds.push(ruleId)
      appliedClauses.push(clause)
    } else {
      remainingExcludeRuleIds.push(ruleId)
    }
  }

  return { liftedRuleIds, remainingExcludeRuleIds, appliedClauses }
}
