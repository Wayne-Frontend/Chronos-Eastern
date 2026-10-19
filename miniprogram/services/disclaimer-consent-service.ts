import type { AppResult } from '../types/result'

export const DISCLAIMER_ACCEPTANCE_KEY = 'syliangchen:disclaimer:v1'

type DisclaimerStorageContext = { storageKey: string }

/** 读取失败时交给调用方再次提示，避免把未知存储状态误认为已确认。 */
export function readDisclaimerAcceptance(): AppResult<
  boolean,
  'STORAGE_READ_FAILED',
  DisclaimerStorageContext
> {
  try {
    const raw: unknown = wx.getStorageSync(DISCLAIMER_ACCEPTANCE_KEY)
    if (raw === '' || raw === null || raw === undefined) return { ok: true, value: false }
    if (raw === 'accepted') return { ok: true, value: true }
  } catch {
    // 存储 API 异常时仍需展示说明；不抛异常中断查询流程。
  }

  return {
    ok: false,
    code: 'STORAGE_READ_FAILED',
    message: '首次说明状态读取失败',
    retryable: true,
    context: { storageKey: DISCLAIMER_ACCEPTANCE_KEY },
  }
}

export function saveDisclaimerAcceptance(): AppResult<
  true,
  'STORAGE_WRITE_FAILED',
  DisclaimerStorageContext
> {
  try {
    wx.setStorageSync(DISCLAIMER_ACCEPTANCE_KEY, 'accepted')
    return { ok: true, value: true }
  } catch {
    return {
      ok: false,
      code: 'STORAGE_WRITE_FAILED',
      message: '首次说明状态保存失败',
      retryable: true,
      context: { storageKey: DISCLAIMER_ACCEPTANCE_KEY },
    }
  }
}
