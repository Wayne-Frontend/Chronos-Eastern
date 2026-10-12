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
  /** 建除类条件（如「值月破」＝当日为破日）。 */
  | { fact: 'jianchu'; value: string }

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
  // 四废「與月破併則諸事皆忌」：月破即建除之破日。
  月破: { fact: 'jianchu', value: '破' },
  // 月厌子午月一条要「與天赦併」；天赦取完整日柱（春戊寅等）。
  天赦: {
    fact: 'stemBranch',
    stemTable: MONTH_GOD_TABLES.天赦干,
    branchTable: MONTH_GOD_TABLES.天赦支,
  },
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

  if (entry.fact === 'jianchu') {
    return facts.jianChu === entry.value
  }

  const target = resolveMonthIndexed(entry.table, monthBranch)

  if (target === null) {
    return null
  }

  return target === (entry.fact === 'branch' ? dayBranch : dayStem)
}

/** 单个忌神煞当日的结论：解除、定为忌、或按常例（两不注）。 */
export type ShenshaOutcome = 'lift' | 'exclude' | 'normal'

/**
 * 求某忌神煞当日的结论。按条款表顺序取第一条命中的支路（月份命中、所需神煞满足），
 * 遇 `delegate` 转致到被指名的神煞继续求值；未命中任何支路即如常例。
 * 边界：`seen` 防止转致成环（两煞互指），成环时按常例处理，不得递归爆栈。
 */
export function resolveShenshaOutcome(
  shensha: string,
  facts: DateFacts,
  eventType: string,
  seen: ReadonlySet<string> = new Set<string>(),
): ShenshaOutcome {
  const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null

  if (monthBranch === null || seen.has(shensha)) {
    return 'normal'
  }

  const visited = new Set([...seen, shensha])

  for (const clause of ADJUDICATION_CLAUSES) {
    if (clause.shensha !== shensha || !clause.monthBranches.includes(monthBranch)) {
      continue
    }

    const satisfied =
      clause.requiresAny.length === 0 ||
      clause.requiresAny.some((name) => isShenshaPresent(name, facts) === true)

    if (!satisfied) {
      continue
    }

    if (clause.outcome === 'delegate') {
      return clause.delegateShensha
        ? resolveShenshaOutcome(clause.delegateShensha, facts, eventType, visited)
        : 'normal'
    }

    if (clause.outcome === 'lift') {
      // 「止忌某某，餘皆不忌」：清单含本事项时，该忌项仍然维持。
      return clause.residualEventTypes.includes(eventType) ? 'normal' : 'lift'
    }

    return clause.outcome
  }

  return 'normal'
}

/** 取该忌神煞当日对该事项生效的解除条款；结论不是解除时返回 null。 */
export function findApplicableClause(
  shensha: string,
  facts: DateFacts,
  eventType: string,
): AdjudicationClause | null {
  if (resolveShenshaOutcome(shensha, facts, eventType) !== 'lift') {
    return null
  }

  const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null

  return (
    ADJUDICATION_CLAUSES.find(
      (clause) =>
        clause.shensha === shensha &&
        clause.outcome === 'lift' &&
        monthBranch !== null &&
        clause.monthBranches.includes(monthBranch),
    ) ?? null
  )
}

export interface AdjudicationOutcome {
  /** 经条款解除的忌规则 id。 */
  liftedRuleIds: readonly string[]
  /** 条款明言「诸事皆忌／犹忌」的忌规则 id：该日据此定为忌。 */
  excludedRuleIds: readonly string[]
  /** 无条款或条款为「如常例」的忌规则 id，维持原判。 */
  remainingExcludeRuleIds: readonly string[]
  /** 生效并改变结论的条款，供解释与测试。 */
  appliedClauses: readonly AdjudicationClause[]
}

/**
 * 对一日命中的忌规则逐条求结论。
 * 边界：只按条款表处置，未编码的神煞一律 `normal`（维持 unresolved），偏保守。
 */
export function applyAdjudication(
  pack: RulePack,
  facts: DateFacts,
  excludeRuleIds: readonly string[],
): AdjudicationOutcome {
  const liftedRuleIds: string[] = []
  const excludedRuleIds: string[] = []
  const remainingExcludeRuleIds: string[] = []
  const appliedClauses: AdjudicationClause[] = []

  for (const ruleId of excludeRuleIds) {
    const rule = pack.rules.find((item) => item.id === ruleId)
    const outcome = rule ? resolveShenshaOutcome(rule.name, facts, pack.eventType) : 'normal'

    if (outcome === 'lift') {
      liftedRuleIds.push(ruleId)
      const clause = rule ? findApplicableClause(rule.name, facts, pack.eventType) : null

      if (clause) {
        appliedClauses.push(clause)
      }
    } else if (outcome === 'exclude') {
      excludedRuleIds.push(ruleId)
    } else {
      remainingExcludeRuleIds.push(ruleId)
    }
  }

  return { liftedRuleIds, excludedRuleIds, remainingExcludeRuleIds, appliedClauses }
}
