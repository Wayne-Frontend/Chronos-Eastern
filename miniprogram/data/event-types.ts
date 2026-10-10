export type EventTypeStatus = 'supported' | 'limited' | 'reviewing' | 'unsupported'

export interface EventTypeEntry {
  id: string
  displayName: string
  /** 古籍中的对应用语；现代词只是界面别名，不改变条目含义。 */
  classicalTerms: readonly string[]
  status: EventTypeStatus
  rulePackId: string | null
  maxRangeDays: number
  /** 状态说明，页面必须展示：不可查询时为置灰原因，limited 为选中后的覆盖范围提示。 */
  statusNote: string
  disclaimer: string
}

/**
 * 允许进入查询与解释的状态。新增状态时必须先在此登记，页面与服务一律调用
 * canQueryEventType 判断，不得各自比较字面量，避免门禁散落到多个页面。
 */
const QUERYABLE_STATUSES: readonly EventTypeStatus[] = ['supported', 'limited']

/** 事项 chip 上的短标记；覆盖完整的 supported 不加标记。 */
const STATUS_BADGE_TEXT: Record<EventTypeStatus, string> = {
  supported: '',
  limited: '有限收录',
  reviewing: '整理中',
  unsupported: '不提供',
}

/**
 * 找日子的事项表。supported 与 limited 允许查询（方案 1.6 状态门禁）。
 * 边界：现代词与古籍用语的对应关系逐项记录；「入宅」在卷十一未检出独立条目，
 * 不得并入「般移」，因此在完成专项校勘前保持 reviewing。
 */
export const EVENT_TYPES: readonly EventTypeEntry[] = [
  {
    id: 'travel',
    displayName: '出行',
    classicalTerms: ['出行', '行幸遣使'],
    // 卷十一的宜 16 条、忌 16 条均已录入；但天德在四仲月只记四维、无法判到具体日期，故维持 limited。
    status: 'limited',
    rulePackId: 'xjbf-travel',
    maxRangeDays: 90,
    statusNote:
      '出行条目已全部录入；天德在部分月份无法判到具体日期，冲突例外仍采用保守处理，结果不代表完整的传统结论。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实交通与安全判断。',
  },
  {
    id: 'relocation',
    displayName: '搬家',
    classicalTerms: ['般移', '移徙'],
    status: 'reviewing',
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '规则整理中：需完成般移/移徙与入宅、方位的区分校勘。',
    disclaimer: '',
  },
  {
    id: 'moving-in',
    displayName: '入宅',
    classicalTerms: ['入宅'],
    status: 'reviewing',
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '规则整理中：卷十一未检出同名独立条目，不得直接并入搬家。',
    disclaimer: '',
  },
  {
    id: 'opening',
    displayName: '开业',
    classicalTerms: ['开市'],
    status: 'reviewing',
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '规则整理中：需完成现代词与开市的映射说明。',
    disclaimer: '',
  },
  {
    id: 'marriage',
    displayName: '婚嫁',
    classicalTerms: ['嫁娶', '纳采问名', '结婚姻'],
    status: 'reviewing',
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '规则整理中：原书分列嫁娶、结婚姻、纳采问名，不可笼统合并。',
    disclaimer: '',
  },
  {
    id: 'funeral',
    displayName: '安葬',
    classicalTerms: ['安葬'],
    status: 'unsupported',
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '本版本不提供：相关规则依赖山向、时辰等本版本不收集的信息。',
    disclaimer: '',
  },
]

export function findEventType(eventTypeId: string): EventTypeEntry | null {
  return EVENT_TYPES.find((entry) => entry.id === eventTypeId) ?? null
}

/**
 * 唯一的状态门禁：查询与单日解释都必须经过这里。
 * 只返回布尔值、不写成类型谓词：调用方在「不可查询」分支仍需读取该事项的 statusNote。
 */
export function canQueryEventType(entry: EventTypeEntry | null): boolean {
  return entry !== null && QUERYABLE_STATUSES.includes(entry.status)
}

export function getStatusBadgeText(status: EventTypeStatus): string {
  return STATUS_BADGE_TEXT[status]
}
