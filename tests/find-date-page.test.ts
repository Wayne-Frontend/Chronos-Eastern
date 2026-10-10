import { describe, expect, it, vi } from 'vitest'

/**
 * 找日子页的事项门禁：选中未开放事项后再改日期范围，按钮必须保持不可用，整理说明也不能被清掉。
 * 原因：页面模块在导入时调用全局 Component()，Node 环境下无法直接 import，
 * 故先用替身接住组件定义，再驱动方法断言视图模型。
 * 边界：只验证状态机与文案，渲染仍需在开发者工具里复验。
 */

const componentDefinitions: Record<string, unknown>[] = []

vi.stubGlobal('Component', (options: unknown) => {
  componentDefinitions.push(options as Record<string, unknown>)
})

vi.stubGlobal('wx', {
  navigateTo: () => undefined,
  switchTab: () => undefined,
  showToast: () => undefined,
  getStorageSync: () => '',
  setStorageSync: () => undefined,
})

await import('../miniprogram/pages/find-date/find-date')

interface FindDateView {
  status: string
  selectedEventId: string
  startDate: string
  endDate: string
  canQuery: boolean
  noticeText: string
  scopeNoteText: string
}

interface FindDatePage {
  data: { view: FindDateView }
  onSelectEvent: (event: { currentTarget: { dataset: { id: string } } }) => void
  applyRange: (startDate: string, endDate: string) => void
}

function loadPage(): FindDatePage {
  const definition = componentDefinitions[0] as {
    data: { view: FindDateView }
    methods: Record<string, (...args: never[]) => unknown>
  }
  const instance = { data: { view: { ...definition.data.view } } } as FindDatePage & {
    setData: (patch: Record<string, unknown>) => void
  }

  instance.setData = (patch) => {
    Object.assign(instance.data, patch)
  }

  for (const [name, method] of Object.entries(definition.methods)) {
    ;(instance as unknown as Record<string, unknown>)[name] = method.bind(instance)
  }

  return instance
}

describe('找日子页的事项门禁', () => {
  it('未开放事项选中后，改日期范围不会让按钮重新可用，整理说明也不被清空', () => {
    const page = loadPage()

    page.onSelectEvent({ currentTarget: { dataset: { id: 'moving-in' } } })

    const blockedNotice = page.data.view.noticeText

    expect(page.data.view.canQuery).toBe(false)
    expect(blockedNotice).toContain('整理中')

    page.applyRange('2026-11-01', '2026-11-30')

    expect(page.data.view.startDate).toBe('2026-11-01')
    expect(page.data.view.canQuery).toBe(false)
    expect(page.data.view.noticeText).toBe(blockedNotice)
  })

  it('可查询事项改范围后按钮可用；范围非法时给范围提示且保持不可用', () => {
    const page = loadPage()

    page.onSelectEvent({ currentTarget: { dataset: { id: 'travel' } } })

    expect(page.data.view.canQuery).toBe(true)

    page.applyRange('2026-12-01', '2026-10-01')

    expect(page.data.view.canQuery).toBe(false)
    expect(page.data.view.noticeText).toBe('结束日期不能早于开始日期')

    page.applyRange('2026-11-01', '2026-11-30')

    expect(page.data.view.canQuery).toBe(true)
    expect(page.data.view.noticeText).toBe('')
  })

  it('未选事项时改日期不会让按钮提前可用', () => {
    const page = loadPage()

    page.applyRange('2026-11-01', '2026-11-30')

    expect(page.data.view.selectedEventId).toBe('')
    expect(page.data.view.canQuery).toBe(false)
  })
})
