declare module 'lunar-javascript' {
  export interface Solar {
    getYear(): number
    getMonth(): number
    getDay(): number
    getWeek(): number
    getLunar(): Lunar
    toYmd(): string
    toYmdHms(): string
  }

  export interface JieQi {
    getName(): string
    getSolar(): Solar
  }

  export interface Lunar {
    getYear(): number
    getMonth(): number
    getDay(): number
    getMonthInChinese(): string
    getDayInChinese(): string
    getYearInGanZhi(): string
    getYearInGanZhiByLiChun(): string
    getMonthInGanZhi(): string
    getDayInGanZhiExact2(): string
    getCurrentJieQi(): JieQi | null
    getNextJieQi(wholeDay?: boolean): JieQi | null
  }

  export const Solar: {
    fromYmd(year: number, month: number, day: number): Solar
  }
}
