import { describe, expect, it } from 'vitest'

import { EARTHLY_BRANCHES, getJianChu, splitGanzhi } from '../miniprogram/utils/ganzhi'

describe('splitGanzhi', () => {
  it('拆解合法干支', () => {
    expect(splitGanzhi('乙卯')).toEqual({ stem: '乙', branch: '卯' })
    expect(splitGanzhi('甲子')).toEqual({ stem: '甲', branch: '子' })
  })

  it.each(['', '乙', '乙卯辰', '子乙', 'A子'])('拒绝非法干支：%s', (input) => {
    expect(splitGanzhi(input)).toBeNull()
  })
})

describe('getJianChu', () => {
  // 期望值取自《协纪辨方书》卷四所引《淮南子》：「正月建寅则寅为建，卯为除，
  // 辰为满，巳为平，午为定，未为执，申为破，酉为危，戌为成，亥为收，子为开，丑为闭」。
  it('正月建寅的十二日依次为建除满平定执破危成收开闭', () => {
    expect(EARTHLY_BRANCHES.map((branch) => getJianChu('寅', branch))).toEqual([
      '开',
      '闭',
      '建',
      '除',
      '满',
      '平',
      '定',
      '执',
      '破',
      '危',
      '成',
      '收',
    ])
  })

  it('其余月建按同样顺序顺行十二辰', () => {
    // 四月建巳：巳日应为建，午日应为除，辰日应为闭（与正月建寅同一规则平移）
    expect(getJianChu('巳', '巳')).toBe('建')
    expect(getJianChu('巳', '午')).toBe('除')
    expect(getJianChu('巳', '辰')).toBe('闭')

    // 十一月建子：子日建、亥日闭（子为十二支首位，需正确回绕）
    expect(getJianChu('子', '子')).toBe('建')
    expect(getJianChu('子', '亥')).toBe('闭')
    expect(getJianChu('子', '丑')).toBe('除')
  })

  it('破日即月建所冲之日（卷四：月破者月建所冲之日也）', () => {
    for (const month of EARTHLY_BRANCHES) {
      const monthIndex = EARTHLY_BRANCHES.indexOf(month)
      const opposite = EARTHLY_BRANCHES[(monthIndex + 6) % 12]

      expect(getJianChu(month, opposite), `${month}月冲${opposite}`).toBe('破')
    }
  })

  it('非法地支返回 null，不猜测结果', () => {
    expect(getJianChu('寅', '子丑')).toBeNull()
    expect(getJianChu('', '子')).toBeNull()
  })
})
