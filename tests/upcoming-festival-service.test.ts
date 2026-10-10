import { describe, expect, it } from 'vitest'

import { findUpcomingFestival } from '../miniprogram/services/upcoming-festival-service'

describe('findUpcomingFestival', () => {
  it('非节日当天返回最近节日及剩余天数', () => {
    const result = findUpcomingFestival('2026-10-10')

    expect(result).toMatchObject({
      dateKey: '2026-10-18',
      daysUntil: 8,
    })
    expect(result?.festivals.map((festival) => festival.name)).toEqual(['重阳节'])
  })

  it('当天有节日时剩余天数为零', () => {
    const result = findUpcomingFestival('2026-10-18')

    expect(result?.daysUntil).toBe(0)
    expect(result?.festivals.map((festival) => festival.name)).toEqual(['重阳节'])
  })

  it('会跨年查找到元旦', () => {
    const result = findUpcomingFestival('2026-12-30')

    expect(result).toMatchObject({
      dateKey: '2027-01-01',
      daysUntil: 2,
    })
    expect(result?.festivals.map((festival) => festival.name)).toEqual(['元旦'])
  })
})
