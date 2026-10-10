import { describe, expect, it } from 'vitest'

import { EVENT_TYPES } from '../miniprogram/data/event-types'
import {
  describeClassicalTerms,
  describeDateOutcome,
  describeRuleReason,
} from '../miniprogram/utils/rule-presentation'

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

describe('事项副行的古籍用语', () => {
  it('剔除与事项名相同的用语，避免同名重复', () => {
    expect(describeClassicalTerms('出行', ['出行', '行幸遣使'])).toBe('行幸遣使')
    expect(describeClassicalTerms('开业', ['开市'])).toBe('开市')
  })

  it('与事项名完全同名时返回空串，不替调用方编内容', () => {
    expect(describeClassicalTerms('入宅', ['入宅'])).toBe('')
    expect(describeClassicalTerms('安葬', ['安葬'])).toBe('')
    expect(describeClassicalTerms('出行', [])).toBe('')
  })

  it('超过两条时以「等」收束，不把整串术语铺开', () => {
    expect(describeClassicalTerms('婚嫁', ['嫁娶', '结婚姻', '纳采问名'])).toBe('嫁娶、结婚姻等')
    expect(describeClassicalTerms('搬家', ['般移', '移徙'])).toBe('般移、移徙')
  })

  it('事项表里每一项都能得到一个副行提示：要么是古籍用语，要么为空串', () => {
    // 页面在空串时退回状态短标记，因此这里只断言函数本身不抛错、不返回空白字符。
    for (const entry of EVENT_TYPES) {
      const hint = describeClassicalTerms(entry.displayName, entry.classicalTerms)

      expect(hint, entry.id).toBe(hint.trim())
      expect(hint, entry.id).not.toContain(entry.displayName)
    }
  })
})
