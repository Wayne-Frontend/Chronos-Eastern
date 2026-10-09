import { parseDateKey } from '../../utils/date-key'

Page({
  data: {
    dateKey: '',
  },
  onLoad(options) {
    const input = options.date ?? ''
    const parsed = parseDateKey(input)

    this.setData({
      dateKey: parsed.ok ? parsed.value.dateKey : '',
    })
  },
})
