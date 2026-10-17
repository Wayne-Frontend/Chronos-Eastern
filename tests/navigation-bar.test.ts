import { beforeEach, describe, expect, it, vi } from 'vitest'
import template from '../miniprogram/components/navigation-bar/navigation-bar.wxml?raw'

const definitions: Record<string, unknown>[] = []
let stackDepth = 2
const navigateBack = vi.fn<(options: { delta: number; fail: () => void }) => void>()
const switchTab = vi.fn<(options: { url: string }) => void>()

vi.stubGlobal('Component', (definition: Record<string, unknown>) => definitions.push(definition))
vi.stubGlobal('getCurrentPages', () => Array.from({ length: stackDepth }, () => ({})))
vi.stubGlobal('wx', { navigateBack, switchTab })

// @ts-expect-error TS2306：官方模板是无导出的脚本，此处仅加载以捕获 Component 定义。
await import('../miniprogram/components/navigation-bar/navigation-bar')

interface NavigationInstance {
  data: { delta: number }
  back: () => void
  home: () => void
  triggerEvent: ReturnType<typeof vi.fn>
}

function loadNavigation(delta = 1): NavigationInstance {
  const definition = definitions[0] as {
    methods: Record<string, (this: NavigationInstance) => void>
  }
  const instance = { data: { delta }, triggerEvent: vi.fn() } as NavigationInstance
  instance.back = definition.methods.back!.bind(instance)
  instance.home = definition.methods.home!.bind(instance)
  return instance
}

beforeEach(() => {
  stackDepth = 2
  navigateBack.mockReset()
  switchTab.mockReset()
})

describe('自定义导航栏返回与首页出口', () => {
  it('首页按钮切换到首页 Tab，模板绑定现有 home 方法', () => {
    const nav = loadNavigation()
    nav.home()
    expect(switchTab).toHaveBeenCalledWith({ url: '/pages/index/index' })
    expect(navigateBack).not.toHaveBeenCalled()
    expect(template).toContain('bindtap="home"')
    expect(template).toContain('wx:if="{{homeButton}}"')
    expect(template).toContain(
      'class="weui-navigation-bar__button weui-navigation-bar__btn_home">首页</text>',
    )
  })

  it('有上一页时正常返回，不额外跳首页', () => {
    const nav = loadNavigation()
    nav.back()
    expect(navigateBack).toHaveBeenCalledWith({ delta: 1, fail: expect.any(Function) })
    expect(switchTab).not.toHaveBeenCalled()
    expect(nav.triggerEvent).toHaveBeenCalledWith('back', { delta: 1 }, {})
  })

  it('页面栈已无可返回页面时直接回首页', () => {
    // 模拟按钮显示后页面栈发生变化：点击时仍需复查。
    const nav = loadNavigation()
    stackDepth = 1
    nav.back()
    expect(navigateBack).not.toHaveBeenCalled()
    expect(switchTab).toHaveBeenCalledWith({ url: '/pages/index/index' })
  })

  it('返回接口失败时回首页兜底', () => {
    const nav = loadNavigation()
    nav.back()
    navigateBack.mock.calls[0]![0].fail()
    expect(switchTab).toHaveBeenCalledTimes(1)
    expect(switchTab).toHaveBeenCalledWith({ url: '/pages/index/index' })
  })

  it('按配置的 delta 检查栈深度，不请求超出页面栈的返回', () => {
    const nav = loadNavigation(2)
    nav.back()
    expect(navigateBack).not.toHaveBeenCalled()
    expect(switchTab).toHaveBeenCalledWith({ url: '/pages/index/index' })
    stackDepth = 3
    switchTab.mockClear()
    nav.back()
    expect(navigateBack).toHaveBeenCalledWith({ delta: 2, fail: expect.any(Function) })
    expect(switchTab).not.toHaveBeenCalled()
  })

  it('delta 为零时保留只触发自定义事件的行为', () => {
    const nav = loadNavigation(0)
    nav.back()
    expect(navigateBack).not.toHaveBeenCalled()
    expect(switchTab).not.toHaveBeenCalled()
    expect(nav.triggerEvent).toHaveBeenCalledWith('back', { delta: 0 }, {})
  })
})
