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
  coverageNoticeText: string
  rules: readonly { id: string; limitations: readonly string[] }[]
}

function loadDetail(options: Record<string, string>): {
  status: string
  ruleSections: RuleSectionShape[]
} {
  const page = pageDefinitions[0] as {
    onLoad: (options: Record<string, string>) => void
  }
  let view: { status: string; ruleSections: RuleSectionShape[] } | null = null

  page.onLoad.call(
    {
      setData: (patch: { view: { status: string; ruleSections: RuleSectionShape[] } }) => {
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

  it('没有任何事项时不出卡，由空状态承担', () => {
    expect(loadDetail({ date: '2026-10-02' }).ruleSections).toEqual([])
    expect(loadDetail({ date: '2026-10-02', eventTypes: ' , ' }).ruleSections).toEqual([])
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

  it('今天没有结论时不带 eventTypes，详情页显示空状态而不是猜一个事项', () => {
    const indexPage = componentDefinitions[0] as {
      methods: { openDetail: () => void }
    }

    navigation.length = 0
    indexPage.methods.openDetail.call({
      data: { view: { dateKey: '2026-10-02', ruleEventTypeIds: '' } },
    })

    expect(navigation).toEqual(['/pages/day-detail/day-detail?date=2026-10-02&from=index'])
  })
})
