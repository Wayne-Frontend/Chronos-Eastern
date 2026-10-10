import type { RuleDefinition, RulePack } from '../../types/rule'
import { MONTH_GOD_TABLES } from './month-gods'

const TRADITION = 'xjbf-default'
const CONFLICT_GROUP = 'opening-day-selection'
/** 建除类条款：卷十一把该项列入开市条目，卷四是建除十二神的起例与同位异名。 */
const JIANCHU_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 月神类条款：卷十一把该项列入开市条目，卷五「义例三」是该神煞起例的定义处。 */
const MONTH_GOD_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol5-scan'] as const
/** 卷六类条款：卷十一列项，卷六「义例四」定义。卷次不同，不得与卷五混挂。 */
const VOL6_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol6-scan'] as const
/** 月厌的起例在卷四《月厌》，不在卷五、卷六；卷次不同，不得混挂。 */
const MONTH_YAN_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 月刑：卷十一列项，卷六只说「与岁刑同」，起例在卷三「义例一」的岁刑条下。三处缺一不可。 */
const MOVE_PUNISHMENT_SOURCE_IDS = [
  'src-xjbf-vol11-scan',
  'src-xjbf-vol6-scan',
  'src-xjbf-vol3-scan',
] as const

const TITLE_LOCATOR = '卷十一「开市」'

/**
 * 开市规则包：收录卷十一「开市」条目的宜 6 条、忌 19 条。
 *
 * 1.0.0 建立（2026-10-10，影印核对卷十一第 41–42 帧，即第 29–30 叶）。
 * 条目原文宜项「天愿、民日、满日、成日、开日、五富」，
 * 忌项「月破、大耗、平日、收日、闭日、劫煞、灾煞、月煞、月刑、月害、月厌、大时、天吏、
 * 小耗、四耗、四废、四穷、五墓、九空」，逐字与同底本转录一致。
 *
 * 两条需要归并的异名（均经影印核对）：
 * - 「大耗」＝「月破」。卷四《大耗》「历例曰大耗者正月起申，顺行十二辰」，
 *   曹震圭曰「大耗者月建击冲破散之辰也，与月破同位」（卷四第 54 帧）；
 *   卷四《建除同位异名》作「破〈大耗〉」；卷六《月煞〈月虚〉》按语亦称「犹破日之又名大耗也」
 *   （卷六第 34 帧）。故与「月破」合并为一条规则，不重复计日。
 * - 「小耗」＝「执日」。卷四《建除同位异名》作「执〈枝德 小耗〉」（卷四第 49 帧图版），
 *   卷四《小耗》「历例曰小耗者常居月建前五辰」（卷四第 50 帧）——「月建前五辰」正合执日
 *   （建、除、满、平、定、执恰为前五辰）。同帧又载其「其日忌经营种莳纳财交易开市」，
 *   与卷十一把「小耗」列入开市忌项一致。故按建除表达，不另立月神表。
 *
 * 边界：交节当天整日按新月计算（卷四「每月交节则叠两值日」的并存之说本版本未采用）。
 */
export const OPENING_RULE_PACK: RulePack = {
  id: 'xjbf-opening',
  version: '1.0.0',
  eventType: 'opening',
  traditionId: TRADITION,
  status: 'verified',
  completeness: 'partial',
  conflictGroup: CONFLICT_GROUP,
  coverage:
    '开市条目宜项 6 条中收录 6 条（天愿、民日、满日、成日、开日、五富），忌项 19 条中收录 19 条（月破、大耗、平日、收日、闭日、劫煞、灾煞、月煞、月刑、月害、月厌、大时、天吏、小耗、四耗、四废、四穷、五墓、九空）。其中「大耗」与「月破」同为破日、「小耗」即执日，二者已归并到对应规则，不重复计日。',
  rules: [
    {
      id: 'xjbf-opening-0001',
      name: '满日',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['满'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「满日」；卷四《建除十二神》`,
      explanation: '满日为建后第二位，开市条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-opening-0002',
      name: '成日',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['成'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「成日」；卷四《建除十二神》`,
      explanation: '成日为建后第八位，开市条目列为宜。',
      limitations: [
        '卷四《建除同位异名》「成〈天医 天喜〉」另载异名，本包只按成日取值，不因异名重复计宜。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-opening-0003',
      name: '开日',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['开'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「开日」；卷四《建除十二神》`,
      explanation:
        '开日为建后第十位，开市条目列为宜；条目名与事项同用「开」字，但取值取自建除，不是因字面相同。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-opening-0004',
      name: '天愿',
      traditionId: TRADITION,
      eventType: 'opening',
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
      locator: `${TITLE_LOCATOR}宜项「天愿」；卷五《天愿》编者订正起例「正月乙亥，二月甲戌，三月乙酉，四月丙申，五月丁未，六月戊午，七月己巳，八月庚辰，九月辛卯，十月壬寅，十一月癸丑，十二月甲子」`,
      explanation: '天愿按月取完整日柱，开市条目列为宜。',
      limitations: ['卷五《天愿》原文起例经编者订正，本包取订正后的取值。'],
    },
    {
      id: 'xjbf-opening-0005',
      name: '民日',
      traditionId: TRADITION,
      eventType: 'opening',
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
      explanation: '民日按季取一辰（春午、夏酉、秋子、冬卯），开市条目列为宜。',
      limitations: [
        '同条历例把王、官、相、民、守五日并列出值，其中王日与官日的名字被编者对调；民日未涉对调，直接取用。',
        '曹震圭以「四时死绝之辰」解释民日，第 74 帧按语否定该说但未改取值，本包只取取值。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0006',
      name: '五富',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.五富,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「五富」；卷六《五富》「历例曰正月起亥，顺行四孟」（影印本第 62 帧）`,
      explanation: '五富自正月起亥、顺行四孟（寅巳申亥），四个月一循环；开市条目列为宜。',
      limitations: [
        '同条按语另存一说（逆行四孟、取三合父母之长生）并称「其说亦通故附存之」；本包取正文历例的顺行四孟。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0007',
      name: '月破',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['破'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月破」；卷四《建除十二神》「破」及《建除同位异名》「破〈大耗〉」引《考原》「月破者月建所冲之日也」`,
      explanation:
        '月破即建除之破日，为月建所冲之日，开市条目列为忌。条目忌项另列「大耗」，经卷四《大耗》「与月破同位」定为月破异名，合并在本条不重复计日。',
      limitations: [
        '「大耗」不是独立神煞：卷四《大耗》原文「历例曰大耗者正月起申，顺行十二辰」与破日同值，曹震圭明言「与月破同位」；卷三《岁破〈大耗〉》按语亦称「大耗即系岁破而复以大耗名者」。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-opening-0008',
      name: '平日',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['平'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「平日」；卷四《建除十二神》`,
      explanation: '平日为建后第三位，开市条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-opening-0009',
      name: '收日',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['收'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「收日」；卷四《建除十二神》`,
      explanation: '收日为建后第九位，开市条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-opening-0010',
      name: '闭日',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['闭'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「闭日」；卷四《建除十二神》`,
      explanation: '闭日为建后第十一位，开市条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-opening-0011',
      name: '小耗',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['执'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「小耗」；卷四《建除同位异名》「执〈枝德 小耗〉」（影印本第 49 帧图版）；同条「历例曰小耗者常居月建前五辰」（影印本第 50 帧）`,
      explanation: '小耗即建除之执日（建、除、满、平、定、执恰为月建前五辰），开市条目列为忌。',
      limitations: [
        '卷四「小耗者常居月建前五辰」与《建除同位异名》「执〈枝德 小耗〉」两说同值，本包按执日表达，不另立月神表。',
        '同条又载「其日忌经营种莳纳财交易开市」，与本条被列入开市忌项一致。',
        '卷五至卷八「义例」各卷均无「小耗」条目，其定义只见于卷四。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-opening-0012',
      name: '劫煞',
      traditionId: TRADITION,
      eventType: 'opening',
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
      locator: `${TITLE_LOCATOR}忌项「劫煞」；卷六《劫煞》「李鼎祚曰正月起亥，逆行四孟」`,
      explanation: '劫煞正月起亥、逆行四孟，开市条目列为忌。本条是月劫煞，非岁劫煞。',
      limitations: ['按语说明「月劫煞义与岁劫煞同」，本条取月劫煞，不得与岁劫煞混用。'],
    },
    {
      id: 'xjbf-opening-0013',
      name: '灾煞',
      traditionId: TRADITION,
      eventType: 'opening',
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
      explanation: '灾煞正月起子、逆行四仲，开市条目列为忌。',
      limitations: ['旧历「天狱顺行四仲」之说经按语判为流传之误，本包取逆行。'],
    },
    {
      id: 'xjbf-opening-0014',
      name: '月煞',
      traditionId: TRADITION,
      eventType: 'opening',
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
      locator: `${TITLE_LOCATOR}忌项「月煞」；卷六《月煞》「历例曰月煞者正月起丑，逆行四季」`,
      explanation: '月煞正月起丑、逆行四季，开市条目列为忌。',
      limitations: ['异名「月虚」起例相同，按语说明二者同位，只录一次、不重复计忌。'],
    },
    {
      id: 'xjbf-opening-0015',
      name: '月刑',
      traditionId: TRADITION,
      eventType: 'opening',
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
      explanation:
        '月刑取当月月建所刑之辰（岁刑同例），辰午酉亥四个月为自刑、即与月建同支；开市条目列为忌。',
      limitations: [
        '本条起例不在卷六本身：卷六只说「与岁刑同」，取值须以卷三岁刑条为准，来源同时挂卷三。',
        '辰、午、酉、亥四个月为自刑，月刑与月建同支，与其余八个月的性质不同。',
      ],
    },
    {
      id: 'xjbf-opening-0016',
      name: '月害',
      traditionId: TRADITION,
      eventType: 'opening',
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
      explanation: '月害为月建所害之辰，正月起巳、逆行十二辰；开市条目列为忌。',
      limitations: [
        '曹震圭以六害立说（卯辰相害、寅巳相害……），与逐月逆行一支的取法逐项吻合。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0017',
      name: '月厌',
      traditionId: TRADITION,
      eventType: 'opening',
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
      sourceIds: MONTH_YAN_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月厌」；卷四《月厌》「历例曰月厌者正月在戌，逆行十二辰」（影印本第 95 帧）`,
      explanation: '月厌为阴建之辰，正月在戌、逐月逆行十二辰；开市条目列为忌。',
      limitations: [
        '异名「地火」起例相同，按语称「地火即是月厌」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0018',
      name: '大时',
      traditionId: TRADITION,
      eventType: 'opening',
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
      locator: `${TITLE_LOCATOR}忌项「大时」；卷六《大时》「李鼎祚曰大时者正月起卯，逆行四仲」`,
      explanation: '大时正月起卯、逆行四仲，开市条目列为忌。',
      limitations: ['异名「大败」「咸池」起例相同，只录一次、不重复计忌。'],
    },
    {
      id: 'xjbf-opening-0019',
      name: '天吏',
      traditionId: TRADITION,
      eventType: 'opening',
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
      locator: `${TITLE_LOCATOR}忌项「天吏」；卷六《天吏》「历例曰天吏者正月起酉，逆行四仲」`,
      explanation: '天吏正月起酉、逆行四仲，开市条目列为忌。',
      limitations: ['异名「致死」起例相同，只录一次、不重复计忌。'],
    },
    {
      id: 'xjbf-opening-0020',
      name: '四耗',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.stem',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四耗干,
          },
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.四耗支,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「四耗」；卷五《四耗》「历例曰春壬子，夏乙卯，秋戊午，冬辛酉」（影印本第 83 帧）`,
      explanation: '四耗按季取完整日柱（春壬子、夏乙卯、秋戊午、冬辛酉），开市条目列为忌。',
      limitations: [
        '《总要历》曰「四耗者谓四时休干临分至之辰也」，《考原》曰「四耗日固是休干亦休支也」——同季干支同五行，但本包仍按原文逐字取干支，不做五行化简。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0021',
      name: '四废',
      traditionId: TRADITION,
      eventType: 'opening',
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
      explanation: '四废按季取干支俱绝之日，开市条目列为忌。',
      limitations: [
        '同季两支同五行，六十甲子必阳干配阳支、阴干配阴支，故「日干属某行 且 日支属某行」恰好等于该季那两支，不会多判。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0022',
      name: '四穷',
      traditionId: TRADITION,
      eventType: 'opening',
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
      locator: `${TITLE_LOCATOR}忌项「四穷」；卷五《四穷》「历例曰春乙亥，夏丁亥，秋辛亥，冬癸亥」（影印本第 85 帧）`,
      explanation: '四穷按季取日柱，四季皆临亥（春乙亥、夏丁亥、秋辛亥、冬癸亥）；开市条目列为忌。',
      limitations: [
        '《总要历》作「以四时旺干临之」，曹震圭作「以四时阴干配之」，用语不同而所指同一组干支，本包照原文字面取用。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0023',
      name: '五墓',
      traditionId: TRADITION,
      eventType: 'opening',
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
      explanation: '五墓按双月与四季月取完整日柱，开市条目列为忌。',
      limitations: [
        '四季月指辰、未、戌、丑四个月，取值与其余八个月不同。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-opening-0024',
      name: '九空',
      traditionId: TRADITION,
      eventType: 'opening',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.九空,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「九空」；卷五《九空》「历例曰九空者正月在辰，逆行四季」（影印本第 79 帧）`,
      explanation: '九空正月在辰、逆行四季（辰戌丑未），即每月自辰起退三支取一辰；开市条目列为忌。',
      limitations: [
        '同条曹震圭以墓库被冲解释「逆行四季」，所得辰、丑、戌、未与逐月退三支一致。',
        '同条另有断语「今历家所传与九坎九焦同行者非」，本包不采九坎九焦同行之说。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
  ] satisfies readonly RuleDefinition[],
}
