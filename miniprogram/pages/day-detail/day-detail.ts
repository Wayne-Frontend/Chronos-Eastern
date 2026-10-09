import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { FESTIVAL_CATEGORY_LABELS } from '../../data/festivals'
import { addFavorite, isFavorite, removeFavorite } from '../../services/favorite-service'
import { matchFestivals } from '../../services/festival-service'
import type { DateInfo } from '../../types/calendar'
import { addDaysToDateKey, getTodayDateKey, parseDateKey } from '../../utils/date-key'
import {
  formatGanzhiWithConventions,
  formatLunarText,
  formatSolarTermDate,
  formatSolarTermTime,
  formatWeekday,
  type GanzhiDisplayItem,
} from '../../utils/format'
import { getGregorianWeekday } from '../../utils/util'

type DayDetailStatus = 'ok' | 'invalid' | 'out_of_range' | 'error'

interface FestivalDisplayItem {
  id: string
  name: string
  categoryLabel: string
}

interface DayDetailViewModel {
  status: DayDetailStatus
  dateLabel: string
  dateKey: string
  weekdayText: string
  lunarText: string
  ganzhiItems: GanzhiDisplayItem[]
  todaySolarTermText: string
  nextSolarTermText: string
  festivalItems: FestivalDisplayItem[]
  calendarDataVersion: string
  favoriteStatus: 'ok' | 'unreadable'
  isFavorite: boolean
  favoriteNotice: string
  noticeText: string
}

Page({
  data: {
    view: {
      status: 'invalid',
      dateLabel: '日期参数',
      dateKey: '',
      weekdayText: '',
      lunarText: '',
      ganzhiItems: [],
      todaySolarTermText: '',
      nextSolarTermText: '',
      festivalItems: [],
      calendarDataVersion: '',
      favoriteStatus: 'ok',
      isFavorite: false,
      favoriteNotice: '',
      noticeText: '',
    } as DayDetailViewModel,
  },
  onLoad(options) {
    this.setData({ view: buildDayDetailViewModel(options.date ?? '') })
  },
  goToday() {
    wx.redirectTo({
      url: `/pages/day-detail/day-detail?date=${getTodayDateKey()}`,
    })
  },
  toggleFavorite() {
    const view = this.data.view

    if (view.favoriteStatus !== 'ok' || view.dateKey === '') {
      return
    }

    const result = view.isFavorite
      ? removeFavorite(view.dateKey)
      : addFavorite(view.dateKey, view.calendarDataVersion)

    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }

    const isFavoriteNow = result.value.some((item) => item.dateKey === view.dateKey)

    this.setData({ 'view.isFavorite': isFavoriteNow })
    wx.showToast({ title: isFavoriteNow ? '已收藏' : '已取消', icon: 'none' })
  },
})

function buildDayDetailViewModel(input: string): DayDetailViewModel {
  const info = getDateInfo(input)

  if (info.ok) {
    return buildSuccessViewModel(info.value)
  }

  return buildFailureViewModel(input, info.code)
}

function buildSuccessViewModel(info: DateInfo): DayDetailViewModel {
  const nextDayKey = addDaysToDateKey(info.dateKey, 1)
  const nextDay = nextDayKey ? getDateInfo(nextDayKey) : null
  const favorite = isFavorite(info.dateKey)

  return {
    status: 'ok',
    dateLabel: '公历',
    dateKey: info.dateKey,
    weekdayText: formatWeekday(info.solar.weekday),
    lunarText: formatLunarText(info.lunar),
    ganzhiItems: formatGanzhiWithConventions(info.ganzhi),
    festivalItems: matchFestivals(info, nextDay?.ok ? nextDay.value : null).map((festival) => ({
      id: festival.id,
      name: festival.name,
      categoryLabel: FESTIVAL_CATEGORY_LABELS[festival.category],
    })),
    todaySolarTermText: info.solarTerm
      ? `${info.solarTerm.name} · 交节时刻 ${formatSolarTermTime(info.solarTerm.instant)}`
      : '今日无节气',
    nextSolarTermText: info.nextSolarTerm
      ? `${info.nextSolarTerm.name} · ${formatSolarTermDate(info.nextSolarTerm.localDate)} ${formatSolarTermTime(
          info.nextSolarTerm.instant,
        )}`
      : '',
    calendarDataVersion: info.versions.calendarAdapter,
    favoriteStatus: favorite.ok ? 'ok' : 'unreadable',
    isFavorite: favorite.ok ? favorite.value : false,
    favoriteNotice: favorite.ok ? '' : favorite.message,
    noticeText: '',
  }
}

function buildFailureViewModel(input: string, code: CalendarServiceErrorCode): DayDetailViewModel {
  const parsed = parseDateKey(input)
  const civil = parsed.ok ? parsed.value : null
  const status: DayDetailStatus =
    code === 'INVALID_DATE'
      ? 'invalid'
      : code === 'CALENDAR_OUT_OF_RANGE'
        ? 'out_of_range'
        : 'error'

  return {
    status,
    dateLabel: status === 'invalid' ? '日期参数' : '日期',
    dateKey: civil ? civil.dateKey : '',
    weekdayText: civil
      ? formatWeekday(getGregorianWeekday(civil.year, civil.month, civil.day))
      : '',
    lunarText: '',
    ganzhiItems: [],
    todaySolarTermText: '',
    nextSolarTermText: '',
    festivalItems: [],
    calendarDataVersion: '',
    favoriteStatus: 'ok',
    isFavorite: false,
    favoriteNotice: '',
    noticeText: buildFailureNotice(code),
  }
}

function buildFailureNotice(code: CalendarServiceErrorCode): string {
  if (code === 'INVALID_DATE') {
    return '日期参数无效，请从首页或日历进入日期详情'
  }

  if (code === 'CALENDAR_OUT_OF_RANGE') {
    return `日期超出本版本支持范围（${SUPPORTED_YEAR_MIN}-01-01 至 ${SUPPORTED_YEAR_MAX}-12-31）`
  }

  return '历法信息暂不可用，请稍后重新进入'
}
