import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { FESTIVAL_CATEGORY_LABELS } from '../../data/festivals'
import { addFavorite, isFavorite, removeFavorite } from '../../services/favorite-service'
import { matchFestivals } from '../../services/festival-service'
import {
  getDateRuleExplanation,
  type DateRuleExplanation,
  type RuleExplanationItem,
} from '../../services/rule-explanation-service'
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
import { describeDateOutcome, describeRuleReason } from '../../utils/rule-presentation'

type DayDetailStatus = 'ok' | 'invalid' | 'out_of_range' | 'error'

interface FestivalDisplayItem {
  id: string
  name: string
  categoryLabel: string
}

interface RuleDisplayItem {
  id: string
  badgeText: '宜' | '忌' | '—'
  effectClass: 'include' | 'exclude' | 'unknown'
  title: string
  summary: string
  sourceExpanded: boolean
  explanation: string
  locator: string
  sourceText: string
}

interface RuleSectionViewModel {
  hasContext: boolean
  status: DateRuleExplanation['status'] | 'error'
  eventName: string
  title: string
  description: string
  suggestion: string
  rules: readonly RuleDisplayItem[]
  noticeText: string
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
  ruleSection: RuleSectionViewModel
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
      ruleSection: buildEmptyRuleSection(),
    } as DayDetailViewModel,
  },
  onLoad(options) {
    this.setData({ view: buildDayDetailViewModel(options.date ?? '', options.eventType ?? '') })
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
  toggleRuleSource(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.view.ruleSection.rules[index]

    if (!Number.isInteger(index) || !item) {
      return
    }

    this.setData({
      [`view.ruleSection.rules[${index}].sourceExpanded`]: !item.sourceExpanded,
    })
  },
})

function buildDayDetailViewModel(input: string, eventType: string): DayDetailViewModel {
  const info = getDateInfo(input)

  if (info.ok) {
    return buildSuccessViewModel(info.value, eventType)
  }

  return buildFailureViewModel(input, info.code)
}

function buildSuccessViewModel(info: DateInfo, eventType: string): DayDetailViewModel {
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
    ruleSection: buildRuleSection(info.dateKey, eventType),
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
    ruleSection: buildEmptyRuleSection(),
  }
}

function buildRuleSection(dateKey: string, eventType: string): RuleSectionViewModel {
  if (eventType === '') {
    return buildEmptyRuleSection()
  }

  const result = getDateRuleExplanation(dateKey, eventType)

  if (!result.ok) {
    return {
      ...buildEmptyRuleSection(),
      hasContext: true,
      status: 'error',
      title: '暂时无法提供当天参考',
      description: '相关信息读取失败，请稍后重新进入。',
      noticeText: '',
    }
  }

  const value = result.value
  const copy = describeDateOutcome(value.status, value.eventName)

  return {
    hasContext: true,
    status: value.status,
    eventName: value.eventName,
    title: copy.title,
    description: copy.summary,
    suggestion: copy.suggestion,
    rules: [
      ...value.matchedRules.map((rule) => toRuleDisplayItem(rule, value.eventName, false)),
      ...value.unknownRules.map((rule) => toRuleDisplayItem(rule, value.eventName, true)),
    ],
    noticeText: '',
  }
}

function buildEmptyRuleSection(): RuleSectionViewModel {
  return {
    hasContext: false,
    status: 'not_matched',
    eventName: '',
    title: '',
    description: '',
    suggestion: '',
    rules: [],
    noticeText: '',
  }
}

function toRuleDisplayItem(
  rule: RuleExplanationItem,
  eventName: string,
  isUnknown: boolean,
): RuleDisplayItem {
  const copy = describeRuleReason(rule.name, rule.effect, eventName, isUnknown)

  return {
    id: rule.id,
    badgeText: isUnknown ? '—' : rule.effect === 'include' ? '宜' : '忌',
    effectClass: isUnknown ? 'unknown' : rule.effect,
    title: copy.title,
    summary: copy.summary,
    sourceExpanded: false,
    explanation: rule.explanation,
    locator: rule.locator,
    sourceText: rule.sources.map((source) => `${source.title}（${source.publisher}）`).join('；'),
  }
}

function buildFailureNotice(code: CalendarServiceErrorCode): string {
  if (code === 'INVALID_DATE') {
    return '日期参数无效，请从首页或日历进入日期详情'
  }

  if (code === 'CALENDAR_OUT_OF_RANGE') {
    return `日期超出可查询范围（${SUPPORTED_YEAR_MIN}-01-01 至 ${SUPPORTED_YEAR_MAX}-12-31）`
  }

  return '历法信息暂不可用，请稍后重新进入'
}
