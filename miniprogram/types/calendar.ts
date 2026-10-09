export type DateKey = `${number}-${number}-${number}`

export interface CivilDateParts {
  year: number
  month: number
  day: number
}

export interface LunarDateParts {
  year: number
  month: number
  day: number
  isLeapMonth: boolean
  monthName: string
  dayName: string
}

export interface GanzhiDateParts {
  /** 以农历正月初一作为年界。 */
  yearLunarNewYear: string
  /** 以立春所在公历日作为年界：交节当天整日按新年计，V1.0 不采用时刻口径。 */
  yearLiChun: string
  /** 以节令所在公历日作为月界：交节当天整日按新月计，V1.0 不采用时刻口径。 */
  monthJieQi: string
  /** 以民用日午夜作为日界，不采用晚子时换日。 */
  dayCivil: string
}

export interface SolarTermInfo {
  name: string
  instant: string
  localDate: DateKey
}

export interface LunarAdapterDateFacts {
  dateKey: DateKey
  timezone: 'Asia/Shanghai'
  solar: CivilDateParts & {
    weekday: number
  }
  lunar: LunarDateParts
  ganzhi: GanzhiDateParts
  solarTerm: SolarTermInfo | null
  nextSolarTerm: SolarTermInfo | null
  adapterVersion: 'lunar-javascript@1.7.7'
}

export interface DateInfo {
  dateKey: DateKey
  timezone: 'Asia/Shanghai'
  solar: CivilDateParts & {
    weekday: number
  }
  lunar: LunarDateParts
  ganzhi: GanzhiDateParts
  solarTerm: SolarTermInfo | null
  nextSolarTerm: SolarTermInfo | null
  /** 只登记已接入的数据版本；节日与规则包实现前不写占位值。 */
  versions: {
    calendarAdapter: string
  }
}
