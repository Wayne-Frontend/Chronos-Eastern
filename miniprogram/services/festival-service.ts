import {
  FESTIVALS,
  type FestivalCategory,
  type FestivalEntry,
  type FestivalMatch,
} from '../data/festivals'
import type { DateInfo } from '../types/calendar'

export interface MatchedFestival {
  id: string
  name: string
  category: FestivalCategory
  sourceIds: readonly string[]
}

const CATEGORY_ORDER: Record<FestivalCategory, number> = {
  traditional: 0,
  commemoration: 1,
}

/**
 * 匹配当日的本地节日。
 * 原因：节日由本地数据定义，不使用第三方历法库的节日输出；只有 status 为 verified 的条目参与匹配。
 * 边界：纯查表，没有失败路径；`nextDayInfo` 只用于除夕这类需要看次日的节日，传 null 时该条不参与匹配。
 */
export function matchFestivals(info: DateInfo, nextDayInfo: DateInfo | null): MatchedFestival[] {
  return FESTIVALS.filter(
    (festival) => festival.status === 'verified' && isMatch(festival, info, nextDayInfo),
  )
    .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category])
    .map((festival) => ({
      id: festival.id,
      name: festival.name,
      category: festival.category,
      sourceIds: festival.sourceIds,
    }))
}

function isMatch(festival: FestivalEntry, info: DateInfo, nextDayInfo: DateInfo | null): boolean {
  return matchByRule(festival.match, info, nextDayInfo)
}

function matchByRule(match: FestivalMatch, info: DateInfo, nextDayInfo: DateInfo | null): boolean {
  switch (match.type) {
    case 'lunar-fixed':
      return (
        info.lunar.month === match.month &&
        info.lunar.day === match.day &&
        (match.allowLeapMonth || !info.lunar.isLeapMonth)
      )
    case 'solar-fixed':
      return info.solar.month === match.month && info.solar.day === match.day
    case 'solar-term':
      return info.solarTerm?.name === match.term
    case 'lunar-eve':
      return (
        nextDayInfo !== null &&
        nextDayInfo.lunar.month === match.month &&
        nextDayInfo.lunar.day === match.day &&
        !nextDayInfo.lunar.isLeapMonth
      )
  }
}
