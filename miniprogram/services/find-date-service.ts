import { findEventType } from '../data/event-types'
import { findVerifiedRulePack } from '../data/rules/manifest'
import type { DateInfo, DateKey } from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import type { RulePack } from '../types/rule'
import { addDaysToDateKey, countDaysBetween, parseDateKey } from '../utils/date-key'
import { formatLunarText, formatWeekday } from '../utils/format'
import { getDateInfo, SUPPORTED_YEAR_MAX, SUPPORTED_YEAR_MIN } from './calendar-service'
import { matchFestivals } from './festival-service'
import { buildDateFacts, evaluateDay } from './rule-engine'

export type FindDateErrorCode =
  'INVALID_DATE' | 'INVALID_RANGE' | 'CALENDAR_OUT_OF_RANGE' | 'RULE_PACK_MISSING'

export interface FindDateFailureContext {
  eventType: string
  startDate: string
  endDate: string
}

export interface FindDateResultItem {
  dateKey: DateKey
  weekdayText: string
  lunarText: string
  /** 节气或节日标签；两者都无时为空串。 */
  tagText: string
  /** 命中的纳入规则说明，最多两条（方案 2.4 结果卡）。 */
  ruleTexts: readonly string[]
  matchedCount: number
}

export interface FindDateSummary {
  checkedDays: number
  passedDays: number
  excludedDays: number
  conflictDays: number
  notMatchedDays: number
  unknownDays: number
  errorDays: number
}

export interface FindDateOutcome {
  /** 有日期计算失败时为 partial，页面不展示正式结果（方案 6.9）。 */
  status: 'complete' | 'partial'
  results: readonly FindDateResultItem[]
  summary: FindDateSummary
  rulePack: {
    id: string
    version: string
    coverage: string
  }
}

export interface FindDatesQuery {
  eventType: string
  startDate: string
  endDate: string
}

export interface FindDatesOptions {
  /** 分批计算时的进度回调，形如「正在核对 12/30 日」。 */
  onProgress?: (checkedDays: number, totalDays: number) => void
}

const BATCH_SIZE = 12
const MAX_RESULT_RULE_TEXTS = 2

/**
 * 按事项与日期范围逐日筛选。
 * 原因：结果必须可解释到规则与来源，因此只输出通过已验证规则包的日子，并给出逐类计数。
 * 边界：同步计算按批让出事件循环，避免长范围查询阻塞渲染；并发查询由调用方的查询令牌丢弃过期结果。
 */
export async function findDates(
  query: FindDatesQuery,
  options: FindDatesOptions = {},
): Promise<AppResult<FindDateOutcome, FindDateErrorCode, FindDateFailureContext>> {
  const context: FindDateFailureContext = {
    eventType: query.eventType,
    startDate: query.startDate,
    endDate: query.endDate,
  }
  const eventType = findEventType(query.eventType)

  if (!eventType || eventType.status !== 'supported') {
    return failure('RULE_PACK_MISSING', '该事项尚未开放查询', context)
  }

  const pack = findVerifiedRulePack(query.eventType)

  if (!pack) {
    return failure('RULE_PACK_MISSING', '规则包缺失或未通过验证', context)
  }

  const start = parseDateKey(query.startDate)

  if (!start.ok) {
    return failure('INVALID_DATE', '开始日期无效', context)
  }

  const end = parseDateKey(query.endDate)

  if (!end.ok) {
    return failure('INVALID_DATE', '结束日期无效', context)
  }

  const totalDays = countDaysBetween(query.startDate, query.endDate)

  if (totalDays === null || totalDays < 0) {
    return failure('INVALID_RANGE', '结束日期不能早于开始日期', context)
  }

  const checkedDays = totalDays + 1

  if (checkedDays > eventType.maxRangeDays) {
    return failure('INVALID_RANGE', `查询范围最长 ${eventType.maxRangeDays} 天`, context)
  }

  if (start.value.year < SUPPORTED_YEAR_MIN || end.value.year > SUPPORTED_YEAR_MAX) {
    return failure(
      'CALENDAR_OUT_OF_RANGE',
      `日期超出本版本支持范围（${SUPPORTED_YEAR_MIN}-01-01 至 ${SUPPORTED_YEAR_MAX}-12-31）`,
      context,
    )
  }

  const infos: (DateInfo | null)[] = []

  // 按需缓存日期，避免每批重复换算；通过日期多取下一日，用于判断除夕等节日。
  const getInfoAtOffset = (offset: number): DateInfo | null => {
    const cached = infos[offset]

    if (cached !== undefined) {
      return cached
    }

    const dateKey = addDaysToDateKey(query.startDate, offset)
    const result = dateKey ? getDateInfo(dateKey) : null
    const value = result && result.ok ? result.value : null

    infos[offset] = value
    return value
  }

  const results: FindDateResultItem[] = []
  const summary: FindDateSummary = {
    checkedDays,
    passedDays: 0,
    excludedDays: 0,
    conflictDays: 0,
    notMatchedDays: 0,
    unknownDays: 0,
    errorDays: 0,
  }

  for (let index = 0; index < checkedDays; index++) {
    const info = getInfoAtOffset(index)

    if (!info) {
      summary.errorDays += 1
    } else {
      const evaluation = evaluateDay(pack, buildDateFacts(info))

      switch (evaluation.status) {
        case 'pass':
          summary.passedDays += 1
          results.push(
            buildResultItem(pack, info, getInfoAtOffset(index + 1), evaluation.matchedRuleIds),
          )
          break
        case 'excluded':
          summary.excludedDays += 1
          break
        case 'unresolved':
          summary.conflictDays += 1
          break
        case 'unknown':
          summary.unknownDays += 1
          break
        default:
          summary.notMatchedDays += 1
      }
    }

    if ((index + 1) % BATCH_SIZE === 0 && index + 1 < checkedDays) {
      options.onProgress?.(index + 1, checkedDays)
      await yieldToHost()
    }
  }

  options.onProgress?.(checkedDays, checkedDays)

  return {
    ok: true,
    value: {
      status: summary.errorDays > 0 ? 'partial' : 'complete',
      results,
      summary,
      rulePack: {
        id: pack.id,
        version: pack.version,
        coverage: pack.coverage,
      },
    },
  }
}

function buildResultItem(
  pack: RulePack,
  info: DateInfo,
  nextDayInfo: DateInfo | null | undefined,
  matchedRuleIds: readonly string[],
): FindDateResultItem {
  const matched = pack.rules.filter((rule) => matchedRuleIds.includes(rule.id))

  return {
    dateKey: info.dateKey,
    weekdayText: formatWeekday(info.solar.weekday),
    lunarText: formatLunarText(info.lunar),
    tagText: describeTag(info, nextDayInfo ?? null),
    ruleTexts: matched.slice(0, MAX_RESULT_RULE_TEXTS).map((rule) => rule.explanation),
    matchedCount: matched.length,
  }
}

function describeTag(info: DateInfo, nextDayInfo: DateInfo | null): string {
  if (info.solarTerm) {
    return info.solarTerm.name
  }

  return matchFestivals(info, nextDayInfo)
    .map((festival) => festival.name)
    .join('·')
}

function failure(
  code: FindDateErrorCode,
  message: string,
  context: FindDateFailureContext,
): AppFailure<FindDateErrorCode, FindDateFailureContext> {
  return {
    ok: false,
    code,
    message,
    retryable: false,
    context,
  }
}

function yieldToHost(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}
