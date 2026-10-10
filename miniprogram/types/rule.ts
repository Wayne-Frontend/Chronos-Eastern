export type RuleStatus =
  'draft' | 'located' | 'transcribed' | 'interpreted' | 'reviewed' | 'verified' | 'deprecated'

export type RuleEffect = 'include' | 'exclude'

/**
 * `in`：事实值在 value 列表内即命中。
 * `month-indexed`：value 必须是 12 项，按节令月支从寅月（正月）起顺数取值，与事实值相等即命中；
 * 供卷五、卷六「正月起某，顺／逆行十二辰」的月神条款使用。表长不是 12 时按缺输入处理。
 * `month-indexed-set`：同 `month-indexed`，但每月的取值是多项，以 `|` 分隔，命中条件为
 * 事实值在本月取值集合内；供「三合」（每月两支）与「阴阳不将」（每月十余个日柱）使用。
 * 某项为空串表示本月无取值，永不命中；表长不是 12 时同样按缺输入处理。
 */
export type RuleOperator = 'in' | 'month-indexed' | 'month-indexed-set'

export interface RuleCondition {
  /** 事实字段路径，形如 `ganzhi.monthJieQi.branch`；规则必须声明读取哪个口径。 */
  fact: string
  operator: RuleOperator
  value: readonly string[]
}

export interface RuleDefinition {
  id: string
  /**
   * 原书条目名（如「建日」「月德」），供摘要类界面直接展示。
   * 必须是对应卷十一宜忌条目里的那个名字，且应能在 `locator` 的「宜项「X」／忌项「X」」中找到；有测试守这条。
   */
  name: string
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

/**
 * 规则包对原始条目的覆盖程度。
 * 与 RuleStatus 正交：status 说明包内单条规则是否过校勘，本字段说明整包是否把条目收全。
 * 只有 complete 才允许对应事项标记为 supported。
 */
export type RulePackCompleteness = 'complete' | 'partial'

export interface RulePack {
  id: string
  version: string
  eventType: string
  traditionId: string
  status: RuleStatus
  completeness: RulePackCompleteness
  conflictGroup: string
  /** 本版本已收录的规则范围说明，页面必须向用户展示。 */
  coverage: string
  rules: readonly RuleDefinition[]
}
