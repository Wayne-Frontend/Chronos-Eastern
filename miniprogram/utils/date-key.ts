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

/**
 * 把绝对时刻换算成 UTC+8 民用日期键。
 * 原因："今天"必须先按 UTC+8 取年月日，不能读取宿主的本地时区；这里只用 UTC 取值，不受宿主时区影响。
 */
export function dateKeyFromTimestampUtc8(timestamp: number): DateKey {
  const utc8 = new Date(timestamp + UTC8_OFFSET_MS)
  const year = utc8.getUTCFullYear()
  const month = utc8.getUTCMonth() + 1
  const day = utc8.getUTCDate()

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}` as DateKey
}

export function getTodayDateKey(): DateKey {
  return dateKeyFromTimestampUtc8(Date.now())
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
