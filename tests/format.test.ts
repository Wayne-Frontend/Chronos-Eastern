import { describe, expect, it } from 'vitest'

import type { SolarTermInfo } from '../miniprogram/types/calendar'
import {
  formatGanzhiSummary,
  formatGanzhiWithConventions,
  formatLunarText,
  formatSolarTermDate,
  formatSolarTermSummary,
  formatSolarTermTime,
  formatWeekday,
} from '../miniprogram/utils/format'

const HAN_LU: SolarTermInfo = {
  name: '寒露',
  instant: '2026-10-08T14:29:17+08:00',
  localDate: '2026-10-08',
}

const SHUANG_JIANG: SolarTermInfo = {
  name: '霜降',
  instant: '2026-10-23T17:37:57+08:00',
  localDate: '2026-10-23',
}

const GANZHI = {
  yearLunarNewYear: '乙巳',
  yearLiChun: '丙午',
  monthJieQi: '庚寅',
  dayCivil: '甲子',
}

describe('formatWeekday', () => {
  it.each([
    [0, '星期日'],
    [4, '星期四'],
    [6, '星期六'],
  ])('%i 对应 %s', (weekday, expected) => {
    expect(formatWeekday(weekday)).toBe(expected)
  })

  it('越界值返回空串，不产生错误文本', () => {
    expect(formatWeekday(9)).toBe('')
  })
})

describe('formatLunarText', () => {
  it('拼接月名与日名，保留闰月前缀', () => {
    expect(
      formatLunarText({
        year: 2026,
        month: 8,
        day: 28,
        isLeapMonth: false,
        monthName: '八月',
        dayName: '廿八',
      }),
    ).toBe('农历八月廿八')
    expect(
      formatLunarText({
        year: 2025,
        month: 6,
        day: 1,
        isLeapMonth: true,
        monthName: '闰六月',
        dayName: '初一',
      }),
    ).toBe('农历闰六月初一')
  })
})

describe('干支展示', () => {
  it('首页摘要按农历岁首口径取年柱', () => {
    expect(formatGanzhiSummary(GANZHI)).toEqual([
      { label: '年柱', value: '乙巳' },
      { label: '月柱', value: '庚寅' },
      { label: '日柱', value: '甲子' },
    ])
  })

  it('详情页四个口径各自成行，不合并字段', () => {
    expect(formatGanzhiWithConventions(GANZHI).map((item) => item.value)).toEqual([
      '乙巳',
      '丙午',
      '庚寅',
      '甲子',
    ])
  })
})

describe('节气展示', () => {
  it('日期去掉前导零，时刻取自 +08:00 时刻串', () => {
    expect(formatSolarTermDate('2026-10-08')).toBe('10月8日')
    expect(formatSolarTermTime('2026-10-08T14:29:17+08:00')).toBe('14:29')
  })

  it('无法识别的时刻串原样返回，不猜测', () => {
    expect(formatSolarTermTime('待运行计算')).toBe('待运行计算')
  })
})

describe('formatSolarTermSummary', () => {
  it('当日有节气时主显名称，并带上到下一个节气的天数', () => {
    expect(
      formatSolarTermSummary({
        dateKey: '2026-10-08',
        solarTerm: HAN_LU,
        nextSolarTerm: SHUANG_JIANG,
      }),
    ).toEqual({
      title: '寒露',
      description: '交节时刻 14:29 · 距霜降还有 15 天',
    })
  })

  it('当日无节气时主显倒计时，不留空白卡片', () => {
    expect(
      formatSolarTermSummary({
        dateKey: '2026-10-12',
        solarTerm: null,
        nextSolarTerm: SHUANG_JIANG,
      }),
    ).toEqual({
      title: '距霜降还有 11 天',
      description: '10月23日 17:37 交节',
    })
  })

  it('没有节气数据时不编造结果', () => {
    expect(
      formatSolarTermSummary({
        dateKey: '2026-10-08',
        solarTerm: null,
        nextSolarTerm: null,
      }),
    ).toEqual({
      title: '节气信息整理中',
      description: '',
    })
  })
})
