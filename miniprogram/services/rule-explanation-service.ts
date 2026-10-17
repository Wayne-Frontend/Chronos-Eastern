import { canQueryEventType, findEventType } from '../data/event-types'
import { findVerifiedRulePack } from '../data/rules/manifest'
import { findSource, type SourceEntry } from '../data/sources'
import type { DateKey } from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import type {
  AdjudicationEvidence,
  RuleEffect,
  RulePackCompleteness,
  RuleStatus,
} from '../types/rule'
import { getDateInfo, type CalendarServiceErrorCode } from './calendar-service'
import { buildDateFacts, evaluateDay, type DayStatus } from './rule-engine'

export type RuleExplanationErrorCode = CalendarServiceErrorCode | 'RULE_PACK_MISSING'

export interface RuleExplanationFailureContext {
  dateKey: string
  eventType: string
}

export interface RuleExplanationItem {
  id: string
  /** 原书条目名，供首页等摘要界面直接展示。 */
  name: string
  effect: RuleEffect
  status: RuleStatus
  /**
   * 本条虽命中，但已依卷十的例外条款解除（如「与德合併则不忌」）。
   * 页面必须说明，不得让用户看到「宜」却不知道那条忌为何不算数。
   */
  adjudicated: boolean
  adjudicationSummary: string
  explanation: string
  locator: string
  limitations: readonly string[]
  sources: readonly SourceEntry[]
}

export interface DateRuleExplanation {
  dateKey: DateKey
  eventType: string
  eventName: string
  status: DayStatus
  matchedRules: readonly RuleExplanationItem[]
  unknownRules: readonly RuleExplanationItem[]
  adjudications: readonly AdjudicationExplanation[]
  rulePack: {
    id: string
    version: string
    /** partial 时详情页必须在规则区显著展示覆盖范围。 */
    completeness: RulePackCompleteness
    coverage: string
  }
}

export interface AdjudicationExplanation extends AdjudicationEvidence {
  id: string
  summary: string
  sources: readonly SourceEntry[]
}

/**
 * 生成单日规则解释。
 * 原因：详情页需要展示与筛选服务同源的完整依据，不能自行读取规则包或重复合并逻辑。
 * 边界：只接受可查询事项、verified 且来源完整的规则包；来源门禁由 manifest 统一执行。
 */
export function getDateRuleExplanation(
  dateKey: string,
  eventTypeId: string,
): AppResult<DateRuleExplanation, RuleExplanationErrorCode, RuleExplanationFailureContext> {
  const context = { dateKey, eventType: eventTypeId }
  const eventType = findEventType(eventTypeId)
  const pack = findVerifiedRulePack(eventTypeId)

  if (!eventType || !canQueryEventType(eventType) || !pack) {
    return failure('RULE_PACK_MISSING', '该事项暂无已验证规则包', context)
  }

  const info = getDateInfo(dateKey)

  if (!info.ok) {
    return {
      ...info,
      context,
    }
  }

  const evaluation = evaluateDay(pack, buildDateFacts(info.value))
  const matchedRuleIds = new Set([...evaluation.matchedRuleIds, ...evaluation.excludeRuleIds])
  const unknownRuleIds = new Set(evaluation.unknownRuleIds)
  const adjudicatedRuleIds = new Set(evaluation.adjudicatedRuleIds)
  const adjudications = evaluation.adjudications.map((evidence): AdjudicationExplanation => ({
    ...evidence,
    id: evidence.ruleId ?? `day-wide-${evidence.monthBranch}-${evidence.dayPillar}`,
    summary: describeAdjudication(evidence),
    sources: evidence.sourceIds
      .map((sourceId) => findSource(sourceId))
      .filter((source): source is SourceEntry => source !== null),
  }))
  const toExplanation = (rule: (typeof pack.rules)[number]): RuleExplanationItem => ({
    id: rule.id,
    name: rule.name,
    effect: rule.effect,
    status: rule.status,
    adjudicated: adjudicatedRuleIds.has(rule.id),
    adjudicationSummary: adjudications.find((item) => item.ruleId === rule.id)?.summary ?? '',
    explanation: rule.explanation,
    locator: rule.locator,
    limitations: rule.limitations,
    sources: rule.sourceIds
      .map((sourceId) => findSource(sourceId))
      .filter((source): source is SourceEntry => source !== null),
  })

  return {
    ok: true,
    value: {
      dateKey: info.value.dateKey,
      eventType: eventType.id,
      eventName: eventType.displayName,
      status: evaluation.status,
      matchedRules: pack.rules.filter((rule) => matchedRuleIds.has(rule.id)).map(toExplanation),
      unknownRules: pack.rules.filter((rule) => unknownRuleIds.has(rule.id)).map(toExplanation),
      adjudications,
      rulePack: {
        id: pack.id,
        version: pack.version,
        completeness: pack.completeness,
        coverage: pack.coverage,
      },
    },
  }
}

function describeAdjudication(evidence: AdjudicationEvidence): string {
  const dateCondition = `本日为${evidence.monthBranch}月${evidence.dayPillar}日`
  if (evidence.kind === 'day-wide') {
    return `${dateCondition}，落在卷十《月厌》的整日排除清单；即使命中宜项，仍按原书列为忌。`
  }

  const path = evidence.steps.map((step) => step.shensha).join(' → ')
  const present = [...new Set(evidence.steps.flatMap((step) => step.presentShensha))]
  const condition = present.length > 0 ? `，并临${present.join('、')}` : ''
  const result =
    evidence.outcome === 'lift'
      ? '依原书条款，本事项的这条忌项解除；当日结论仍结合其他条款判断。'
      : evidence.outcome === 'exclude'
        ? '依原书条款仍列为忌，同日宜项不能改变这一结论。'
        : '本事项的这条忌项未获解除，宜忌并见时仍按常例处理。'
  return `${dateCondition}${condition}，按${path}条款处理。${result}`
}

function failure(
  code: RuleExplanationErrorCode,
  message: string,
  context: RuleExplanationFailureContext,
): AppFailure<RuleExplanationErrorCode, RuleExplanationFailureContext> {
  return {
    ok: false,
    code,
    message,
    retryable: false,
    context,
  }
}
