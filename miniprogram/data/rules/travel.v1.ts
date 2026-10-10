import type { RuleDefinition, RulePack } from '../../types/rule'
import { MONTH_GOD_TABLES } from './month-gods'

const TRADITION = 'xjbf-default'
const CONFLICT_GROUP = 'travel-day-selection'
/** 建除类条款：卷十一把该项列入出行条目，卷四是建除十二神的起例与同位异名。 */
const JIANCHU_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const
/** 「巳日」只由卷十一的忌项支撑；卷四讲建除与月神，不涉及民用日支，不得挂卷四来源。 */
const BRANCH_ONLY_SOURCE_IDS = ['src-xjbf-vol11-scan'] as const
/** 月神类条款：卷十一把该项列入出行条目，卷五「义例三」是该神煞起例的定义处。 */
const MONTH_GOD_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol5-scan'] as const
/** 卷六类条款（含驿马等吉神与劫煞等凶煞）：卷十一列项，卷六「义例四」定义。卷次不同，不得与卷五混挂。 */
const VOL6_SOURCE_IDS = ['src-xjbf-vol11-scan', 'src-xjbf-vol6-scan'] as const
/** 月刑：卷十一列项，卷六只说「与岁刑同」，起例在卷三「义例一」的岁刑条下。三处缺一不可。 */
const MOVE_PUNISHMENT_SOURCE_IDS = [
  'src-xjbf-vol11-scan',
  'src-xjbf-vol6-scan',
  'src-xjbf-vol3-scan',
] as const

const TITLE_LOCATOR = '卷十一「行幸遣使」（原注：出行同）'

/**
 * 出行规则包：收录卷十一「行幸遣使（原注：出行同）」条目的宜 16 条、忌 16 条。
 * 原因：32 条原语均已完成影印校勘；天德在四仲月仍无法判到具体日期，故整包保持 partial。
 * 边界：交节日新旧月建除重叠（卷四「每月交节则叠两值日」），本包按日口径取新月值。
 * completeness 为 partial：包内规则条条 verified，条目已收 宜 16/16、忌 16/16，
 * 但「天德」一调在四仲月无值日（见该条 limitations），整包尚未达到可判 complete 的程度。
 *
 * 1.0.1 变更原因：按来源精度复核修正出处（2026-10-09 影印核对）。
 * - 「巳日」收窄为只引卷十一，去掉卷四（卷四不涉及民用日支）。
 * - 「月破」locator 由《建除十二神》改为《建除同位异名》「破〈大耗〉」：卷四该条原文
 *   「考原曰月破者月建所冲之日也與歲破義同」在影印本第 54 帧，属「破〈大耗〉」而非
 *   「建除十二神」；「对七为冲，冲则破也」是《建除十二神》引《洞源经》的另一句。
 *   when 与 effect 未变，筛选结果不受影响。
 *
 * 1.1.0 变更原因：新增两条宜项规则（2026-10-09 影印核对）。
 * - 「吉期」＝建除之除日（卷四《建除同位异名》「除〈吉期 兵宝〉」，影印本第 26 帧）。
 * - 「天喜」＝建除之成日（卷四《建除同位异名》「成〈天医 天喜〉」及按语「与成日同位」，
 *   影印本第 58、59 帧）。历书另有「春戌夏丑秋辰冬未」的四季说，卷四按语与《选择宗镜》
 *   均取与成日同位之说，本包从之，差异记在该条 limitations。
 *
 * 1.2.0 变更原因：新增两条月神类宜项（2026-10-09 影印核对卷五）。
 * - 「月德」＝当月三合局的阳干（卷五《月德》历例，影印本第 22 帧；按语见第 23 帧）。
 * - 「月德合」＝当月月德所合之干（卷五《月德合》历例与《考原》，影印本第 30 帧）。
 *   两条都用 month-indexed 读取日干，表按正月至十二月顺列。
 *
 * 1.3.0 变更原因：新增宜项「天赦」（2026-10-09 影印核对卷五，第 42 帧历例、第 43–44 帧按语）。
 * 天赦取完整日柱，用「干表 + 支表」两条 month-indexed 条件表达，仍是一条原书条目对应一条规则。
 *
 * 1.4.0 变更原因：新增两条月神类宜项（2026-10-09 影印核对卷五）。
 * - 「月恩」＝月建五行所生之干（卷五《月恩》历例，影印本第 57 帧）。
 * - 「时德」＝四时当旺之阳辰（卷五《时德》历例，影印本第 65 帧；图见第 64 帧）。
 * 注：同卷的「四相」（第 61 帧，春丙丁、夏戊己、秋壬癸、冬甲乙）每季取两个天干，
 * 现有 month-indexed 只能取单值，暂未收录，待定案表达能力后再补。
 *
 * 1.5.0 变更原因：新增两条卷六忌项（2026-10-09 影印核对卷六）。
 * - 「劫煞」＝月三合绝气之位（卷六《劫煞》历例，影印本第 24 帧）。
 * - 「天吏」＝月三合死气之位（卷六《天吏》历例，影印本第 50 帧）。
 *
 * 1.6.0 变更原因：再增两条卷六忌项（2026-10-09 影印核对卷六）。
 * - 「灾煞」＝月三合胎气之位；卷六按语订正旧历「天狱」顺行之误，取逆行四仲（第 26 帧）。
 * - 「月煞」＝正月起丑、逆行四季（第 34 帧）。
 *
 * 1.7.0 变更原因：再增卷六忌项「大时」（2026-10-09 影印核对卷六）。
 * - 「大时」＝月建三合沐浴之辰（卷六《大时》历例，影印本第 42 帧；图见第 41 帧）。
 *
 * 1.8.0 变更原因：再增卷六忌项「天贼」（2026-10-09 影印核对卷六）。
 * - 「天贼」＝正月在丑、逆行十二辰（卷六《天贼》历例，影印本第 70 帧；图见第 69 帧）。
 *
 * 1.17.1 变更原因：规则 limitations 的措辞改为面向用户（2026-10-09）。
 * - 「本包」→「本版本」；「交节日按日口径取新月建除」→「交节当天整日按新月计算」。
 *   这些字符串会作为「限制：」直接显示在日期详情页，不应出现内部用语。规则本身未改动。
 *
 * 1.17.0 变更原因：新增宜项「天德」，出行条目至此 32/32 全部收录（2026-10-09 影印核对卷五）。
 * - 「天德」＝三合之气所成之德：正五九月火局取丙丁与乾，二六十月木局取甲乙与坤，
 *   三七十一月水局取壬癸与巽，四八十二月金局取庚辛与艮（卷五第 10–11 帧历例、第 12 帧考原）。
 *   八个月取值是天干，四仲月取值是乾坤艮巽四维之卦。
 * - 四仲月不判值日，理由记入该条 limitations；审计 §4.1 曾要求「不得自行把卦位换成某一地支」，
 *   本条即不换，而是如实留空。
 *
 * 1.16.0 变更原因：新增忌项「月刑」（2026-10-09 影印核对卷六、卷三）。
 * - 「月刑」＝当月月建所刑之辰。卷六《月刑》全条只有一句按语「按月刑之义与岁刑同，
 *   详见岁刑条下」（影印本第 36 帧），起例在卷三《岁刑》曾门经（影印本第 106 帧：
 *   「子刑卯、丑刑戌、寅刑巳、卯刑子、巳刑申、未刑丑、申刑寅、戌刑未，辰午酉亥为自刑也」）。
 *   故本条 sourceIds 同时挂卷三，locator 写明三卷各自的贡献，不得只引卷六。
 * - 已与卷二十、二十二、二十四、二十七、二十九五张月表交叉核对，含辰午酉亥四个自刑月，逐项吻合。
 * - 忌项至此 16/16 全收；本包仅余宜项「天德」未收录。
 *
 * 1.15.0 变更原因：新增宜项「天马」（2026-10-09 影印核对卷六）。
 * - 「天马」＝正月起午、顺行六阳辰（卷六《天马》李鼎祚说，影印本第 103 帧图、第 104 帧历例）。
 *   同条曹震圭以「乾体六阳用事之神」为说，按语自校「四、十月在子」，三处互证。
 * - 勘误：审计文档 §4.1、§7 称本条「维基文库正文存在影像/转录缺口」，该结论有误——
 *   逐字回看影印本第 104 帧后确认正文完整，转录准确。原因是当时只按条目位置线性估算帧号，
 *   未实际读到该条即下结论，与本文件 §8.4、§8.6 已记录的教训同源。
 *
 * 1.14.1 变更原因：修正 coverage 对三项未收录原因的表述（2026-10-09）。
 * 原文把「需核对卷三刑例与十二月表」当成天德、天马、月刑的共同原因，实际只对月刑成立：
 * 天德卡在四仲月四维如何落实为值日，天马卡在卷六影印对应条目尚未核对。规则本身未改动。
 *
 * 1.14.0 变更原因：新增忌项「月厌」（2026-10-09 影印核对卷四第 95 帧）。
 *
 * 1.13.0 变更原因：新增两条忌项（2026-10-09 影印核对卷五）。
 * - 「五墓」＝五行旺干自临墓辰（第 81 帧）。
 * - 「四废」＝干支俱绝；按「日干与日支同属一季所废之行」判定，加派生事实 branchElement。
 *
 * 1.12.0 变更原因：新增宜项「王日」（2026-10-09 影印核对卷五，第 69 帧）。
 * 编者将「王日」「官日」两名对调，本包取对调后的定稿，详见该条 limitations。
 *
 * 1.11.0 变更原因：新增宜项「驿马」（2026-10-09 影印核对卷六，第 18 帧）。
 *
 * 1.10.0 变更原因：新增三条宜项（2026-10-09 影印核对卷五）。
 * - 「天德合」（第 26 帧）、「四相」（第 61 帧）、「天愿」编者订正表（第 51 帧）。
 * 四相每季取一对天干，改用派生事实 stemElement（日干五行）承载。
 *
 * 1.9.0 变更原因：再增卷六忌项「往亡」（2026-10-09 影印核对卷六，按语见第 133–134 帧）。
 */
export const TRAVEL_RULE_PACK: RulePack = {
  id: 'xjbf-travel',
  version: '1.17.1',
  eventType: 'travel',
  traditionId: TRADITION,
  status: 'verified',
  completeness: 'partial',
  conflictGroup: CONFLICT_GROUP,
  coverage:
    '出行条目宜项 16 条中收录 16 条（建日、开日、吉期、天喜、月德、月德合、天赦、月恩、时德、天德合、四相、天愿、驿马、天马、王日、天德），忌项 16 条中收录 16 条（月破、平日、收日、闭日、巳日、劫煞、天吏、灾煞、月煞、大时、天贼、往亡、五墓、四废、月厌、月刑）。其中天德在四仲月（二、五、八、十一月）以乾坤艮巽四维记位、不判值日，属该条自身的适用边界，详见该条限制。',
  rules: [
    {
      id: 'xjbf-travel-0001',
      name: '建日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['建'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「建日」；卷四《建除十二神》`,
      explanation: '建日为月建当日，出行条目列为宜。',
      limitations: [
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本版本以用事条目为准。',
        '交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。',
      ],
    },
    {
      id: 'xjbf-travel-0002',
      name: '开日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['开'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「开日」；卷四《建除十二神》`,
      explanation: '开日为建后第十位，出行条目列为宜。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-travel-0003',
      name: '平日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['平'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「平日」；卷四《建除十二神》`,
      explanation: '平日为建后第三位，出行条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-travel-0004',
      name: '收日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['收'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「收日」；卷四《建除十二神》`,
      explanation: '收日为建后第九位，出行条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-travel-0005',
      name: '闭日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['闭'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「闭日」；卷四《建除十二神》`,
      explanation: '闭日为建除十二神末位，出行条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-travel-0006',
      name: '月破',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['破'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「月破」；卷四《建除十二神》「破」及《建除同位异名》「破〈大耗〉」引《考原》「月破者月建所冲之日也」`,
      explanation: '月破即建除之破日，为月建所冲之日，出行条目列为忌。',
      limitations: ['交节当天整日按新月计算。'],
    },
    {
      id: 'xjbf-travel-0007',
      name: '巳日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'ganzhi.dayCivil.branch', operator: 'in', value: ['巳'] }] },
      sourceIds: BRANCH_ONLY_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「巳日」`,
      explanation: '出行条目另以日支为巳者为忌，与建除无关，故单独成条。',
      limitations: ['只按日支判定，不涉时辰。'],
    },
    {
      id: 'xjbf-travel-0008',
      name: '吉期',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['除'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「吉期」；卷四《建除同位异名》「除〈吉期 兵宝〉」「历例曰常居月建前一辰也」`,
      explanation: '吉期与建除之除日同位，常居月建前一辰，出行条目列为宜。',
      limitations: ['交节当天整日按新月计算；原文另有新旧两值并存之说，本版本未采用。'],
    },
    {
      id: 'xjbf-travel-0009',
      name: '天喜',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: { all: [{ fact: 'jianChu', operator: 'in', value: ['成'] }] },
      sourceIds: JIANCHU_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「天喜」；卷四《建除同位异名》「成〈天医 天喜〉」及按语「与成日同位」`,
      explanation: '天喜与建除之成日同位，出行条目列为宜。',
      limitations: [
        '历书另有「春戌夏丑秋辰冬未」的四季天喜说；卷四按语与《选择宗镜》均取与成日同位之说，本版本从之。',
        '交节当天整日按新月计算。',
      ],
    },
    {
      id: 'xjbf-travel-0010',
      name: '月德',
      traditionId: TRADITION,
      eventType: 'travel',
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
      locator: `${TITLE_LOCATOR}宜项「月德」；卷五《月德》「历例曰月德者正五九月在丙，二六十月在甲，三七十一月在壬，四八十二月在庚」`,
      explanation: '月德为月中之阳德，取当月三合局的阳干；出行条目列为宜。',
      limitations: [
        '月按节令月划分，不按农历朔月；交节日整日按新月取值。',
        '卷五按语说明月德只用甲丙庚壬四阳干、不及戊土，故不涉土局。',
      ],
    },
    {
      id: 'xjbf-travel-0011',
      name: '月德合',
      traditionId: TRADITION,
      eventType: 'travel',
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
      locator: `${TITLE_LOCATOR}宜项「月德合」；卷五《月德合》「历例曰月德合者正五九月在辛，二六十月在己，三七十一月在丁，四八十二月在乙」`,
      explanation: '月德合取当月月德所合之干（五合），出行条目列为宜。',
      limitations: ['月按节令月划分，不按农历朔月；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-travel-0012',
      name: '天赦',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '天赦按季节取完整日柱：春戊寅、夏甲午、秋戊申、冬甲子；出行条目列为宜。',
      limitations: [
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度或农历月。',
        '卷五另录曹震圭的甲己配合之说；按语引《历神原始》判其不足取，本版本从历例。',
      ],
    },
    {
      id: 'xjbf-travel-0013',
      name: '月恩',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '月恩为月建五行所生之干（子母相从），出行条目列为宜。',
      limitations: ['月按节令月划分，不按农历朔月；交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-travel-0014',
      name: '时德',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '时德按季节取四时当旺的阳辰（春午、夏辰、秋子、冬寅），出行条目列为宜。',
      limitations: [
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度。',
        '卷五按语说明：四相取天干、时德取地支，两条同义而所读字段不同。',
      ],
    },
    {
      id: 'xjbf-travel-0015',
      name: '劫煞',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '劫煞为月三合绝气之位（火绝于亥等），出行条目列为忌。',
      limitations: [
        '月按节令月划分；交节日整日按新月取值。',
        '本条是月劫煞。卷六按语称「月劫煞义与岁劫煞同」，但两者起例不同，不得混用岁劫煞。',
      ],
    },
    {
      id: 'xjbf-travel-0016',
      name: '天吏',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '天吏为月三合死气之位（火死于酉等），出行条目列为忌。',
      limitations: ['天吏又名致死，同位异名不重复计忌。', '月按节令月划分，交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-travel-0017',
      name: '灾煞',
      traditionId: TRADITION,
      eventType: 'travel',
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
      id: 'xjbf-travel-0018',
      name: '月煞',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '月煞为月内杀神，正月起丑、逆行四季（辰戌丑未）；出行条目列为忌。',
      limitations: [
        '同条「月虚」起例相同，按语说明二者同位；只录一次，不重复计忌。',
        '月按节令月划分，交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-travel-0019',
      name: '大时',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '大时为月建三合沐浴之辰（火沐浴于卯等），出行条目列为忌。',
      limitations: [
        '大时又名大败、咸池，同位异名只录一次，不重复计忌。',
        '月按节令月划分，交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-travel-0020',
      name: '天贼',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'exclude',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.天贼,
          },
        ],
      },
      sourceIds: VOL6_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}忌项「天贼」；卷六《天贼》「李鼎祚曰天贼者正月在丑，逆行十二辰」`,
      explanation: '天贼为月中盗神，正月在丑、逐月逆行十二辰；出行条目列为忌。',
      limitations: ['月按节令月划分，交节日整日按新月取值。'],
    },
    {
      id: 'xjbf-travel-0021',
      name: '往亡',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '往亡按月三合局顺行三辰，出行条目列为忌。',
      limitations: [
        '月按节令月划分；交节日整日按新月取值。',
        '卷六按语引宋武帝「我往则彼亡」之事，仍判「不必以一事之无验而遽谓其可废」，本条从编者保留之说。',
      ],
    },
    {
      id: 'xjbf-travel-0022',
      name: '天德合',
      traditionId: TRADITION,
      eventType: 'travel',
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
      locator: `${TITLE_LOCATOR}宜项「天德合」；卷五《天德合》「历例曰天德合者正月壬，三月丁，四月丙，六月己，七月戊，九月辛，十月庚，十二月乙」`,
      explanation: '天德合取当月天德所合之干，出行条目列为宜；四仲月天德居四维，无合。',
      limitations: [
        '四仲月（二、五、八、十一月）天德以乾坤艮巽四维记位，按语明言「四维固无合矣」，故这四个月不作天德合日。',
        '本条按自身历例实现，不依赖天德；天德因四维如何落实为值日尚未定案，仍为 B 类未收录。',
      ],
    },
    {
      id: 'xjbf-travel-0023',
      name: '四相',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '四相按季节取当旺之行所生的一对天干（春木生火取丙丁等），出行条目列为宜。',
      limitations: [
        '卷五按语：「四相取天干，时德取地支。」故本条读日干所属五行，与读日支的时德同义而字段不同。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬），不按公历季度。',
      ],
    },
    {
      id: 'xjbf-travel-0024',
      name: '天愿',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '天愿为月中善神，按月取完整日柱；出行条目列为宜。',
      limitations: [
        '卷五原引旧历作「正月甲午、二月甲戌……」等，编者核对神煞起例后判定「二十四字中误十三字」，本版本采用订正后的序列。',
        '编者同时批评曹震圭为旧文「曲为之解，展转支离」，故不采用其解说。',
      ],
    },
    {
      id: 'xjbf-travel-0025',
      name: '驿马',
      traditionId: TRADITION,
      eventType: 'travel',
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
      locator: `${TITLE_LOCATOR}宜项「驿马」；卷六《驿马》「李鼎祚曰驿马者正月起申，逆行四孟」`,
      explanation: '驿马为月三合局的驿骑之位（火局在申等），出行条目列为宜。',
      limitations: [
        '本条用的是月驿马。卷六另提年支、日支也可取驿马；本版本只用月驿马，不与年驿马、日驿马混用。',
        '卷六同帧载「天后与驿马同位」，同位异名只录一次，不重复计入。',
      ],
    },
    {
      id: 'xjbf-travel-0026',
      name: '王日',
      traditionId: TRADITION,
      eventType: 'travel',
      status: 'verified',
      effect: 'include',
      conflictGroup: CONFLICT_GROUP,
      priority: null,
      when: {
        all: [
          {
            fact: 'ganzhi.dayCivil.branch',
            operator: 'month-indexed',
            value: MONTH_GOD_TABLES.王日,
          },
        ],
      },
      sourceIds: MONTH_GOD_SOURCE_IDS,
      locator: `${TITLE_LOCATOR}宜项「王日」；卷五《王官守相民日》历例「王日者春寅夏巳秋申冬亥」旁注「今易为官日」、官日条旁注「今易为王日」，取对调后的定稿`,
      explanation: '王日为四时正王之辰（子午卯酉四正），出行条目列为宜。',
      limitations: [
        '卷五历例先出旧名「王日者春寅夏巳秋申冬亥」，紧随的编者旁注将其改名为官日、官日改名为王日；本版本采用编者对调后的定稿（春卯、夏午、秋酉、冬子），不采用旧名序列。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-travel-0027',
      name: '五墓',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '五墓为五行旺干自临墓辰之日（木墓于未故正二月乙未等），出行条目列为忌。',
      limitations: [
        '取完整日柱，必须干、支同时吻合，不能只看日干或只看日支。',
        '四季月指辰、未、戌、丑四个月；月按节令月划分，交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-travel-0028',
      name: '四废',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation: '四废为干支俱绝之辰（春庚申辛酉等），出行条目列为忌。',
      limitations: [
        '本条按「日干与日支同属一季所废之行」判定。因六十甲子必阳干配阳支、阴干配阴支，该条件与历例所举的两支日柱一一对应，不多判也不少判。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-travel-0029',
      name: '月厌',
      traditionId: TRADITION,
      eventType: 'travel',
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
      sourceIds: ['src-xjbf-vol11-scan', 'src-xjbf-vol4-scan'] as const,
      locator: `${TITLE_LOCATOR}忌项「月厌」；卷四《月厌》「历例曰月厌者正月在戌，逆行十二辰」（影印本第 95 帧）`,
      explanation: '月厌为阴建之辰，正月在戌、逐月逆行十二辰；出行条目列为忌。',
      limitations: [
        '异名「地火」起例相同，按语称「地火即是月厌」，只录一次、不重复计忌。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-travel-0030',
      name: '天马',
      traditionId: TRADITION,
      eventType: 'travel',
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
      explanation:
        '天马为乾体六阳用事之神（乾卦所纳子寅辰午申戌），正月起午、顺行六阳辰；出行条目列为宜。',
      limitations: [
        '六阳辰顺行，六个月一循环：正月与七月同值午，二月与八月同值申，余月仿此。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-travel-0031',
      name: '月刑',
      traditionId: TRADITION,
      eventType: 'travel',
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
        '月刑取当月月建所刑之辰（岁刑同例），辰午酉亥四个月为自刑、即与月建同支；出行条目列为忌。',
      limitations: [
        '本条起例不在卷六本身：卷六只说「与岁刑同」，取值须以卷三岁刑条为准，来源同时挂卷三。',
        '辰、午、酉、亥四个月为自刑，月刑与月建同支，与其余八个月的性质不同。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
    {
      id: 'xjbf-travel-0032',
      name: '天德',
      traditionId: TRADITION,
      eventType: 'travel',
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
      locator: `${TITLE_LOCATOR}宜项「天德」；卷五《天德》「正月丁，二月坤，三月壬，四月辛，五月乾，六月甲，七月癸，八月艮，九月丙，十月乙，十一月巽，十二月庚」（影印本第 10–11 帧历例、第 12 帧考原、第 13–14 帧按语）`,
      explanation:
        '天德为三合之气所成之德，八个月取天干（正月丁、三月壬……十二月庚）；出行条目列为宜。',
      limitations: [
        '四仲月（二月、五月、八月、十一月）天德的取值是乾坤艮巽四维之卦，不是天干。本版本不把卦位折算成某一地支，故这四个月不判天德日——是缺值，不是「不忌」。',
        '依据：卷五历例四仲月只给卦；考原「五月乾，戌火墓在乾宮也」以乾为取值、以戌为理由；天德合历例四仲月无值（若天德在四仲月可落为地支，其五合干即应存在）；卷二十、二十二、二十四、二十七、二十九各月月表同样只给卦，不给地支。',
        '与「四卦以代辰戌丑未」的关系：该句出自卷五按语，说的是四卦在二十四山中占的是墓辰所在的宫位，不是把值日折算为墓辰。若日后有更强证据表明应折算，本条表可改为 未／戌／丑／辰 四值并拆成干支两条规则。',
        '月按节令月划分；交节日整日按新月取值。',
      ],
    },
  ] satisfies readonly RuleDefinition[],
}
