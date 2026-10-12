import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_SCHEMA_VERSION,
} from '../miniprogram/services/favorite-service'

interface FavoriteCard {
  dateKey: string
}

interface FavoritesPage {
  data: {
    view: {
      status: string
      upcoming: FavoriteCard[]
      past: FavoriteCard[]
      showPast: boolean
      noticeText: string
    }
  }
  refresh: () => void
  onShow: () => void
  togglePast: () => void
  openDetail: (event: { currentTarget: { dataset: { dateKey: string } } }) => void
}

const navigateTo = vi.fn()
let storageValue = ''
let storageFails = false
const definitions: Record<string, unknown>[] = []

vi.useFakeTimers()
vi.setSystemTime(new Date('2026-10-12T04:00:00.000Z'))
vi.stubGlobal('wx', {
  getStorageSync: (key: string) => {
    expect(key).toBe(FAVORITES_STORAGE_KEY)
    if (storageFails) {
      throw new Error('storage unavailable')
    }
    return storageValue
  },
  navigateTo,
})
vi.stubGlobal('Component', (definition: unknown) => {
  definitions.push(definition as Record<string, unknown>)
})

await import('../miniprogram/pages/favorites/favorites')

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  storageValue = ''
  storageFails = false
  navigateTo.mockClear()
})

function loadPage(): FavoritesPage {
  const definition = definitions[0] as {
    data: FavoritesPage['data']
    methods: Record<string, (...args: never[]) => unknown>
    pageLifetimes: { show: (this: FavoritesPage) => void }
  }
  const page = {
    data: { view: { ...definition.data.view } },
  } as FavoritesPage & { setData: (patch: Record<string, unknown>) => void }

  page.setData = (patch) => {
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'view.showPast') {
        page.data.view.showPast = value as boolean
      } else if (key === 'view') {
        page.data.view = value as FavoritesPage['data']['view']
      }
    }
  }

  for (const [name, method] of Object.entries(definition.methods)) {
    ;(page as unknown as Record<string, unknown>)[name] = method.bind(page)
  }

  page.onShow = definition.pageLifetimes.show.bind(page)
  return page
}

function setFavorites(dateKeys: string[]): void {
  storageValue = JSON.stringify({
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    items: dateKeys.map((dateKey) => ({
      dateKey,
      createdAt: '2026-10-12T12:00:00+08:00',
      calendarDataVersion: '1.7.7',
    })),
  })
}

describe('收藏列表', () => {
  it('未来日期按日期排序，过去日期保留但默认折叠，并能进入详情', () => {
    setFavorites(['2026-10-20', '2026-10-01', '2026-10-12', '2026-10-15'])
    const page = loadPage()

    page.onShow()

    expect(page.data.view.upcoming.map((item) => item.dateKey)).toEqual([
      '2026-10-12',
      '2026-10-15',
      '2026-10-20',
    ])
    expect(page.data.view.past.map((item) => item.dateKey)).toEqual(['2026-10-01'])
    expect(page.data.view.showPast).toBe(false)

    page.togglePast()
    expect(page.data.view.showPast).toBe(true)

    page.openDetail({ currentTarget: { dataset: { dateKey: '2026-10-15' } } })
    expect(navigateTo).toHaveBeenCalledWith({
      url: '/pages/day-detail/day-detail?date=2026-10-15&from=favorites',
    })
  })

  it('返回列表时重新读取收藏，不显示已经取消的日期', () => {
    setFavorites(['2026-10-15'])
    const page = loadPage()
    page.onShow()
    expect(page.data.view.upcoming).toHaveLength(1)

    setFavorites([])
    page.onShow()
    expect(page.data.view.upcoming).toHaveLength(0)
  })

  it('读取失败时展示错误，不会改写用户收藏', () => {
    storageFails = true
    const page = loadPage()

    page.onShow()

    expect(page.data.view.status).toBe('error')
    expect(page.data.view.noticeText).toContain('读取失败')
    expect(page.data.view.upcoming).toHaveLength(0)
  })
})
