import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as findDateService from '../miniprogram/services/find-date-service'
import * as favoriteService from '../miniprogram/services/favorite-service'
import findDateTemplate from '../miniprogram/pages/find-date/find-date.wxml?raw'

const TODAY_TIMESTAMP = Date.parse('2026-10-17T12:00:00+08:00')
vi.spyOn(Date, 'now').mockReturnValue(TODAY_TIMESTAMP)

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

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(TODAY_TIMESTAMP)
})
afterEach(() => vi.restoreAllMocks())

interface FindDateView {
  status: string
  selectedEventId: string
  startDate: string
  endDate: string
  canQuery: boolean
  noticeText: string
  scopeNoteText: string
  pickerStart: string
  expiredNotice: string
  conditionText: string
  summaryText: string
  coverageNoticeText: string
  favoriteNotice: string
  progressText: string
  resultCount: number
  checkedDays: number
  results: { dateKey: string; isFavorite: boolean | null }[]
  conflictCards: { dateKey: string }[]
}

interface FindDatePage {
  data: { view: FindDateView }
  onSelectEvent: (event: { currentTarget: { dataset: { id: string } } }) => void
  applyRange: (startDate: string, endDate: string) => void
  onQuery: () => Promise<void>
  refreshDateBoundary: () => void
  refreshFavoriteMarks: () => void
  applyOutcome: (
    eventTypeId: string,
    outcome: Awaited<ReturnType<typeof findDateService.findDates>>,
  ) => void
}

function showPage(page: FindDatePage) {
  const definition = componentDefinitions[0] as {
    pageLifetimes: { show: (this: FindDatePage) => void }
  }
  definition.pageLifetimes.show.call(page)
}

function selectTravel(page: FindDatePage, startDate = '2026-11-01', endDate = '2026-11-02') {
  page.applyRange(startDate, endDate)
  page.onSelectEvent({ currentTarget: { dataset: { id: 'travel' } } })
}

function completedOutcome(): Awaited<ReturnType<typeof findDateService.findDates>> {
  return {
    ok: true,
    value: {
      status: 'complete',
      results: [
        { dateKey: '2026-11-01', weekdayText: '星期日', lunarText: '九月廿三', tagText: '' },
      ],
      conflictDates: ['2026-11-02'],
      summary: {
        checkedDays: 2,
        passedDays: 1,
        excludedDays: 0,
        conflictDays: 1,
        notMatchedDays: 0,
        unknownDays: 0,
        errorDays: 0,
      },
      rulePack: { id: 'xjbf-travel', version: '1.20.0', completeness: 'complete', coverage: '' },
    },
  }
}

describe('找日子查询状态恢复', () => {
  it('重新查询立即清空旧冲突、汇总和结果；失败后也不残留', async () => {
    const page = loadPage()
    selectTravel(page)
    page.applyOutcome('travel', completedOutcome())
    expect(page.data.view.conflictCards).toHaveLength(1)
    let finish!: (value: Awaited<ReturnType<typeof findDateService.findDates>>) => void
    vi.spyOn(findDateService, 'findDates').mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const running = page.onQuery()
    expect(page.data.view).toMatchObject({
      status: 'running',
      results: [],
      conflictCards: [],
      conditionText: '',
      summaryText: '',
      coverageNoticeText: '',
      resultCount: 0,
      checkedDays: 0,
    })
    expect(page.data.view.scopeNoteText).not.toBe('')
    finish({
      ok: false,
      code: 'RULE_PACK_MISSING',
      message: 'missing',
      retryable: false,
      context: { eventType: 'travel', startDate: '2026-11-01', endDate: '2026-11-02' },
    })
    await running
    expect(page.data.view).toMatchObject({
      status: 'blocked',
      results: [],
      conflictCards: [],
      conditionText: '',
      progressText: '',
    })
  })

  it('成功重查仅展示本轮结果', async () => {
    const page = loadPage()
    selectTravel(page)
    page.applyOutcome('travel', completedOutcome())
    const outcome = completedOutcome()
    if (!outcome.ok) throw new Error('fixture')
    outcome.value.conflictDates = []
    outcome.value.summary.conflictDays = 0
    outcome.value.summary.notMatchedDays = 1
    vi.spyOn(findDateService, 'findDates').mockResolvedValueOnce(outcome)
    await page.onQuery()
    expect(page.data.view.status).toBe('ok')
    expect(page.data.view.conflictCards).toEqual([])
    expect(page.data.view.results).toHaveLength(1)
  })

  it('跨北京时间零点重新显示时刷新下限，清空过期结果并保留原日期供修正', () => {
    const page = loadPage()
    selectTravel(page, '2026-10-17', '2026-11-02')
    page.applyOutcome('travel', completedOutcome())
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-17T16:00:00Z'))
    showPage(page)
    expect(page.data.view).toMatchObject({
      pickerStart: '2026-10-18',
      startDate: '2026-10-17',
      canQuery: false,
      results: [],
      conflictCards: [],
      conditionText: '',
    })
    expect(page.data.view.noticeText).toContain('不能早于今天')
    expect(page.data.view.expiredNotice).toContain('日期已更新')
    page.applyRange('2026-10-18', '2026-11-02')
    expect(page.data.view.canQuery).toBe(true)
    expect(page.data.view.noticeText).toBe('')
  })

  it('跨天时未来范围的查询结果仍然保留', () => {
    const page = loadPage()
    selectTravel(page)
    page.applyOutcome('travel', completedOutcome())
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-18T00:01:00+08:00'))
    showPage(page)
    expect(page.data.view.pickerStart).toBe('2026-10-18')
    expect(page.data.view.status).toBe('ok')
    expect(page.data.view.results).toHaveLength(1)
    expect(page.data.view.canQuery).toBe(true)
  })

  it('前台停留跨天后点击查询也会阻止过去日期', async () => {
    const page = loadPage()
    selectTravel(page, '2026-10-17', '2026-10-18')
    const findDates = vi.spyOn(findDateService, 'findDates')
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-18T00:01:00+08:00'))
    await page.onQuery()
    expect(findDates).not.toHaveBeenCalled()
    expect(page.data.view.canQuery).toBe(false)
  })

  it('跨天前启动的查询晚到时不能覆盖已失效的页面', async () => {
    const page = loadPage()
    selectTravel(page, '2026-10-17', '2026-10-18')
    let finish!: (value: Awaited<ReturnType<typeof findDateService.findDates>>) => void
    vi.spyOn(findDateService, 'findDates').mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const pending = page.onQuery()
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-18T00:01:00+08:00'))
    finish(completedOutcome())
    await pending
    expect(page.data.view).toMatchObject({
      status: 'idle',
      pickerStart: '2026-10-18',
      canQuery: false,
      results: [],
      conflictCards: [],
      progressText: '',
    })
  })

  it('收藏读取失败时查询仍成功，但收藏状态标为未知并提供独立提示', () => {
    const page = loadPage()
    selectTravel(page)
    vi.spyOn(favoriteService, 'listFavorites').mockReturnValueOnce({
      ok: false,
      code: 'STORAGE_READ_FAILED',
      message: '本地收藏读取失败',
      retryable: false,
      context: { storageKey: favoriteService.FAVORITES_STORAGE_KEY, reason: 'storage-api-error' },
    })
    page.applyOutcome('travel', completedOutcome())
    expect(page.data.view.status).toBe('ok')
    expect(page.data.view.results[0]?.isFavorite).toBeNull()
    expect(page.data.view.favoriteNotice).toContain('收藏状态暂不可用')
    expect(page.data.view.noticeText).toBe('')
    expect(findDateTemplate).toContain('wx:if="{{view.favoriteNotice}}"')
    expect(findDateTemplate).toContain('{{view.favoriteNotice}}')
  })

  it('返回页面刷新收藏失败不会伪装成未收藏，恢复读取后重建标记并清除提示', () => {
    const page = loadPage()
    selectTravel(page)
    page.applyOutcome('travel', completedOutcome())
    const read = vi.spyOn(favoriteService, 'listFavorites')
    read.mockReturnValueOnce({
      ok: false,
      code: 'STORAGE_READ_FAILED',
      message: '收藏格式异常',
      retryable: false,
      context: { storageKey: favoriteService.FAVORITES_STORAGE_KEY, reason: 'corrupt' },
    })
    showPage(page)
    expect(page.data.view.results[0]?.isFavorite).toBeNull()
    expect(page.data.view.favoriteNotice).toContain('收藏格式异常')
    read.mockReturnValueOnce({
      ok: true,
      value: [{ dateKey: '2026-11-01', createdAt: '', calendarDataVersion: 'test' }],
    })
    showPage(page)
    expect(page.data.view.results[0]?.isFavorite).toBe(true)
    expect(page.data.view.favoriteNotice).toBe('')
    showPage(page)
    expect(page.data.view.results[0]?.isFavorite).toBe(false)
  })
})

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
    expect(page.data.view.scopeNoteText).not.toBe('')

    const scopeNote = page.data.view.scopeNoteText

    page.applyRange('2026-12-01', '2026-10-01')

    expect(page.data.view.canQuery).toBe(false)
    expect(page.data.view.noticeText).toBe('结束日期不能早于开始日期')
    expect(page.data.view.scopeNoteText).toBe(scopeNote)

    page.applyRange('2026-11-01', '2026-11-30')

    expect(page.data.view.canQuery).toBe(true)
    expect(page.data.view.noticeText).toBe('')
    expect(page.data.view.scopeNoteText).toBe(scopeNote)
  })

  it('未选事项时改日期不会让按钮提前可用', () => {
    const page = loadPage()

    page.applyRange('2026-11-01', '2026-11-30')

    expect(page.data.view.selectedEventId).toBe('')
    expect(page.data.view.canQuery).toBe(false)
  })
})
