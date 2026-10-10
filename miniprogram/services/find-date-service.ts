import { canQueryEventType, findEventType } from '../data/event-types'
import { findVerifiedRulePack } from '../data/rules/manifest'
import type { DateInfo, DateKey } from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import type { RulePackCompleteness } from '../types/rule'
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

/**
 * 结果卡只承载「哪一天」与「那天是什么日子」，依据本身不进结果卡。
 * 原因：结果卡上列规则名会让传统术语抢在用户结论之前出现，且与详情页重复；
 * 产品决定由用户点进详情查看完整依据，方案 2.4 的结果卡依据摘要不再实现。
 * 边界：因此这里不返回任何规则名、说明或命中计数。
 */
export interface FindDateResultItem {
  dateKey: DateKey
  weekdayText: string
  lunarText: string
  /** 节气或节日标签；两者都无时为空串。 */
  tagText: string
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
  /**
   * 纳入与排除同级命中、未经裁决因而不进入结果的日子（方案 6.7）。
   * 原因：只给计数会让用户看到日期凭空消失，这里连同计数一起交给页面逐日说明。
   * 边界：只给日期，不替用户裁决谁先谁后；详情页会列出双方依据。
   */
  conflictDates: readonly DateKey[]
  rulePack: {
    id: string
    version: string
    /** partial 时页面必须显著展示覆盖范围，不得让用户当作完整结论。 */
    completeness: RulePackCompleteness
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

  if (!eventType || !canQueryEventType(eventType)) {
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
  const rangeIssue = describeRangeIssue(query.startDate, query.endDate, eventType.maxRangeDays)

  if (rangeIssue !== '') {
    return failure('INVALID_RANGE', rangeIssue, context)
  }

  // describeRangeIssue 通过后，totalDays 必为非空且非负。
  const checkedDays = (totalDays ?? 0) + 1

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
  const conflictDates: DateKey[] = []
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
          results.push(buildResultItem(info, getInfoAtOffset(index + 1)))
          break
        case 'excluded':
          summary.excludedDays += 1
          break
        case 'unresolved':
          summary.conflictDays += 1
          conflictDates.push(info.dateKey)
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
      conflictDates,
      rulePack: {
        id: pack.id,
        version: pack.version,
        completeness: pack.completeness,
        coverage: pack.coverage,
      },
    },
  }
}

/**
 * 校验查询范围，返回就地提示；合法时返回空串。
 * 原因：方案 2.4 要求范围非法时「就地提示并阻止查询」。页面必须在点击之前就能说明按钮为何不可用，
 * 而查询失败也要给出同一句话，两处共用这一份判据与文案，不得各写一套。
 * 边界：日期键无法相减时按「起始日晚于结束日」处理；只校验范围本身，年份上下限由调用方另判。
 */
export function describeRangeIssue(
  startDate: string,
  endDate: string,
  maxRangeDays: number,
): string {
  const days = countDaysBetween(startDate, endDate)

  if (days === null || days < 0) {
    return '结束日期不能早于开始日期'
  }

  const checkedDays = days + 1

  if (checkedDays > maxRangeDays) {
    return `查询范围最长 ${maxRangeDays} 天，当前选择了 ${checkedDays} 天`
  }

  return ''
}

function buildResultItem(
  info: DateInfo,
  nextDayInfo: DateInfo | null | undefined,
): FindDateResultItem {
  return {
    dateKey: info.dateKey,
    weekdayText: formatWeekday(info.solar.weekday),
    lunarText: formatLunarText(info.lunar),
    tagText: describeTag(info, nextDayInfo ?? null),
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
