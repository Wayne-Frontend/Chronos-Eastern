import type { CivilDateParts, DateKey } from '../types/calendar'
import type { AppResult } from '../types/result'
import { getGregorianMonthDays } from './util'

export type DateKeyErrorCode = 'INVALID_DATE'

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * 将页面间传递的日期键解析为纯数字字段。
 * 原因：直接构造 `new Date('YYYY-MM-DD')` 在不同 JavaScript 环境中可能按 UTC 解析。
 * 边界：这里只验证公历日期本身，产品支持年份范围由 calendar-service 单独判断。
 */
export function parseDateKey(
  input: string,
): AppResult<CivilDateParts & { dateKey: DateKey }, DateKeyErrorCode, { input: string }> {
  const match = DATE_KEY_PATTERN.exec(input)

  if (!match) {
    return invalidDate(input)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (month < 1 || month > 12 || day < 1 || day > getGregorianMonthDays(year, month)) {
    return invalidDate(input)
  }

  return {
    ok: true,
    value: {
      dateKey: input as DateKey,
      year,
      month,
      day,
    },
  }
}

/** 把公历年月日格式化为日期键，不参与任何时区换算。 */
export function formatDateKey(parts: CivilDateParts): DateKey {
  return `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}` as DateKey
}

/**
 * 把绝对时刻换算成 UTC+8 民用日期键。
 * 原因："今天"必须先按 UTC+8 取年月日，不能读取宿主的本地时区；这里只用 UTC 取值，不受宿主时区影响。
 */
export function dateKeyFromTimestampUtc8(timestamp: number): DateKey {
  const utc8 = new Date(timestamp + UTC8_OFFSET_MS)

  return formatDateKey({
    year: utc8.getUTCFullYear(),
    month: utc8.getUTCMonth() + 1,
    day: utc8.getUTCDate(),
  })
}

export function getTodayDateKey(): DateKey {
  return dateKeyFromTimestampUtc8(Date.now())
}

/** 按公历日平移日期键，用于取次日或补位日；任一输入无效时返回 null。 */
export function addDaysToDateKey(dateKey: string, days: number): DateKey | null {
  const parts = parseDateKey(dateKey)

  if (!parts.ok) {
    return null
  }

  const shifted = new Date(
    Date.UTC(parts.value.year, parts.value.month - 1, parts.value.day + days),
  )

  return formatDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  })
}

/**
 * 切换到目标年月并保留同一日号；目标月没有该日号时取该月最后一日（方案 3.3）。
 * 边界：selectedDateKey 无效时取该月 1 日，不猜测日期。
 */
export function shiftDateKeyToMonth(selectedDateKey: string, year: number, month: number): DateKey {
  const parsed = parseDateKey(selectedDateKey)
  const day = parsed.ok ? parsed.value.day : 1

  return formatDateKey({ year, month, day: Math.min(day, getGregorianMonthDays(year, month)) })
}

/**
 * 按 UTC+8 民用日计算两个日期键相差的天数，任一日期无效时返回 null。
 * 边界：只做民用日相减，不承载时刻或时区语义。
 */
export function countDaysBetween(start: string, end: string): number | null {
  const startParts = parseDateKey(start)
  const endParts = parseDateKey(end)

  if (!startParts.ok || !endParts.ok) {
    return null
  }

  const startMs = Date.UTC(startParts.value.year, startParts.value.month - 1, startParts.value.day)
  const endMs = Date.UTC(endParts.value.year, endParts.value.month - 1, endParts.value.day)

  return Math.round((endMs - startMs) / MS_PER_DAY)
}

function invalidDate(
  input: string,
): AppResult<CivilDateParts & { dateKey: DateKey }, DateKeyErrorCode, { input: string }> {
  return {
    ok: false,
    code: 'INVALID_DATE',
    message: '日期格式或日期值无效',
    retryable: false,
    context: { input },
  }
}
