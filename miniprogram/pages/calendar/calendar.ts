import {
  getMonthGrid,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  type MonthGridCell,
} from '../../services/calendar-service'
import { getTodayDateKey, parseDateKey, shiftDateKeyToMonth } from '../../utils/date-key'

interface CalendarViewModel {
  status: 'ok' | 'error'
  year: number
  month: number
  todayKey: string
  titleText: string
  pickerValue: string
  cells: MonthGridCell[]
  selectedDateKey: string
  canGoPrev: boolean
  canGoNext: boolean
  noticeText: string
}

const BOUNDARY_NOTICE = `本版本支持 ${SUPPORTED_YEAR_MIN}–${SUPPORTED_YEAR_MAX} 年`

Component({
  data: {
    view: buildInitialView(),
  },
  pageLifetimes: {
    show() {
      this.refreshToday()
    },
  },
  methods: {
    goPrevMonth() {
      this.shiftMonth(-1)
    },
    goNextMonth() {
      this.shiftMonth(1)
    },
    backToToday() {
      this.setData({ view: buildInitialView() })
    },
    onMonthPicked(event: { detail: { value: string } }) {
      const parsed = parseDateKey(`${String(event.detail.value)}-01`)

      if (!parsed.ok) {
        return
      }

      this.setData({
        view: buildView(parsed.value.year, parsed.value.month, this.data.view.selectedDateKey),
      })
    },
    onSelectDate(event: { detail: { dateKey: string } }) {
      const dateKey = String(event.detail.dateKey)

      this.setData({ 'view.selectedDateKey': dateKey })
      wx.navigateTo({
        url: `/pages/day-detail/day-detail?date=${dateKey}&from=calendar`,
      })
    },
    retry() {
      const { year, month, selectedDateKey } = this.data.view

      this.setData({ view: buildView(year, month, selectedDateKey) })
    },
    shiftMonth(delta: number) {
      const { year, month, selectedDateKey } = this.data.view
      const total = year * 12 + (month - 1) + delta
      const nextYear = Math.floor(total / 12)
      const nextMonth = (total % 12) + 1

      this.setData({
        view: buildView(
          nextYear,
          nextMonth,
          shiftDateKeyToMonth(selectedDateKey, nextYear, nextMonth),
        ),
      })
    },
    refreshToday() {
      const todayKey = getTodayDateKey()

      if (todayKey === this.data.view.todayKey) {
        return
      }

      const { year, month, selectedDateKey } = this.data.view

      this.setData({ view: buildView(year, month, selectedDateKey, todayKey) })
    },
  },
})

function buildInitialView(): CalendarViewModel {
  const todayKey = getTodayDateKey()
  const parsed = parseDateKey(todayKey)

  if (!parsed.ok) {
    return {
      status: 'error',
      year: SUPPORTED_YEAR_MIN,
      month: 1,
      todayKey,
      titleText: '日期不可用',
      pickerValue: `${SUPPORTED_YEAR_MIN}-01`,
      cells: [],
      selectedDateKey: '',
      canGoPrev: false,
      canGoNext: false,
      noticeText: '设备日期无效，无法生成月历',
    }
  }

  return buildView(parsed.value.year, parsed.value.month, todayKey, todayKey)
}

function buildView(
  year: number,
  month: number,
  selectedDateKey: string,
  todayKey = getTodayDateKey(),
): CalendarViewModel {
  const base = {
    year,
    month,
    todayKey,
    titleText: `${year}年${month}月`,
    pickerValue: `${year}-${String(month).padStart(2, '0')}`,
    selectedDateKey,
    canGoPrev: !(year === SUPPORTED_YEAR_MIN && month === 1),
    canGoNext: !(year === SUPPORTED_YEAR_MAX && month === 12),
  }
  const grid = getMonthGrid(year, month, todayKey)

  if (!grid.ok) {
    return {
      ...base,
      status: 'error',
      cells: [],
      noticeText: `月历生成失败：${grid.message}`,
    }
  }

  return {
    ...base,
    status: 'ok',
    cells: grid.value,
    noticeText: base.canGoPrev && base.canGoNext ? '' : BOUNDARY_NOTICE,
  }
}
