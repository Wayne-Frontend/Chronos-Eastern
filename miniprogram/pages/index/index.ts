import { HOME_PREVIEW_FIXTURE } from '../../data/fixtures/home'

Component({
  data: {
    preview: HOME_PREVIEW_FIXTURE,
  },
  methods: {
    openDetail() {
      wx.navigateTo({
        url: `/pages/day-detail/day-detail?date=${this.data.preview.dateKey}`,
      })
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
