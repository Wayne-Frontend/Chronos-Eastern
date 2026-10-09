import type { DateInfo, DateKey, GanzhiDateParts, LunarDateParts } from '../types/calendar'
import { countDaysBetween } from './date-key'

export interface GanzhiDisplayItem {
  label: string
  value: string
}

export interface SolarTermSummary {
  title: string
  description: string
}

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const SOLAR_TERM_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2})/

export function formatWeekday(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? ''
}

export function formatLunarText(lunar: LunarDateParts): string {
  return `农历${lunar.monthName}${lunar.dayName}`
}

/** 首页摘要只展示三个常用柱子，年柱采用农历岁首口径（方案 6.3）。 */
export function formatGanzhiSummary(ganzhi: GanzhiDateParts): GanzhiDisplayItem[] {
  return [
    { label: '年柱', value: ganzhi.yearLunarNewYear },
    { label: '月柱', value: ganzhi.monthJieQi },
    { label: '日柱', value: ganzhi.dayCivil },
  ]
}

/** 详情页展示全部口径，标签本身写明切换规则。 */
export function formatGanzhiWithConventions(ganzhi: GanzhiDateParts): GanzhiDisplayItem[] {
  return [
    { label: '年柱（正月初一换年）', value: ganzhi.yearLunarNewYear },
    { label: '年柱（立春换年）', value: ganzhi.yearLiChun },
    { label: '月柱（节令换月）', value: ganzhi.monthJieQi },
    { label: '日柱（民用日）', value: ganzhi.dayCivil },
  ]
}

export function formatSolarTermDate(localDate: DateKey): string {
  const [, month, day] = localDate.split('-')

  return `${Number(month)}月${Number(day)}日`
}

export function formatSolarTermTime(instant: string): string {
  return SOLAR_TERM_INSTANT_PATTERN.exec(instant)?.[1] ?? instant
}

/** 首页节气摘要：当日有节气时主显名称，否则主显到下一个节气的天数，两者都不留空白。 */
export function formatSolarTermSummary(
  info: Pick<DateInfo, 'dateKey' | 'solarTerm' | 'nextSolarTerm'>,
): SolarTermSummary {
  const next = info.nextSolarTerm
  const countdown = next ? countDaysBetween(info.dateKey, next.localDate) : null
  const nextText = next && countdown !== null ? `距${next.name}还有 ${countdown} 天` : ''

  if (info.solarTerm) {
    return {
      title: info.solarTerm.name,
      description: [`交节时刻 ${formatSolarTermTime(info.solarTerm.instant)}`, nextText]
        .filter((part) => part.length > 0)
        .join(' · '),
    }
  }

  if (next) {
    return {
      title: nextText,
      description: `${formatSolarTermDate(next.localDate)} ${formatSolarTermTime(next.instant)} 交节`,
    }
  }

  return { title: '节气信息整理中', description: '' }
}
