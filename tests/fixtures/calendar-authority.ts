export interface CalendarAuthorityFixture {
  dateKey: string
  expected: {
    year: number
    month: number
    day: number
    isLeapMonth: boolean
    monthName: string
    dayName: string
  }
  source: {
    name: string
    url: string
  }
}

/**
 * 基础公农历回归样本。
 * 原因：候选库自身测试只能证明实现自洽，不能替代独立权威历表校验。
 * 边界：这里只录入已能从官方年度对照表定位的民用日，干支和节气时刻另行验证。
 */
export const CALENDAR_AUTHORITY_FIXTURES: readonly CalendarAuthorityFixture[] = [
  {
    dateKey: '1901-01-01',
    expected: {
      year: 1900,
      month: 11,
      day: 11,
      isLeapMonth: false,
      monthName: '冬月',
      dayName: '十一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2012-05-21',
    expected: {
      year: 2012,
      month: 4,
      day: 1,
      isLeapMonth: true,
      monthName: '闰四月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2014-10-24',
    expected: {
      year: 2014,
      month: 9,
      day: 1,
      isLeapMonth: true,
      monthName: '闰九月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2017-07-23',
    expected: {
      year: 2017,
      month: 6,
      day: 1,
      isLeapMonth: true,
      monthName: '闰六月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2020-05-23',
    expected: {
      year: 2020,
      month: 4,
      day: 1,
      isLeapMonth: true,
      monthName: '闰四月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2023-03-22',
    expected: {
      year: 2023,
      month: 2,
      day: 1,
      isLeapMonth: true,
      monthName: '闰二月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2024-02-09',
    expected: {
      year: 2023,
      month: 12,
      day: 30,
      isLeapMonth: false,
      monthName: '腊月',
      dayName: '三十',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2024-02-10',
    expected: {
      year: 2024,
      month: 1,
      day: 1,
      isLeapMonth: false,
      monthName: '正月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2025-07-25',
    expected: {
      year: 2025,
      month: 6,
      day: 1,
      isLeapMonth: true,
      monthName: '闰六月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2033-12-22',
    expected: {
      year: 2033,
      month: 11,
      day: 1,
      isLeapMonth: true,
      monthName: '闰冬月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
  {
    dateKey: '2100-12-31',
    expected: {
      year: 2100,
      month: 12,
      day: 1,
      isLeapMonth: false,
      monthName: '腊月',
      dayName: '初一',
    },
    source: {
      name: '香港天文台公历与农历日期对照表',
      url: 'https://www.hko.gov.hk/sc/gts/time/conversion.htm',
    },
  },
]
