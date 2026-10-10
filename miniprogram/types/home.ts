import type { GanzhiDisplayItem } from '../utils/format'
import type { DateKey } from './calendar'

export type HomeStatus = 'ok' | 'out_of_range' | 'error'

/** 首页的一组宜忌结果：第一层是事项，第二层是对应的传统名称。 */
export interface HomeAlmanacRow {
  id: 'include' | 'exclude' | 'caution' | 'none'
  badge: '宜' | '忌' | '慎' | '—'
  badgeClass: 'include' | 'exclude' | 'caution' | 'none'
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
  ruleEventTypeId: string
}
