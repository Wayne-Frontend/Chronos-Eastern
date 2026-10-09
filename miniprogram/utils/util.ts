/**
 * 按公历规则判断闰年。
 * 世纪年必须能被 400 整除，因此 2000 年是闰年，1900 与 2100 年不是。
 */
export function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/**
 * 返回指定公历月份的天数；月份越界时返回 0，由调用方统一转换为业务错误。
 */
export function getGregorianMonthDays(year: number, month: number): number {
  const monthDays = [
    31,
    isGregorianLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return monthDays[month - 1] ?? 0
}
