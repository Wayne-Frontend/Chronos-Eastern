export type RuleStatus =
  'draft' | 'located' | 'transcribed' | 'interpreted' | 'reviewed' | 'verified' | 'deprecated'

export type RuleEffect = 'include' | 'exclude'

export type RuleOperator = 'in'

export interface RuleCondition {
  /** 事实字段路径，形如 `ganzhi.monthJieQi.branch`；规则必须声明读取哪个口径。 */
  fact: string
  operator: RuleOperator
  value: readonly string[]
}

export interface RuleDefinition {
  id: string
  traditionId: string
  eventType: string
  status: RuleStatus
  effect: RuleEffect
  conflictGroup: string
  /** 来源未记录优先关系时为 null；程序不得自行补成数字。 */
  priority: number | null
  when: {
    all: readonly RuleCondition[]
  }
  sourceIds: readonly string[]
  /** 影像页或条目定位，便于回查底本。 */
  locator: string
  explanation: string
  limitations: readonly string[]
}

export interface RulePack {
  id: string
  version: string
  eventType: string
  traditionId: string
  status: RuleStatus
  conflictGroup: string
  /** 本版本已收录的规则范围说明，页面必须向用户展示。 */
  coverage: string
  rules: readonly RuleDefinition[]
}
