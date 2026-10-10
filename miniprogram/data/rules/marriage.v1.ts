import type { RuleDefinition, RulePack } from '../../types/rule'
import { MONTH_GOD_TABLES } from './month-gods'

const TRADITION = 'xjbf-default'
const CONFLICT_GROUP = 'marriage-day-selection'
/** 建除类条款：卷十一把该项列入嫁娶条目，卷四是建除十二神的起例与同位异名。 */
const JIANCHU_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 「亥日」只由卷十一的忌项支撑；卷四讲建除与月神，不涉及民用日支，不得挂卷四来源。 */
const BRANCH_ONLY_SOURCE_IDS = ['src-xjbf-vol11-scan'] as const
/** 月神类条款：卷十一把该项列入嫁娶条目，卷五「义例三」是该神煞起例的定义处。 */
const MONTH_GOD_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol5-scan'] as const
/** 卷六类条款：卷十一列项，卷六「义例四」定义。卷次不同，不得与卷五混挂。 */
const VOL6_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol6-scan'] as const
/** 月厌、厌对、阴阳不将的起例都在卷四；卷次不同，不得挂到卷五、卷六。 */
const VOL4_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 月刑：卷十一列项，卷六只说「与岁刑同」，起例在卷三「义例一」的岁刑条下。三处缺一不可。 */
const MOVE_PUNISHMENT_SOURCE_IDS = [
  'src-xjbf-vol11-scan',
  'src-xjbf-vol6-scan',
  'src-xjbf-vol3-scan',
] as const

const TITLE_LOCATOR = '卷十一「嫁娶」（影印本第 29 帧）'

/**
 * 阴阳不将的十二个月日柱表：卷四《阴阳不将》历例（影印本第 107 帧，图见第 105 帧）。
 * 「天宝历曰阴阳不将者，以月建为阳谓之阳建，正月起寅顺行十二辰；
 *  月厌为阴谓之阴建，正月起戌逆行十二辰，分于卯酉、会于子午。
 *  厌前干支自相配者为阳将，厌后干支自相配者为阴将，厌后干配厌前支者为阴阳俱将，
 *  厌前干配厌后支者为阴阳不将也。」
 *
 * 两处对表本身的结构校验（逐月程序化核对，见 tests/rule-engine.test.ts）：
 * - 各月所列日支，恰为月厌顺行方向之后五辰，12 个月无一例外，且都不含月厌自身之支，
 *   与卷四《厌对》按语「必干支与厌全不相涉者始为吉日」相合。
 * - 戊只出现在四至九月、己只出现在十至三月，与同条「经曰春冬己不将、秋夏戊不将」相合。
 *
 * 与历例的一处差异：历例六月一项含「戊午」，而卷四同条按语明言「惟六月戊午为逐阵不可用」，
 * 本表据按语剔除该日，其余照历例逐字录入。
 */
const BU_JIANG_BY_MONTH: readonly string[] = [
  '辛亥|辛丑|辛卯|庚子|庚寅|己亥|己丑|己卯|丁亥|丁丑|丁卯|丙子|丙寅',
  '庚戌|庚子|庚寅|己亥|己丑|丁亥|丁丑|丙戌|丙子|丙寅|乙亥|乙丑',
  '己酉|己亥|己丑|丁酉|丁亥|丁丑|丙戌|丙子|乙酉|乙亥|乙丑|甲戌|甲子',
  '丁酉|丁亥|丙申|丙戌|丙子|乙酉|乙亥|甲申|甲戌|甲子|戊申|戊戌|戊子',
  '丙申|丙戌|乙未|乙酉|乙亥|甲申|甲戌|戊申|戊戌|癸未|癸酉|癸亥',
  '乙未|乙酉|甲午|甲申|甲戌|戊申|戊戌|癸未|癸酉|壬午|壬申|壬戌',
  '乙巳|乙未|乙酉|甲午|甲申|戊午|戊申|癸巳|癸未|癸酉|壬午|壬申',
  '甲辰|甲午|甲申|戊辰|戊午|戊申|癸巳|癸未|壬辰|壬午|壬申|辛巳|辛未',
  '戊辰|戊午|癸卯|癸巳|癸未|壬辰|壬午|辛卯|辛巳|辛未|庚辰|庚午',
  '癸卯|癸巳|壬寅|壬辰|壬午|辛卯|辛巳|庚寅|庚辰|庚午|己卯|己巳',
  '壬寅|壬辰|辛丑|辛卯|辛巳|庚寅|庚辰|己丑|己卯|己巳|丁丑|丁卯|丁巳',
  '辛丑|辛卯|庚子|庚寅|庚辰|己丑|己卯|丁丑|丁卯|丙子|丙寅|丙辰',
]

/**
 * 嫁娶规则包：收录卷十一「嫁娶」条目的宜 10 条、忌 20 条。
 *
 * 1.0.0 建立（2026-10-10，影印核对卷十一第 29 帧）。
 * 条目原文宜项「天德、月德、天德合、月德合、天赦、天愿、三合、天喜、六合、不将」，
 * 忌项「月破、平日、收日、闭日、劫煞、灾煞、月煞、月刑、月害、月厌、厌对、大时、天吏、
 * 四废、四忌、四穷、五墓、往亡、八专、亥日」，逐字与同底本转录一致。
 *
 * 需要说明的几处（均经影印核对）：
 * - 「天喜」＝建除之成日（卷四《建除同位异名》「成〈天医 天喜〉」，影印本第 58–59 帧），
 *   与出行包同法，不另立月神表。
 * - 「厌对」＝月厌所冲之辰（卷四《厌对》「天宝历曰厌对者月厌所冲之辰也，其日忌嫁娶」），
 *   同条的「六仪」起例相同而所宜相反，卷四按语已辨其抵牾，本包只取「厌对忌嫁娶」一面。
 *
 * 1.1.0 变更原因：改正「三合」十二月取值（2026-10-10，逐字复核卷六第 10 帧）。
 * - 底本卷六《三合》历例十二月确印作「丑巳」，且与八月（酉月）一项全同；但同条曾门经明言
 *   「巳酉丑金之三合」、同条《考原》定义「各与其月建会成三合局」，丑为丑月月建本身不能与会，
 *   另外十一个月又一律取月建之外的两支。故十二月一项系底本讹字，「丑」为「酉」之误。
 * - 本包按「巳酉」取值，偏离底本字面，理由记入该条 limitations；筛选结果随之变化：
 *   丑月的丑日不再计三合宜（这些日子多与忌项「往亡」同日，原先由「慎」回到「忌」），
 *   丑月的酉日开始计三合宜。表本体在 month-gods.ts，那里同步记录了四条依据。
 * - 同批复核确认底本此页无第二处三合取值表（第 11 帧为该条按语，只论三合之义）。
 *
 * 边界：本包只承接卷十一「嫁娶」一条。同卷另有「结婚姻」「纳采问名」两条各自分列宜忌
 * （两者都多出「五合」、且都不收「不将」「往亡」「厌对」「亥日」），现代「订婚」不可与嫁娶
 * 互相顶替，故不并入本包，事项表亦不为其开查询入口。
 * completeness 为 partial：包内规则条条 verified，条目已收 宜 10/10、忌 20/20，
 * 但「天德」「天德合」二调在四仲月无值日（见各条 limitations），整包尚未达到可判 complete 的程度。
 */
export const MARRIAGE_RULE_PACK: RulePack = {
  id: 'xjbf-marriage',
  version: '1.1.0',
  eventType: 'marriage',
  traditionId: TRADITION,
  status: 'verified',
  completeness: 'partial',
  conflictGroup: CONFLICT_GROUP,
  coverage:
    '嫁娶条目宜项 10 条中收录 10 条（天德、月德、天德合、月德合、天赦、天愿、三合、天喜、六合、不将），忌项 20 条中收录 20 条（月破、平日、收日、闭日、劫煞、灾煞、月煞、月刑、月害、月厌、厌对、大时、天吏、四废、四忌、四穷、五墓、往亡、八专、亥日）。其中天德、天德合在四仲月（二、五、八、十一月）以乾坤艮巽四维记位、不判值日，属各该条自身的适用边界；三合十二月按底本讹字更正为「巳酉」，与底本字面不同。二者详见各该条限制。同卷另有「结婚姻」「纳采问名」两条，宜忌与本条不同，本版本未收录。',
  rules: [
    {
      id: 'xjbf-marriage-0001',
      name: '天德',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天德,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天德」；卷五《天德》「正月丁，二月坤，三月壬，四月辛，五月乾，六月甲，七月癸，八月艮，九月丙，十月乙，十一月巽，十二月庚」`,
      explanation: '天德为三合之气所成之德，八个月取值是天干；嫁娶条目列为宜。',
      limitations: [
        '四仲月（二、五、八、十一月）取值是乾坤艮巽四维之卦，不落实为某一日，本版本在这四个月不判值日。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0002',
      name: '月德',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月德,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「月德」；卷五《月德》「月德者正五九月在丙，二六十月在甲，三七十一月在壬，四八十二月在庚」`,
      explanation: '月德为当月三合局的阳干；嫁娶条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-marriage-0003',
      name: '天德合',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天德合,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天德合」；卷五《天德合》「天德合者合德之神也」及同条历例`,
      explanation: '天德合为天德所合之干；嫁娶条目列为宜。',
      limitations: [
        '四仲月的天德取值是四维之卦，无干可合，本版本在这四个月不判值日。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0004',
      name: '月德合',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月德合,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「月德合」；卷五《月德合》「月德合者正五九月在辛，二六十月在己，三七十一月在丁，四八十二月在乙」`,
      explanation: '月德合为当月月德所合之干；嫁娶条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-marriage-0005',
      name: '天赦',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天赦干,
          },
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天赦支,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天赦」；卷五《天赦》「历例曰春戊寅，夏甲午，秋戊申，冬甲子是也」`,
      explanation: '天赦按季节取完整日柱：春戊寅、夏甲午、秋戊申、冬甲子；嫁娶条目列为宜。',
      limitations: [
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度或农历月。',
        '卷五另录曹震圭的甲己配合之说；按语引《历神原始》判其不足取，本版本从历例。',
      ],
    },
    {
      id: 'xjbf-marriage-0006',
      name: '天愿',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天愿干,
          },
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天愿支,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天愿」；卷五《天愿》编者订正起例（「二十四字中误十三字」）与同条表格`,
      explanation: '天愿取完整日柱，表从卷五编者订正后的起例；嫁娶条目列为宜。',
      limitations: [
        '旧历所传天愿起例与编者订正后的表不同，本版本取订正后的表。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0007',
      name: '三合',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed-set',
            value: MONTH_GOD_TABLES.三合,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「三合」；卷六《三合》「曾门经曰三合者异位而同气也，寅午戌火之三合、巳酉丑金之三合、申子辰水之三合、亥卯未木之三合」及历例「正月在午戌，二月在未亥……十二月在丑巳」（影印本第 10 帧；十二月「丑巳」为底本讹字，本条取「巳酉」，见限制）`,
      explanation: '三合取月建三合局的另外两支；嫁娶条目列为宜。',
      limitations: [
        '每月取两支，故用 month-indexed-set 表达；十一个月按历例逐月录入，十二月按底本讹字处理。',
        '底本历例十二月印作「丑巳」，与八月（酉月）一项全同；同条曾门经作「巳酉丑金之三合」、同条《考原》作「各与其月建会成三合局」，其余十一个月也一律取月建之外的两支，故判定「丑」为「酉」之误，本条取「巳酉」，与底本字面不同。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0008',
      name: '天喜',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['成'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天喜」；卷四《建除同位异名》「成〈天医 天喜〉」及按语「与成日同位」（影印本第 58、59 帧）`,
      explanation: '天喜与建除之成日同位；嫁娶条目列为宜。',
      limitations: [
        '历书另有「春戌夏丑秋辰冬未」的四季说，卷四按语与《选择宗镜》均取与成日同位之说，本版本从之。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0009',
      name: '六合',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.六合,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「六合」；卷六《六合》「神枢经曰六合者日月合宿之辰也，其日宜会宾客、结婚姻、立契券、合交易」及「李鼎祚曰正月在亥，逆行十二辰」（影印本第 54 帧；图见第 53 帧）`,
      explanation: '六合为月建与月将相合之辰（寅月亥、卯月戌……）；嫁娶条目列为宜。',
      limitations: [
        '同条另载异名「无翘」，起例相同而其日忌嫁娶；卷六按语辨其说「义亦不足取」，本版本只取六合为宜。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0010',
      name: '不将',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'dayPillar',
            operator: 'month-indexed-set',
            value: BU_JIANG_BY_MONTH,
          },
        ],
      },
      sourceIds: VOL4_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「不将」；卷四《阴阳不将》「天宝历曰阴阳不将者……厌前干配厌后支者为阴阳不将也」及历例十二个月日柱表（影印本第 107 帧；图见第 105 帧）`,
      explanation: '阴阳不将取月厌顺行方向之后五辰、且干支与月厌不相涉的日柱；嫁娶条目列为宜。',
      limitations: [
        '按日柱取值，故用 dayPillar 事实与 month-indexed-set 表达；表按历例逐月录入。',
        '历例六月一项含「戊午」，同条按语明言「惟六月戊午为逐阵不可用」，本版本据按语剔除该日。',
        '卷四按语指出不将「乃堪舆家之吉日，凡事可用，非仅施之嫁娶也」；本版本只在嫁娶条目下使用，不推广到其它事项。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0011',
      name: '月破',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['破'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月破」；卷四《建除同位异名》「破〈大耗〉」及「考原曰月破者月建所冲之日也，与岁破义同」（影印本第 54 帧）`,
      explanation: '月破为月建所冲之日，即建除之破日；嫁娶条目列为忌。',
      limitations: [
        '卷四《建除同位异名》以「大耗」为破日异名，本条已含大耗，不另立一条、不重复计忌。',
        '交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。',
      ],
    },
    {
      id: 'xjbf-marriage-0012',
      name: '平日',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['平'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「平日」；卷四《建除十二神》`,
      explanation: '平日为建后第四位，嫁娶条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0013',
      name: '收日',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['收'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「收日」；卷四《建除十二神》`,
      explanation: '收日为建除第十位，嫁娶条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0014',
      name: '闭日',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['闭'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「闭日」；卷四《建除十二神》`,
      explanation: '闭日为建除第十二位，嫁娶条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-marriage-0015',
      name: '劫煞',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.劫煞,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「劫煞」；卷六《劫煞》「李鼎祚曰正月起亥，逆行四孟」（影印本第 24 帧）`,
      explanation: '劫煞为月三合绝气之位；嫁娶条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-marriage-0016',
      name: '灾煞',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.灾煞,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「灾煞」；卷六《灾煞》按语「天狱正月起子，顺行四仲……应逆行四仲，而今顺行者，流传之误也。其说是，今从之」`,
      explanation: '灾煞为月三合胎气之位（火胎于子等）；卷六订正旧历「天狱」顺行之误，取逆行。',
      limitations: [
        '卷六明载旧历作「顺行四仲」属流传之误，本版本从编者订正后的逆行，不采用现代黄历常见的顺行说法。',
        '卷六另载「天狱」，编者判其即灾煞，不另立一条、不重复计忌。',
      ],
    },
    {
      id: 'xjbf-marriage-0017',
      name: '月煞',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月煞,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月煞」；卷六《月煞》「历例曰月煞者正月起丑，逆行四季」（影印本第 34 帧）`,
      explanation: '月煞自正月起丑、逆行四季；嫁娶条目列为忌。',
      limitations: [
        '卷六另载异名「月虚」，起例相同，按语说明二者同位；只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0018',
      name: '月刑',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月刑,
          },
        ],
      },
      sourceIds: MOVE_PUNISHMENT_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月刑」；卷六《月刑》「按月刑之义与岁刑同，详见岁刑条下」（影印本第 36 帧）；卷三《岁刑》曾门经「子刑卯、丑刑戌、寅刑巳、卯刑子、巳刑申、未刑丑、申刑寅、戌刑未，辰午酉亥为自刑也」（影印本第 106 帧）`,
      explanation: '月刑为当月月建所刑之辰，起例与岁刑同；嫁娶条目列为忌。',
      limitations: [
        '卷六本条无自身起例，全部依据在卷三岁刑条下，故来源同时挂卷三、卷六两处。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0019',
      name: '月害',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月害,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月害」；卷六《月害》《神枢经》「月害者阳建所害之辰也」及「历例曰正月起巳，逆行十二辰」（影印本第 38 帧）`,
      explanation: '月害为阳建所害之辰（六害之辰）；嫁娶条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-marriage-0020',
      name: '月厌',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月厌,
          },
        ],
      },
      sourceIds: VOL4_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月厌」；卷四《月厌》「历例曰月厌者正月在戌，逆行十二辰」（影印本第 95 帧）`,
      explanation: '月厌为阴建之辰，正月在戌、逐月逆行十二辰；嫁娶条目列为忌。',
      limitations: [
        '异名「地火」起例相同，按语称「地火即是月厌」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0021',
      name: '厌对',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.厌对,
          },
        ],
      },
      sourceIds: VOL4_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「厌对」；卷四《厌对》「天宝历曰厌对者月厌所冲之辰也，其日忌嫁娶」及「历例曰厌对者正月起辰，逆行十二辰」（影印本第 103 帧）`,
      explanation: '厌对为月厌所冲之辰（正月在辰、逐月逆行）；嫁娶条目列为忌。',
      limitations: [
        '异名「六仪」起例相同，卷四却谓其宜结亲纳礼，与厌对相反；同条按语已辨此抵牾，本版本只取用事条目的忌嫁娶一面。',
        '异名「招摇」同条称忌乘船渡水，不属嫁娶条目，本版本不据此判日。',
      ],
    },
    {
      id: 'xjbf-marriage-0022',
      name: '大时',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.大时,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「大时」；卷六《大时》历例（影印本第 42 帧；图见第 41 帧）`,
      explanation: '大时为月建三合沐浴之辰；嫁娶条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-marriage-0023',
      name: '天吏',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天吏,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「天吏」；卷六《天吏》「历例曰天吏者正月起酉，逆行四仲」（影印本第 50 帧）`,
      explanation: '天吏为月三合死气之位；嫁娶条目列为忌。',
      limitations: [
        '卷六另载异名「致死」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-marriage-0024',
      name: '四废',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'stemElement',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四废,
          },
          {
            fact: 'branchElement',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四废,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「四废」；卷五《四废》「历例曰春庚申辛酉，夏壬子癸亥，秋甲寅乙卯，冬丙午丁巳」及曹震圭「四废者干支俱绝也」（影印本第 84 帧）`,
      explanation: '四废为干支俱绝之辰（春庚申辛酉等）；嫁娶条目列为忌。',
      limitations: [
        '本条按「日干与日支同属一季所废之行」判定。因六十甲子必阳干配阳支、阴干配阴支，该条件与历例所举的两支日柱一一对应，不多判也不少判。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-marriage-0025',
      name: '四忌',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四忌干,
          },
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'in',
            value: ['子'],
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「四忌」；卷五《四忌》「神煞起例曰四忌春甲子、夏丙子、秋庚子、冬壬子」及按语「四忌日以本令阳干加于辰首也」（影印本第 85、86 帧）`,
      explanation: '四忌为本令阳干临子（春甲子、夏丙子、秋庚子、冬壬子）；嫁娶条目列为忌。',
      limitations: [
        '按语「本令阳干加于辰首」与历例所举四日柱互为印证，本条按历例逐字取干、支固定为子。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-marriage-0026',
      name: '四穷',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四穷干,
          },
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四穷支,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「四穷」；卷五《四穷》「总要历曰四穷者……历例曰春乙亥，夏丁亥，秋辛亥，冬癸亥」（影印本第 85 帧）`,
      explanation: '四穷为本令阴干临亥（春乙亥、夏丁亥、秋辛亥、冬癸亥）；嫁娶条目列为忌。',
      limitations: [
        '四季皆临亥，故支表十二月同值；表仍按原文逐月列出，不做缩写。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-marriage-0027',
      name: '五墓',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.五墓干,
          },
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.五墓支,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「五墓」；卷五《五墓》「历例曰五墓者正月二月乙未，四月五月丙戌，七月八月辛丑，十月十一月壬辰，四季月戊辰也」（影印本第 81 帧）`,
      explanation: '五墓为五行旺干自临墓辰；嫁娶条目列为忌。',
      limitations: ['季节月（三、六、九、十二月）取戊辰，与四季各月的取值不同，表按原文逐月列出。'],
    },
    {
      id: 'xjbf-marriage-0028',
      name: '往亡',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.往亡,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「往亡」；卷六《往亡》起例「火月（寅午戌）顺行寅卯辰，木月（卯未亥）顺行巳午未，水月（辰申子）顺行申酉戌，金月（巳酉丑）顺行亥子丑」`,
      explanation: '往亡按月三合局顺行三辰，嫁娶条目列为忌。',
      limitations: [
        '月按节令月划分；交节日整日按新月取值。',
        '卷六按语引宋武帝「我往则彼亡」之事，仍判「不必以一事之无验而遽谓其可废」，本条从编者保留之说。',
      ],
    },
    {
      id: 'xjbf-marriage-0029',
      name: '八专',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          { fact: 'dayPillar', operator: 'in', value: ['丁未', '己未', '庚申', '甲寅', '癸丑'] },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「八专」；卷五《八专》「曾门经曰八专日忌出军、嫁娶，丁未、己未、庚申、甲寅、癸丑也」及按语「八专而止五日者，十干所寄止于八支……忌嫁娶者，阴阳同居则无别也」（影印本第 107 帧）`,
      explanation:
        '八专为丁未、己未、庚申、甲寅、癸丑五日，其忌嫁娶见于《曾门经》；嫁娶条目列为忌。',
      limitations: [
        '条名作「八专」而编者明言「止五日」，本条按编者所列的五日取用。',
        '同一按语又驳「专日所忌止在行军」之说，但仍保留忌嫁娶一面，本版本从条目列项。',
      ],
    },
    {
      id: 'xjbf-marriage-0030',
      name: '亥日',
      traditionId: TRADITION,
      eventType: 'marriage',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'ganzhi.dayCivil.branch', operator: 'in', value: ['亥'] }] },
      sourceIds: BRANCH_ONLY_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「亥日」`,
      explanation: '嫁娶条目直接把亥日列为忌，不附起例。',
      limitations: [
        '本条是条目自带的日支忌，不是月神或建除，故只引卷十一，不挂义例各卷。',
        '原书未给出该条的理由，本版本不代为解释。',
      ],
    },
  ] satisfies readonly RuleDefinition[],
}
