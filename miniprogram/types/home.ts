import type { GanzhiDisplayItem } from '../utils/format'
import type { DateKey } from './calendar'

export type HomeStatus = 'ok' | 'out_of_range' | 'error'

/**
 * 首页「今日传统规则参考」的一行。
 * 原因：宜、忌、以及「不作结论」三种情况的行结构相同，先在服务侧拼成统一形状，
 * 页面只负责渲染，不在 wxml 里做判断。
 */
export interface HomeRuleRow {
  /** 供 wx:key 使用。 */
  id: 'verdict' | 'include' | 'exclude'
  badge: '宜' | '忌' | '—'
  /** 圆标配色类名，页面不自行判断。 */
  badgeClass: 'include' | 'exclude' | 'none'
  /** 条目名串（用「 · 」连接）或状态短句。 */
  title: string
  /** 补充说明；无内容时为空串。 */
  detail: string
}

export interface HomeViewModel {
  status: HomeStatus
  dateKey: DateKey
  yearText: string
  monthText: string
  dayText: string
  weekdayText: string
  lunarText: string
  ganzhiItems: GanzhiDisplayItem[]
  solarTermTitle: string
  solarTermDescription: string
  festivalText: string
  noticeText: string
  ruleRows: HomeRuleRow[]
  /** 规则包版本与命中条数；规则不可用时为空串。 */
  ruleCountText: string
}
