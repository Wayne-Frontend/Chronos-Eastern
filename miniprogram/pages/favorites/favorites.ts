import { listFavorites, type FavoriteItem } from '../../services/favorite-service'
import { getTodayDateKey, parseDateKey } from '../../utils/date-key'
import { formatWeekday } from '../../utils/format'

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
    return {
      status: 'error',
      upcoming: [],
      past: [],
      showPast,
      noticeText: stored.message,
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

  return { status: 'ok', upcoming, past, showPast, noticeText: '' }
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
    weekdayText: formatWeekday(new Date(Date.UTC(year, month - 1, day)).getUTCDay()),
  }
}
