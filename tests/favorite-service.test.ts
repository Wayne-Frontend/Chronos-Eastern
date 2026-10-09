import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  addFavorite,
  FAVORITES_LIMIT,
  FAVORITES_SCHEMA_VERSION,
  FAVORITES_STORAGE_KEY,
  isFavorite,
  listFavorites,
  removeFavorite,
} from '../miniprogram/services/favorite-service'
import { addDaysToDateKey } from '../miniprogram/utils/date-key'

const CALENDAR_VERSION = 'lunar-javascript@1.7.7'

interface FakeStorage {
  store: Map<string, unknown>
  getStorageSync(key: string): unknown
  setStorageSync(key: string, value: unknown): void
  failNextWrite(): void
}

function useFakeStorage(initial?: string): FakeStorage {
  const store = new Map<string, unknown>()

  if (initial !== undefined) {
    store.set(FAVORITES_STORAGE_KEY, initial)
  }

  let failing = false

  const storage: FakeStorage = {
    store,
    getStorageSync: (key: string) => store.get(key) ?? '',
    setStorageSync: (key: string, value: unknown) => {
      if (failing) {
        throw new Error('quota exceeded')
      }

      store.set(key, value)
    },
    failNextWrite: () => {
      failing = true
    },
  }

  vi.stubGlobal('wx', storage)

  return storage
}

function seedItems(count: number): string {
  const start = '2026-01-01'
  const items = []

  for (let index = 0; index < count; index++) {
    const dateKey = index === 0 ? start : addDaysToDateKey(start, index)

    items.push({
      dateKey,
      createdAt: '2026-01-01T00:00:00+08:00',
      calendarDataVersion: CALENDAR_VERSION,
    })
  }

  return JSON.stringify({ schemaVersion: FAVORITES_SCHEMA_VERSION, items })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('favorite-service', () => {
  it('空存储时返回空列表，不视为异常', () => {
    useFakeStorage()

    expect(listFavorites()).toEqual({ ok: true, value: [] })
    expect(isFavorite('2026-10-09')).toEqual({ ok: true, value: false })
  })

  it('新增、判重与取消收藏', () => {
    const storage = useFakeStorage()

    const added = addFavorite('2026-10-09', CALENDAR_VERSION)

    expect(added.ok).toBe(true)
    expect(isFavorite('2026-10-09')).toEqual({ ok: true, value: true })
    expect(storage.store.get(FAVORITES_STORAGE_KEY)).toContain('2026-10-09')

    const again = addFavorite('2026-10-09', CALENDAR_VERSION)

    expect(again.ok).toBe(true)
    expect(again.ok && again.value).toHaveLength(1)

    const removed = removeFavorite('2026-10-09')

    expect(removed).toEqual({ ok: true, value: [] })
    expect(removeFavorite('2026-10-09')).toEqual({ ok: true, value: [] })
  })

  it('记录 UTC+8 的创建时间与历法数据版本', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-09T05:30:00Z'))
    useFakeStorage()

    const result = addFavorite('2026-10-09', CALENDAR_VERSION)

    expect(result.ok && result.value[0]).toEqual({
      dateKey: '2026-10-09',
      createdAt: '2026-10-09T13:30:00+08:00',
      calendarDataVersion: CALENDAR_VERSION,
    })
  })

  it('拒绝非法日期', () => {
    useFakeStorage()

    expect(addFavorite('2026-02-30', CALENDAR_VERSION)).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
  })

  it('达到上限时拒绝新增且不删除旧收藏', () => {
    const storage = useFakeStorage(seedItems(FAVORITES_LIMIT))
    const result = addFavorite('2026-12-31', CALENDAR_VERSION)

    const listed = listFavorites()

    expect(result).toMatchObject({ ok: false, code: 'FAVORITE_LIMIT_REACHED' })
    expect(listed.ok && listed.value).toHaveLength(FAVORITES_LIMIT)
    expect(storage.store.get(FAVORITES_STORAGE_KEY)).toBe(seedItems(FAVORITES_LIMIT))
  })

  it('写入失败返回统一错误，原数据保持不变', () => {
    const storage = useFakeStorage(seedItems(2))

    storage.failNextWrite()

    const result = addFavorite('2026-12-31', CALENDAR_VERSION)

    expect(result).toMatchObject({ ok: false, code: 'STORAGE_WRITE_FAILED', retryable: true })
    expect(storage.store.get(FAVORITES_STORAGE_KEY)).toBe(seedItems(2))
  })

  it.each([
    ['无法解析的 JSON', 'not-json', 'corrupt'],
    ['schema 版本不识别', '{"schemaVersion":99,"items":[]}', 'unsupported-schema'],
    ['items 不是数组', '{"schemaVersion":1,"items":{}}', 'corrupt'],
    [
      '条目日期非法',
      '{"schemaVersion":1,"items":[{"dateKey":"2026-02-30","createdAt":"x","calendarDataVersion":"y"}]}',
      'corrupt',
    ],
    ['条目缺字段', '{"schemaVersion":1,"items":[{"dateKey":"2026-10-09"}]}', 'corrupt'],
    ['存储的是对象而不是字符串', '{"schemaVersion":1,"items":[]}', 'corrupt'],
  ])('读取失败：%s', (label, stored, reason) => {
    const raw = label === '存储的是对象而不是字符串' ? JSON.parse(stored) : stored
    const storage = useFakeStorage()

    storage.store.set(FAVORITES_STORAGE_KEY, raw)

    expect(listFavorites()).toMatchObject({
      ok: false,
      code: 'STORAGE_READ_FAILED',
      context: { storageKey: FAVORITES_STORAGE_KEY, reason },
    })
    expect(addFavorite('2026-10-09', CALENDAR_VERSION)).toMatchObject({
      ok: false,
      code: 'STORAGE_READ_FAILED',
    })
    expect(storage.store.get(FAVORITES_STORAGE_KEY)).toBe(raw)
  })

  it('读取时对重复条目去重', () => {
    const duplicated = JSON.stringify({
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      items: [
        { dateKey: '2026-10-09', createdAt: 'a', calendarDataVersion: 'v1' },
        { dateKey: '2026-10-09', createdAt: 'b', calendarDataVersion: 'v1' },
      ],
    })

    useFakeStorage(duplicated)

    const result = listFavorites()

    expect(result.ok && result.value).toHaveLength(1)
  })

  it('存储 API 抛错时返回读取失败', () => {
    vi.stubGlobal('wx', {
      getStorageSync: () => {
        throw new Error('storage broken')
      },
      setStorageSync: () => undefined,
    })

    expect(listFavorites()).toMatchObject({
      ok: false,
      code: 'STORAGE_READ_FAILED',
      context: { reason: 'storage-api-error' },
    })
  })
})
