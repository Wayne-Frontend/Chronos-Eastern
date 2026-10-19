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
    expect(copy.suggestion).toBe('如果时间允许，可以看看其他日期。')
    expect(`${copy.title}${copy.summary}${copy.suggestion}`).not.toMatch(
      /规则包|规则版本|命中|排除规则|已校勘/,
    )
  })

  it('事项名称来自参数，不把出行写死到通用文案', () => {
    expect(describeDateOutcome('pass', '婚嫁').title).toBe('宜 · 婚嫁')
    expect(describeDateOutcome('excluded', '搬家').title).toBe('忌 · 搬家')
    expect(describeDateOutcome('pass', '婚嫁').summary).toContain('这一天')
  })

  it('把未裁决冲突表达为宜忌并见，并给出下一步建议', () => {
    const copy = describeDateOutcome('unresolved', '开业')

    expect(copy.title).toBe('宜忌并见 · 开业')
    expect(copy.summary).toContain('现有规则未能裁定')
    expect(copy.summary).toContain('暂不列入候选')
    expect(copy.suggestion).toContain('双方依据')
  })

  it('未命中已收录规则时不误称没有传统建议数据或诸事皆宜', () => {
    const copy = describeDateOutcome('not_matched', '婚嫁')

    expect(copy.title).toBe('暂无明确说法 · 婚嫁')
    expect(copy.summary).toContain('关于婚嫁的明确宜忌')
    expect(copy.summary).toContain('不代表宜或忌')
  })

  it('单条原因简短说明宜忌方向，专业原文留给出处区', () => {
    expect(describeRuleReason('天贼', 'exclude', '出行', false)).toEqual({
      title: '命中「天贼」',
      summary: '原书将其列为出行忌项。',
    })
  })

  it('未来日期详情不被称为今天', () => {
    for (const status of ['pass', 'excluded', 'unresolved', 'unknown', 'not_matched'] as const) {
      const copy = describeDateOutcome(status, '出行')
      expect(`${copy.title}${copy.summary}${copy.suggestion}`).not.toContain('今天')
    }
    expect(describeRuleReason('天喜', 'include', '出行', false).title).not.toContain('今天')
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
