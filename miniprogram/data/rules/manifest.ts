import { findSource } from '../sources'
import type { RulePack } from '../../types/rule'
import { TRAVEL_RULE_PACK } from './travel.v1'

/** 已登记的规则包。只有 status 为 verified 的包允许参与筛选（方案 6.8）。 */
export const RULE_PACKS: readonly RulePack[] = [TRAVEL_RULE_PACK]

/**
 * 规则包只收录部分条款时的统一提示语。
 * 原因：结果页与详情页都要展示覆盖范围，口径只写一份，避免两处文案日久漂移。
 */
export const PARTIAL_COVERAGE_NOTICE =
  '本事项仅收录部分古籍条款，未收录条款不参与判断，结果不代表完整的传统规则结论。'

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
