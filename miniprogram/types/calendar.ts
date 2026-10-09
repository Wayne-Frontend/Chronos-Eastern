export type DateKey = `${number}-${number}-${number}`

export interface CivilDateParts {
  year: number
  month: number
  day: number
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
