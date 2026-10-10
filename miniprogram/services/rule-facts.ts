import { EARTHLY_BRANCHES } from '../utils/ganzhi'

/**
 * 日期规则事实模块：把「节令月 → 季节」「节令月支 → 目标日干／日支」这类换算集中在这里，
 * 规则引擎与规则数据只通过本模块取值，页面永远不参与计算。
 *
 * 口径：本模块所有「月」都是 `ganzhi.monthJieQi` 的节令月，不是农历朔月，也不是公历月。
 * 交节当天整日按新月计（方案 5.2 既有定案）；原书卷四有「每月交节则叠两值日」的并存之说，
 * 本版本不采用，差异已写进各规则包的 limitations。
 */

/** 建除十二神的实现在 utils/ganzhi，这里集中导出，让规则侧只有这一个取值入口。 */
export { getJianChu, JIAN_CHU_NAMES } from '../utils/ganzhi'

/** 十二节令月。卷五、卷六的月神条款一律写作「正月起某，顺／逆行十二辰」，表长必须是 12。 */
export const MONTH_COUNT = 12

/** 四季用语与卷五「春……夏……秋……冬……」的季节性条款一致，故直接用汉字而不另造枚举名。 */
export type Season = '春' | '夏' | '秋' | '冬'

/** 寅月（正月）在 EARTHLY_BRANCHES 中的下标；月建起于寅，故以此为「正月」第 0 项。 */
const FIRST_MONTH_BRANCH_INDEX = 2

/** 按月序（寅＝0）逐月列出所属季节，直接以月序取用，不再做除法。 */
const SEASON_BY_MONTH: readonly Season[] = [
  '春',
  '春',
  '春',
  '夏',
  '夏',
  '夏',
  '秋',
  '秋',
  '秋',
  '冬',
  '冬',
  '冬',
]

/**
 * 节令月支转「正月起」序号：寅月＝0，卯月＝1……丑月＝11。
 * 原因：月神条款的表格以「正月」为第一项，不能用地支下标（子＝0）或农历月号定位。
 * 边界：月支不在十二支内时返回 null，由调用方按缺输入处理，不得回退到公历月。
 */
export function getMonthIndex(monthBranch: string): number | null {
  const branchIndex = EARTHLY_BRANCHES.indexOf(monthBranch)

  if (branchIndex < 0) {
    return null
  }

  return (branchIndex - FIRST_MONTH_BRANCH_INDEX + MONTH_COUNT) % MONTH_COUNT
}

/**
 * 节令月支所属季节：寅卯辰为春、巳午未为夏、申酉戌为秋、亥子丑为冬。
 * 原因：卷五「天赦」「四相」「时德」「王日」「四废」等条款按季节取值。
 * 边界：季节随节令月切换，不按公历季度、也不按农历月；交节日整日计入新月所属季节。
 */
export function getSeason(monthBranch: string): Season | null {
  const monthIndex = getMonthIndex(monthBranch)

  if (monthIndex === null) {
    return null
  }

  return SEASON_BY_MONTH[monthIndex]
}

/**
 * 从「正月起」的十二项取值表中，取出本月应取的那一项。
 * 原因：把「月支 → 目标日干／日支」的换算收在引擎一侧，规则数据只声明表本身，
 * 既不必为每条规则新增字段，也不必把映射散落到页面。
 * 边界：表长不是 12、或月支无法解析时返回 null（调用方按缺输入处理，该日不进入结果）。
 */
/**
 * 天干的五行归属：甲乙木、丙丁火、戊己土、庚辛金、壬癸水。
 * 原因：卷五「四相」一类条款按季节取「某一对天干」（如春丙丁），一条条件只能比对单值，
 * 故改为比对这对天干共同的五行，把「丙或丁」化简成「五行属火」。
 * 边界：只认十天干，其它输入返回 null。
 */
const STEM_ELEMENT: Record<string, Element> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

export type Element = '木' | '火' | '土' | '金' | '水'

export function getStemElement(stem: string): Element | null {
  return STEM_ELEMENT[stem] ?? null
}

/** 地支的五行归属：子水、丑土、寅卯木、辰土、巳午火、未土、申酉金、戌土、亥水。 */
const BRANCH_ELEMENT: Record<string, Element> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

export function getBranchElement(branch: string): Element | null {
  return BRANCH_ELEMENT[branch] ?? null
}

export function resolveMonthIndexed(values: readonly string[], monthBranch: string): string | null {
  const monthIndex = getMonthIndex(monthBranch)

  if (monthIndex === null || values.length !== MONTH_COUNT) {
    return null
  }

  return values[monthIndex]
}

/**
 * month-indexed-set 的多值分隔符：一月中取多项时，各项以此分隔（如「午|戌」）。
 * 原因：三合每月取两支、阴阳不将每月取十余个日柱，一表一项的表达不了；
 * 用可读的分隔符而不是定宽切片，是为了让表在数据文件里仍能逐项读出来。
 */
export const MONTH_INDEXED_SET_SEPARATOR = '|'

/**
 * 从「正月起」的十二项取值表中取出本月应取的多项取值。
 * 边界：与 resolveMonthIndexed 同一套缺输入判据；空串项按空集合返回，由调用方判为不命中。
 */
export function resolveMonthIndexedSet(
  values: readonly string[],
  monthBranch: string,
): readonly string[] | null {
  const target = resolveMonthIndexed(values, monthBranch)

  return target === null ? null : target.split(MONTH_INDEXED_SET_SEPARATOR)
}
