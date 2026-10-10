import type { RuleDefinition, RulePack } from '../../types/rule'
import { MONTH_GOD_TABLES } from './month-gods'

const TRADITION = 'xjbf-default'
const CONFLICT_GROUP = 'relocation-day-selection'
/** 建除类条款：卷十一把该项列入般移条目，卷四是建除十二神的起例与同位异名。 */
const JIANCHU_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 月神类条款：卷十一把该项列入般移条目，卷五「义例三」是该神煞起例的定义处。 */
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

const TITLE_LOCATOR = '卷十一「般移」（原注：移徙同，影印本第 30 帧）'

/**
 * 般移规则包：收录卷十一「般移（原注：移徙同）」条目的宜 14 条、忌 15 条。
 * 原因：29 条原语均已按影印本逐字核对（第 30 帧一叶之内宜忌俱全），
 * 现代「搬家」即原书「般移」，条下小字注「移徙同」，两者同一组宜忌，不另立一包。
 * 边界：交节当天整日按新月计算（卷四「每月交节则叠两值日」的并存之说本版本未采用）。
 * completeness 为 partial：包内规则条条 verified，条目已收 宜 14/14、忌 15/15，
 * 但「天德」「天德合」二调在四仲月无值日（见各条 limitations），整包尚未达到可判 complete 的程度。
 *
 * 1.0.0 建立（2026-10-10，影印核对卷十一第 30 帧）。
 * 条目原文宜项「天德、月德、天德合、月德合、天赦、天愿、月恩、四相、时德、民日、驿马、天马、成日、开日」，
 * 忌项「月破、平日、收日、闭日、劫煞、灾煞、月煞、月刑、月厌、大时、天吏、四废、五墓、归忌、往亡」，
 * 逐字与同底本转录一致。
 *
 * 与本包条目同日列出的还有卷十一「远回」（忌月厌、归忌）与「入宅」——
 * 后者在卷十一全卷未检出同名条目，故事项表仍保持 reviewing，不并入本条。
 */
export const RELOCATION_RULE_PACK: RulePack = {
  id: 'xjbf-relocation',
  version: '1.0.0',
  eventType: 'relocation',
  traditionId: TRADITION,
  status: 'verified',
  completeness: 'partial',
  conflictGroup: CONFLICT_GROUP,
  coverage:
    '般移条目宜项 14 条中收录 14 条（天德、月德、天德合、月德合、天赦、天愿、月恩、四相、时德、民日、驿马、天马、成日、开日），忌项 15 条中收录 15 条（月破、平日、收日、闭日、劫煞、灾煞、月煞、月刑、月厌、大时、天吏、四废、五墓、归忌、往亡）。其中天德、天德合在四仲月（二、五、八、十一月）以乾坤艮巽四维记位、不判值日，属各该条自身的适用边界，详见各该条限制。原书「移徙」与此同条，另有「远回」条目与本条同日列出，本版本未收录。',
  rules: [
    {
      id: 'xjbf-relocation-0001',
      name: '天德',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '天德为三合之气所成之德，八个月取值是天干；般移条目列为宜。',
      limitations: [
        '四仲月（二、五、八、十一月）取值是乾坤艮巽四维之卦，不落实为某一日，本版本在这四个月不判值日。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-relocation-0002',
      name: '月德',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '月德为当月三合局的阳干；般移条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-relocation-0003',
      name: '天德合',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '天德合为天德所合之干；般移条目列为宜。',
      limitations: [
        '四仲月的天德取值是四维之卦，无干可合，本版本在这四个月不判值日。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-relocation-0004',
      name: '月德合',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '月德合为当月月德所合之干；般移条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-relocation-0005',
      name: '天赦',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '天赦按季节取完整日柱：春戊寅、夏甲午、秋戊申、冬甲子；般移条目列为宜。',
      limitations: [
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度或农历月。',
        '卷五另录曹震圭的甲己配合之说；按语引《历神原始》判其不足取，本版本从历例。',
      ],
    },
    {
      id: 'xjbf-relocation-0006',
      name: '天愿',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '天愿取完整日柱，表从卷五编者订正后的起例；般移条目列为宜。',
      limitations: [
        '旧历所传天愿起例与编者订正后的表不同，本版本取订正后的表。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-relocation-0007',
      name: '月恩',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '月恩取月建五行所生之干；般移条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-relocation-0008',
      name: '四相',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '四相按季节取当旺之行所生的一对天干（春木生火取丙丁等）；般移条目列为宜。',
      limitations: [
        '卷五按语：「四相取天干，时德取地支。」故本条读日干所属五行，与读日支的时德同义而字段不同。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度。',
      ],
    },
    {
      id: 'xjbf-relocation-0009',
      name: '时德',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '时德按季节取当旺之辰（又名四时天德）；般移条目列为宜。',
      limitations: [
        '卷五按语：「四相取天干，时德取地支。」故本条读日支。',
        '季节按节令月划分，不按公历季度。',
      ],
    },
    {
      id: 'xjbf-relocation-0010',
      name: '民日',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '民日按季节取辰（春午、夏酉、秋子、冬卯）；般移条目列为宜。',
      limitations: [
        '曹震圭以「四时死绝之辰」解释民日，同卷按语否定该说但未改取值，本版本只取取值。',
        '季节按节令月划分，不按公历季度。',
      ],
    },
    {
      id: 'xjbf-relocation-0011',
      name: '驿马',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.驿马,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「驿马」；卷六《驿马》李鼎祚起例与同条按语（影印本第 18 帧）`,
      explanation: '驿马取月三合局长生之冲（寅午戌月在申等）；般移条目列为宜。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-relocation-0012',
      name: '天马',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天马,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天马」；卷六《天马》「李鼎祚曰天马者正月起午，顺行六阳辰」（影印本第 103 帧图、第 104 帧历例）`,
      explanation: '天马自正月起午、顺行六阳辰；般移条目列为宜。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-relocation-0013',
      name: '成日',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['成'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「成日」；卷四《建除十二神》`,
      explanation: '成日为建后第八位，般移条目列为宜。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。',
      ],
    },
    {
      id: 'xjbf-relocation-0014',
      name: '开日',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['开'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「开日」；卷四《建除十二神》`,
      explanation: '开日为建除第十一位，般移条目列为宜。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。',
      ],
    },
    {
      id: 'xjbf-relocation-0015',
      name: '月破',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['破'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月破」；卷四《建除同位异名》「破〈大耗〉」及「考原曰月破者月建所冲之日也，与岁破义同」（影印本第 54 帧）`,
      explanation: '月破为月建所冲之日，即建除之破日；般移条目列为忌。',
      limitations: [
        '卷四《建除同位异名》以「大耗」为破日异名，本条已含大耗，不另立一条、不重复计忌。',
        '交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。',
      ],
    },
    {
      id: 'xjbf-relocation-0016',
      name: '平日',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['平'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「平日」；卷四《建除十二神》`,
      explanation: '平日为建后第四位，般移条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-relocation-0017',
      name: '收日',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['收'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「收日」；卷四《建除十二神》`,
      explanation: '收日为建除第十位，般移条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-relocation-0018',
      name: '闭日',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['闭'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「闭日」；卷四《建除十二神》`,
      explanation: '闭日为建除第十二位，般移条目列为忌。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-relocation-0019',
      name: '劫煞',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '劫煞为月三合绝气之位；般移条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-relocation-0020',
      name: '灾煞',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      id: 'xjbf-relocation-0021',
      name: '月煞',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '月煞自正月起丑、逆行四季；般移条目列为忌。',
      limitations: [
        '卷六另载异名「月虚」，起例相同，按语说明二者同位；只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-relocation-0022',
      name: '月刑',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '月刑为当月月建所刑之辰，起例与岁刑同；般移条目列为忌。',
      limitations: [
        '卷六本条无自身起例，全部依据在卷三岁刑条下，故来源同时挂卷三、卷六两处。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-relocation-0023',
      name: '月厌',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '月厌为阴建之辰，正月在戌、逐月逆行十二辰；般移条目列为忌。',
      limitations: [
        '异名「地火」起例相同，按语称「地火即是月厌」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-relocation-0024',
      name: '大时',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '大时为月建三合沐浴之辰；般移条目列为忌。',
      limitations: ['月按节令月划分；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-relocation-0025',
      name: '天吏',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '天吏为月三合死气之位；般移条目列为忌。',
      limitations: [
        '卷六另载异名「致死」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-relocation-0026',
      name: '四废',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '四废为干支俱绝之辰（春庚申辛酉等）；般移条目列为忌。',
      limitations: [
        '本条按「日干与日支同属一季所废之行」判定。因六十甲子必阳干配阳支、阴干配阴支，该条件与历例所举的两支日柱一一对应，不多判也不少判。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-relocation-0027',
      name: '五墓',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '五墓为五行旺干自临墓辰；般移条目列为忌。',
      limitations: ['季节月（三、六、九、十二月）取戊辰，与四季各月的取值不同，表按原文逐月列出。'],
    },
    {
      id: 'xjbf-relocation-0028',
      name: '归忌',
      traditionId: TRADITION,
      eventType: 'relocation',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.归忌,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「归忌」；卷六《归忌》「广圣历曰归忌者月内凶神也，其日忌远行归家移徙娶妇」及历例「孟月丑、仲月寅、季月子」（影印本第 128 帧）`,
      explanation: '归忌为孟月丑、仲月寅、季月子；般移条目列为忌。',
      limitations: [
        '本条的原始依据是《后汉书·郭镇传》注引阴阳书历法，卷六按语称「其来旧矣」，非唐宋术家新造。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-relocation-0029',
      name: '往亡',
      traditionId: TRADITION,
      eventType: 'relocation',
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
      explanation: '往亡按月三合局顺行三辰，般移条目列为忌。',
      limitations: [
        '月按节令月划分；交节日整日按新月取值。',
        '卷六按语引宋武帝「我往则彼亡」之事，仍判「不必以一事之无验而遽谓其可废」，本条从编者保留之说。',
      ],
    },
  ] satisfies readonly RuleDefinition[],
}
