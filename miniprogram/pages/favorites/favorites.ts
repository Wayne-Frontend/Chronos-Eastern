import { listFavorites, type FavoriteItem } from '../../services/favorite-service'
import { getTodayDateKey, parseDateKey } from '../../utils/date-key'
import { formatWeekday } from '../../utils/format'
import { getGregorianWeekday } from '../../utils/util'

interface FavoriteCard {
  dateKey: string
  dateText: string
  weekdayText: string
}

interface FavoritesViewModel {
  status: 'ok' | 'error'
  upcoming: FavoriteCard[]
  past: FavoriteCard[]
  showPast: boolean
  noticeText: string
  canRetry: boolean
}

Component({
  data: {
    view: buildView(false),
  },
  pageLifetimes: {
    show() {
      this.refresh()
    },
  },
  methods: {
    refresh() {
      this.setData({ view: buildView(this.data.view.showPast) })
    },
    togglePast() {
      this.setData({ 'view.showPast': !this.data.view.showPast })
    },
    openDetail(event: { currentTarget: { dataset: { dateKey: string } } }) {
      const dateKey = String(event.currentTarget.dataset.dateKey)

      if (!parseDateKey(dateKey).ok) {
        return
      }

      wx.navigateTo({ url: `/pages/day-detail/day-detail?date=${dateKey}&from=favorites` })
    },
  },
})

function buildView(showPast: boolean): FavoritesViewModel {
  const stored = listFavorites()

  if (!stored.ok) {
    const reason = stored.context.reason
    // 损坏数据和未知 schema 都不会被服务层覆盖；此时反复重试无效，必须提示用户保留原值。
    const noticeText =
      reason === 'corrupt'
        ? `${stored.message}。原数据已保留，请勿清理小程序缓存；本版本无法自动修复。`
        : reason === 'unsupported-schema'
          ? `${stored.message}。原数据已保留，请更新到最新版本后再试，期间请勿清理缓存。`
          : `${stored.message}，请稍后重试。`

    return {
      status: 'error',
      upcoming: [],
      past: [],
      showPast,
      noticeText,
      canRetry: reason === 'storage-api-error',
    }
  }

  const todayKey = getTodayDateKey()
  // 日期键固定为 YYYY-MM-DD，字典序与公历顺序一致；仅改变展示顺序，不修改本地收藏。
  const ordered = [...stored.value].sort((left, right) => left.dateKey.localeCompare(right.dateKey))
  const upcoming: FavoriteCard[] = []
  const past: FavoriteCard[] = []

  for (const item of ordered) {
    const card = toCard(item)

    if (item.dateKey < todayKey) {
      past.push(card)
    } else {
      upcoming.push(card)
    }
  }

  return { status: 'ok', upcoming, past, showPast, noticeText: '', canRetry: false }
}

function toCard(item: FavoriteItem): FavoriteCard {
  const parsed = parseDateKey(item.dateKey)

  if (!parsed.ok) {
    return { dateKey: item.dateKey, dateText: item.dateKey, weekdayText: '' }
  }

  const { year, month, day } = parsed.value

  return {
    dateKey: item.dateKey,
    dateText: `${year}年${month}月${day}日`,
    weekdayText: formatWeekday(getGregorianWeekday(year, month, day)),
  }
}
