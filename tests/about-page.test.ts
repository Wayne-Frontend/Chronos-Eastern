import { describe, expect, it, vi } from 'vitest'

/**
 * 关于页资料采用同组单开折叠，避免长篇资料同时展开后形成密集卡片墙。
 * 边界：这里只验证折叠状态；排版、点击反馈仍需在开发者工具里复验。
 */

const componentDefinitions: Record<string, unknown>[] = []

vi.stubGlobal('Component', (options: unknown) => {
  componentDefinitions.push(options as Record<string, unknown>)
})

await import('../miniprogram/pages/about/about')

interface SourceView {
  title: string
  expanded: boolean
}

interface AboutPage {
  data: {
    calendarSources: SourceView[]
    cultureSources: SourceView[]
  }
  toggleSource: (event: { currentTarget: { dataset: { group: string; index: number } } }) => void
}

function loadPage(): AboutPage {
  const definition = componentDefinitions[0] as {
    data: AboutPage['data']
    methods: Record<string, (...args: never[]) => unknown>
  }
  const instance = {
    data: {
      calendarSources: definition.data.calendarSources.map((item) => ({ ...item })),
      cultureSources: definition.data.cultureSources.map((item) => ({ ...item })),
    },
  } as AboutPage & { setData: (patch: Partial<AboutPage['data']>) => void }

  instance.setData = (patch) => {
    Object.assign(instance.data, patch)
  }

  for (const [name, method] of Object.entries(definition.methods)) {
    ;(instance as unknown as Record<string, unknown>)[name] = method.bind(instance)
  }

  return instance
}

describe('关于页资料折叠', () => {
  it('历法资料首项默认展开，同组切换时只保留当前项', () => {
    const page = loadPage()

    expect(page.data.calendarSources[0]?.expanded).toBe(true)
    expect(page.data.calendarSources[1]?.expanded).toBe(false)

    page.toggleSource({
      currentTarget: { dataset: { group: 'calendarSources', index: 1 } },
    })

    expect(page.data.calendarSources[0]?.expanded).toBe(false)
    expect(page.data.calendarSources[1]?.expanded).toBe(true)
  })

  it('再次点击已展开项会收起，且不影响另一组资料', () => {
    const page = loadPage()

    page.toggleSource({
      currentTarget: { dataset: { group: 'calendarSources', index: 0 } },
    })

    expect(page.data.calendarSources[0]?.expanded).toBe(false)
    expect(page.data.cultureSources.every((item) => !item.expanded)).toBe(true)
  })
})
