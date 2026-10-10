import { describe, expect, it } from 'vitest'

import {
  canQueryEventType,
  EVENT_TYPES,
  findEventType,
  getStatusBadgeText,
  type EventTypeEntry,
  type EventTypeStatus,
} from '../miniprogram/data/event-types'
import { PARTIAL_COVERAGE_NOTICE, RULE_PACKS } from '../miniprogram/data/rules/manifest'

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
