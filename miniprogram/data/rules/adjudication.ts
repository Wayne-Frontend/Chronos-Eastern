import type { AdjudicationClause } from '../../types/rule'

/**
 * 卷十「宜忌」的裁决例外条款（试点，2026-10-12 建立）。
 *
 * 为什么只收「解除忌项」的条款：卷十对宜忌并见的处置有四种形态——「併則不忌」、
 * 「止忌某某，餘皆不忌」「如常例（不註宜亦不註忌）」「諸事皆忌／雖與德合併猶忌」，
 * 另有「從某煞論」的转致。本表只收前两种中**对该事项解除**的部分：它们只会让日子变多，
 * 不会让原书未支持的日子出现。其余三种尚未编码，一律维持常例（unresolved），偏保守。
 * **每条条款编码前都必须回看影印件**（转录只用于定位），帧号记在各自 locator 里。
 *
 * 覆盖进度（开业忌项 18 个神煞）：**18 个已全部回影印核对**。其中 15 个有解除条款（共 24 条，
 * 见下）；月破、闭日、四废三条经核对**没有**解除条款——月破只列忌项、闭日两条支路均为
 * 「如常例」、四废明言「與德合併猶忌」，故都不入本表。帧号与体例见
 * docs/conflict-adjudication-audit.md §6.1.1。
 */
export const ADJUDICATION_CLAUSES: readonly AdjudicationClause[] = [
  {
    shensha: '九空',
    monthBranches: ['寅', '申'],
    requiresAny: ['月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《九空》「寅申月值滿日，子午卯酉月值開日，與月德天德合月德合併則不忌」及按语「與德合併則支以干合而忘衝，故不忌也」（影印本第 198–199 帧）',
  },
  {
    shensha: '九空',
    monthBranches: ['子', '午', '卯', '酉'],
    requiresAny: ['月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《九空》「寅申月值滿日，子午卯酉月值開日，與月德天德合月德合併則不忌」（影印本第 198–199 帧）',
  },
  {
    shensha: '五墓',
    monthBranches: ['午', '子'],
    requiresAny: ['月德'],
    residualEventTypes: [],
    outcome: 'lift',
    locator: '卷十《五墓》「五月十一月與月德併則不忌」（影印本第 197 帧）',
  },
  {
    shensha: '收日',
    monthBranches: ['辰', '未'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《收日》「辰未月與德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 146 帧）',
  },
  {
    shensha: '劫煞',
    monthBranches: ['寅', '申'],
    requiresAny: ['六合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《劫煞》「寅申巳亥月值收日，為月令長生；寅申月又值六合，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 154 帧）及按语「生則不絕、合則不劫，即不與德願併其吉已足勝凶」（第 156 帧）',
  },
  {
    shensha: '劫煞',
    monthBranches: ['巳', '亥'],
    requiresAny: ['月德', '天德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《劫煞》「巳亥月值月害，與月德天德合併，亦止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 154 帧）',
  },
  {
    shensha: '劫煞',
    monthBranches: ['辰', '戌', '丑', '未'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《劫煞》「辰戌丑未月值除日相日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「與德合併則又濟以三合吉干，不當復以絕論，故亦止忌軍事療病，餘皆不忌」（影印本第 154、156–157 帧）',
  },
  {
    shensha: '灾煞',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《災煞》「寅申巳亥月值開日，辰戌丑未月值滿日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「寅申巳亥月開日之吉，而非德無以解正衝之凶」（影印本第 158 帧）',
  },
  {
    shensha: '灾煞',
    monthBranches: ['辰', '戌', '丑', '未'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《災煞》「寅申巳亥月值開日，辰戌丑未月值滿日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 158 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['亥'],
    requiresAny: ['時德', '六合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《平日》「寅申巳亥月值相日，亥月又值時德六合，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「亥月值相日又值時德六合，即不與德願併其吉已足勝凶」（影印本第 140 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['申'],
    requiresAny: ['天德', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《平日》「申月值月害，與天德月德合併，亦止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 140 帧）',
  },
  {
    shensha: '月厌',
    monthBranches: ['寅', '申', '丑', '未'],
    requiresAny: ['月德', '天德合', '月德合'],
    // 原书「止忌」清单：行幸遣使、安撫邊境、選將訓兵、出師、上官赴任、臨政親民、結婚姻、
    // 納采問名、嫁娶、求醫療病、般移、遠迴、栽種——出行、搬家、婚嫁、订婚、提亲五类都在其中，
    // 故本条款只对开业等不在清单内的事项解除。
    residualEventTypes: ['travel', 'relocation', 'marriage', 'engagement', 'proposal'],
    outcome: 'lift',
    locator:
      '卷十《月厭》「寅申月值成日、丑未月值開日，與月德天德合月德合併，止忌行幸遣使安撫邊境選將訓兵出師上官赴任臨政親民結婚姻納采問名嫁娶求醫療病般移遠迴栽種，餘皆不忌」（影印本第 171 帧）',
  },
  {
    shensha: '月刑',
    monthBranches: ['巳'],
    requiresAny: ['月德', '天德合', '天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《月刑》「巳月值平日相日六合，與月德天德合天願併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 164 帧）',
  },
  {
    shensha: '月害',
    monthBranches: ['卯', '酉', '丑', '未'],
    requiresAny: ['天德', '月德'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《月害》「卯酉月值除日守日、丑未月值執日大時，與天德月德併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 167 帧）',
  },
  {
    shensha: '月煞',
    monthBranches: ['卯', '酉'],
    requiresAny: ['月德', '天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《月煞》「卯酉月值六合，與月德天願併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「與德願併而後從德願所宜，否則不宜不忌」（影印本第 159、161 帧）',
  },
  {
    shensha: '小耗',
    // 子午卯酉月的小耗值日即劫煞，原书对那四个月另作「雖與德合併猶忌」，故不列入。
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未'],
    requiresAny: ['天德', '月德', '天德合', '月德合', '天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《小耗》「與天德月德天德合月德合天願併則不忌；子午卯酉月值劫煞雖與德合併猶忌」及按语「與德合天願併則貪合忘衝故不忌」（影印本第 188 帧）',
  },
  {
    shensha: '大时',
    // 原书据按语：寅申巳亥月值除日、官日，辰戌月值执日六合，皆「不应以三合败气论」，
    // 故即不与德合赦愿并也解除；丑未月值执日六害才是「吉不抵凶，与德神并则吉胜」。
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《大時》按语「寅申巳亥月值除日官日為月建旺辰、辰戌月值執日六合太陽合月建，不應以三合敗氣論，故即不與德合赦願併亦止忌軍事，餘皆不忌也」（影印本第 182 帧）',
  },
  {
    shensha: '大时',
    monthBranches: ['丑', '未'],
    requiresAny: ['天德', '月德'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《大時》按语「丑未月值執日六害……吉不抵凶，與德神併則吉勝，亦不應以敗論，故亦止忌軍事，餘皆不忌也」（影印本第 182 帧）',
  },
  {
    shensha: '天吏',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《天吏》「寅申巳亥月值危日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「與德合併則吉勝，故止忌軍事療病」（影印本第 185 帧）',
  },
  {
    shensha: '四耗',
    monthBranches: ['辰'],
    requiresAny: ['天德', '月德'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四耗》「辰月與天德月德併、寅申月與天德合併、巳月與月德合併、辰戌丑未月與三合併，止忌安撫邊境選將訓兵出師，餘不忌」（影印本第 190 帧）',
  },
  {
    shensha: '四耗',
    monthBranches: ['寅', '申'],
    requiresAny: ['天德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四耗》「寅申月與天德合併……止忌安撫邊境選將訓兵出師，餘不忌」（影印本第 190 帧）',
  },
  {
    shensha: '四耗',
    monthBranches: ['巳'],
    requiresAny: ['月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator: '卷十《四耗》「巳月與月德合併……止忌安撫邊境選將訓兵出師，餘不忌」（影印本第 190 帧）',
  },
  {
    shensha: '四耗',
    monthBranches: ['辰', '戌', '丑', '未'],
    requiresAny: ['三合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四耗》「辰戌丑未月與三合併……止忌安撫邊境選將訓兵出師，餘不忌」（影印本第 190 帧）',
  },
  {
    shensha: '四穷',
    // 原书「惟正月乙亥與天願併」；四穷在寅月（春）的值日正是乙亥，故月份加天愿即可判。
    monthBranches: ['寅'],
    requiresAny: ['天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四忌四窮》「與月德天德合月德合併猶忌，惟正月乙亥與天願併，止忌安撫邊境選將訓兵出師，餘皆不忌」（影印本第 194 帧）',
  },
]
