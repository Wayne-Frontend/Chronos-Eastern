import dayDetailWxml from '../miniprogram/pages/day-detail/day-detail.wxml?raw'
import findDateWxml from '../miniprogram/pages/find-date/find-date.wxml?raw'
import { describe, expect, it, vi } from 'vitest'

import {
  canQueryEventType,
  EVENT_TYPES,
  findEventType,
  getStatusBadgeText,
  type EventTypeEntry,
  type EventTypeStatus,
} from '../miniprogram/data/event-types'
import {
  describeCoverage,
  findVerifiedRulePack,
  PARTIAL_COVERAGE_NOTICE,
  RULE_PACKS,
} from '../miniprogram/data/rules/manifest'

function entryWithStatus(status: EventTypeStatus): EventTypeEntry {
  return {
    id: 'test-entry',
    displayName: '测试事项',
    classicalTerms: [],
    status,
    rulePackId: null,
    maxRangeDays: 90,
    statusNote: '',
    disclaimer: '',
  }
}

describe('canQueryEventType', () => {
  it('supported 与 limited 允许查询', () => {
    for (const status of ['supported', 'limited'] as const) {
      expect(canQueryEventType(entryWithStatus(status)), status).toBe(true)
    }
  })

  it('reviewing 与 unsupported 不允许查询', () => {
    for (const status of ['reviewing', 'unsupported'] as const) {
      expect(canQueryEventType(entryWithStatus(status)), status).toBe(false)
    }
  })

  it('未知事项（null）不允许查询', () => {
    expect(canQueryEventType(null)).toBe(false)
  })

  it('可查询的四个事项逐个点名，其余（入宅、安葬）全部置灰', () => {
    const queryable = EVENT_TYPES.filter((entry) => canQueryEventType(entry)).map(
      (entry) => entry.id,
    )
    const blocked = EVENT_TYPES.filter((entry) => !canQueryEventType(entry)).map(
      (entry) => entry.id,
    )

    expect(queryable).toEqual(['travel', 'relocation', 'opening', 'marriage'])
    expect(blocked).toEqual(['moving-in', 'funeral'])
  })
})

describe('getStatusBadgeText', () => {
  it('每个状态都有短标记，仅覆盖完整的 supported 不显示', () => {
    const statuses: EventTypeStatus[] = ['supported', 'limited', 'reviewing', 'unsupported']

    expect(statuses.map(getStatusBadgeText)).toEqual(['', '有限收录', '整理中', '不提供'])
  })
})

describe('事项状态与规则包完整性的一致性', () => {
  it('limited 事项必须挂 partial 包，且必须有覆盖范围说明', () => {
    for (const entry of EVENT_TYPES) {
      if (entry.status !== 'limited') {
        continue
      }

      const pack = RULE_PACKS.find((item) => item.id === entry.rulePackId)

      expect(pack, `${entry.id} 缺少规则包`).toBeDefined()
      expect(pack?.completeness, entry.id).toBe('partial')
    }
  })

  it('状态与规则包 completeness 一一对应，不得漂移', () => {
    for (const entry of EVENT_TYPES) {
      const pack =
        entry.rulePackId === null
          ? null
          : (RULE_PACKS.find((item) => item.id === entry.rulePackId) ?? null)

      if (pack === null) {
        expect(entry.status, `${entry.id} 无规则包却标为可查询`).not.toBe('supported')
        expect(entry.status, `${entry.id} 无规则包却标为可查询`).not.toBe('limited')
        continue
      }

      expect(entry.status === 'limited', entry.id).toBe(pack.completeness === 'partial')
    }
  })

  it('可查询事项必须给出状态说明，供入口展示覆盖范围', () => {
    for (const entry of EVENT_TYPES) {
      if (entry.status === 'limited') {
        expect(entry.statusNote.length, entry.id).toBeGreaterThan(0)
      }
    }
  })

  it('出行降为 limited 并保留既有规则包绑定', () => {
    expect(findEventType('travel')).toMatchObject({
      status: 'limited',
      rulePackId: 'xjbf-travel',
      maxRangeDays: 90,
    })
  })

  it('出行有限支持说明与当前 32/32 覆盖一致，不再声称仍有条款未收录', () => {
    const travel = findEventType('travel')

    expect(travel?.statusNote).toContain('出行条目已全部录入')
    expect(travel?.statusNote).toContain('天德')
    expect(travel?.statusNote).not.toContain('其余条款尚在校勘')
    expect(PARTIAL_COVERAGE_NOTICE).not.toContain('未收录条款')
  })
})

describe('覆盖范围披露', () => {
  it('partial 包一律给出统一披露语与收录范围，complete 包两者都为空', () => {
    expect(describeCoverage('partial', '至少收了这些')).toEqual({
      noticeText: PARTIAL_COVERAGE_NOTICE,
      coverageText: '至少收了这些',
    })
    // complete 时不得留下一句「仍有未能判定」的空话。
    expect(describeCoverage('complete', '已收全')).toEqual({ noticeText: '', coverageText: '' })
  })

  it('当前每个可查询事项都是 partial，因此都必须拿到披露语', () => {
    for (const entry of EVENT_TYPES) {
      if (!canQueryEventType(entry)) {
        continue
      }

      const pack = findVerifiedRulePack(entry.id)

      expect(pack, entry.id).not.toBeNull()
      expect(
        describeCoverage(pack?.completeness ?? 'complete', pack?.coverage ?? '').noticeText,
        entry.id,
      ).toBe(PARTIAL_COVERAGE_NOTICE)
    }
  })

  /*
   * 「覆盖范围必须出现在哪几处」是合规红线里最容易悄悄回退的一条，而三处都在页面层：
   * chip 标记来自页面自己的视图模型，另两处只体现在 wxml 的绑定上。
   * 页面模块会调用全局 Component()，故先用替身接住它的定义，再取回视图模型来断言；
   * wxml 没有可执行形式，只能用 ?raw 读源码核对绑定名——只断言绑定的名字，不校验排版。
   */
  it('事项入口的 chip 标记与选中提示都带上覆盖范围', async () => {
    const definitions: {
      data?: {
        view?: { eventOptions?: readonly { id: string; disabled: boolean; badgeText: string }[] }
      }
    }[] = []

    vi.stubGlobal('Component', (options: unknown) => {
      definitions.push(options as (typeof definitions)[number])
    })

    await import('../miniprogram/pages/find-date/find-date')

    const options = definitions[0]?.data?.view?.eventOptions ?? []
    const badgeOf = (id: string) => options.find((option) => option.id === id)?.badgeText

    // 可查询的四个事项都必须是「有限收录」，未开放的仍只说能否使用。
    expect(badgeOf('travel')).toBe('有限收录')
    expect(badgeOf('relocation')).toBe('有限收录')
    expect(badgeOf('opening')).toBe('有限收录')
    expect(badgeOf('marriage')).toBe('有限收录')
    expect(badgeOf('moving-in')).toBe('敬请期待')
    expect(badgeOf('funeral')).toBe('暂不支持')

    expect(findDateWxml).toContain('view.scopeNoteText')
  })

  it('结果列表上方与详情页规则区都绑定了披露', () => {
    // ② 结果列表上方。
    expect(findDateWxml).toContain('view.coverageNoticeText')
    // ③ 详情页规则区：披露语与收录范围都要在，且与逐条依据同屏。
    expect(dayDetailWxml).toContain('view.ruleSection.coverageNoticeText')
    expect(dayDetailWxml).toContain('view.ruleSection.coverageText')
  })
})
