import { ADJUDICATION_CLAUSES, DAY_WIDE_EXCLUSION_PILLARS } from '../data/rules/adjudication'
import { MONTH_GOD_TABLES } from '../data/rules/month-gods'
import type { AdjudicationClause, AdjudicationEvidence, RulePack } from '../types/rule'
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
  /** 四相一类的成对天干神煞：表里存的是这对天干共同的五行，与派生事实 stemElement 比对。 */
  | { fact: 'element'; table: readonly string[] }
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
  // 满日条的解除条件含月恩与四相；四相同 四相规则一样读日干五行。
  月恩: { fact: 'stem', table: MONTH_GOD_TABLES.月恩 },
  四相: { fact: 'element', table: MONTH_GOD_TABLES.四相 },
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

  if (entry.fact === 'element') {
    const target = resolveMonthIndexed(entry.table, monthBranch)

    return target === null || facts.stemElement === null ? null : target === facts.stemElement
  }

  const target = resolveMonthIndexed(entry.table, monthBranch)

  if (target === null) {
    return null
  }

  return target === (entry.fact === 'branch' ? dayBranch : dayStem)
}

/**
 * 该日是否落在卷十《月厭》的整日「诸事皆忌」清单里（陰陽大會、小會、陰位、交破、
 * 擊衝、陽破陰衝、陰道衝陽、三陰、絕陰、絕陽）。
 * 边界：缺输入（月支或日柱解析不出）按 false 处理——宁可维持常例，不得凭空定为忌。
 */
export function isDayWideExcluded(facts: DateFacts): boolean {
  const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null
  const dayPillar = facts.dayPillar

  if (monthBranch === null || dayPillar === null) {
    return false
  }

  return (DAY_WIDE_EXCLUSION_PILLARS[monthBranch] ?? []).includes(dayPillar)
}

export function getDayWideExclusionEvidence(facts: DateFacts): AdjudicationEvidence | null {
  if (!isDayWideExcluded(facts)) {
    return null
  }

  return {
    kind: 'day-wide',
    outcome: 'exclude',
    ruleId: null,
    name: '整日排除',
    monthBranch: facts.ganzhi.monthJieQi!.branch,
    dayPillar: facts.dayPillar!,
    sourceIds: ['src-xjbf-vol10-scan'],
    steps: [
      {
        shensha: '月厌',
        outcome: 'exclude',
        presentShensha: [],
        locator: '卷十《月厭》整日「諸事皆忌」日柱清单（影印本第 172–173 帧）',
      },
    ],
  }
}

/** 单个忌神煞当日的结论：解除、定为忌、或按常例（两不注）。 */
export type ShenshaOutcome = 'lift' | 'exclude' | 'normal'

interface ShenshaResolution {
  outcome: ShenshaOutcome
  clauses: readonly AdjudicationClause[]
  steps: AdjudicationEvidence['steps']
}

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
  return resolveShensha(shensha, facts, eventType, seen).outcome
}

/** 判定和轨迹共用同一次匹配，保留转致链及实际满足的并临条件。 */
function resolveShensha(
  shensha: string,
  facts: DateFacts,
  eventType: string,
  seen: ReadonlySet<string> = new Set<string>(),
): ShenshaResolution {
  const monthBranch = facts.ganzhi.monthJieQi?.branch ?? null

  if (monthBranch === null || seen.has(shensha)) {
    return { outcome: 'normal', clauses: [], steps: [] }
  }

  const visited = new Set([...seen, shensha])

  for (const clause of ADJUDICATION_CLAUSES) {
    if (clause.shensha !== shensha || !clause.monthBranches.includes(monthBranch)) {
      continue
    }

    const presentShensha = clause.requiresAny.filter(
      (name) => isShenshaPresent(name, facts) === true,
    )
    const satisfied = clause.requiresAny.length === 0 || presentShensha.length > 0

    if (!satisfied) {
      continue
    }

    const step = { shensha, outcome: clause.outcome, presentShensha, locator: clause.locator }

    if (clause.outcome === 'delegate') {
      const next = clause.delegateShensha
        ? resolveShensha(clause.delegateShensha, facts, eventType, visited)
        : { outcome: 'normal' as const, clauses: [], steps: [] }
      return {
        outcome: next.outcome,
        clauses: [clause, ...next.clauses],
        steps: [step, ...next.steps],
      }
    }

    if (clause.outcome === 'lift') {
      // 「止忌某某，餘皆不忌」：清单含本事项时，该忌项仍然维持。
      return {
        outcome: clause.residualEventTypes.includes(eventType) ? 'normal' : 'lift',
        clauses: [clause],
        steps: [step],
      }
    }

    return { outcome: clause.outcome, clauses: [clause], steps: [step] }
  }

  return { outcome: 'normal', clauses: [], steps: [] }
}

/** 取该忌神煞当日对该事项生效的解除条款；结论不是解除时返回 null。 */
export function findApplicableClause(
  shensha: string,
  facts: DateFacts,
  eventType: string,
): AdjudicationClause | null {
  const result = resolveShensha(shensha, facts, eventType)
  return result.outcome === 'lift' ? (result.clauses[result.clauses.length - 1] ?? null) : null
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
  evidence: readonly AdjudicationEvidence[]
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
  const evidence: AdjudicationEvidence[] = []

  for (const ruleId of excludeRuleIds) {
    const rule = pack.rules.find((item) => item.id === ruleId)
    const resolution = rule ? resolveShensha(rule.name, facts, pack.eventType) : null
    const outcome = resolution?.outcome ?? 'normal'

    if (rule && resolution && resolution.steps.length > 0) {
      evidence.push({
        kind: 'clause',
        outcome,
        ruleId,
        name: rule.name,
        monthBranch: facts.ganzhi.monthJieQi!.branch,
        dayPillar: facts.dayPillar ?? '',
        sourceIds: ['src-xjbf-vol10-scan'],
        steps: resolution.steps,
      })
    }

    if (outcome === 'lift') {
      liftedRuleIds.push(ruleId)
      appliedClauses.push(...(resolution?.clauses ?? []))
    } else if (outcome === 'exclude') {
      excludedRuleIds.push(ruleId)
      appliedClauses.push(...(resolution?.clauses ?? []))
    } else {
      remainingExcludeRuleIds.push(ruleId)
    }
  }

  return { liftedRuleIds, excludedRuleIds, remainingExcludeRuleIds, appliedClauses, evidence }
}
