import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { FESTIVAL_CATEGORY_LABELS } from '../../data/festivals'
import { PARTIAL_COVERAGE_NOTICE } from '../../data/rules/manifest'
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

type DayDetailStatus = 'ok' | 'invalid' | 'out_of_range' | 'error'

interface FestivalDisplayItem {
  id: string
  name: string
  categoryLabel: string
}

interface RuleDisplayItem {
  id: string
  badgeText: '宜' | '忌' | '待'
  effectClass: 'include' | 'exclude' | 'unknown'
  statusText: string
  explanation: string
  locator: string
  sourceText: string
  limitations: readonly string[]
}

interface RuleSectionViewModel {
  hasContext: boolean
  status: DateRuleExplanation['status'] | 'error'
  eventName: string
  title: string
  description: string
  rules: readonly RuleDisplayItem[]
  coverageText: string
  versionText: string
  noticeText: string
  /** 规则包只收录部分条款时的显著提示；覆盖完整时为空串。 */
  partialNoticeText: string
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
      title: '规则依据暂不可用',
      description: '无法读取本次找日子的规则依据，请返回后重新查询。',
      noticeText: result.message,
    }
  }

  const value = result.value
  const copy = describeRuleStatus(value.status)

  return {
    hasContext: true,
    status: value.status,
    eventName: value.eventName,
    title: copy.title,
    description: copy.description,
    rules: [
      ...value.matchedRules.map((rule) => toRuleDisplayItem(rule, false)),
      ...value.unknownRules.map((rule) => toRuleDisplayItem(rule, true)),
    ],
    coverageText: value.rulePack.coverage,
    versionText: `${value.rulePack.id}@${value.rulePack.version}`,
    noticeText: '',
    partialNoticeText: value.rulePack.completeness === 'partial' ? PARTIAL_COVERAGE_NOTICE : '',
  }
}

function buildEmptyRuleSection(): RuleSectionViewModel {
  return {
    hasContext: false,
    status: 'not_matched',
    eventName: '',
    title: '',
    description: '',
    rules: [],
    coverageText: '',
    versionText: '',
    noticeText: '',
    partialNoticeText: '',
  }
}

function toRuleDisplayItem(rule: RuleExplanationItem, isUnknown: boolean): RuleDisplayItem {
  return {
    id: rule.id,
    badgeText: isUnknown ? '待' : rule.effect === 'include' ? '宜' : '忌',
    effectClass: isUnknown ? 'unknown' : rule.effect,
    statusText: isUnknown
      ? '资料不足，未判定'
      : rule.status === 'verified'
        ? '已验证'
        : rule.status,
    explanation: rule.explanation,
    locator: rule.locator,
    sourceText: rule.sources.map((source) => `${source.title}（${source.publisher}）`).join('；'),
    limitations: rule.limitations,
  }
}

function describeRuleStatus(status: DateRuleExplanation['status']): {
  title: string
  description: string
} {
  switch (status) {
    case 'pass':
      return {
        title: '符合本版本已收录规则',
        description: '以下为本次结果命中的全部纳入依据。',
      }
    case 'excluded':
      return {
        title: '命中已收录排除规则',
        description: '本日不会列入当前事项的查询结果。',
      }
    case 'unresolved':
      return {
        title: '规则依据存在冲突',
        description:
          '本日同时命中宜项与忌项。原书对宜忌并见且无德神裁决者的常例是两者皆不注，故本版本不作结论。',
      }
    case 'unknown':
      return {
        title: '资料不足，暂不判断',
        description: '部分规则缺少必要事实，本版本不会据此给出结果。',
      }
    default:
      return {
        title: '未命中已收录纳入规则',
        description: '这不代表现实安排上的不可用，也不代表完整传统规则结论。',
      }
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
