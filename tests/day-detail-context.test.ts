import { describe, expect, it, vi } from 'vitest'
import detailTemplate from '../miniprogram/pages/day-detail/day-detail.wxml?raw'

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
let pageStackDepth = 2
vi.stubGlobal('getCurrentPages', () => Array.from({ length: pageStackDepth }, () => ({})))

vi.stubGlobal('wx', {
  navigateTo: (options: { url: string }) => {
    navigation.push(options.url)
  },
  redirectTo: () => undefined,
  showToast: () => undefined,
  setClipboardData: () => undefined,
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
  coverageText: string
  rulePackText: string
  adjudications: readonly {
    id: string
    summary: string
    locator: string
    sourceText: string
    sourceLinks: readonly { id: string; title: string }[]
  }[]
  rules: readonly {
    id: string
    statusText: string
    limitations: readonly string[]
    sourceLinks: readonly { id: string; title: string }[]
  }[]
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
  it('规则与裁决出处提供可复制的已登记链接，复制成败均有反馈', () => {
    const section = loadDetail({ date: '2026-10-27' }).ruleSections[0]!
    expect(section.adjudications[0]?.sourceLinks.length).toBeGreaterThan(0)
    expect(section.rules[0]?.sourceLinks.length).toBeGreaterThan(0)
    expect(detailTemplate.match(/bindtap="copySourceLink"/g)).toHaveLength(2)

    const copy = pageDefinitions[0]!.copySourceLink as (event: {
      currentTarget: { dataset: { sourceId: string } }
    }) => void
    const clipboard = vi.spyOn(wx, 'setClipboardData')
    const toast = vi.spyOn(wx, 'showToast')
    try {
      copy({ currentTarget: { dataset: { sourceId: section.rules[0]!.sourceLinks[0]!.id } } })
      expect(clipboard).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.stringMatching(/^https:\/\//) }),
      )
      const options = clipboard.mock.calls[0]![0]
      ;(options.success as (() => void) | undefined)?.()
      expect(toast).toHaveBeenCalledWith({ title: '来源链接已复制', icon: 'none' })
      ;(options.fail as (() => void) | undefined)?.()
      expect(toast).toHaveBeenCalledWith({ title: '复制失败，请重试', icon: 'none' })
    } finally {
      clipboard.mockRestore()
      toast.mockRestore()
    }
  })

  it('判定原因与出处绑定在依据折叠区之前，概览入口也可直接阅读', () => {
    const visibleTemplate = detailTemplate.split('<block wx:if="{{section.detailsExpanded}}">')[0]!
    expect(visibleTemplate).toContain('wx:for="{{section.adjudications}}"')
    expect(visibleTemplate).toContain('{{item.summary}}')
    expect(visibleTemplate).toContain('{{item.locator}}')
    expect(visibleTemplate).toContain('{{item.sourceText}}')
  })

  it('整日排除的原因和卷十出处进入未展开的概览卡', () => {
    const section = loadDetail({ date: '2026-10-27' }).ruleSections[0]!
    expect(section.detailsExpanded).toBe(false)
    expect(section.adjudications[0]?.summary).toContain('戌月甲戌日')
    expect(section.adjudications[0]?.summary).toContain('仍按原书列为忌')
    expect(section.adjudications[0]?.locator).toContain('172–173 帧')
    expect(section.adjudications[0]?.sourceText).toContain('卷十')
  })

  it('聚焦事项的转致解释保留两处条款定位', () => {
    const section = loadDetail({ date: '2026-08-03', eventType: 'engagement' }).ruleSections[0]!
    const decision = section.adjudications.find((item) => item.summary.includes('满日 → 灾煞'))!
    expect(decision.locator).toContain('149–150 帧')
    expect(decision.locator).toContain('158 帧')
    expect(decision.sourceText).toContain('卷十')
  })

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
      // 详情页规则区是三处披露里的第三处；2026-10-12 六个包改判 complete 后披露语为空，
      // 但各条 limitations（适用边界）仍与出处同屏，由下面的用例守住。
      expect(section.coverageNoticeText, section.eventTypeId).toBe('')
      expect(section.coverageText, section.eventTypeId).toBe('')
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
  function loadNavigation(options: Record<string, string>, depth: number) {
    const page = pageDefinitions[0] as { onLoad: (options: Record<string, string>) => void }
    const setData = vi.fn()
    pageStackDepth = depth
    try {
      page.onLoad.call({ setData }, options)
    } finally {
      pageStackDepth = 2
    }
    return setData.mock.calls[0]![0] as {
      canGoBack: boolean
      view: { status: string; dateKey: string }
    }
  }

  it('分享冷启动直达详情时展示首页入口，并保留所分享的日期', () => {
    const data = loadNavigation({ date: '2026-10-15' }, 1)
    expect(data.canGoBack).toBe(false)
    expect(data.view).toMatchObject({ status: 'ok', dateKey: '2026-10-15' })
    expect(detailTemplate).toContain('back="{{canGoBack}}"')
    expect(detailTemplate).toContain('home-button="{{!canGoBack}}"')
  })

  it('普通进入或热启动存在上一页时保留返回入口，不依赖来源参数', () => {
    expect(loadNavigation({ date: '2026-10-15', from: 'calendar' }, 2).canGoBack).toBe(true)
    expect(loadNavigation({ date: '2026-10-15' }, 3).canGoBack).toBe(true)
    expect(loadNavigation({ date: '2026-10-15', from: 'calendar' }, 1).canGoBack).toBe(false)
  })

  it.each(['invalid-date', '2101-01-01'])('分享日期为 %s 时错误页同样提供首页出口', (date) => {
    const data = loadNavigation({ date }, 1)
    expect(data.canGoBack).toBe(false)
    expect(data.view.status).not.toBe('ok')
  })

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
