import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { matchFestivals } from '../../services/festival-service'
import type { DateInfo } from '../../types/calendar'
import type { HomeViewModel } from '../../types/home'
import { addDaysToDateKey, getTodayDateKey, parseDateKey } from '../../utils/date-key'
import {
  formatGanzhiSummary,
  formatLunarText,
  formatSolarTermSummary,
  formatWeekday,
} from '../../utils/format'
import { getGregorianWeekday } from '../../utils/util'

const CALENDAR_UNAVAILABLE_HINT = '历法信息暂不可用，请重新计算'

Component({
  data: {
    view: buildHomeViewModel(),
  },
  lifetimes: {
    attached() {
      this.refreshToday()
    },
  },
  pageLifetimes: {
    show() {
      this.refreshToday()
    },
  },
  methods: {
    refreshToday() {
      const view = buildHomeViewModel()

      if (view.dateKey === this.data.view.dateKey && view.status === this.data.view.status) {
        return
      }

      this.setData({ view })
    },
    recalculate() {
      this.setData({ view: buildHomeViewModel() })
    },
    openDetail() {
      wx.navigateTo({
        url: `/pages/day-detail/day-detail?date=${this.data.view.dateKey}`,
      })
    },
    openCalendar() {
      wx.switchTab({
        url: '/pages/calendar/calendar',
      })
    },
    openFindDate() {
      wx.switchTab({
        url: '/pages/find-date/find-date',
      })
    },
  },
})

function buildHomeViewModel(): HomeViewModel {
  const dateKey = getTodayDateKey()
  const info = getDateInfo(dateKey)

  if (info.ok) {
    return buildSuccessViewModel(info.value)
  }

  return buildFailureViewModel(dateKey, info.code)
}

function buildSuccessViewModel(info: DateInfo): HomeViewModel {
  const solarTermText = formatSolarTermSummary(info)
  const nextDayKey = addDaysToDateKey(info.dateKey, 1)
  const nextDay = nextDayKey ? getDateInfo(nextDayKey) : null
  const traditionalFestivals = matchFestivals(info, nextDay?.ok ? nextDay.value : null).filter(
    (festival) => festival.category === 'traditional',
  )

  return {
    status: 'ok',
    dateKey: info.dateKey,
    yearText: `${info.solar.year}年`,
    monthText: `${info.solar.month}`,
    dayText: `${info.solar.day}`,
    weekdayText: formatWeekday(info.solar.weekday),
    lunarText: formatLunarText(info.lunar),
    ganzhiItems: formatGanzhiSummary(info.ganzhi),
    solarTermTitle: solarTermText.title,
    solarTermDescription: solarTermText.description,
    festivalText:
      traditionalFestivals.length > 0
        ? traditionalFestivals.map((festival) => festival.name).join('、')
        : '今日无传统节日',
    noticeText: '',
  }
}

function buildFailureViewModel(dateKey: string, code: CalendarServiceErrorCode): HomeViewModel {
  const parsed = parseDateKey(dateKey)
  const civil = parsed.ok ? parsed.value : null
  const outOfRange = code === 'CALENDAR_OUT_OF_RANGE'

  return {
    status: outOfRange ? 'out_of_range' : 'error',
    dateKey: parsed.ok ? parsed.value.dateKey : getTodayDateKey(),
    yearText: civil ? `${civil.year}年` : '',
    monthText: civil ? `${civil.month}` : '',
    dayText: civil ? `${civil.day}` : '',
    weekdayText: civil
      ? formatWeekday(getGregorianWeekday(civil.year, civil.month, civil.day))
      : '',
    lunarText: '',
    ganzhiItems: [],
    solarTermTitle: '',
    solarTermDescription: '',
    festivalText: '',
    noticeText: outOfRange
      ? `设备日期超出本版本支持范围（${SUPPORTED_YEAR_MIN}-01-01 至 ${SUPPORTED_YEAR_MAX}-12-31）`
      : CALENDAR_UNAVAILABLE_HINT,
  }
}
