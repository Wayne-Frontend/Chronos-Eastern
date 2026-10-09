/**
 * 按公历规则判断闰年。
 * 世纪年必须能被 400 整除，因此 2000 年是闰年，1900 与 2100 年不是。
 */
export function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/**
 * 按公历规则返回星期，0 表示星期日，与 `Date.prototype.getUTCDay()` 及历法库口径一致。
 * 原因：日期计算失败时页面仍需显示公历星期，不能依赖第三方库结果。
 */
export function getGregorianWeekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
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
