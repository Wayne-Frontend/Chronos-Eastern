import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DISCLAIMER_ACCEPTANCE_KEY,
  readDisclaimerAcceptance,
  saveDisclaimerAcceptance,
} from '../miniprogram/services/disclaimer-consent-service'

let stored: unknown
let readFails = false
let writeFails = false

vi.stubGlobal('wx', {
  getStorageSync: (key: string) => {
    expect(key).toBe(DISCLAIMER_ACCEPTANCE_KEY)
    if (readFails) throw new Error('read unavailable')
    return stored
  },
  setStorageSync: (key: string, value: unknown) => {
    expect(key).toBe(DISCLAIMER_ACCEPTANCE_KEY)
    if (writeFails) throw new Error('write unavailable')
    stored = value
  },
})

beforeEach(() => {
  stored = ''
  readFails = false
  writeFails = false
})

describe('首次查询说明的本机确认标记', () => {
  it('确认后仅在独立版本键中记住', () => {
    expect(readDisclaimerAcceptance()).toEqual({ ok: true, value: false })
    expect(saveDisclaimerAcceptance()).toEqual({ ok: true, value: true })
    expect(readDisclaimerAcceptance()).toEqual({ ok: true, value: true })
  })

  it('读取异常或未知值都不误认为已确认', () => {
    stored = 'unknown-version'
    expect(readDisclaimerAcceptance()).toMatchObject({ ok: false, code: 'STORAGE_READ_FAILED' })
    readFails = true
    expect(readDisclaimerAcceptance()).toMatchObject({ ok: false, code: 'STORAGE_READ_FAILED' })
  })

  it('写入失败保留未确认状态，供下次再次提示', () => {
    writeFails = true
    expect(saveDisclaimerAcceptance()).toMatchObject({ ok: false, code: 'STORAGE_WRITE_FAILED' })
    expect(readDisclaimerAcceptance()).toEqual({ ok: true, value: false })
  })
})
