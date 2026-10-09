export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

export const EARTHLY_BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
]

/**
 * 建除十二神，顺序即《协纪辨方书》卷四「建除满平定执破危成收开闭」。
 * 原文：「其法从月建上起建，与斗杓所指相应，如正月建寅则寅日起建，顺行十二辰是也。」
 */
export const JIAN_CHU_NAMES = [
  '建',
  '除',
  '满',
  '平',
  '定',
  '执',
  '破',
  '危',
  '成',
  '收',
  '开',
  '闭',
]

export interface GanzhiParts {
  stem: string
  branch: string
}

/** 拆解两字干支；长度或字符不在六十甲子用字内时返回 null，不猜测。 */
export function splitGanzhi(ganzhi: string): GanzhiParts | null {
  if (ganzhi.length !== 2 || !HEAVENLY_STEMS.includes(ganzhi[0])) {
    return null
  }

  if (!EARTHLY_BRANCHES.includes(ganzhi[1])) {
    return null
  }

  return { stem: ganzhi[0], branch: ganzhi[1] }
}

/**
 * 由月建支与日支求建除十二神：建在月建当日，其后顺行十二辰（卷四《建除十二神》）。
 * 边界：任一支不在十二支内时返回 null，由调用方按缺输入处理。
 */
export function getJianChu(monthBranch: string, dayBranch: string): string | null {
  const monthIndex = EARTHLY_BRANCHES.indexOf(monthBranch)
  const dayIndex = EARTHLY_BRANCHES.indexOf(dayBranch)

  if (monthIndex < 0 || dayIndex < 0) {
    return null
  }

  return JIAN_CHU_NAMES[(dayIndex - monthIndex + 12) % 12]
}
