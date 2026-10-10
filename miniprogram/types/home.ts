import type { GanzhiDisplayItem } from '../utils/format'
import type { DateKey } from './calendar'

export type HomeStatus = 'ok' | 'out_of_range' | 'error'

/**
 * 首页的一组宜忌结果：第一层是事项，第二层是对应的传统名称。
 * 边界：只有「有结论」的三种形态才成行。今天没有明确说法或读取失败的，不进本区块——
 * 「今日宜忌」里出现既非宜也非忌的行会让整块读不出结论；读取失败改走首页提示条。
 */
export interface HomeAlmanacRow {
  id: 'include' | 'exclude' | 'caution'
  badge: '宜' | '忌' | '慎'
  badgeClass: 'include' | 'exclude' | 'caution'
  /** 当前结论对应的事项，用顿号连接。 */
  eventText: string
  /** 支撑该结论的传统名称，用间隔点连接。 */
  reasonText: string
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
  festivalTitle: string
  festivalDescription: string
  noticeText: string
  almanacRows: HomeAlmanacRow[]
  /** 当前可用于查看来源详情的事项；后续多事项时由具体行携带事项 id。 */
  /**
   * 摘要读到的全部事项，逗号分隔。
   * 原因：首页的今日宜忌是几个事项合并成行的，详情页必须一次拿到同一批事项，
   * 否则用户看到「宜出行、忌开业」却只读到一个说法。
   * 边界：只含有结论的事项；空串表示今天没有可展示的结论。
   */
  ruleEventTypeIds: string
}
