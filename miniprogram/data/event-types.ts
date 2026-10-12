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
 * 2026-10-12：六个事项的规则包全部改判 complete（条目收全 ＋ 卷十裁决例外逐条落实），
 * 事项随之升 supported，chip 上的「有限收录」标记消失；覆盖范围仍由 statusNote 与
 * 各条 limitations 如实说明。
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
    status: 'supported',
    rulePackId: 'xjbf-travel',
    maxRangeDays: 90,
    statusNote:
      '出行条目宜忌已全部录入；天德在四仲月按底本不判值日。宜忌并见时按《协纪辨方书》卷十的例外逐条裁决。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实交通与安全判断。',
  },
  {
    id: 'relocation',
    displayName: '搬家',
    classicalTerms: ['般移', '移徙'],
    // 卷十一「般移（原注：移徙同）」的宜 14 条、忌 15 条均已录入；天德在四仲月只记四维、无法判到具体日期，故维持 limited。
    status: 'supported',
    rulePackId: 'xjbf-relocation',
    maxRangeDays: 90,
    statusNote:
      '般移条目宜忌已全部录入；天德、天德合在四仲月按底本不判值日。宜忌并见时按《协纪辨方书》卷十的例外逐条裁决。',
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
    status: 'supported',
    rulePackId: 'xjbf-opening',
    maxRangeDays: 90,
    statusNote: '开市条目宜忌已全部录入；宜忌并见时按《协纪辨方书》卷十的例外逐条裁决。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实经营决策与投资判断。',
  },
  {
    id: 'marriage',
    displayName: '婚嫁',
    // 只对应卷十一「嫁娶」一条。同卷另有「结婚姻」「纳采问名」，宜忌与本条不同，不并入，
    // 三条各自成事项（见 engagement、proposal）。
    classicalTerms: ['嫁娶'],
    // 卷十一「嫁娶」的宜 10 条、忌 20 条均已录入；宜忌并见时的原书例外仍未实现，故维持 limited。
    status: 'supported',
    rulePackId: 'xjbf-marriage',
    maxRangeDays: 90,
    statusNote:
      '嫁娶条目宜忌已全部录入；原书另有分列的「结婚姻」「纳采问名」两条，宜忌不同，已各自单独成事项，不并入本条。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实婚姻与家庭决策。',
  },
  {
    id: 'engagement',
    displayName: '订婚',
    // 只对应卷十一「结婚姻」一条。与「嫁娶」分列，现代词只是界面别名。
    classicalTerms: ['结婚姻'],
    // 卷十一「结婚姻」的宜 14 条、忌 20 条均已录入；天德四仲月不判值日、宜忌并见的原书例外未实现，故维持 limited。
    status: 'supported',
    rulePackId: 'xjbf-engagement',
    maxRangeDays: 90,
    statusNote:
      '结婚姻条目宜忌已全部录入；天德、天德合在四仲月按底本不判值日。同卷另有分列的「嫁娶」「纳采问名」两条，宜忌不同，不并入本条。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实婚姻与家庭决策。',
  },
  {
    id: 'proposal',
    displayName: '提亲',
    // 只对应卷十一「纳采问名」一条；其宜项比「结婚姻」少「六合」「五合」两条，二者不互相顶替。
    classicalTerms: ['纳采问名'],
    // 卷十一「纳采问名」的宜 12 条、忌 20 条均已录入；边界同上，维持 limited。
    status: 'supported',
    rulePackId: 'xjbf-proposal',
    maxRangeDays: 90,
    statusNote:
      '纳采问名条目宜忌已全部录入，宜项比「结婚姻」少「六合」「五合」两条；天德、天德合在四仲月按底本不判值日。',
    disclaimer: '仅按已收录传统规则提供文化参考，不涉及现实婚恋与家庭关系判断。',
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
