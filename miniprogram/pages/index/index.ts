import { canQueryEventType, EVENT_TYPES } from '../../data/event-types'
import { PARTIAL_COVERAGE_NOTICE } from '../../data/rules/manifest'
import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { matchFestivals } from '../../services/festival-service'
import {
  getDateRuleExplanation,
  type RuleExplanationItem,
} from '../../services/rule-explanation-service'
import type { DayStatus } from '../../services/rule-engine'
import type { DateInfo } from '../../types/calendar'
import type { HomeRuleRow, HomeViewModel } from '../../types/home'
import { addDaysToDateKey, getTodayDateKey, parseDateKey } from '../../utils/date-key'
import {
  formatGanzhiSummary,
  formatLunarText,
  formatSolarTermSummary,
  formatWeekday,
} from '../../utils/format'
import { getGregorianWeekday } from '../../utils/util'

const CALENDAR_UNAVAILABLE_HINT = '历法信息暂不可用，请重新计算'

/** 首页规则摘要每行最多列出的条目名个数（方案 2.3：宜忌摘要最多各 4 项）。 */
const MAX_HOME_RULE_NAMES = 4

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
  const ruleSection = buildRuleSection(info.dateKey)

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
    ruleRows: ruleSection.rows,
    ruleCountText: ruleSection.countText,
    ruleCoverageText: ruleSection.coverageText,
  }
}

/**
 * 首页的「今日传统规则参考」摘要。
 * 原因：方案 2.3 要求首页显示宜忌摘要，且只来自已验证规则包；摘要行在这里拼好，页面不做判断。
 * 边界：本版本只按「第一个可查询事项」出摘要——目前即出行。宜忌并见时先出一行「不作结论」，
 * 再把双方依据列为佐证，避免用户只看「宜」那行就当成结论。
 */
function buildRuleSection(dateKey: string): {
  rows: HomeRuleRow[]
  countText: string
  coverageText: string
} {
  const eventType = EVENT_TYPES.find(canQueryEventType)

  if (!eventType) {
    return {
      rows: [unavailableRow()],
      countText: '',
      coverageText: '',
    }
  }

  const result = getDateRuleExplanation(dateKey, eventType.id)

  if (!result.ok) {
    return {
      rows: [unavailableRow()],
      countText: '',
      coverageText: '',
    }
  }

  const value = result.value
  const includes = value.matchedRules.filter((rule) => rule.effect === 'include')
  const excludes = value.matchedRules.filter((rule) => rule.effect === 'exclude')
  const rows: HomeRuleRow[] = []

  if (
    value.status === 'unresolved' ||
    value.status === 'unknown' ||
    value.status === 'not_matched'
  ) {
    const copy = describeHomeRuleStatus(value.status)

    rows.push({
      id: 'verdict',
      badge: '—',
      badgeClass: 'none',
      title: copy.title,
      detail: copy.detail,
    })
  }

  if (includes.length > 0) {
    rows.push(toRuleRow('include', '宜', includes))
  }

  if (excludes.length > 0) {
    rows.push(toRuleRow('exclude', '忌', excludes))
  }

  return {
    rows,
    // 不给用户看规则包 id@version 这类术语；版本与来源在日期详情页的覆盖范围块里给。
    countText:
      value.matchedRules.length > 0
        ? `${value.eventName} · 已校勘规则 ${value.matchedRules.length} 条`
        : '',
    // 事项为 partial 时首页也必须说明覆盖不全，不能只靠详情页兜底。
    coverageText: value.rulePack.completeness === 'partial' ? PARTIAL_COVERAGE_NOTICE : '',
  }
}

function unavailableRow(): HomeRuleRow {
  return {
    id: 'verdict',
    badge: '—',
    badgeClass: 'none',
    title: '今日传统规则资料整理中',
    detail: '规则未加载或未通过验证时不展示结论，也不回退到第三方库宜忌。',
  }
}

function toRuleRow(
  id: 'include' | 'exclude',
  badge: '宜' | '忌',
  rules: readonly RuleExplanationItem[],
): HomeRuleRow {
  const names = rules.slice(0, MAX_HOME_RULE_NAMES).map((rule) => rule.name)
  const more = rules.length - names.length

  return {
    id,
    badge,
    badgeClass: id,
    title: names.join(' · '),
    detail: more > 0 ? `另有 ${more} 条，点「查看说明」看全部依据` : '',
  }
}

function describeHomeRuleStatus(status: DayStatus): { title: string; detail: string } {
  switch (status) {
    case 'unresolved':
      return {
        title: '宜忌并见，本版本不作结论',
        detail: '原书对宜忌并见且无德神裁决者的常例是两者皆不注，下列双方依据仅供参考。',
      }
    case 'unknown':
      return { title: '资料不足，暂不判断', detail: '部分规则缺少必要事实。' }
    case 'excluded':
      return { title: '本日已命中排除规则', detail: '本日不会列入出行查询结果。' }
    case 'pass':
      return { title: '本日符合已收录规则', detail: '' }
    default:
      return { title: '本日未命中已收录规则', detail: '这不代表现实安排上的不可用。' }
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
    ruleRows: [unavailableRow()],
    ruleCountText: '',
    ruleCoverageText: '',
  }
}
