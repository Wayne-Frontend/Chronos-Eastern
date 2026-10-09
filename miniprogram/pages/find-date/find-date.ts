import { EVENT_TYPES } from '../../data/event-types'
import { findDates, type FindDateOutcome } from '../../services/find-date-service'
import { listFavorites } from '../../services/favorite-service'
import {
  addDaysToDateKey,
  countDaysBetween,
  getTodayDateKey,
  parseDateKey,
} from '../../utils/date-key'

type PageStatus = 'idle' | 'running' | 'ok' | 'empty' | 'partial' | 'blocked'

interface EventOption {
  id: string
  displayName: string
  classicalText: string
  disabled: boolean
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
  expiredNotice: string
  progressText: string
  conditionText: string
  coverageText: string
  summaryText: string
  results: ResultCard[]
  disclaimerText: string
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
        summaryText: '',
        coverageText: '',
        conditionText: '',
        noticeText: '',
        progressText: '',
        expiredNotice: '',
        ...patch,
      })
    },
    onSelectEvent(event: { detail: { id: string } }) {
      const view = this.data.view

      if (view.status === 'running') {
        return
      }

      const option = EVENT_TYPES.find((entry) => entry.id === String(event.detail.id))

      if (!option) {
        return
      }

      if (option.status !== 'supported') {
        this.resetResults({
          selectedEventId: option.id,
          status: 'blocked',
          noticeText: option.statusNote,
          canQuery: false,
        })
        return
      }

      this.resetResults({
        selectedEventId: option.id,
        canQuery: isRangeQueryable(view.startDate, view.endDate),
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

      if (!option || option.status !== 'supported' || !view.canQuery || view.status === 'running') {
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
        progressText: '',
        summaryText: buildSummaryText(value),
        coverageText: `本版本收录范围：${value.rulePack.coverage}`,
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
    onOpenDetail(event: { detail: { dateKey: string } }) {
      wx.navigateTo({
        url: `/pages/day-detail/day-detail?date=${String(event.detail.dateKey)}&from=find-date`,
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
      disabled: entry.status !== 'supported',
      statusNote: entry.statusNote,
    })),
    selectedEventId: '',
    startDate: today,
    endDate,
    pickerStart: today,
    maxRangeDays: 90,
    canQuery: false,
    noticeText: '',
    expiredNotice: '',
    progressText: '',
    conditionText: '',
    coverageText: '',
    summaryText: '',
    results: [],
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
    moreText: more > 0 ? `另有 ${more} 条依据，进入详情查看全部` : '',
    isFavorite: favoriteKeys.has(item.dateKey),
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
