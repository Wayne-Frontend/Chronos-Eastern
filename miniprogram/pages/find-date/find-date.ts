import { canQueryEventType, EVENT_TYPES, getStatusBadgeText } from '../../data/event-types'
import { describeCoverage } from '../../data/rules/manifest'
import {
  describeRangeIssue,
  findDates,
  type FindDateOutcome,
} from '../../services/find-date-service'
import { listFavorites } from '../../services/favorite-service'
import {
  addDaysToDateKey,
  countDaysBetween,
  getTodayDateKey,
  parseDateKey,
} from '../../utils/date-key'
import { formatWeekday } from '../../utils/format'
import { describeClassicalTerms } from '../../utils/rule-presentation'
import { getGregorianWeekday } from '../../utils/util'

type PageStatus = 'idle' | 'running' | 'ok' | 'empty' | 'partial' | 'blocked'

interface EventOption {
  id: string
  displayName: string
  disabled: boolean
  /**
   * 短标记，紧跟在事项名后：partial 事项显示「有限收录」（合规要求的第一处覆盖范围披露），
   * 未开放事项只说明当前能否使用。覆盖完整的 supported 不加标记。
   */
  badgeText: string
  /** 副行提示：显示古籍用语（让用户看见要查的是哪一条古籍条目）；无可显示时为空串。 */
  hintText: string
  /** 读屏用的事项状态说明；未开放事项直接给出其整理原因。 */
  statusNote: string
}

interface ResultCard {
  dateKey: string
  dateText: string
  weekdayText: string
  lunarText: string
  tagText: string
  moreText: string
  isFavorite: boolean
}

interface FindDateViewModel {
  status: PageStatus
  eventOptions: EventOption[]
  selectedEventId: string
  startDate: string
  endDate: string
  pickerStart: string
  maxRangeDays: number
  canQuery: boolean
  noticeText: string
  /** noticeText 的语气：error 表示被拒绝或出错，info 表示正常的结果说明。 */
  noticeTone: 'error' | 'info'
  expiredNotice: string
  progressText: string
  conditionText: string
  summaryText: string
  /** 选中事项的覆盖范围提示（合规要求的「选中提示」），未开放事项为空。 */
  scopeNoteText: string
  /** 结果列表上方的覆盖范围披露（合规要求的第二处），非 partial 时为空。 */
  coverageNoticeText: string
  results: ResultCard[]
  /** 因传统说法不一致而未列入的日期；无冲突时为空。 */
  conflictCards: ConflictCard[]
  disclaimerText: string
}

interface ConflictCard {
  dateKey: string
  dateText: string
  weekdayText: string
}

const DEFAULT_RANGE_DAYS = 30

/** 查询令牌：只采纳最新一次查询的结果（方案 3.6）。 */
let queryToken = 0

Component({
  data: {
    view: buildInitialView(),
  },
  pageLifetimes: {
    show() {
      this.refreshFavoriteMarks()
    },
  },
  methods: {
    setView(patch: Partial<FindDateViewModel>) {
      this.setData({ view: { ...this.data.view, ...patch } })
    },
    resetResults(patch: Partial<FindDateViewModel>) {
      this.setView({
        status: 'idle',
        results: [],
        conflictCards: [],
        summaryText: '',
        conditionText: '',
        noticeText: '',
        noticeTone: 'error',
        progressText: '',
        expiredNotice: '',
        scopeNoteText: '',
        coverageNoticeText: '',
        ...patch,
      })
    },
    onSelectEvent(event: WechatMiniprogram.TouchEvent) {
      const view = this.data.view

      if (view.status === 'running') {
        return
      }

      const option = EVENT_TYPES.find(
        (entry) => entry.id === String(event.currentTarget.dataset.id),
      )

      if (!option) {
        return
      }

      if (!canQueryEventType(option)) {
        this.resetResults({
          selectedEventId: option.id,
          status: 'blocked',
          noticeText: option.statusNote,
          canQuery: false,
          scopeNoteText: '',
          disclaimerText: option.disclaimer,
        })
        return
      }

      const rangeIssue = describeRangeIssue(view.startDate, view.endDate, option.maxRangeDays)

      this.resetResults({
        selectedEventId: option.id,
        canQuery: rangeIssue === '',
        noticeText: rangeIssue,
        noticeTone: 'error',
        scopeNoteText: option.statusNote,
        disclaimerText: option.disclaimer,
      })
    },
    onStartChange(event: { detail: { value: string } }) {
      this.applyRange(String(event.detail.value), this.data.view.endDate)
    },
    onEndChange(event: { detail: { value: string } }) {
      this.applyRange(this.data.view.startDate, String(event.detail.value))
    },
    applyRange(startDate: string, endDate: string) {
      const view = this.data.view

      if (view.status === 'running') {
        return
      }

      const hadResults = view.results.length > 0 || view.status === 'ok' || view.status === 'empty'
      const option = EVENT_TYPES.find((entry) => entry.id === view.selectedEventId)
      const rangeIssue = describeRangeIssue(
        startDate,
        endDate,
        option?.maxRangeDays ?? view.maxRangeDays,
      )

      this.resetResults({
        startDate,
        endDate,
        canQuery: view.selectedEventId !== '' && rangeIssue === '',
        noticeText: rangeIssue,
        noticeTone: 'error',
        expiredNotice: hadResults ? '条件已修改，结果已过期，请重新查询' : '',
      })
    },
    async onQuery() {
      const view = this.data.view
      const option = EVENT_TYPES.find((entry) => entry.id === view.selectedEventId)

      if (!option || !canQueryEventType(option) || !view.canQuery || view.status === 'running') {
        return
      }

      const token = ++queryToken
      const total = (countDaysBetween(view.startDate, view.endDate) ?? 0) + 1

      this.setView({
        status: 'running',
        noticeText: '',
        expiredNotice: '',
        results: [],
        summaryText: '',
        progressText: `正在核对 0/${total} 日`,
      })

      const outcome = await findDates(
        { eventType: option.id, startDate: view.startDate, endDate: view.endDate },
        {
          onProgress: (checked, all) => {
            if (token === queryToken) {
              this.setView({ progressText: `正在核对 ${checked}/${all} 日` })
            }
          },
        },
      )

      if (token !== queryToken) {
        return
      }

      this.applyOutcome(option.id, outcome)
    },
    applyOutcome(eventTypeId: string, outcome: Awaited<ReturnType<typeof findDates>>) {
      const option = EVENT_TYPES.find((entry) => entry.id === eventTypeId)

      if (!outcome.ok) {
        this.setView({
          status: 'blocked',
          noticeText:
            outcome.code === 'RULE_PACK_MISSING'
              ? '该事项暂时无法查询，请稍后再试'
              : outcome.message,
          noticeTone: 'error',
          progressText: '',
        })
        return
      }

      const value: FindDateOutcome = outcome.value
      const favorites = listFavorites()
      const favoriteKeys = new Set<string>(
        favorites.ok ? favorites.value.map((item) => item.dateKey) : [],
      )
      const results = value.results.map((item) => toCard(item, favoriteKeys))
      const partial = value.status === 'partial'

      this.setView({
        status: partial ? 'partial' : results.length > 0 ? 'ok' : 'empty',
        results,
        conflictCards: value.conflictDates.map(toConflictCard),
        progressText: '',
        summaryText: buildSummaryText(value),
        conditionText: `${option?.displayName ?? ''} · ${this.data.view.startDate} 至 ${this.data.view.endDate}`,
        coverageNoticeText: describeCoverage(value.rulePack.completeness, value.rulePack.coverage)
          .noticeText,
        disclaimerText: option?.disclaimer ?? '',
        // 语气跟提示本身的语义走：计算失败才是 error，查无结果是正常结论。
        // 之前这里不设值，语气会残留自用户点按顺序，同一句话时红时灰。
        noticeTone: partial ? 'error' : 'info',
        noticeText: partial
          ? '部分日期计算失败，本次结果不完整，请重试'
          : results.length === 0
            ? // 方案 2.4 状态处理要求：无结果必须说明这不是现实安排上的不可用，
              // 否则「规则没推荐」容易被读成「这天不吉利」。措辞与详情页的无匹配结论一致。
              '这段时间内没有找到符合已收录规则的候选日期，可以扩大日期范围再试；这不代表这些日子在现实安排上不可用。'
            : '',
      })
    },
    onOpenDetail(event: WechatMiniprogram.TouchEvent) {
      const dateKey = String(event.currentTarget.dataset.dateKey ?? '')
      const eventType = this.data.view.selectedEventId

      if (dateKey === '' || eventType === '') {
        return
      }

      wx.navigateTo({
        url: `/pages/day-detail/day-detail?date=${dateKey}&eventType=${eventType}&from=find-date`,
      })
    },
    refreshFavoriteMarks() {
      const results = this.data.view.results

      if (results.length === 0) {
        return
      }

      const favorites = listFavorites()
      const favoriteKeys = new Set<string>(
        favorites.ok ? favorites.value.map((item) => item.dateKey) : [],
      )

      this.setView({
        results: results.map((item) => ({ ...item, isFavorite: favoriteKeys.has(item.dateKey) })),
      })
    },
  },
})

function buildInitialView(): FindDateViewModel {
  const today = getTodayDateKey()
  const endDate = addDaysToDateKey(today, DEFAULT_RANGE_DAYS - 1) ?? today

  return {
    status: 'idle',
    eventOptions: EVENT_TYPES.map((entry) => {
      const queryable = canQueryEventType(entry)

      return {
        id: entry.id,
        displayName: entry.displayName,
        disabled: !queryable,
        // 可查询事项用状态短标记（partial 即「有限收录」）；未开放事项只说明用户当前能否使用，
        // 不暴露内部的 supported / reviewing / unsupported 等级名。
        badgeText: queryable
          ? getStatusBadgeText(entry.status)
          : entry.status === 'unsupported'
            ? '暂不支持'
            : '敬请期待',
        hintText: describeClassicalTerms(entry.displayName, entry.classicalTerms),
        // 读屏用的事项说明取事项表里的原文，不再改写成通用句——那里的「整理中」原因本来就是面向用户的。
        statusNote: entry.statusNote,
      }
    }),
    selectedEventId: '',
    startDate: today,
    endDate,
    pickerStart: today,
    maxRangeDays: 90,
    canQuery: false,
    noticeText: '',
    noticeTone: 'error',
    expiredNotice: '',
    progressText: '',
    conditionText: '',
    summaryText: '',
    scopeNoteText: '',
    coverageNoticeText: '',
    results: [],
    conflictCards: [],
    disclaimerText: '',
  }
}

function toCard(item: FindDateOutcome['results'][number], favoriteKeys: Set<string>): ResultCard {
  const parsed = parseDateKey(item.dateKey)
  const dateText = parsed.ok ? `${parsed.value.month}月${parsed.value.day}日` : item.dateKey
  return {
    dateKey: item.dateKey,
    dateText,
    weekdayText: item.weekdayText,
    lunarText: item.lunarText,
    tagText: item.tagText,
    moreText: '查看当天参考 ›',
    isFavorite: favoriteKeys.has(item.dateKey),
  }
}

function toConflictCard(dateKey: string): ConflictCard {
  const parsed = parseDateKey(dateKey)

  return {
    dateKey,
    dateText: parsed.ok ? `${parsed.value.month}月${parsed.value.day}日` : dateKey,
    weekdayText: parsed.ok
      ? formatWeekday(getGregorianWeekday(parsed.value.year, parsed.value.month, parsed.value.day))
      : '',
  }
}

/**
 * 汇总行的分项说明。
 * 原因：本项目的合规要求是区分「无数据 / 无匹配 / 有明确排除」三种语义，
 * 只报「找到 0 个」会让「规则明确说不行」和「规则根本没表态」看起来一样。
 * 边界：措辞与详情页 describeDateOutcome 保持同一套说法，不出现内部状态名与命中计数。
 */
function buildSummaryText(value: FindDateOutcome): string {
  const parts = [
    `共查看 ${value.summary.checkedDays} 天，找到 ${value.summary.passedDays} 个候选日期`,
  ]

  // 有明确排除：规则给出了方向，只是方向是「不推荐」。
  if (value.summary.excludedDays > 0) {
    parts.push(`${value.summary.excludedDays} 天有不利说法`)
  }

  // 无匹配：规则都没有表态，不等于被否定。
  if (value.summary.notMatchedDays > 0) {
    parts.push(`${value.summary.notMatchedDays} 天没有明确说法`)
  }

  if (value.summary.conflictDays > 0) {
    parts.push(`${value.summary.conflictDays} 天说法不一致，未列入候选`)
  }

  if (value.summary.unknownDays > 0) {
    parts.push(`${value.summary.unknownDays} 天信息不足，暂无法判断`)
  }

  if (value.summary.errorDays > 0) {
    parts.push(`${value.summary.errorDays} 天暂未完成`)
  }

  return parts.join('；')
}
