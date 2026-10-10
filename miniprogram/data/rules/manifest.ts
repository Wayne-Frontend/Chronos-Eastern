import { findSource } from '../sources'
import type { RulePack } from '../../types/rule'
import { TRAVEL_RULE_PACK } from './travel.v1'

/** 已登记的规则包。只有 status 为 verified 的包允许参与筛选（方案 6.8）。 */
export const RULE_PACKS: readonly RulePack[] = [TRAVEL_RULE_PACK]

/**
 * 规则包仍有未能判定或尚未实现边界时的统一提示语。
 * 原因：partial 不一定表示缺少原文条款，也可能是条款无法落实到具体日期；统一文案不能误报缺项。
 */
export const PARTIAL_COVERAGE_NOTICE =
  '本事项仍有未能判定或尚未实现的适用边界，结果不代表完整的传统规则结论。'

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
