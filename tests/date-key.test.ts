import { describe, expect, it } from 'vitest'

import { parseDateKey } from '../miniprogram/utils/date-key'

describe('parseDateKey', () => {
  it('解析合法日期键', () => {
    expect(parseDateKey('2026-10-08')).toEqual({
      ok: true,
      value: {
        dateKey: '2026-10-08',
        year: 2026,
        month: 10,
        day: 8,
      },
    })
  })

  it('接受公历闰年的 2 月 29 日', () => {
    expect(parseDateKey('2000-02-29').ok).toBe(true)
  })

  it('拒绝非闰年的 2 月 29 日', () => {
    expect(parseDateKey('2100-02-29')).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
  })

  it('拒绝非标准格式，避免隐式日期解析', () => {
    expect(parseDateKey('2026-1-8')).toMatchObject({
      ok: false,
      code: 'INVALID_DATE',
    })
  })
})
