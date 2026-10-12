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

/**
 * 卷十「宜忌」给出的裁决例外：宜忌并见时，原书对「与德神同日的忌神」另有取舍。
 * 只编码原书**明言不忌**的条款；「止忌某某餘皆不忌」「如常例」「諸事皆忌」「猶忌」
 * 「從某煞論」等形态尚未编码，未编码即按常例（`unresolved`）处理。见审计 §6.1。
 */
export interface AdjudicationClause {
  /** 受裁决的忌神煞条目名，必须与该规则 name 一致。 */
  shensha: string
  /**
   * 触发月份（节令月支）。条款以月组表述时，先按该神煞在各月的实际值日逐月展开、
   * 与规则包的表核对后再录入（如九空条「寅申月值滿日」即寅月、申月两值）。
   */
  monthBranches: readonly string[]
  /** 需同日并临的神煞，任一命中即满足；空数组表示条款不要求德神。 */
  requiresAny: readonly string[]
  /**
   * 条款生效后**仍然维持忌**的用事（原书「止忌某某，餘皆不忌」的清单）。
   * 存本项目的 eventType id，编码时由原文用事名逐项折算；空数组表示对该事项也解除。
   * 例如卷十劫煞条的清单是「安撫邊境、選將訓兵、出師、求醫療病」，与已开放事项无一相关，
   * 故为空；将来若开出「安葬」等事项，必须回头重核这些清单。
   */
  residualEventTypes: readonly string[]
  /**
   * 条款结论：
   * - `lift`＝原书明言「併則不忌」或「止忌…餘皆不忌」，对该事项解除忌项；
   * - `exclude`＝原书明言「諸事皆忌」或「雖與德合併猶忌」，该日定为忌；
   * - `normal`＝原书写「如常例」「不註宜亦不註忌」，两不注（也是无条款时的默认）；
   * - `delegate`＝原书写「從某煞論」，按 `delegateShensha` 的结论处置。
   */
  outcome: 'lift' | 'exclude' | 'normal' | 'delegate'
  /** outcome 为 delegate 时的被转致神煞名（如「從月破論」）。 */
  delegateShensha?: string
  /** 来源定位：卷次、条目与帧号。 */
  locator: string
}
