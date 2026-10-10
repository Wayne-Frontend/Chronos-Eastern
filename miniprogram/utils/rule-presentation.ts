import type { DayStatus } from '../services/rule-engine'
import type { RuleEffect } from '../types/rule'

export interface DateOutcomeCopy {
  badge: '宜' | '忌' | '慎' | '—'
  badgeClass: 'include' | 'exclude' | 'caution' | 'none'
  title: string
  summary: string
  suggestion: string
}

export interface RuleReasonCopy {
  title: string
  summary: string
}

/**
 * 把内部计算状态翻译成用户可以直接使用的日期结论。
 * 原因：状态名、命中数量和规则版本只服务于计算与维护，不能要求用户先理解实现方式。
 * 边界：这里表达的是传统文化参考，不替代现实中的交通、安全或行程判断。
 */
export function describeDateOutcome(status: DayStatus, eventName: string): DateOutcomeCopy {
  switch (status) {
    case 'pass':
      return {
        badge: '宜',
        badgeClass: 'include',
        title: `宜 · ${eventName}`,
        summary: `传统择日中，今天有适合${eventName}的说法。`,
        suggestion: '如果时间和现实条件合适，可以把今天列入备选。',
      }
    case 'excluded':
      return {
        badge: '忌',
        badgeClass: 'exclude',
        title: `忌 · ${eventName}`,
        summary: `传统择日中，今天有不利于${eventName}的说法。`,
        suggestion: '如果时间允许，可以优先看看其他日期；普通日常安排不必因此改变。',
      }
    case 'unresolved':
      return {
        badge: '慎',
        badgeClass: 'caution',
        title: `宜忌不定 · ${eventName}`,
        summary: '不同传统说法给出了相反的方向，因此今天不作明确推荐。',
        suggestion: '可以看看其他日期，或根据自己的实际安排决定。',
      }
    case 'unknown':
      return {
        badge: '—',
        badgeClass: 'none',
        title: `未定 · ${eventName}`,
        summary: '现有信息不足，暂时无法给出清晰的传统择日参考。',
        suggestion: '请以现实安排和实际条件为准。',
      }
    default:
      return {
        badge: '—',
        badgeClass: 'none',
        title: `未定 · ${eventName}`,
        summary: `传统择日中，没有找到足够明确的${eventName}倾向。`,
        suggestion: '这不代表今天不能安排，请结合实际情况决定。',
      }
  }
}

/**
 * 单条依据只解释“它对当前结果意味着什么”；古籍术语、原文定位和适用限制留在折叠区。
 * 这样既保留可追溯性，也不会让专业术语抢在用户结论之前出现。
 */
export function describeRuleReason(
  name: string,
  effect: RuleEffect,
  eventName: string,
  isUnknown: boolean,
): RuleReasonCopy {
  if (isUnknown) {
    return {
      title: `“${name}”暂时无法确认`,
      summary: '这项传统说法缺少足够信息，因此没有用来得出本次结论。',
    }
  }

  return effect === 'include'
    ? {
        title: `今天符合“${name}”的传统说法`,
        summary: `这种说法通常把今天视为适合${eventName}的日期。`,
      }
    : {
        title: `今天遇到“${name}”的传统说法`,
        summary: `这种说法通常不会优先选择今天安排${eventName}。`,
      }
}
