import { findSource } from '../sources'
import type { RulePack, RulePackCompleteness } from '../../types/rule'
import { MARRIAGE_RULE_PACK } from './marriage.v1'
import { OPENING_RULE_PACK } from './opening.v1'
import { RELOCATION_RULE_PACK } from './relocation.v1'
import { TRAVEL_RULE_PACK } from './travel.v1'

/** 已登记的规则包。只有 status 为 verified 的包允许参与筛选（方案 6.8）。 */
export const RULE_PACKS: readonly RulePack[] = [
  TRAVEL_RULE_PACK,
  OPENING_RULE_PACK,
  RELOCATION_RULE_PACK,
  MARRIAGE_RULE_PACK,
]

/**
 * 规则包仍有未能判定或尚未实现边界时的统一提示语。
 * 原因：partial 不一定表示缺少原文条款，也可能是条款无法落实到具体日期；统一文案不能误报缺项。
 */
export const PARTIAL_COVERAGE_NOTICE =
  '本事项仍有未能判定或尚未实现的适用边界，结果不代表完整的传统规则结论。'

export interface CoverageDisclosure {
  /** 覆盖范围披露语；complete 时为空串。三处落点共用这一句，不得各写一套。 */
  noticeText: string
  /** 该事项本版本收录了什么、还差什么；complete 时为空串。 */
  coverageText: string
}

/**
 * 覆盖范围披露的唯一出口。
 * 原因：partial 事项必须在事项入口（chip 短标记与选中提示）、结果列表上方、详情页规则区
 * 三处显示覆盖范围；三处若各写一句，迟早出现三套说法，故统一从这里取。
 * 边界：只认规则包的 completeness，不认事项状态——将来出现 complete 的事项时不会被多提示一句。
 */
export function describeCoverage(
  completeness: RulePackCompleteness,
  coverage: string,
): CoverageDisclosure {
  return completeness === 'partial'
    ? { noticeText: PARTIAL_COVERAGE_NOTICE, coverageText: coverage }
    : { noticeText: '', coverageText: '' }
}

export function findVerifiedRulePack(eventType: string): RulePack | null {
  return (
    RULE_PACKS.find(
      (pack) =>
        pack.eventType === eventType &&
        pack.status === 'verified' &&
        pack.rules
          .filter((rule) => rule.status === 'verified')
          .every(
            (rule) =>
              rule.sourceIds.length > 0 &&
              rule.sourceIds.every((sourceId) => findSource(sourceId) !== null),
          ),
    ) ?? null
  )
}
