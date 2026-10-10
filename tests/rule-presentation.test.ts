import { describe, expect, it } from 'vitest'

import { describeDateOutcome, describeRuleReason } from '../miniprogram/utils/rule-presentation'

describe('用户日期结果文案', () => {
  it('把排除状态翻译成用户可理解的结果，不暴露内部术语', () => {
    const copy = describeDateOutcome('excluded', '出行')

    expect(copy).toMatchObject({
      badge: '忌',
      title: '忌 · 出行',
    })
    expect(copy.suggestion).toBe('如果时间允许，可以优先看看其他日期；普通日常安排不必因此改变。')
    expect(`${copy.title}${copy.summary}${copy.suggestion}`).not.toMatch(
      /规则包|规则版本|命中|排除规则|已校勘/,
    )
  })

  it('事项名称来自参数，不把出行写死到通用文案', () => {
    expect(describeDateOutcome('pass', '婚嫁').title).toBe('宜 · 婚嫁')
    expect(describeDateOutcome('excluded', '搬家').title).toBe('忌 · 搬家')
  })

  it('把冲突状态表达为说法不一致，并给出下一步建议', () => {
    const copy = describeDateOutcome('unresolved', '开业')

    expect(copy.title).toBe('宜忌不定 · 开业')
    expect(copy.summary).toContain('不作明确推荐')
    expect(copy.suggestion).toContain('其他日期')
  })

  it('单条原因先解释对结果的含义，专业原文留给出处区', () => {
    expect(describeRuleReason('天贼', 'exclude', '出行', false)).toEqual({
      title: '今天遇到“天贼”的传统说法',
      summary: '这种说法通常不会优先选择今天安排出行。',
    })
  })
})
