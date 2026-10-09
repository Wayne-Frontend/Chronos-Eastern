import type { CivilDateParts, DateKey } from '../types/calendar'
import type { AppResult } from '../types/result'
import { getGregorianMonthDays } from './util'

export type DateKeyErrorCode = 'INVALID_DATE'

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

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
