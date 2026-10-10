import { canQueryEventType, EVENT_TYPES } from '../../data/event-types'
import {
  getDateInfo,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type CalendarServiceErrorCode,
} from '../../services/calendar-service'
import { getDateRuleExplanation } from '../../services/rule-explanation-service'
import { findUpcomingFestival } from '../../services/upcoming-festival-service'
import type { DateInfo } from '../../types/calendar'
import type { HomeAlmanacRow, HomeViewModel } from '../../types/home'
import { getTodayDateKey, parseDateKey } from '../../utils/date-key'
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
      const eventTypes = this.data.view.ruleEventTypeIds
      const eventTypeQuery = eventTypes ? `&eventTypes=${eventTypes}` : ''

      wx.navigateTo({
        // 首页摘要与详情必须读取同一批事项；否则首页显示了几个事项的宜忌，详情却只讲其中一个。
        url: `/pages/day-detail/day-detail?date=${this.data.view.dateKey}${eventTypeQuery}&from=index`,
      })
    },
    openAlmanac() {
      // 「查看详情」按字面进当日详情，与上方摘要读同一批事项。
      this.openDetail()
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
  const festivalText = buildFestivalSummary(info.dateKey)
  const almanacSection = buildAlmanacSection(info.dateKey)

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
    festivalTitle: festivalText.title,
    festivalDescription: festivalText.description,
    // 读取失败不冒充结论进宜忌行，改用提示条：全失败与部分失败的话术不同。
    noticeText: almanacSection.hasFailure
      ? almanacSection.rows.length > 0
        ? '部分事项的宜忌暂时读取失败'
        : '今日宜忌暂不可用，请稍后再试'
      : '',
    almanacRows: almanacSection.rows,
    ruleEventTypeIds: almanacSection.eventTypeIds.join(','),
  }
}

/**
 * 首页按“宜 / 忌 / 慎”聚合全部已开放事项。
 * 原因：标题必须保持事项中立；未来开放搬家、婚嫁等事项后，应自动加入相应行而不是增加专用页面文案。
 * 边界：
 * - 只有有结论的事项成行。没有明确说法（not_matched）或无法判定（unknown）的不进本区块，
 *   否则「今日宜忌」里会混进既非宜也非忌的行，整块读不出结论。
 * - 读取失败同样不伪装成一条结论，改由首页提示条承担，避免错误被读成结果。
 * - 传统名称只作为第二层解释，不替代第一层的事项结论。
 */
function buildAlmanacSection(dateKey: string): {
  rows: HomeAlmanacRow[]
  eventTypeIds: string[]
  hasFailure: boolean
} {
  const queryableEvents = EVENT_TYPES.filter(canQueryEventType)
  const groups = new Map<HomeAlmanacRow['id'], { events: string[]; reasons: string[] }>()
  // 只收「今天真有结论」的事项：详情页要展示的正是这一批，多带一个都会让上方摘要对不上账。
  const eventTypeIds: string[] = []
  let hasFailure = false

  for (const eventType of queryableEvents) {
    const result = getDateRuleExplanation(dateKey, eventType.id)

    if (!result.ok) {
      hasFailure = true
      continue
    }

    const value = result.value
    const 结论类别: HomeAlmanacRow['id'] | null =
      value.status === 'pass'
        ? 'include'
        : value.status === 'excluded'
          ? 'exclude'
          : value.status === 'unresolved'
            ? 'caution'
            : null

    // 其余状态（not_matched／unknown）今天没有结论，不成行，也不进详情页的事项清单。
    if (结论类别 === null) {
      continue
    }

    eventTypeIds.push(value.eventType)
    addAlmanacItem(
      groups,
      结论类别,
      value.eventName,
      value.matchedRules
        .filter((rule) => 结论类别 === 'caution' || rule.effect === 结论类别)
        .map((rule) => rule.name),
    )
  }

  const rowMeta: Record<HomeAlmanacRow['id'], Pick<HomeAlmanacRow, 'badge' | 'badgeClass'>> = {
    include: { badge: '宜', badgeClass: 'include' },
    exclude: { badge: '忌', badgeClass: 'exclude' },
    caution: { badge: '慎', badgeClass: 'caution' },
  }
  const order: HomeAlmanacRow['id'][] = ['include', 'exclude', 'caution']
  const rows = order.flatMap((id) => {
    const group = groups.get(id)

    if (!group) {
      return []
    }

    return [
      {
        id,
        ...rowMeta[id],
        eventText: unique(group.events).join('、'),
        reasonText: unique(group.reasons).join(' · '),
      },
    ]
  })

  return {
    // 没有一行有结论时返回空数组，由页面隐藏整块，而不是补一行“暂无”充数。
    rows,
    eventTypeIds,
    hasFailure,
  }
}

function addAlmanacItem(
  groups: Map<HomeAlmanacRow['id'], { events: string[]; reasons: string[] }>,
  id: HomeAlmanacRow['id'],
  eventName: string,
  reasons: string | readonly string[],
): void {
  const group = groups.get(id) ?? { events: [], reasons: [] }

  group.events.push(eventName)
  group.reasons.push(...(typeof reasons === 'string' ? [reasons] : reasons))
  groups.set(id, group)
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function buildFestivalSummary(dateKey: string): { title: string; description: string } {
  const upcoming = findUpcomingFestival(dateKey)

  if (!upcoming) {
    return { title: '近期暂无节日信息', description: '' }
  }

  const names = upcoming.festivals.map((festival) => festival.name).join('、')
  const dateText = `${upcoming.dateInfo.solar.month}月${upcoming.dateInfo.solar.day}日`
  const description = `${dateText} · ${formatLunarText(upcoming.dateInfo.lunar)}`

  return {
    title: upcoming.daysUntil === 0 ? `今日${names}` : `距${names}还有 ${upcoming.daysUntil} 天`,
    description,
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
    festivalTitle: '',
    festivalDescription: '',
    noticeText: outOfRange
      ? `设备日期超出可查询范围（${SUPPORTED_YEAR_MIN}-01-01 至 ${SUPPORTED_YEAR_MAX}-12-31）`
      : CALENDAR_UNAVAILABLE_HINT,
    // 历法本身算不出来时整块隐藏：原因已由 noticeText 说明，再补一行「—」是重复。
    almanacRows: [],
    ruleEventTypeIds: '',
  }
}
