import type { RuleDefinition, RulePack } from '../../types/rule'
import { MONTH_GOD_TABLES } from './month-gods'

const TRADITION = 'xjbf-default'
const CONFLICT_GROUP = 'engagement-day-selection'
/** 建除类条款：卷十一把该项列入结婚姻条目，卷四是建除十二神的起例与同位异名。 */
const JIANCHU_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 月神类条款：卷十一把该项列入结婚姻条目，卷五「义例三」是该神煞起例的定义处。 */
const MONTH_GOD_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol5-scan'] as const
/** 卷六类条款：卷十一列项，卷六「义例四」定义。卷次不同，不得与卷五混挂。 */
const VOL6_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol6-scan'] as const
/** 月建、月厌的起例在卷四；卷次不同，不得挂到卷五、卷六。 */
const VOL4_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 月刑：卷十一列项，卷六只说「与岁刑同」，起例在卷三「义例一」的岁刑条下。三处缺一不可。 */
const MOVE_PUNISHMENT_SOURCE_IDS = [
  'src-xjbf-vol11-scan',
  'src-xjbf-vol6-scan',
  'src-xjbf-vol3-scan',
] as const

const TITLE_LOCATOR = '卷十一「结婚姻」（影印本第 27、28 帧）'

/**
 * 结婚姻规则包：收录卷十一「结婚姻」条目的宜 14 条、忌 20 条。
 * 本包对应事项「订婚」；现代词只是界面别名，不改变条目含义。
 *
 * 1.0.1 变更原因：天德四仲月定案（2026-10-12，见审计 §8.12）。
 * 底本月表在二月、十一月同样只记卦位，加上已核的五月乾、八月艮，四仲月四张月表齐备；
 * 天德合按语「四仲之月天德居四維故無合也」亦经影印复核（卷五第 26 帧）。
 * 只改「天德」「天德合」两条限制语，取值与筛选结果不变。
 *
 * 1.0.0 建立（2026-10-12，影印核对卷十一第 27、28 帧）。
 * 条目原文宜项「天德、月德、天德合、月德合、天赦、天愿、月恩、四相、时德、民日、三合、
 * 天喜、六合、五合」，忌项「月建、月破、平日、收日、满日、闭日、劫煞、灾煞、月煞、月刑、
 * 月害、月厌、大时、天吏、四废、四忌、四穷、五墓、五离、八专」，逐字与同底本转录一致。
 *
 * 需要说明的几处（均经影印核对）：
 * - 「天喜」＝建除之成日（卷四《建除同位异名》「成〈天医 天喜〉」，影印本第 58–59 帧），
 *   与出行、嫁娶两包同法，不另立月神表。
 * - 「五合」＝寅卯日（卷五《五合》历例，影印本第 114 帧），是固定日支、不随月建变化；
 *   同条曹震圭以戌亥立论，编者按语已言「未详其义」，本包取历例。
 * - 「五离」＝申酉日（卷五《五离〈除神〉》历例，影印本第 116 帧），与五合相对；异名「除神」
 *   另有沐浴祓除之用，本包只取用事条目的忌项。
 * - 「月建」＝建除之建日（卷四《月建》历例「正月建寅，顺行十二辰」，影印本第 88 帧）；
 *   卷四明言其日「不宜兴造土功、结亲礼」，与条目列项一致，本包按建日取值。
 *
 * 1.1.0 变更原因：整包改判 complete、事项升 supported（2026-10-12）。
 * 判据：条目收全 ＋ 卷十裁决例外逐条落实 ＋ 未给依据者如实标注；见审计 §6.1.1。
 *
 * 边界：本包只承接卷十一「结婚姻」一条。同卷另有「嫁娶」「纳采问名」两条各自分列宜忌，
 * 现代「订婚」不可与嫁娶互相顶替，故不并入本包，也不并入「婚嫁」事项。
 * completeness 为 complete（2026-10-12 改判）：条目已收全，卷十的裁决例外（解除、定忌、
 * 转致、整日诸事皆忌）亦逐条落实；仍如实标注的边界有天德四仲月不判值日与巳日、亥日这类
 * 用事自带的日支忌（原书未给裁决依据，按常例处理），见审计 §6.1.1。
 */
export const ENGAGEMENT_RULE_PACK: RulePack = {
  id: 'xjbf-engagement',
  version: '1.1.0',
  eventType: 'engagement',
  traditionId: TRADITION,
  status: 'verified',
  completeness: 'complete',
  conflictGroup: CONFLICT_GROUP,
  coverage:
    '结婚姻条目宜项 14 条中收录 14 条（天德、月德、天德合、月德合、天赦、天愿、月恩、四相、时德、民日、三合、天喜、六合、五合），忌项 20 条中收录 20 条（月建、月破、平日、收日、满日、闭日、劫煞、灾煞、月煞、月刑、月害、月厌、大时、天吏、四废、四忌、四穷、五墓、五离、八专）。其中天德、天德合在四仲月（二、五、八、十一月）以乾坤艮巽四维记位、不判值日，属各该条自身的适用边界；三合十二月按底本讹字更正为「巳酉」，与底本字面不同。二者详见各该条限制。同卷另有分列的「嫁娶」「纳采问名」两条，宜忌与本条不同，本版本未并入本条。',
  rules: [
    {
      id: 'xjbf-engagement-0001',
      name: '天德',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '天德为三合之气所成之德，八个月取值是天干；结婚姻条目列为宜。',
      limitations: [
        '四仲月（二、五、八、十一月）取值是乾坤艮巽四维之卦，不落实为某一日；底本自身的月表在这四个月也只记卦位，本版本据底本不判值日。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0002',
      name: '月德',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '月德为当月三合局的阳干；结婚姻条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-engagement-0003',
      name: '天德合',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '天德合为天德所合之干；结婚姻条目列为宜。',
      limitations: [
        '四仲月的天德取值是四维之卦，无干可合；卷五《天德合》按语即言「四仲之月天德居四維故無合也」，本版本据底本不判值日。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0004',
      name: '月德合',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '月德合为当月月德所合之干；结婚姻条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-engagement-0005',
      name: '天赦',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '天赦按季节取完整日柱：春戊寅、夏甲午、秋戊申、冬甲子；结婚姻条目列为宜。',
      limitations: [
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度或农历月。',
        '卷五另录曹震圭的甲己配合之说；按语引《历神原始》判其不足取，本版本从历例。',
      ],
    },
    {
      id: 'xjbf-engagement-0006',
      name: '天愿',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '天愿取完整日柱，表从卷五编者订正后的起例；结婚姻条目列为宜。',
      limitations: [
        '旧历所传天愿起例与编者订正后的表不同，本版本取订正后的表。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0007',
      name: '月恩',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.月恩,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「月恩」；卷五《月恩》「历例曰月恩者正月丙，二月丁，三月庚，四月己，五月戊，六月辛，七月壬，八月癸，九月庚，十月乙，十一月甲，十二月辛」`,
      explanation: '月恩取月建五行所生之干；结婚姻条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-engagement-0008',
      name: '四相',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'stemElement',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四相,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「四相」；卷五《四相》「历例曰春丙丁，夏戊己，秋壬癸，冬甲乙」`,
      explanation: '四相按季节取当旺之行所生的一对天干（春木生火取丙丁等）；结婚姻条目列为宜。',
      limitations: [
        '卷五按语：「四相取天干，时德取地支。」故本条读日干所属五行，与读日支的时德同义而字段不同。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度。',
      ],
    },
    {
      id: 'xjbf-engagement-0009',
      name: '时德',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.时德,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「时德」；卷五《时德》「历例曰春午，夏辰，秋子，冬寅」`,
      explanation: '时德按季节取当旺之辰（又名四时天德）；结婚姻条目列为宜。',
      limitations: [
        '卷五按语：「四相取天干，时德取地支。」故本条读日支。',
        '季节按节令月划分，不按公历季度。',
      ],
    },
    {
      id: 'xjbf-engagement-0010',
      name: '民日',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.民日,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「民日」；卷五《王官守相民日》「民日者春午夏酉秋子冬卯」（影印本第 69 帧）`,
      explanation: '民日按季节取辰（春午、夏酉、秋子、冬卯）；结婚姻条目列为宜。',
      limitations: [
        '曹震圭以「四时死绝之辰」解释民日，同卷按语否定该说但未改取值，本版本只取取值。',
        '季节按节令月划分，不按公历季度。',
      ],
    },
    {
      id: 'xjbf-engagement-0011',
      name: '三合',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '三合取月建三合局的另外两支；结婚姻条目列为宜。',
      limitations: [
        '每月取两支，故用 month-indexed-set 表达；十一个月按历例逐月录入，十二月按底本讹字处理。',
        '底本历例十二月印作「丑巳」，与八月（酉月）一项全同；同条曾门经作「巳酉丑金之三合」、同条《考原》作「各与其月建会成三合局」，其余十一个月也一律取月建之外的两支，故判定「丑」为「酉」之误，本条取「巳酉」，与底本字面不同。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-engagement-0012',
      name: '天喜',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['成'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天喜」；卷四《建除同位异名》「成〈天医 天喜〉」及按语「与成日同位」（影印本第 58、59 帧）`,
      explanation: '天喜与建除之成日同位；结婚姻条目列为宜。',
      limitations: [
        '历书另有「春戌夏丑秋辰冬未」的四季说，卷四按语与《选择宗镜》均取与成日同位之说，本版本从之。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0013',
      name: '六合',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '六合为月建与月将相合之辰（寅月亥、卯月戌……）；结婚姻条目列为宜。',
      limitations: [
        '同条另载异名「无翘」，起例相同而其日忌嫁娶；卷六按语辨其说「义亦不足取」，本版本只取六合为宜。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-engagement-0014',
      name: '五合',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'ganzhi.dayCivil.branch', operator: 'in', value: ['寅', '卯'] }] },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「五合」；卷五《五合》「枢要历曰五合者月内良日也，其日宜结婚姻、会亲友、立券交易」及「历例曰五合者寅卯日也」（影印本第 113、114 帧）`,
      explanation: '五合取寅卯二日，原书称其为月内良日、宜结婚姻；结婚姻条目列为宜。',
      limitations: [
        '本条是固定日支，不随月建变化；全月逢寅日、卯日即为五合。',
        '同条曹震圭以戌亥立论，编者按语已言「未详其义」，本版本取历例的寅卯二日。',
      ],
    },
    {
      id: 'xjbf-engagement-0015',
      name: '月建',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['建'] }] },
      sourceIds: VOL4_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月建」；卷四《月建》「天宝历曰月建者阳建之神也……所值之日宜封建视事，不宜兴造土功、结亲礼」及「历例曰正月建寅，顺行十二辰」（影印本第 88、89 帧）`,
      explanation: '月建为当月月建之支，即建除之建日；卷四明言其日不可结亲礼，结婚姻条目亦列为忌。',
      limitations: [
        '月建与建除十二神的建日同值一日，本条按建日取值，不另立月神表。',
        '卷四把「结亲礼」与兴造土功并列为所忌，本条只按用事条目「结婚姻」的列项判日，不推广到其它事项。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0016',
      name: '月破',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['破'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月破」；卷四《建除同位异名》「破〈大耗〉」及「考原曰月破者月建所冲之日也，与岁破义同」（影印本第 54 帧）`,
      explanation: '月破为月建所冲之日，即建除之破日；结婚姻条目列为忌。',
      limitations: [
        '卷四《建除同位异名》以「大耗」为破日异名，本条已含大耗，不另立一条、不重复计忌。',
        '交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。',
      ],
    },
    {
      id: 'xjbf-engagement-0017',
      name: '平日',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['平'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「平日」；卷四《建除十二神》`,
      explanation: '平日为建后第四位，结婚姻条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0018',
      name: '收日',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['收'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「收日」；卷四《建除十二神》`,
      explanation: '收日为建除第十位，结婚姻条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0019',
      name: '满日',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['满'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「满日」；卷四《建除十二神》`,
      explanation: '满日为建后第二位，结婚姻条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0020',
      name: '闭日',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['闭'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「闭日」；卷四《建除十二神》`,
      explanation: '闭日为建除第十二位，结婚姻条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-engagement-0021',
      name: '劫煞',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '劫煞为月三合绝气之位；结婚姻条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-engagement-0022',
      name: '灾煞',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      id: 'xjbf-engagement-0023',
      name: '月煞',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '月煞自正月起丑、逆行四季；结婚姻条目列为忌。',
      limitations: [
        '卷六另载异名「月虚」，起例相同，按语说明二者同位；只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-engagement-0024',
      name: '月刑',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '月刑为当月月建所刑之辰，起例与岁刑同；结婚姻条目列为忌。',
      limitations: [
        '卷六本条无自身起例，全部依据在卷三岁刑条下，故来源同时挂卷三、卷六两处。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-engagement-0025',
      name: '月害',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '月害为阳建所害之辰（六害之辰）；结婚姻条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-engagement-0026',
      name: '月厌',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '月厌为阴建之辰，正月在戌、逐月逆行十二辰；结婚姻条目列为忌。',
      limitations: [
        '异名「地火」起例相同，按语称「地火即是月厌」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-engagement-0027',
      name: '大时',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '大时为月建三合沐浴之辰；结婚姻条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-engagement-0028',
      name: '天吏',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '天吏为月三合死气之位；结婚姻条目列为忌。',
      limitations: [
        '卷六另载异名「致死」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-engagement-0029',
      name: '四废',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '四废为干支俱绝之辰（春庚申辛酉等）；结婚姻条目列为忌。',
      limitations: [
        '本条按「日干与日支同属一季所废之行」判定。因六十甲子必阳干配阳支、阴干配阴支，该条件与历例所举的两支日柱一一对应，不多判也不少判。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-engagement-0030',
      name: '四忌',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '四忌为本令阳干临子（春甲子、夏丙子、秋庚子、冬壬子）；结婚姻条目列为忌。',
      limitations: [
        '按语「本令阳干加于辰首」与历例所举四日柱互为印证，本条按历例逐字取干、支固定为子。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-engagement-0031',
      name: '四穷',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '四穷为本令阴干临亥（春乙亥、夏丁亥、秋辛亥、冬癸亥）；结婚姻条目列为忌。',
      limitations: [
        '四季皆临亥，故支表十二月同值；表仍按原文逐月列出，不做缩写。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-engagement-0032',
      name: '五墓',
      traditionId: TRADITION,
      eventType: 'engagement',
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
      explanation: '五墓为五行旺干自临墓辰；结婚姻条目列为忌。',
      limitations: ['季节月（三、六、九、十二月）取戊辰，与四季各月的取值不同，表按原文逐月列出。'],
    },
    {
      id: 'xjbf-engagement-0033',
      name: '五离',
      traditionId: TRADITION,
      eventType: 'engagement',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'ganzhi.dayCivil.branch', operator: 'in', value: ['申', '酉'] }] },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「五离」；卷五《五离〈除神〉》「枢要历曰五离者月中离神也，其日忌结婚姻、会亲友、作交关、立契券」及「历例曰五离者申酉日是也」（影印本第 115、116 帧）`,
      explanation: '五离取申酉二日，为月中离神、与五合相对；结婚姻条目列为忌。',
      limitations: [
        '本条是固定日支，不随月建变化；全月逢申日、酉日即为五离。',
        '异名「除神」，《考原》引通书谓其宜沐浴祓除灾眚；本版本只取用事条目的忌项，不据以判宜。',
      ],
    },
    {
      id: 'xjbf-engagement-0034',
      name: '八专',
      traditionId: TRADITION,
      eventType: 'engagement',
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
        '八专为丁未、己未、庚申、甲寅、癸丑五日；卷五引《曾门经》言其忌嫁娶，结婚姻条目亦列为忌。',
      limitations: [
        '条名作「八专」而编者明言「止五日」，本条按编者所列的五日取用。',
        '同一按语又驳「专日所忌止在行军」之说，但仍保留忌嫁娶一面；结婚姻条目同样列入忌项，本版本从条目列项。',
      ],
    },
  ] satisfies readonly RuleDefinition[],
}
