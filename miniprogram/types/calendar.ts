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
  /** 以立春作为年界。 */
  yearLiChun: string
  /** 以节令交接作为月界。 */
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
  versions: {
    calendarAdapter: string
    festivalData: string
    rulePack: string
  }
}
