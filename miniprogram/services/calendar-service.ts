import { getLunarDateFacts } from '../adapters/lunar-adapter'
import type { DateInfo } from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import { parseDateKey } from '../utils/date-key'

export type CalendarServiceErrorCode =
  'INVALID_DATE' | 'CALENDAR_OUT_OF_RANGE' | 'CALENDAR_COMPUTE_FAILED'

type CalendarServiceFailure = AppFailure<CalendarServiceErrorCode, { dateKey: string }>

export const SUPPORTED_YEAR_MIN = 1901
export const SUPPORTED_YEAR_MAX = 2100

/**
 * 按 UTC+8 民用日组装统一日期信息。
 * 原因：产品支持范围与统一错误码由服务层判断，页面只消费这里的结果，不直接接触适配器或第三方库。
 * 边界：只接受 `YYYY-MM-DD`；节日与规则字段在对应服务接入后追加，当前不提供占位值。
 */
export function getDateInfo(
  dateKey: string,
): AppResult<DateInfo, CalendarServiceErrorCode, { dateKey: string }> {
  const parsed = parseDateKey(dateKey)

  if (!parsed.ok) {
    return getDateInfoFailure('INVALID_DATE', parsed.message, dateKey)
  }

  const { year, month, day } = parsed.value

  if (year < SUPPORTED_YEAR_MIN || year > SUPPORTED_YEAR_MAX) {
    return getDateInfoFailure(
      'CALENDAR_OUT_OF_RANGE',
      `日期超出本版本支持范围（${SUPPORTED_YEAR_MIN}-01-01 至 ${SUPPORTED_YEAR_MAX}-12-31）`,
      dateKey,
    )
  }

  const facts = getLunarDateFacts({ year, month, day })

  if (!facts.ok) {
    return getDateInfoFailure('CALENDAR_COMPUTE_FAILED', facts.message, dateKey)
  }

  return {
    ok: true,
    value: {
      dateKey: facts.value.dateKey,
      timezone: facts.value.timezone,
      solar: facts.value.solar,
      lunar: facts.value.lunar,
      ganzhi: facts.value.ganzhi,
      solarTerm: facts.value.solarTerm,
      nextSolarTerm: facts.value.nextSolarTerm,
      versions: {
        calendarAdapter: facts.value.adapterVersion,
      },
    },
  }
}

function getDateInfoFailure(
  code: CalendarServiceErrorCode,
  message: string,
  dateKey: string,
): CalendarServiceFailure {
  return {
    ok: false,
    code,
    message,
    retryable: false,
    context: { dateKey },
  }
}
