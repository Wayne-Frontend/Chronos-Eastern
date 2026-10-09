import { describe, expect, it } from 'vitest'

import {
  getMonthIndex,
  getSeason,
  MONTH_COUNT,
  resolveMonthIndexed,
} from '../miniprogram/services/rule-facts'
import { EARTHLY_BRANCHES } from '../miniprogram/utils/ganzhi'

/** 12 项互不相同的表，用于确认取到的是哪一项。 */
const LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] as const

describe('getMonthIndex', () => {
  it('以寅月（正月）为第 0 项，顺数到丑月为第 11 项', () => {
    expect(getMonthIndex('寅')).toBe(0)
    expect(getMonthIndex('卯')).toBe(1)
    expect(getMonthIndex('辰')).toBe(2)
    expect(getMonthIndex('亥')).toBe(9)
    expect(getMonthIndex('子')).toBe(10)
    expect(getMonthIndex('丑')).toBe(11)
  })

  it('十二支恰好覆盖 0–11 且不重复', () => {
    const indexes = EARTHLY_BRANCHES.map((branch) => getMonthIndex(branch)).sort(
      (left, right) => (left ?? -1) - (right ?? -1),
    )

    expect(indexes).toEqual([...LABELS.map((_, index) => index)])
  })

  it('不是十二支时返回 null，不回退到别的月序', () => {
    expect(getMonthIndex('甲')).toBeNull()
    expect(getMonthIndex('')).toBeNull()
    expect(getMonthIndex('寅月')).toBeNull()
  })
})

describe('getSeason', () => {
  it('按节令月分四季：寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬', () => {
    for (const branch of ['寅', '卯', '辰']) {
      expect(getSeason(branch), branch).toBe('春')
    }

    for (const branch of ['巳', '午', '未']) {
      expect(getSeason(branch), branch).toBe('夏')
    }

    for (const branch of ['申', '酉', '戌']) {
      expect(getSeason(branch), branch).toBe('秋')
    }

    for (const branch of ['亥', '子', '丑']) {
      expect(getSeason(branch), branch).toBe('冬')
    }
  })

  it('不是十二支时返回 null', () => {
    expect(getSeason('丙')).toBeNull()
    expect(getSeason('')).toBeNull()
  })
})

describe('resolveMonthIndexed', () => {
  it('按节令月取对应项', () => {
    expect(resolveMonthIndexed(LABELS, '寅')).toBe('0')
    expect(resolveMonthIndexed(LABELS, '丑')).toBe('11')
    expect(resolveMonthIndexed(LABELS, '戌')).toBe('8')
  })

  it('表长不是 12 时返回 null，由调用方按缺输入处理', () => {
    expect(resolveMonthIndexed(LABELS.slice(0, 11), '寅')).toBeNull()
    expect(resolveMonthIndexed([...LABELS, '甲'], '寅')).toBeNull()
    expect(resolveMonthIndexed([], '寅')).toBeNull()
  })

  it('月支无法解析时返回 null', () => {
    expect(resolveMonthIndexed(LABELS, '甲')).toBeNull()
  })

  it('MONTH_COUNT 与十二支数量一致', () => {
    expect(MONTH_COUNT).toBe(EARTHLY_BRANCHES.length)
  })
})
