import { describe, expect, it, vi } from 'vitest'

/**
 * 详情页与首页在「一次讲几个事项」上必须对齐。
 * 原因：这两个页面模块会在导入时调用全局 Page()／Component()，Node 环境下无法直接 import，
 * 故先用替身接住页面定义，再取回视图模型与跳转行为来断言。
 * 边界：这里只验证参数传递与视图模型，wxml 的渲染仍需在开发者工具里复验。
 */

const pageDefinitions: Record<string, unknown>[] = []
const componentDefinitions: Record<string, unknown>[] = []

vi.stubGlobal('Page', (options: unknown) => {
  pageDefinitions.push(options as Record<string, unknown>)
})
vi.stubGlobal('Component', (options: unknown) => {
  componentDefinitions.push(options as Record<string, unknown>)
})

const navigation: string[] = []

vi.stubGlobal('wx', {
  navigateTo: (options: { url: string }) => {
    navigation.push(options.url)
  },
  redirectTo: () => undefined,
  showToast: () => undefined,
  setStorage: () => undefined,
  getStorageSync: () => '',
  setStorageSync: () => undefined,
})

await import('../miniprogram/pages/day-detail/day-detail')
await import('../miniprogram/pages/index/index')

interface RuleSectionShape {
  eventTypeId: string
  eventName: string
  detailsExpanded: boolean
  coverageNoticeText: string
  rulePackText: string
  rules: readonly { id: string; statusText: string; limitations: readonly string[] }[]
}

function loadDetail(options: Record<string, string>): {
  status: string
  isOverview: boolean
  dateKey: string
  ruleSections: RuleSectionShape[]
} {
  const page = pageDefinitions[0] as {
    onLoad: (options: Record<string, string>) => void
  }
  let view: {
    status: string
    isOverview: boolean
    dateKey: string
    ruleSections: RuleSectionShape[]
  } | null = null

  page.onLoad.call(
    {
      setData: (patch: {
        view: {
          status: string
          isOverview: boolean
          dateKey: string
          ruleSections: RuleSectionShape[]
        }
      }) => {
        view = patch.view
      },
    },
    options,
  )

  if (!view) {
    throw new Error('onLoad 未产生视图模型')
  }

  return view
}

describe('日期详情页的事项上下文', () => {
  it('eventTypes 里几个事项就出几张卡，且每个事项都带上覆盖范围', () => {
    const view = loadDetail({ date: '2026-10-02', eventTypes: 'travel,opening,relocation' })

    expect(view.status).toBe('ok')
    expect(view.ruleSections.map((section) => section.eventTypeId)).toEqual([
      'travel',
      'opening',
      'relocation',
    ])
    expect(view.ruleSections.map((section) => section.eventName)).toEqual(['出行', '开业', '搬家'])

    for (const section of view.ruleSections) {
      // 详情页规则区是三处披露里的第三处，多事项时每个事项各带一份。
      expect(section.coverageNoticeText, section.eventTypeId).not.toBe('')
    }
  })

  it('重复事项只出一张卡，顺序按参数给定', () => {
    const view = loadDetail({ date: '2026-10-02', eventTypes: 'opening,opening,travel' })

    expect(view.ruleSections.map((section) => section.eventTypeId)).toEqual(['opening', 'travel'])
  })

  it('旧的单数 eventType 参数仍然可用', () => {
    const view = loadDetail({ date: '2026-10-02', eventType: 'travel' })

    expect(view.ruleSections.map((section) => section.eventTypeId)).toEqual(['travel'])
  })

  it('未开放或不认识的事项被跳过，不把整页变成错误页', () => {
    const view = loadDetail({ date: '2026-10-02', eventTypes: 'travel,moving-in,not-a-matter' })

    expect(view.status).toBe('ok')
    expect(view.ruleSections.map((section) => section.eventTypeId)).toEqual(['travel'])
  })

  it('显式指定不可查询的事项，不误认为全部事项均未开放', () => {
    const view = loadDetail({ date: '2026-10-02', eventType: 'moving-in' })

    expect(view.status).toBe('ok')
    expect(view.isOverview).toBe(false)
    expect(view.ruleSections).toEqual([])
  })

  it('只有日期时展示全部已开放事项，不展示整理中或不提供的事项', () => {
    const entries: Record<string, string>[] = [
      { date: '2026-10-02', from: 'calendar' },
      { date: '2026-10-02', from: 'favorites' },
      { date: '2026-10-02' },
    ]

    for (const options of entries) {
      const view = loadDetail(options)
      expect(view.isOverview).toBe(true)
      expect(view.ruleSections.map((section) => section.eventTypeId)).toEqual([
        'travel',
        'relocation',
        'opening',
        'marriage',
        'engagement',
        'proposal',
      ])
    }
  })

  it('六项概览默认收起逐条依据，单事项详情默认展开', () => {
    const overview = loadDetail({ date: '2026-10-02', from: 'calendar' })
    const focused = loadDetail({ date: '2026-10-02', eventType: 'travel', from: 'find-date' })

    expect(overview.ruleSections.every((section) => !section.detailsExpanded)).toBe(true)
    expect(focused.ruleSections).toHaveLength(1)
    expect(focused.ruleSections[0]?.detailsExpanded).toBe(true)
  })

  it('点击某项概览只展开该事项的依据与限制', () => {
    const view = loadDetail({ date: '2026-10-02', from: 'calendar' })
    const page = pageDefinitions[0] as {
      toggleRuleDetails: (this: unknown, event: unknown) => void
    }

    page.toggleRuleDetails.call(
      {
        data: { view },
        setData: (patch: Record<string, boolean>) => {
          expect(patch).toEqual({ 'view.ruleSections[1].detailsExpanded': true })
          view.ruleSections[1]!.detailsExpanded = true
        },
      },
      { currentTarget: { dataset: { index: 1 } } },
    )

    expect(view.ruleSections[0]?.detailsExpanded).toBe(false)
    expect(view.ruleSections[1]?.detailsExpanded).toBe(true)
    expect(view.ruleSections[2]?.detailsExpanded).toBe(false)
  })

  it('每条依据都带上适用边界，供详情页与出处同屏展示', () => {
    // 规则包 1.17.1 起 limitations 就是面向用户的措辞，说明它本该上屏；
    // 页面若把它丢掉，用户会以为「本版本收录的这一条」就是完整结论。
    const view = loadDetail({ date: '2026-10-02', eventTypes: 'travel' })
    const rules = view.ruleSections[0]?.rules ?? []

    expect(rules.length).toBeGreaterThan(0)

    for (const rule of rules) {
      expect(rule.limitations.length, `${rule.id} 缺少适用边界`).toBeGreaterThan(0)
    }
  })

  it('规则包版本和逐条校勘状态都进入视图模型，页面能够直接展示追溯信息', () => {
    const section = loadDetail({ date: '2026-10-02', eventTypes: 'travel' }).ruleSections[0]

    expect(section?.rulePackText).toMatch(/@/)
    expect(section?.rules.length).toBeGreaterThan(0)

    for (const rule of section?.rules ?? []) {
      expect(rule.id).not.toBe('')
      expect(rule.statusText).toBe('已校勘')
    }
  })
})

describe('日期详情分享', () => {
  it('只分享公开日期，不携带事项、收藏或页面来源', () => {
    const page = pageDefinitions[0] as {
      onShareAppMessage: (this: { data: { view: ReturnType<typeof loadDetail> } }) => {
        title: string
        path: string
      }
    }
    const view = loadDetail({ date: '2026-10-15', eventType: 'travel', from: 'favorites' })

    expect(page.onShareAppMessage.call({ data: { view } })).toEqual({
      title: '2026年10月15日 · 岁月良辰',
      path: '/pages/day-detail/day-detail?date=2026-10-15',
    })
  })

  it('无效日期只分享首页，不传播错误参数', () => {
    const page = pageDefinitions[0] as {
      onShareAppMessage: (this: { data: { view: ReturnType<typeof loadDetail> } }) => {
        title: string
        path: string
      }
    }
    const view = loadDetail({ date: 'invalid-date' })

    expect(page.onShareAppMessage.call({ data: { view } }).path).toBe('/pages/index/index')
  })
})

describe('首页跳详情时带上的事项', () => {
  it('把摘要读到的全部事项一次交给详情页，不是一个主事项', () => {
    const indexPage = componentDefinitions[0] as {
      methods: { openDetail: () => void }
    }

    navigation.length = 0
    indexPage.methods.openDetail.call({
      data: { view: { dateKey: '2026-10-02', ruleEventTypeIds: 'travel,opening' } },
    })

    expect(navigation).toEqual([
      '/pages/day-detail/day-detail?date=2026-10-02&eventTypes=travel,opening&from=index',
    ])
  })

  it('首页今天没有结论时不带 eventTypes，详情页仍展示全事项概览', () => {
    const indexPage = componentDefinitions[0] as {
      methods: { openDetail: () => void }
    }

    navigation.length = 0
    indexPage.methods.openDetail.call({
      data: { view: { dateKey: '2026-10-02', ruleEventTypeIds: '' } },
    })

    expect(navigation).toEqual(['/pages/day-detail/day-detail?date=2026-10-02&from=index'])
    expect(loadDetail({ date: '2026-10-02', from: 'index' }).ruleSections).toHaveLength(6)
  })
})
