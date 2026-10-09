import { getLunarDateFacts } from '../adapters/lunar-adapter'
import type { DateInfo, DateKey } from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import { formatDateKey, parseDateKey } from '../utils/date-key'
import { getGregorianWeekday } from '../utils/util'
import { matchFestivals } from './festival-service'

export type CalendarServiceErrorCode =
  'INVALID_DATE' | 'CALENDAR_OUT_OF_RANGE' | 'CALENDAR_COMPUTE_FAILED'

type CalendarServiceFailure = AppFailure<CalendarServiceErrorCode, { dateKey: string }>

export const SUPPORTED_YEAR_MIN = 1901
export const SUPPORTED_YEAR_MAX = 2100

export interface MonthGridCell {
  dateKey: DateKey
  day: number
  /** 格内单一标签：节气 > 传统节日 > 纪念日 > 农历初一（月名）> 农历日名。 */
  labelText: string
  labelKind: 'solar-term' | 'festival' | 'commemoration' | 'lunar-month' | 'lunar-day' | 'none'
  isCurrentMonth: boolean
  isToday: boolean
}

const GRID_CELL_COUNT = 42

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

/**
 * 生成月历 42 格渲染模型：周一起始，首尾由相邻月份补位。
 * 原因：页面只接收渲染字段，不接触历法库对象；计算是同步的，因此不存在旧月份结果覆盖新月份的竞态。
 * 边界：补位日超出支持年份时仍显示日号，但不给标签。
 */
export function getMonthGrid(
  year: number,
  month: number,
  todayKey: string,
): AppResult<MonthGridCell[], CalendarServiceErrorCode, { dateKey: string }> {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return getDateInfoFailure('INVALID_DATE', '月份参数无效', `${year}-${month}`)
  }

  if (!Number.isInteger(year) || year < SUPPORTED_YEAR_MIN || year > SUPPORTED_YEAR_MAX) {
    return getDateInfoFailure(
      'CALENDAR_OUT_OF_RANGE',
      `月份超出本版本支持范围（${SUPPORTED_YEAR_MIN}-01 至 ${SUPPORTED_YEAR_MAX}-12）`,
      `${year}-${month}`,
    )
  }

  const offset = (getGregorianWeekday(year, month, 1) + 6) % 7
  const dates: { dateKey: DateKey; day: number; isCurrentMonth: boolean }[] = []
  const facts: (DateInfo | null)[] = []

  // 多算一天：末格的次日是判断除夕所必需的输入。
  for (let index = 0; index <= GRID_CELL_COUNT; index++) {
    const cellDate = new Date(Date.UTC(year, month - 1, 1 - offset + index))
    const cellYear = cellDate.getUTCFullYear()
    const cellMonth = cellDate.getUTCMonth() + 1
    const cellDay = cellDate.getUTCDate()
    const dateKey = formatDateKey({ year: cellYear, month: cellMonth, day: cellDay })
    const info = getDateInfo(dateKey)

    dates.push({
      dateKey,
      day: cellDay,
      isCurrentMonth: cellYear === year && cellMonth === month,
    })
    facts.push(info.ok ? info.value : null)
  }

  const cells: MonthGridCell[] = dates.slice(0, GRID_CELL_COUNT).map((date, index) => {
    const info = facts[index]
    const label = info
      ? describeCellLabel(info, facts[index + 1])
      : { text: '', kind: 'none' as const }

    return {
      dateKey: date.dateKey,
      day: date.day,
      labelText: label.text,
      labelKind: label.kind,
      isCurrentMonth: date.isCurrentMonth,
      isToday: date.dateKey === todayKey,
    }
  })

  return { ok: true, value: cells }
}

function describeCellLabel(
  info: DateInfo,
  nextDayInfo: DateInfo | null,
): {
  text: string
  kind: MonthGridCell['labelKind']
} {
  if (info.solarTerm) {
    return { text: info.solarTerm.name, kind: 'solar-term' }
  }

  const festivals = matchFestivals(info, nextDayInfo)

  if (festivals.length > 0) {
    return {
      text: festivals.map((festival) => festival.name).join('·'),
      kind: festivals[0].category === 'traditional' ? 'festival' : 'commemoration',
    }
  }

  if (info.lunar.day === 1) {
    return { text: info.lunar.monthName, kind: 'lunar-month' }
  }

  return { text: info.lunar.dayName, kind: 'lunar-day' }
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
