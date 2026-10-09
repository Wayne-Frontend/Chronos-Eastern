import type { MonthGridCell } from '../../services/calendar-service'
import { WEEKDAY_LABELS } from '../../utils/format'

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
  },
  methods: {
    onCellTap(event: WechatMiniprogram.TouchEvent) {
      this.triggerEvent('select', {
        dateKey: String(event.currentTarget.dataset.dateKey),
      })
    },
  },
})
