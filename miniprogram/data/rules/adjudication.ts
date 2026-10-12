import type { AdjudicationClause } from '../../types/rule'

/**
 * 卷十「宜忌」的裁决条款（2026-10-12 建立，同日补全三类结论与转致）。
 *
 * 卷十对「宜忌并见」的处置有四类结论，本表把它们逐个编码：
 * - `lift`：原书明言「併則不忌」或「止忌某某，餘皆不忌」——对该事项解除忌项；
 * - `exclude`：原书明言「諸事皆忌」或「雖與德合併猶忌」——该日定为忌；
 * - `normal`：原书写「如常例」「不註宜亦不註忌」——两不注，维持 unresolved（也是无条款时的默认）；
 * - `delegate`：原书写「從某煞論」——按被转致神煞的结论处置。
 *
 * 匹配规则：**按顺序取第一条命中的支路**（月份命中、所需神煞满足）。因此每条神煞下
 * 先写带条件的支路、再写不带条件的兜底支路。未登记的月份与未编码的神煞一律走 `normal`，
 * 偏保守。**每条支路编码前都必须回看影印件**；帧号记在各条 locator 里。
 *
 * 覆盖说明（六事项忌项的 22 个神煞）：已核并编码 21 个——月建、月破、平日、收日、满日、
 * 闭日、劫煞、灾煞、月煞、月刑、月害、月厌、厌对、大时、天吏、小耗、四耗、四废、四穷、
 * 五墓、九空；其中月建、满日两条经核对无解除条款（月建忌「结亲礼」而条目自身不给例外，
 * 满日与民日并时按天愿条计），厌对条唯「忌嫁娶」一句、无裁决语。**月厌的特定日柱清单
 * （阴阳大会、小会、阴位、三阴等，影印本第 172–173 帧）尚未编码**，见审计 §6.1.1。
 */
export const ADJUDICATION_CLAUSES: readonly AdjudicationClause[] = [
  // ── 月破：破日为诸事皆忌，德神临此失力，故与併犹忌（影印本第 136 帧按语）。
  {
    shensha: '月破',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'exclude',
    locator:
      '卷十《月破》按语「此德神臨此失力不能為福，故與併猶忌……否則諸事皆忌也；若值災煞又值月厭，則陰氣尤毒，故雖與德神併而仍諸事皆忌也」（影印本第 136 帧）',
  },

  // ── 平日：亥月值時德六合、申月与天德月德合并则解除；寅巳子月从月刑论，辰戌丑未月从月煞论。
  {
    shensha: '平日',
    monthBranches: ['亥'],
    requiresAny: ['時德', '六合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《平日》「寅申巳亥月值相日，亥月又值時德六合，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 140 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《平日》「不與德合併，如常例」（影印本第 140 帧）',
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
    shensha: '平日',
    monthBranches: ['申'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《平日》「不與德合併，如常例」（影印本第 140 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['寅', '巳'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月刑',
    locator: '卷十《平日》「寅巳月值月刑，從月刑論」（影印本第 140 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['子'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月刑',
    locator: '卷十《平日》「子月又值月刑，從月刑論」（影印本第 140 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['卯', '午', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《平日》「子午卯酉月值天吏……凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」（影印本第 140 帧）',
  },
  {
    shensha: '平日',
    monthBranches: ['辰', '戌', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月煞',
    locator: '卷十《平日》「辰戌丑未月值月煞，從月煞論」（影印本第 140 帧）',
  },

  // ── 收日：辰未月与德合并则解除；寅申巳亥月从劫煞论，卯丑戌月从月刑论，子午酉月如常例。
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
    shensha: '收日',
    monthBranches: ['辰', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《收日》「不與德合併，如常例」（影印本第 146 帧）',
  },
  {
    shensha: '收日',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '劫煞',
    locator: '卷十《收日》「寅申巳亥月值刼煞，從刼煞論」（影印本第 146 帧）',
  },
  {
    shensha: '收日',
    monthBranches: ['卯', '丑', '戌'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月刑',
    locator: '卷十《收日》「卯月丑戌月皆值月刑，從月刑論」（影印本第 146 帧）',
  },
  {
    shensha: '收日',
    monthBranches: ['子', '午', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《收日》「子午卯酉月值大時……凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」（影印本第 146 帧）',
  },

  // ── 闭日：两条支路都是如常例；寅申巳亥月从月煞论。
  {
    shensha: '闭日',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月煞',
    locator: '卷十《閉日》「寅申巳亥月值月煞，從月煞論」（影印本第 151 帧）',
  },
  {
    shensha: '闭日',
    monthBranches: ['子', '午', '卯', '酉', '辰', '戌', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《閉日》「與天德月德天德合月德合天赦天願併，凡所忌者則不註宜，所宜者亦不註忌；不與德合赦願併，如常例」（影印本第 151 帧）',
  },

  // ── 劫煞：寅申月值六合即解除（不要求德神）；巳亥月与月德天德合、辰戌丑未月与德合并则解除。
  {
    shensha: '劫煞',
    monthBranches: ['寅', '申'],
    requiresAny: ['六合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《劫煞》「寅申巳亥月值收日，為月令長生；寅申月又值六合，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「生則不絕、合則不劫」（影印本第 154、156 帧）',
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
      '卷十《劫煞》「辰戌丑未月值除日相日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「與德合併則又濟以三合吉干」（影印本第 156–157 帧）',
  },
  {
    shensha: '劫煞',
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未', '子', '午', '卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《劫煞》「不與德神併，凡所忌者則不註宜，所宜者亦不註忌」「子午卯酉月值執日與月德月德合併，凡所忌者則不註宜……不與德合併，如常例」（影印本第 154 帧）',
  },

  // ── 灾煞：值开日（寅申巳亥月）或值满日（辰戌丑未月）与德合并则解除；子午卯酉月从月破论。
  {
    shensha: '灾煞',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《災煞》「寅申巳亥月值開日，辰戌丑未月值滿日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 158 帧）',
  },
  {
    shensha: '灾煞',
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《災煞》「不與德神併，如常例」（影印本第 158 帧）',
  },
  {
    shensha: '灾煞',
    monthBranches: ['子', '午', '卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月破',
    locator: '卷十《災煞》「子午卯酉月值破日，從月破論」（影印本第 158 帧）',
  },

  // ── 月煞：卯酉月与月德天愿并则解除；子午月如常例；其余月分德合与否：无德神者诸事皆忌。
  {
    shensha: '月煞',
    monthBranches: ['卯', '酉'],
    requiresAny: ['月德', '天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《月煞》「卯酉月值六合，與月德天願併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」及按语「與德願併而後從德願所宜」（影印本第 159、161 帧）',
  },
  {
    shensha: '月煞',
    monthBranches: ['卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《月煞》「不與德願併，凡所忌者則不註宜，所宜者亦不註忌」（影印本第 159 帧）',
  },
  {
    shensha: '月煞',
    monthBranches: ['子', '午'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《月煞》「子午月值月害，與月德合併，凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」（影印本第 159 帧）',
  },
  {
    shensha: '月煞',
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《月煞》「寅申巳亥月值閉日、辰戌丑未月值平日，與天德月德天德合月德合併，如常例」（影印本第 159 帧）',
  },
  {
    shensha: '月煞',
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'exclude',
    locator: '卷十《月煞》「不與德合併，諸事皆忌」（影印本第 159 帧）',
  },

  // ── 月刑：巳月与月德天德合天愿并则解除；午月从月厌论；子卯未申月无德神者诸事皆忌。
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
    shensha: '月刑',
    monthBranches: ['巳'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《月刑》「不與德願併，凡所忌者則不註宜，所宜者亦不註忌」（影印本第 164 帧）',
  },
  {
    shensha: '月刑',
    monthBranches: ['午'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月厌',
    locator: '卷十《月刑》「午月值月厭，從月厭論」（影印本第 164 帧）',
  },
  {
    shensha: '月刑',
    monthBranches: ['寅', '辰', '酉', '亥', '丑', '戌'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《月刑》「寅月值平日相日六害、辰酉亥月值建日、丑戌月值收日，與天德月德天德合月德合併，凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」（影印本第 164 帧）',
  },
  {
    shensha: '月刑',
    monthBranches: ['子', '卯', '未', '申'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《月刑》「子月值平日天吏、卯月值收日大時、未申月值月破，與德合併，如常例」（影印本第 164 帧）',
  },
  {
    shensha: '月刑',
    monthBranches: ['子', '卯', '未', '申'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'exclude',
    locator: '卷十《月刑》「不與德合併，諸事皆忌」（影印本第 164 帧）',
  },

  // ── 月害：卯酉丑未月与天德月德并则解除；辰戌月如常例；子午从月煞、巳亥从劫煞、寅从月刑、申从平日。
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
    shensha: '月害',
    monthBranches: ['卯', '酉', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《月害》「不與二德併，如常例」（影印本第 167 帧）',
  },
  {
    shensha: '月害',
    monthBranches: ['辰', '戌'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《月害》「辰戌月值閉日官日天吏，與天德合月德合併，凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」（影印本第 167 帧）',
  },
  {
    shensha: '月害',
    monthBranches: ['子', '午'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月煞',
    locator: '卷十《月害》「子午月值月煞……各從重論」（影印本第 167 帧）',
  },
  {
    shensha: '月害',
    monthBranches: ['巳', '亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '劫煞',
    locator: '卷十《月害》「巳亥月值刼煞……各從重論」（影印本第 167 帧）',
  },
  {
    shensha: '月害',
    monthBranches: ['寅'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月刑',
    locator: '卷十《月害》「寅月值月刑……各從重論」（影印本第 167 帧）',
  },
  {
    shensha: '月害',
    monthBranches: ['申'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '平日',
    locator: '卷十《月害》「申月值平日……各從重論」（影印本第 167 帧）',
  },

  // ── 月厌：寅申丑未月与德合并则对清单外的事项解除（清单含出行、搬家、婚嫁、订婚、提亲）；
  //    卯酉月值月破灾煞仍诸事皆忌；子午月厌建会非天赦日诸事皆忌。
  //    边界：阴阳大会、小会、阴位、三阴等特定日柱清单尚未编码（影印本第 172–173 帧）。
  {
    shensha: '月厌',
    monthBranches: ['寅', '申', '丑', '未'],
    requiresAny: ['月德', '天德合', '月德合'],
    residualEventTypes: ['travel', 'relocation', 'marriage', 'engagement', 'proposal'],
    outcome: 'lift',
    locator:
      '卷十《月厭》「寅申月值成日、丑未月值開日，與月德天德合月德合併，止忌行幸遣使安撫邊境選將訓兵出師上官赴任臨政親民結婚姻納采問名嫁娶求醫療病般移遠迴栽種，餘皆不忌」（影印本第 171 帧）',
  },
  {
    shensha: '月厌',
    monthBranches: ['寅', '申', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《月厭》「不與德神併，如常例」（影印本第 171 帧）',
  },
  {
    shensha: '月厌',
    monthBranches: ['辰', '戌', '巳', '亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《月厭》「辰戌月值定日、巳亥月值滿日，與天德月德月德合併，凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」（影印本第 171 帧）',
  },
  {
    shensha: '月厌',
    monthBranches: ['卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'exclude',
    locator: '卷十《月厭》「卯酉月值月破災煞，雖與德合併仍諸事皆忌」（影印本第 172 帧）',
  },
  {
    shensha: '月厌',
    monthBranches: ['子', '午'],
    requiresAny: ['天赦'],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《月厭》「子午月厭建會，與天赦併，如常例」（影印本第 172 帧）',
  },
  {
    shensha: '月厌',
    monthBranches: ['子', '午'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'exclude',
    locator: '卷十《月厭》「子午月厭建會……不與天赦併，諸事皆忌」（影印本第 172 帧）',
  },

  // ── 大时：寅申巳亥月与辰戌月即不要求德神；丑未月与二德并则解除；卯月从月刑论。
  {
    shensha: '大时',
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
    shensha: '大时',
    monthBranches: ['卯'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月刑',
    locator: '卷十《大時》「卯月又值月刑，從月刑論」（影印本第 182 帧）',
  },
  {
    shensha: '大时',
    monthBranches: ['丑', '未', '子', '午', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《大時》「子午卯酉月值收日，子午月與月德合併、酉月與月德併，凡所忌者則不註宜，所宜者亦不註忌；不與德合併，如常例」「丑未月……否則如常例也」（影印本第 182 帧）',
  },

  // ── 天吏：寅申巳亥月与德合并则解除；辰戌丑未月如常例；午卯酉月从平日论，子月从月刑论。
  {
    shensha: '天吏',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: ['天德', '月德', '天德合', '月德合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《天吏》「寅申巳亥月值危日，與天德月德天德合月德合併，止忌安撫邊境選將訓兵出師求醫療病，餘皆不忌」（影印本第 185 帧）',
  },
  {
    shensha: '天吏',
    monthBranches: ['寅', '申', '巳', '亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《天吏》「不與德合併，如常例」（影印本第 185 帧）',
  },
  {
    shensha: '天吏',
    monthBranches: ['午', '卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '平日',
    locator: '卷十《天吏》「午卯酉月值平日，從平日論」（影印本第 185 帧）',
  },
  {
    shensha: '天吏',
    monthBranches: ['子'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月刑',
    locator: '卷十《天吏》「子月又值月刑，從月刑論」（影印本第 185 帧）',
  },
  {
    shensha: '天吏',
    monthBranches: ['辰', '戌', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷十《天吏》「辰戌丑未月值閉日，與德合赦願併，凡所忌者則不註宜，所宜者亦不註忌；不與德合赦願併，如常例」（影印本第 185 帧）',
  },

  // ── 小耗：八个月与五德神任一同日即不忌；子午卯酉月值劫煞，虽与德合并犹忌。
  {
    shensha: '小耗',
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未'],
    requiresAny: ['天德', '月德', '天德合', '月德合', '天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《小耗》「與天德月德天德合月德合天願併則不忌」及按语「與德合天願併則貪合忘衝故不忌」（影印本第 188 帧）',
  },
  {
    shensha: '小耗',
    monthBranches: ['寅', '申', '巳', '亥', '辰', '戌', '丑', '未', '子', '午', '卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《小耗》「子午卯酉月值劫煞，雖與德合併猶忌」（影印本第 188 帧）',
  },

  // ── 四耗：辰月与天德月德、寅申月与天德合、巳月与月德合、辰戌丑未月与三合并则解除。
  {
    shensha: '四耗',
    monthBranches: ['辰'],
    requiresAny: ['天德', '月德'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四耗》「辰月與天德月德併……止忌安撫邊境選將訓兵出師，餘不忌」（影印本第 190 帧）',
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
    monthBranches: ['戌', '丑', '未'],
    requiresAny: ['三合'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四耗》「辰戌丑未月與三合併……止忌安撫邊境選將訓兵出師，餘不忌」（影印本第 190 帧）',
  },
  {
    shensha: '四耗',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《四耗》未列条件下的处置从常例（影印本第 190 帧）',
  },

  // ── 四废：与德合并犹忌；与月破同日则诸事皆忌。
  {
    shensha: '四废',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: ['月破'],
    residualEventTypes: [],
    outcome: 'exclude',
    locator: '卷十《四廢》「與月破併，諸事皆忌」（影印本第 192 帧）',
  },
  {
    shensha: '四废',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《四廢》「與德合併猶忌」（影印本第 192 帧）',
  },

  // ── 四穷：与德合并犹忌，惟正月（寅月）乙亥日与天愿同日则解除。
  {
    shensha: '四穷',
    monthBranches: ['寅'],
    requiresAny: ['天願'],
    residualEventTypes: [],
    outcome: 'lift',
    locator:
      '卷十《四忌四窮》「與月德天德合月德合併猶忌，惟正月乙亥與天願併，止忌安撫邊境選將訓兵出師，餘皆不忌」（影印本第 194 帧）',
  },
  {
    shensha: '四穷',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《四忌四窮》「與月德天德合月德合併猶忌」（影印本第 194 帧）',
  },

  // ── 五墓：五月、十一月与月德同日则不忌。
  {
    shensha: '五墓',
    monthBranches: ['午', '子'],
    requiresAny: ['月德'],
    residualEventTypes: [],
    outcome: 'lift',
    locator: '卷十《五墓》「五月十一月與月德併則不忌」（影印本第 197 帧）',
  },
  {
    shensha: '五墓',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《五墓》未列条件下的处置从常例（影印本第 197 帧）',
  },

  // ── 九空：寅申月满日、子午卯酉月开日与德合并则不忌；巳亥月从月厌论、辰戌丑未月从月破论。
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
    shensha: '九空',
    monthBranches: ['巳', '亥'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月厌',
    locator: '卷十《九空》「巳亥月值月厭，從月厭論」（影印本第 199 帧）',
  },
  {
    shensha: '九空',
    monthBranches: ['辰', '戌', '丑', '未'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'delegate',
    delegateShensha: '月破',
    locator: '卷十《九空》「辰戌丑未月值破日，從月破論」（影印本第 199 帧）',
  },
  {
    shensha: '九空',
    monthBranches: ['寅', '申', '子', '午', '卯', '酉'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《九空》未列条件下的处置从常例（影印本第 198–199 帧）',
  },

  // ── 月建：卷四明言其日「不宜兴造土功、结亲礼」，条目自身不给解除条件，按诸事皆忌之外的口径处理。
  {
    shensha: '月建',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator:
      '卷四《月建》「所值之日宜封建視事，不宜興造土功、結親禮」（影印本第 88 帧）；卷十未为月建另立裁决条款',
  },

  // ── 满日：十月中满日与民日、天愿等并见时的处置已由各该条承载，本条不另立解除条件。
  {
    shensha: '满日',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《滿日》按语「辰戌丑未月值民日，然值災煞……故各從重論」（影印本第 150 帧）',
  },

  // ── 厌对：卷十只记「忌嫁娶」一句，无裁决语；冲突时按常例处理。
  {
    shensha: '厌对',
    monthBranches: ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'],
    requiresAny: [],
    residualEventTypes: [],
    outcome: 'normal',
    locator: '卷十《厭對》「忌嫁娶」（卷四《厌对》「其日忌嫁娶」；卷十未另立裁决条款）',
  },
]
