import { canQueryEventType, EVENT_TYPES, getStatusBadgeText } from '../../data/event-types'
import { PARTIAL_COVERAGE_NOTICE } from '../../data/rules/manifest'
import { findDates, type FindDateOutcome } from '../../services/find-date-service'
import { listFavorites } from '../../services/favorite-service'
import {
  addDaysToDateKey,
  countDaysBetween,
  getTodayDateKey,
  parseDateKey,
} from '../../utils/date-key'
import { formatWeekday } from '../../utils/format'
import { getGregorianWeekday } from '../../utils/util'

type PageStatus = 'idle' | 'running' | 'ok' | 'empty' | 'partial' | 'blocked'

interface EventOption {
  id: string
  displayName: string
  classicalText: string
  disabled: boolean
  /** chip 上的状态短标记；覆盖完整的 supported 为空串。 */
  badgeText: string
  statusNote: string
}

interface ResultCard {
  dateKey: string
  dateText: string
  weekdayText: string
  lunarText: string
  tagText: string
  ruleTexts: string[]
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
  /** noticeText 的语气：error 表示被拒绝或出错，info 表示覆盖范围等说明性内容。 */
  noticeTone: 'error' | 'info'
  expiredNotice: string
  progressText: string
  conditionText: string
  coverageText: string
  /** 规则包只收录部分条款时的显著提示，位于结果列表上方；覆盖完整时为空串。 */
  partialNoticeText: string
  summaryText: string
  results: ResultCard[]
  /** 因规则冲突未列入的日期，逐日列出并可跳详情看双方依据；无冲突时为空。 */
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
        coverageText: '',
        partialNoticeText: '',
        conditionText: '',
        noticeText: '',
        noticeTone: 'error',
        progressText: '',
        expiredNotice: '',
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
          disclaimerText: option.disclaimer,
        })
        return
      }

      this.resetResults({
        selectedEventId: option.id,
        canQuery: isRangeQueryable(view.startDate, view.endDate),
        // limited 事项在入口处先说明覆盖范围，避免用户把结果当作完整结论。
        noticeText: option.status === 'limited' ? option.statusNote : '',
        noticeTone: 'info',
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

      this.resetResults({
        startDate,
        endDate,
        canQuery: view.selectedEventId !== '' && isRangeQueryable(startDate, endDate),
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
        this.setView({ status: 'blocked', noticeText: outcome.message, progressText: '' })
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
        coverageText: `本版本收录范围：${value.rulePack.coverage}`,
        partialNoticeText: value.rulePack.completeness === 'partial' ? PARTIAL_COVERAGE_NOTICE : '',
        conditionText: `${option?.displayName ?? ''} · ${this.data.view.startDate} 至 ${
          this.data.view.endDate
        } · 规则包 ${value.rulePack.id}@${value.rulePack.version}`,
        disclaimerText: option?.disclaimer ?? '',
        noticeText: partial
          ? '部分日期计算失败，本次结果不完整，请重试'
          : results.length === 0
            ? '本范围内没有符合已收录规则的日期。可扩大范围再查；这不代表现实安排上的不可用。'
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
    eventOptions: EVENT_TYPES.map((entry) => ({
      id: entry.id,
      displayName: entry.displayName,
      classicalText: entry.classicalTerms.join('/'),
      disabled: !canQueryEventType(entry),
      badgeText: getStatusBadgeText(entry.status),
      statusNote: entry.statusNote,
    })),
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
    coverageText: '',
    partialNoticeText: '',
    summaryText: '',
    results: [],
    conflictCards: [],
    disclaimerText: '',
  }
}

function isRangeQueryable(startDate: string, endDate: string): boolean {
  const days = countDaysBetween(startDate, endDate)

  return days !== null && days >= 0 && days + 1 <= 90
}

function toCard(item: FindDateOutcome['results'][number], favoriteKeys: Set<string>): ResultCard {
  const parsed = parseDateKey(item.dateKey)
  const dateText = parsed.ok ? `${parsed.value.month}月${parsed.value.day}日` : item.dateKey
  const more = item.matchedCount - item.ruleTexts.length

  return {
    dateKey: item.dateKey,
    dateText,
    weekdayText: item.weekdayText,
    lunarText: item.lunarText,
    tagText: item.tagText,
    ruleTexts: [...item.ruleTexts],
    moreText: more > 0 ? `另有 ${more} 条依据，查看全部 ›` : '查看全部依据 ›',
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

function buildSummaryText(value: FindDateOutcome): string {
  const parts = [`共核对 ${value.summary.checkedDays} 日，${value.summary.passedDays} 日符合`]

  if (value.summary.conflictDays > 0) {
    parts.push(`${value.summary.conflictDays} 日因规则冲突未列入`)
  }

  if (value.summary.unknownDays > 0) {
    parts.push(`${value.summary.unknownDays} 日因资料不足未判定`)
  }

  if (value.summary.errorDays > 0) {
    parts.push(`${value.summary.errorDays} 日计算失败`)
  }

  return parts.join('；')
}
