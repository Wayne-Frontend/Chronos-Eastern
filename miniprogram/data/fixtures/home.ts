import type { HomePreviewFixture } from '../../types/home'

// 该数据只用于验证首页信息层级和布局，不代表真实历法或传统规则结论。
export const HOME_PREVIEW_FIXTURE: HomePreviewFixture = {
  dateKey: '2026-10-08',
  yearText: '2026年',
  monthText: '10',
  dayText: '8',
  weekdayText: '星期四',
  calendarPlaceholder: '农历、干支信息将在历法适配器验证完成后显示',
  solarTermTitle: '二十四节气数据待验证',
  solarTermDescription: '交节时刻将统一按中国标准时间计算',
  rulePlaceholder: '完成来源校勘与测试后再展示具体事项',
}
