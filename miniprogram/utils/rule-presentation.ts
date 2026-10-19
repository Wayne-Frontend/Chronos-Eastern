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
        summary: `按已收录的传统规则，这一天可列为${eventName}备选。`,
        suggestion: '',
      }
    case 'excluded':
      return {
        badge: '忌',
        badgeClass: 'exclude',
        title: `忌 · ${eventName}`,
        summary: `按已收录的传统规则，这一天有${eventName}忌项。`,
        suggestion: '如果时间允许，可以看看其他日期。',
      }
    case 'unresolved':
      return {
        badge: '慎',
        badgeClass: 'caution',
        title: `宜忌并见 · ${eventName}`,
        // 卷十常例有德神等适用边界，不能把未裁决的冲突一概归因于某一原书条款。
        summary: '这一天同时有宜、忌依据，现有规则未能裁定，暂不列入候选。',
        suggestion: '可查看下方双方依据，再结合实际安排决定。',
      }
    case 'unknown':
      return {
        badge: '—',
        badgeClass: 'none',
        title: `未定 · ${eventName}`,
        summary: '判断所需信息不足，暂时无法给出明确的传统择日参考。',
        suggestion: '',
      }
    case 'not_matched':
      return {
        badge: '—',
        badgeClass: 'none',
        title: `暂无明确说法 · ${eventName}`,
        summary: `已收录规则中，未找到这一天关于${eventName}的明确宜忌；不代表宜或忌。`,
        suggestion: '',
      }
    default:
      return {
        badge: '—',
        badgeClass: 'none',
        title: `未定 · ${eventName}`,
        summary: `现有信息不足，暂时无法判断这一天的${eventName}宜忌。`,
        suggestion: '',
      }
  }
}

/** 事项副行最多列出的古籍用语条数；超出部分以「等」收束，与来源标题的「等」同一用法。 */
const CLASSICAL_TERM_HINT_LIMIT = 2

/**
 * 事项副行的古籍用语提示。
 * 原因：现代事项名与古籍条目不是一一对应（婚嫁在卷十一分列嫁娶、结婚姻、纳采问名），
 * 卡片上要让用户看见「要查的是哪一条古籍条目」，但不能把一整串术语铺开。
 * 边界：剔除与事项名完全相同的用语（「入宅」「安葬」与其古籍用语本就同名，重复显示只是噪音）；
 * 剔除后为空时返回空串，由调用方决定副行改显示什么，本函数不替它编内容。
 */
export function describeClassicalTerms(displayName: string, terms: readonly string[]): string {
  const distinct = [...new Set(terms)].filter((term) => term !== displayName)

  if (distinct.length === 0) {
    return ''
  }

  if (distinct.length <= CLASSICAL_TERM_HINT_LIMIT) {
    return distinct.join('、')
  }

  return `${distinct.slice(0, CLASSICAL_TERM_HINT_LIMIT).join('、')}等`
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
      title: `「${name}」暂时无法确认`,
      summary: '这项传统说法缺少足够信息，因此没有用来得出本次结论。',
    }
  }

  return effect === 'include'
    ? {
        title: `命中「${name}」`,
        summary: `原书将其列为${eventName}宜项。`,
      }
    : {
        title: `命中「${name}」`,
        summary: `原书将其列为${eventName}忌项。`,
      }
}
