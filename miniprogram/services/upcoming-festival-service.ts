import type { MatchedFestival } from './festival-service'
import { matchFestivals } from './festival-service'
import { getDateInfo } from './calendar-service'
import type { DateInfo, DateKey } from '../types/calendar'
import { addDaysToDateKey } from '../utils/date-key'

export interface UpcomingFestival {
  dateKey: DateKey
  daysUntil: number
  festivals: readonly MatchedFestival[]
  dateInfo: DateInfo
}

const MAX_LOOKAHEAD_DAYS = 370

/**
 * 查找从指定日期起最近的已收录节日。
 * 原因：首页需要像节气一样持续给出“下一个节日”，不能在非节日当天只显示空状态。
 * 边界：向后最多查 370 天，足以跨过一个完整公历年；超出历法支持范围时安全停止。
 */
export function findUpcomingFestival(dateKey: string): UpcomingFestival | null {
  for (let daysUntil = 0; daysUntil <= MAX_LOOKAHEAD_DAYS; daysUntil++) {
    const candidateKey = addDaysToDateKey(dateKey, daysUntil)

    if (!candidateKey) {
      return null
    }

    const candidate = getDateInfo(candidateKey)

    if (!candidate.ok) {
      return null
    }

    const nextDayKey = addDaysToDateKey(candidateKey, 1)
    const nextDay = nextDayKey ? getDateInfo(nextDayKey) : null
    const festivals = matchFestivals(candidate.value, nextDay?.ok ? nextDay.value : null)

    if (festivals.length > 0) {
      return {
        dateKey: candidate.value.dateKey,
        daysUntil,
        festivals,
        dateInfo: candidate.value,
      }
    }
  }

  return null
}
