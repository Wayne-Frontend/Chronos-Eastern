import { Solar, type JieQi } from 'lunar-javascript'

import type {
  CivilDateParts,
  DateKey,
  LunarAdapterDateFacts,
  SolarTermInfo,
} from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import { getGregorianMonthDays } from '../utils/util'

export type LunarAdapterErrorCode = 'CALENDAR_COMPUTE_FAILED'

type LunarAdapterFailure = AppFailure<
  LunarAdapterErrorCode,
  {
    input: CivilDateParts
  }
>

/**
 * 将第三方历法对象收敛为项目自己的普通数据结构。
 * 原因：页面和后续服务不能依赖库对象或顺带访问未经校勘的宜忌、神煞等字段。
 * 边界：这里只验证单个公历日期的计算与字段完整性，1901—2100 产品范围由服务层负责。
 */
export function getLunarDateFacts(
  input: CivilDateParts,
): AppResult<LunarAdapterDateFacts, LunarAdapterErrorCode, { input: CivilDateParts }> {
  if (!isValidCivilDate(input)) {
    return calendarComputeFailed(input)
  }

  try {
    const solar = Solar.fromYmd(input.year, input.month, input.day)

    if (
      solar.getYear() !== input.year ||
      solar.getMonth() !== input.month ||
      solar.getDay() !== input.day
    ) {
      return calendarComputeFailed(input)
    }

    const lunar = solar.getLunar()
    const rawLunarMonth = lunar.getMonth()
    const dateKey = formatDateKey(input)
    const result: LunarAdapterDateFacts = {
      dateKey,
      timezone: 'Asia/Shanghai',
      solar: {
        ...input,
        weekday: solar.getWeek(),
      },
      lunar: {
        year: lunar.getYear(),
        month: Math.abs(rawLunarMonth),
        day: lunar.getDay(),
        isLeapMonth: rawLunarMonth < 0,
        monthName: `${lunar.getMonthInChinese()}月`,
        dayName: lunar.getDayInChinese(),
      },
      ganzhi: {
        yearLunarNewYear: lunar.getYearInGanZhi(),
        yearLiChun: lunar.getYearInGanZhiByLiChun(),
        monthJieQi: lunar.getMonthInGanZhi(),
        dayCivil: lunar.getDayInGanZhiExact2(),
      },
      solarTerm: normalizeSolarTerm(lunar.getCurrentJieQi()),
      nextSolarTerm: normalizeSolarTerm(lunar.getNextJieQi(true)),
      adapterVersion: 'lunar-javascript@1.7.7',
    }

    if (!hasCompleteFields(result)) {
      return calendarComputeFailed(input)
    }

    return {
      ok: true,
      value: result,
    }
  } catch {
    return calendarComputeFailed(input)
  }
}

function isValidCivilDate(input: CivilDateParts): boolean {
  return (
    Number.isInteger(input.year) &&
    Number.isInteger(input.month) &&
    Number.isInteger(input.day) &&
    input.year > 0 &&
    input.month >= 1 &&
    input.month <= 12 &&
    input.day >= 1 &&
    input.day <= getGregorianMonthDays(input.year, input.month)
  )
}

function normalizeSolarTerm(jieQi: JieQi | null): SolarTermInfo | null {
  if (!jieQi) {
    return null
  }

  const solar = jieQi.getSolar()

  return {
    name: jieQi.getName(),
    instant: `${solar.toYmdHms().replace(' ', 'T')}+08:00`,
    localDate: solar.toYmd() as DateKey,
  }
}

function hasCompleteFields(result: LunarAdapterDateFacts): boolean {
  return (
    result.solar.weekday >= 0 &&
    result.solar.weekday <= 6 &&
    result.lunar.month >= 1 &&
    result.lunar.month <= 12 &&
    result.lunar.day >= 1 &&
    result.lunar.day <= 30 &&
    result.lunar.monthName.length > 1 &&
    result.lunar.dayName.length > 0 &&
    Object.values(result.ganzhi).every((value) => value.length > 0)
  )
}

function formatDateKey(input: CivilDateParts): DateKey {
  return `${input.year.toString().padStart(4, '0')}-${input.month
    .toString()
    .padStart(2, '0')}-${input.day.toString().padStart(2, '0')}` as DateKey
}

function calendarComputeFailed(input: CivilDateParts): LunarAdapterFailure {
  return {
    ok: false,
    code: 'CALENDAR_COMPUTE_FAILED',
    message: '历法信息计算失败',
    retryable: false,
    context: { input },
  }
}
