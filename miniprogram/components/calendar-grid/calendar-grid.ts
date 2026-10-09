import type { MonthGridCell } from '../../services/calendar-service'
import { WEEKDAY_LABELS } from '../../utils/format'

interface GridRow {
  id: number
  cells: MonthGridCell[]
}

const COLUMNS = 7

Component({
  properties: {
    cells: {
      type: Array,
      value: [] as MonthGridCell[],
    },
    selectedDateKey: {
      type: String,
      value: '',
    },
  },
  data: {
    weekdayLabels: WEEKDAY_LABELS,
    // 显式分行渲染：每行固定 7 格用 flex 均分，避免百分比宽度取整导致换行错位。
    rows: [] as GridRow[],
  },
  observers: {
    cells(cells: MonthGridCell[]) {
      const rows: GridRow[] = []

      for (let index = 0; index < cells.length; index += COLUMNS) {
        rows.push({ id: index, cells: cells.slice(index, index + COLUMNS) })
      }

      this.setData({ rows })
    },
  },
  methods: {
    onCellTap(event: WechatMiniprogram.TouchEvent) {
      this.triggerEvent('select', {
        dateKey: String(event.currentTarget.dataset.dateKey),
      })
    },
  },
})
