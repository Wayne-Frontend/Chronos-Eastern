import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { FESTIVAL_CATEGORY_LABELS } from '../../data/festivals'
import { describeCoverage } from '../../data/rules/manifest'
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
  /** 面向用户的校勘状态，不直接暴露内部状态字面量。 */
  statusText: string
  /** 该条的适用边界；面向用户的措辞，与出处同屏显示。 */
  limitations: readonly string[]
}

interface RuleSectionViewModel {
  /** 事项 id，供 wx:key 与按事项定位使用。 */
  eventTypeId: string
  status: DateRuleExplanation['status'] | 'error'
  eventName: string
  title: string
  description: string
  suggestion: string
  /** 规则包版本用于详情页追溯，与逐条规则编号共同构成依据元信息。 */
  rulePackText: string
  rules: readonly RuleDisplayItem[]
  noticeText: string
  /** partial 规则包的覆盖范围披露（合规要求的第三处），complete 时为空。 */
  coverageNoticeText: string
  /** 该事项本版本收录了什么、还差什么；与披露语配套显示。 */
  coverageText: string
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
  ruleSections: RuleSectionViewModel[]
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
      ruleSections: [],
    } as DayDetailViewModel,
  },
  onLoad(options) {
    this.setData({
      view: buildDayDetailViewModel(options.date ?? '', parseEventTypeIds(options)),
    })
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
    const sectionIndex = Number(event.currentTarget.dataset.sectionIndex)
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.view.ruleSections[sectionIndex]?.rules[index]

    if (!Number.isInteger(sectionIndex) || !Number.isInteger(index) || !item) {
      return
    }

    this.setData({
      [`view.ruleSections[${sectionIndex}].rules[${index}].sourceExpanded`]: !item.sourceExpanded,
    })
  },
})

/**
 * 从页面参数里取出要展示的事项。
 * 原因：首页的今日宜忌可能同时给出几个事项的结论，详情页必须把它们一并展示，
 * 否则用户看到「宜出行、忌开业」却只读到出行一个说法。
 * 边界：兼容旧的单数 `eventType` 参数；两者都缺时返回空数组，页面显示空状态而不是猜一个事项。
 */
function parseEventTypeIds(options: Record<string, string | undefined>): string[] {
  const raw = options.eventTypes ?? options.eventType ?? ''

  return [
    ...new Set(
      raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== ''),
    ),
  ]
}

function buildDayDetailViewModel(
  input: string,
  eventTypeIds: readonly string[],
): DayDetailViewModel {
  const info = getDateInfo(input)

  if (info.ok) {
    return buildSuccessViewModel(info.value, eventTypeIds)
  }

  return buildFailureViewModel(input, info.code)
}

function buildSuccessViewModel(
  info: DateInfo,
  eventTypeIds: readonly string[],
): DayDetailViewModel {
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
    ruleSections: eventTypeIds
      .map((eventTypeId) => buildRuleSection(info.dateKey, eventTypeId))
      .filter((section) => section !== null),
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
    ruleSections: [],
  }
}

/** 读不出结论的事项返回 null，由调用方跳过，不补一张空卡充数。 */
function buildRuleSection(dateKey: string, eventType: string): RuleSectionViewModel | null {
  if (eventType === '') {
    return null
  }

  const result = getDateRuleExplanation(dateKey, eventType)

  if (!result.ok) {
    // 事项本身不可查询（URL 被手改、事项后来下线）只跳过这一条，不把整页变成错误页。
    if (result.code === 'RULE_PACK_MISSING') {
      return null
    }

    return {
      eventTypeId: eventType,
      status: 'error',
      eventName: '',
      title: '暂时无法提供当天参考',
      description: '相关信息读取失败，请稍后重新进入。',
      suggestion: '',
      rulePackText: '',
      rules: [],
      noticeText: '',
      coverageNoticeText: '',
      coverageText: '',
    }
  }

  const value = result.value
  const copy = describeDateOutcome(value.status, value.eventName)
  // 详情页是唯一展开逐条依据的地方，覆盖范围必须与依据同屏出现：
  // 只给结论不给收录范围，用户会把「本版本收录的部分」读成「原书的全部结论」。
  const coverage = describeCoverage(value.rulePack.completeness, value.rulePack.coverage)

  return {
    eventTypeId: value.eventType,
    status: value.status,
    eventName: value.eventName,
    title: copy.title,
    description: copy.summary,
    suggestion: copy.suggestion,
    rulePackText: `${value.rulePack.id}@${value.rulePack.version}`,
    rules: [
      ...value.matchedRules.map((rule) => toRuleDisplayItem(rule, value.eventName, false)),
      ...value.unknownRules.map((rule) => toRuleDisplayItem(rule, value.eventName, true)),
    ],
    noticeText: '',
    coverageNoticeText: coverage.noticeText,
    coverageText: coverage.coverageText,
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
    // 当前只有 verified 规则会进入解释服务；仍保留分支，避免未来状态扩展时页面误称已校勘。
    statusText: rule.status === 'verified' ? '已校勘' : '待复核',
    // 各条自带的适用边界（如某神煞在某几个月不判值日）必须与出处同屏，
    // 否则用户会把「本版本收录的这一条」当成完整结论；文案本身已是面向用户的措辞。
    limitations: rule.limitations,
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
