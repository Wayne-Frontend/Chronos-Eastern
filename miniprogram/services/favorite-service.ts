import type { DateKey } from '../types/calendar'
import type { AppFailure, AppResult } from '../types/result'
import { nowIsoUtc8, parseDateKey } from '../utils/date-key'

export const FAVORITES_STORAGE_KEY = 'syliangchen:favorites:v1'
export const FAVORITES_SCHEMA_VERSION = 1
export const FAVORITES_LIMIT = 200

export interface FavoriteItem {
  dateKey: DateKey
  createdAt: string
  calendarDataVersion: string
}

export type FavoriteErrorCode =
  'INVALID_DATE' | 'STORAGE_READ_FAILED' | 'STORAGE_WRITE_FAILED' | 'FAVORITE_LIMIT_REACHED'

export type FavoriteReadFailureReason = 'storage-api-error' | 'corrupt' | 'unsupported-schema'

export type FavoriteFailureContext = {
  storageKey: string
  reason: FavoriteReadFailureReason | 'none'
}

type FavoriteFailure<Code extends FavoriteErrorCode> = AppFailure<Code, FavoriteFailureContext>

interface StoredFavorites {
  schemaVersion: number
  items: FavoriteItem[]
}

/**
 * 本地收藏的读写封装。
 * 原因：schema 版本、去重、上限和存储异常必须收在一处，页面不直接接触 Storage。
 * 边界：读取失败（数据损坏或 schema 不识别）时保留原值并拒绝写入，避免把用户数据静默清掉。
 */
export function listFavorites(): AppResult<
  readonly FavoriteItem[],
  'STORAGE_READ_FAILED',
  FavoriteFailureContext
> {
  const stored = readStored()

  return stored.ok ? { ok: true, value: stored.value.items } : stored
}

export function isFavorite(
  dateKey: string,
): AppResult<boolean, 'STORAGE_READ_FAILED', FavoriteFailureContext> {
  const stored = readStored()

  return stored.ok
    ? { ok: true, value: stored.value.items.some((item) => item.dateKey === dateKey) }
    : stored
}

export function addFavorite(
  dateKey: string,
  calendarDataVersion: string,
): AppResult<readonly FavoriteItem[], FavoriteErrorCode, FavoriteFailureContext> {
  if (!parseDateKey(dateKey).ok) {
    return favoriteFailure('INVALID_DATE', '日期无效，无法收藏', 'none')
  }

  const stored = readStored()

  if (!stored.ok) {
    return stored
  }

  const items = stored.value.items

  if (items.some((item) => item.dateKey === dateKey)) {
    return { ok: true, value: items }
  }

  if (items.length >= FAVORITES_LIMIT) {
    return favoriteFailure(
      'FAVORITE_LIMIT_REACHED',
      `收藏已达上限 ${FAVORITES_LIMIT} 条，请先取消部分收藏`,
      'none',
    )
  }

  return writeItems([
    { dateKey: dateKey as DateKey, createdAt: nowIsoUtc8(), calendarDataVersion },
    ...items,
  ])
}

export function removeFavorite(
  dateKey: string,
): AppResult<
  readonly FavoriteItem[],
  'STORAGE_READ_FAILED' | 'STORAGE_WRITE_FAILED',
  FavoriteFailureContext
> {
  const stored = readStored()

  if (!stored.ok) {
    return stored
  }

  const items = stored.value.items.filter((item) => item.dateKey !== dateKey)

  return items.length === stored.value.items.length ? { ok: true, value: items } : writeItems(items)
}

function readStored(): AppResult<StoredFavorites, 'STORAGE_READ_FAILED', FavoriteFailureContext> {
  let raw: unknown

  try {
    raw = wx.getStorageSync(FAVORITES_STORAGE_KEY)
  } catch {
    return favoriteFailure('STORAGE_READ_FAILED', '本地收藏读取失败', 'storage-api-error')
  }

  if (raw === '' || raw === undefined || raw === null) {
    return { ok: true, value: { schemaVersion: FAVORITES_SCHEMA_VERSION, items: [] } }
  }

  if (typeof raw !== 'string') {
    return favoriteFailure(
      'STORAGE_READ_FAILED',
      '本地收藏数据格式异常，已停止写入以保留原数据',
      'corrupt',
    )
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    return favoriteFailure(
      'STORAGE_READ_FAILED',
      '本地收藏数据无法解析，已停止写入以保留原数据',
      'corrupt',
    )
  }

  if (!isRecord(parsed)) {
    return favoriteFailure(
      'STORAGE_READ_FAILED',
      '本地收藏数据格式异常，已停止写入以保留原数据',
      'corrupt',
    )
  }

  if (parsed.schemaVersion !== FAVORITES_SCHEMA_VERSION) {
    return favoriteFailure(
      'STORAGE_READ_FAILED',
      '本地收藏版本不识别，已停止写入以保留原数据',
      'unsupported-schema',
    )
  }

  if (!Array.isArray(parsed.items)) {
    return favoriteFailure(
      'STORAGE_READ_FAILED',
      '本地收藏数据格式异常，已停止写入以保留原数据',
      'corrupt',
    )
  }

  const items: FavoriteItem[] = []
  const seen = new Set<string>()

  for (const entry of parsed.items) {
    if (
      !isRecord(entry) ||
      typeof entry.createdAt !== 'string' ||
      typeof entry.calendarDataVersion !== 'string'
    ) {
      return favoriteFailure(
        'STORAGE_READ_FAILED',
        '本地收藏数据格式异常，已停止写入以保留原数据',
        'corrupt',
      )
    }

    const dateKey = entry.dateKey

    if (typeof dateKey !== 'string' || !parseDateKey(dateKey).ok) {
      return favoriteFailure(
        'STORAGE_READ_FAILED',
        '本地收藏数据格式异常，已停止写入以保留原数据',
        'corrupt',
      )
    }

    if (seen.has(dateKey)) {
      continue
    }

    seen.add(dateKey)
    items.push({
      dateKey: dateKey as DateKey,
      createdAt: entry.createdAt,
      calendarDataVersion: entry.calendarDataVersion,
    })
  }

  return { ok: true, value: { schemaVersion: FAVORITES_SCHEMA_VERSION, items } }
}

function writeItems(
  items: readonly FavoriteItem[],
): AppResult<readonly FavoriteItem[], 'STORAGE_WRITE_FAILED', FavoriteFailureContext> {
  try {
    wx.setStorageSync(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({ schemaVersion: FAVORITES_SCHEMA_VERSION, items }),
    )
  } catch {
    return favoriteFailure('STORAGE_WRITE_FAILED', '本地收藏保存失败，请重试', 'none')
  }

  return { ok: true, value: items }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function favoriteFailure<Code extends FavoriteErrorCode>(
  code: Code,
  message: string,
  reason: FavoriteFailureContext['reason'],
): FavoriteFailure<Code> {
  return {
    ok: false,
    code,
    message,
    retryable: code === 'STORAGE_WRITE_FAILED',
    context: { storageKey: FAVORITES_STORAGE_KEY, reason },
  }
}
