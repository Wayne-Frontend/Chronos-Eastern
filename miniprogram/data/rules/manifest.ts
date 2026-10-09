import { findSource } from '../sources'
import type { RulePack } from '../../types/rule'
import { TRAVEL_RULE_PACK } from './travel.v1'

/** 已登记的规则包。只有 status 为 verified 的包允许参与筛选（方案 6.8）。 */
export const RULE_PACKS: readonly RulePack[] = [TRAVEL_RULE_PACK]

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
