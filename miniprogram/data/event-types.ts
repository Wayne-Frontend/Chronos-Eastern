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
 * 边界：现代词与古籍用语的对应关系逐项记录。只有「入宅」仍是 reviewing——
 * 卷十一全卷（御用六十七事、民用三十七事、通书六十事三份清单及逐条宜忌）均无同名条目，
 * 不得把它并入「般移」，也不得按现代语义自造条目。安葬的日期还取决于山向、形势等
 * 本版本不收集的条件，保持 unsupported。
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
    // 卷十一「般移（原注：移徙同）」的宜 14 条、忌 15 条均已录入；天德在四仲月只记四维、无法判到具体日期，故维持 limited。
    status: 'limited',
    rulePackId: 'xjbf-relocation',
    maxRangeDays: 90,
    statusNote:
      '般移条目已全部录入；天德在部分月份无法判到具体日期，冲突例外仍采用保守处理，结果不代表完整的传统结论。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实搬迁安排与居住决策。',
  },
  {
    id: 'moving-in',
    displayName: '入宅',
    classicalTerms: ['入宅'],
    status: 'reviewing',
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '规则整理中：卷十一全卷未检出同名条目，不得直接并入搬家。',
    disclaimer: '',
  },
  {
    id: 'opening',
    displayName: '开业',
    classicalTerms: ['开市'],
    // 卷十一「开市」条目的宜 6 条、忌 19 条均已录入；宜忌并见时的原书例外仍未实现，故维持 limited。
    status: 'limited',
    rulePackId: 'xjbf-opening',
    maxRangeDays: 90,
    statusNote: '开市条目已全部录入；宜忌并见时仍按原书常例保守处理，结果不代表完整的传统结论。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实经营决策与投资判断。',
  },
  {
    id: 'marriage',
    displayName: '婚嫁',
    // 只对应卷十一「嫁娶」一条。同卷另有「结婚姻」「纳采问名」，宜忌与本条不同，不并入。
    classicalTerms: ['嫁娶'],
    // 卷十一「嫁娶」的宜 10 条、忌 20 条均已录入；宜忌并见时的原书例外仍未实现，故维持 limited。
    status: 'limited',
    rulePackId: 'xjbf-marriage',
    maxRangeDays: 90,
    statusNote:
      '嫁娶条目已全部录入；原书另有分列的「结婚姻」「纳采问名」两条，宜忌不同，本版本未收录。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实婚姻与家庭决策。',
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
