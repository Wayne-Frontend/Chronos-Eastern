export type EventTypeStatus = 'supported' | 'reviewing' | 'unsupported'

export interface EventTypeEntry {
  id: string
  displayName: string
  /** 古籍中的对应用语；现代词只是界面别名，不改变条目含义。 */
  classicalTerms: readonly string[]
  status: EventTypeStatus
  rulePackId: string | null
  maxRangeDays: number
  /** 非 supported 事项的置灰说明，页面必须展示。 */
  statusNote: string
  disclaimer: string
}

/**
 * 找日子的事项表。只有 supported 事项允许查询（方案 1.6 状态门禁）。
 * 边界：现代词与古籍用语的对应关系逐项记录；「入宅」在卷十一未检出独立条目，
 * 不得并入「般移」，因此在完成专项校勘前保持 reviewing。
 */
export const EVENT_TYPES: readonly EventTypeEntry[] = [
  {
    id: 'travel',
    displayName: '出行',
    classicalTerms: ['出行', '行幸遣使'],
    status: 'supported',
    rulePackId: 'xjbf-travel',
    maxRangeDays: 90,
    statusNote: '',
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
