import type { RuleDefinition, RulePack } from '../../types/rule'

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

/**
 * 月神的十二节令月取值表，一律按「正月（寅）起」顺数，交给引擎的 month-indexed 算子解析。
 * 摘自卷五各条目的「历例」，逐字核对影印本后填入；未核对的神煞不得加入。
 */
const MONTH_GOD_TABLES = {
  /** 卷五《月德》：「月德者正五九月在丙，二六十月在甲，三七十一月在壬，四八十二月在庚。」 */
  月德: ['丙', '甲', '壬', '庚', '丙', '甲', '壬', '庚', '丙', '甲', '壬', '庚'],
  /** 卷五《月德合》：「月德合者正五九月在辛，二六十月在己，三七十一月在丁，四八十二月在乙。」 */
  月德合: ['辛', '己', '丁', '乙', '辛', '己', '丁', '乙', '辛', '己', '丁', '乙'],
  /**
   * 卷五《天赦》：「历例曰春戊寅，夏甲午，秋戊申，冬甲子是也。」
   * 天赦要同时匹配完整日柱，故拆成干、支两张表；两条 month-indexed 条件同时成立才算命中。
   * 按语引《历神原始》以甲、戊立说（「岁星为仁而甲应之，镇星为德而戊应之」），
   * 并明判曹震圭的甲己配合之说不足取，故不采用「甲戌/甲辰/己丑/己未」那一套。
   */
  天赦干: ['戊', '戊', '戊', '甲', '甲', '甲', '戊', '戊', '戊', '甲', '甲', '甲'],
  天赦支: ['寅', '寅', '寅', '午', '午', '午', '申', '申', '申', '子', '子', '子'],
  /**
   * 卷五《月恩》：「历例曰月恩者正月丙，二月丁，三月庚，四月己，五月戊，六月辛，
   * 七月壬，八月癸，九月庚，十月乙，十一月甲，十二月辛。」《历神原始》以月建五行所生为说
   * （寅木生丙火、卯木生丁火、辰土生庚金……），逐月与之吻合。
   */
  月恩: ['丙', '丁', '庚', '己', '戊', '辛', '壬', '癸', '庚', '乙', '甲', '辛'],
  /**
   * 卷五《时德》（又名四时天德）：「历例曰春午，夏辰，秋子，冬寅。」
   * 同条按语：「四相取天干，时德取地支。」故本条读日支。
   */
  时德: ['午', '午', '午', '辰', '辰', '辰', '子', '子', '子', '寅', '寅', '寅'],
  /**
   * 卷六《劫煞》：「李鼎祚曰正月起亥，逆行四孟。」四孟＝寅申巳亥。
   * 按语说明「月劫煞义与岁劫煞同」，本条取的是月劫煞，不得与岁劫煞混用。
   * 与三合绝气吻合：火绝于亥（寅午戌月）、木绝于申（亥卯未月）、
   * 水绝于巳（申子辰月）、金绝于寅（巳酉丑月）。
   */
  劫煞: ['亥', '申', '巳', '寅', '亥', '申', '巳', '寅', '亥', '申', '巳', '寅'],
  /**
   * 卷六《天吏》：「历例曰天吏者正月起酉，逆行四仲。」四仲＝子午卯酉。
   * 曹震圭曰「三合五行死气之位」，即火死于酉、木死于午、水死于卯、金死于子。
   * 又名致死，仅录一次，不因异名重复计忌。
   */
  天吏: ['酉', '午', '卯', '子', '酉', '午', '卯', '子', '酉', '午', '卯', '子'],
  /**
   * 卷六《灾煞》：旧历作「天獄正月起子，順行四仲」，曹震圭以为天狱即灾煞、应逆行四仲，
   * 按语判「而今順行者，流傳之誤也。其說是，今從之」，故本条取正月起子、逆行四仲。
   * 与三合胎气吻合：火胎于子（寅午戌月）、木胎于酉、水胎于午、金胎于卯。
   */
  灾煞: ['子', '酉', '午', '卯', '子', '酉', '午', '卯', '子', '酉', '午', '卯'],
  /**
   * 卷六《月煞》：「曆例曰月煞者正月起丑，逆行四季。」四季＝辰戌丑未。
   * 同条另载「月虚」起例相同，按语说明二者同位；只录一次，不重复计忌。
   */
  月煞: ['丑', '戌', '未', '辰', '丑', '戌', '未', '辰', '丑', '戌', '未', '辰'],
  /**
   * 卷六《大时》：「李鼎祚曰大時者正月起卯，逆行四仲」。又名大败、咸池。
   * 曹震圭曰「月建三合五行沐浴之辰」，与三合沐浴吻合：火长生寅沐浴卯、
   * 木长生亥沐浴子、水长生申沐浴酉、金长生巳沐浴午。
   */
  大时: ['卯', '子', '酉', '午', '卯', '子', '酉', '午', '卯', '子', '酉', '午'],
  /**
   * 卷六《天贼》：「李鼎祚曰天賊者正月在丑，逆行十二辰」。曹震圭曰「常居天倉後辰，
   * 蓋倉庫之後必有盜也」；本条按语又谓天贼即月厌之收日。按十二辰逐月逆行，非四仲四孟。
   */
  天贼: ['丑', '子', '亥', '戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅'],
  /**
   * 卷六《往亡》：起例按三合局顺行三辰——「火月（寅午戌）顺行寅卯辰；木月（卯未亥）顺行巳午未；
   * 水月（辰申子）顺行申酉戌；金月（巳酉丑）顺行亥子丑」。按此逐月展开即下表，
   * 与同卷按语「四仲者五行當旺之辰，是旺氣之道往而亡也」的五行说自洽。
   */
  往亡: ['寅', '巳', '申', '亥', '卯', '午', '酉', '子', '辰', '未', '戌', '丑'],
  /**
   * 卷六《驿马》：「李鼎祚曰驛馬者正月起申，逆行四孟」。四孟＝寅申巳亥。
   * 同帧储泳《祛疑说》以先天三合数推导，与三合局相合：火局（寅午戌）驿马在申、
   * 木局（亥卯未）在巳、水局（申子辰）在寅、金局（巳酉丑）在亥。
   */
  驿马: ['申', '巳', '寅', '亥', '申', '巳', '寅', '亥', '申', '巳', '寅', '亥'],
  /**
   * 卷五《王官守相民日》：历例原文作「王日者春寅夏巳秋申冬亥」，但紧跟旁注「今易为官日」，
   * 而「官日者春卯夏午秋酉冬子」旁注「今易为王日」——编者把两个名字对调了。
   * 故定稿的王日是春卯、夏午、秋酉、冬子，即子午卯酉四正。
   * 曹震圭曰「王日者四時正王之辰，四正之位帝王之象」，与对调后的取值吻合。
   * 边界：只取定稿的王日。官日、守日、相日、民日不在出行条目内，不收录。
   */
  王日: ['卯', '卯', '卯', '午', '午', '午', '酉', '酉', '酉', '子', '子', '子'],
  /**
   * 卷五《五墓》：「曆例曰五墓者正月二月乙未，四月五月丙戌，七月八月辛丑，十月十一月壬辰，
   * 四季月戊辰也。」取完整日柱，故拆干、支两表；四季月指辰未戌丑四个月。
   * 曹震圭曰「五墓者五行旺干自臨墓辰也」，如正二月木旺、木墓于未，故得乙未。
   */
  五墓干: ['乙', '乙', '戊', '丙', '丙', '戊', '辛', '辛', '戊', '壬', '壬', '戊'],
  五墓支: ['未', '未', '辰', '戌', '戌', '辰', '丑', '丑', '辰', '辰', '辰', '辰'],
  /**
   * 卷五《四废》：「曆例曰春庚申辛酉，夏壬子癸亥，秋甲寅乙卯，冬丙午丁巳。」
   * 每季是两个完整日柱，同季两支同五行。曹震圭曰「四廢者干支俱絕也」——
   * 而六十甲子必阳干配阳支、阴干配阴支，故「日干属某行 且 日支属某行」恰好等于该季那两支，
   * 不会多判。乾造：春金、夏水、秋木、冬火。
   */
  四废: ['金', '金', '金', '水', '水', '水', '木', '木', '木', '火', '火', '火'],
  /**
   * 卷四《月厌》：「曆例曰月厭者正月在戌，逆行十二辰。」逐月逆行一整辰，非四位循环。
   * 同条《天宝历》：「所值之日忌遠行歸家移徙婚嫁」——远行即在忌中，故入本包。
   * 异名「地火」起例相同（正月起戌、逆行十二辰），按语明言「地火即是月厌」，不重复计忌。
   */
  月厌: ['戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子', '亥'],
  /**
   * 卷五《天德合》：「天德合者正月壬，三月丁，四月丙，六月己，七月戊，九月辛，十月庚，
   * 十二月乙。」四仲月（二、五、八、十一月）天德居乾坤艮巽四维，按语明言「四維固無合矣」，
   * 故这四个月没有天德合日——表里留空串作哨兵，永远不等于任何真实天干。
   */
  天德合: ['壬', '', '丁', '丙', '', '己', '戊', '', '辛', '庚', '', '乙'],
  /**
   * 卷五《四相》：「曆例曰春丙丁，夏戊己，秋壬癸，冬甲乙。」每季取一对天干，
   * 一条条件只能比对单值，故改比对这对天干共同的五行（丙丁属火、戊己属土、壬癸属水、甲乙属木），
   * 读的是派生事实 stemElement。
   */
  四相: ['火', '火', '火', '土', '土', '土', '水', '水', '水', '木', '木', '木'],
  /** 卷五《天愿》编者订正后的起例（影印本第 51 帧），按月取完整日柱，故拆干、支两表。 */
  天愿干: ['乙', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸', '甲'],
  天愿支: ['亥', '戌', '酉', '申', '未', '午', '巳', '辰', '卯', '寅', '丑', '子'],
} as const satisfies Record<string, readonly string[]>
const TITLE_LOCATOR = '卷十一「行幸遣使」（原注：出行同）'

/**
 * 出行规则包第一批：只收录卷十一出行条目里由建除十二神与日支直接判定的条款。
 * 原因：其余条款依赖天德、驿马、往亡等神煞，其定义尚在逐条校勘，未完成前不得入库。
 * 边界：交节日新旧月建除重叠（卷四「每月交节则叠两值日」），本包按日口径取新月值。
 * completeness 为 partial：包内规则条条 verified，但整包只收到宜 4/16、忌 5/16。
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
  version: '1.14.0',
  eventType: 'travel',
  traditionId: TRADITION,
  status: 'verified',
  completeness: 'partial',
  conflictGroup: CONFLICT_GROUP,
  coverage:
    '出行条目宜项 16 条中收录 14 条（建日、开日、吉期、天喜、月德、月德合、天赦、月恩、时德、天德合、四相、天愿、驿马、王日），忌项 16 条中收录 15 条（月破、平日、收日、闭日、巳日、劫煞、天吏、灾煞、月煞、大时、天贼、往亡、五墓、四废、月厌）；天德、天马、月刑尚在校勘（B 类，需核对卷三刑例与十二月表），未收录。',
  rules: [
    {
      id: 'xjbf-travel-0001',
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
        '卷四《考原》对建除另有通类吉凶之说，与本条不一致；本包以用事条目为准。',
        '交节日按日口径取新月建除，与原文「叠两值日」并存之说不同。',
      ],
    },
    {
      id: 'xjbf-travel-0002',
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
      limitations: ['交节日按日口径取新月建除。'],
    },
    {
      id: 'xjbf-travel-0003',
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
      limitations: ['交节日按日口径取新月建除。'],
    },
    {
      id: 'xjbf-travel-0004',
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
      limitations: ['交节日按日口径取新月建除。'],
    },
    {
      id: 'xjbf-travel-0005',
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
      limitations: ['交节日按日口径取新月建除。'],
    },
    {
      id: 'xjbf-travel-0006',
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
      limitations: ['交节日按日口径取新月建除。'],
    },
    {
      id: 'xjbf-travel-0007',
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
      limitations: ['交节日按日口径取新月建除，与原文「叠两值日」并存之说不同。'],
    },
    {
      id: 'xjbf-travel-0009',
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
        '历书另有「春戌夏丑秋辰冬未」的四季天喜说；卷四按语与《选择宗镜》均取与成日同位之说，本包从之。',
        '交节日按日口径取新月建除。',
      ],
    },
    {
      id: 'xjbf-travel-0010',
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
        '卷五另录曹震圭的甲己配合之说；按语引《历神原始》判其不足取，本包从历例。',
      ],
    },
    {
      id: 'xjbf-travel-0013',
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
        '卷六明载旧历作「顺行四仲」属流传之误，本包从编者订正后的逆行，不采用现代黄历常见的顺行说法。',
        '卷六另载「天狱」，编者判其即灾煞，不另立一条、不重复计忌。',
      ],
    },
    {
      id: 'xjbf-travel-0018',
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
        '卷五原引旧历作「正月甲午、二月甲戌……」等，编者核对神煞起例后判定「二十四字中误十三字」，本包采用订正后的序列。',
        '编者同时批评曹震圭为旧文「曲为之解，展转支离」，故不采用其解说。',
      ],
    },
    {
      id: 'xjbf-travel-0025',
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
        '本包取月驿马。卷六另提年支、日支也可取驿马；卷十一的月神语境只用月驿马，不混用年驿马、日驿马。',
        '卷六同帧载「天后与驿马同位」，同位异名只录一次，不重复计入。',
      ],
    },
    {
      id: 'xjbf-travel-0026',
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
        '卷五历例先出旧名「王日者春寅夏巳秋申冬亥」，紧随的编者旁注将其改名为官日、官日改名为王日；本包采用编者对调后的定稿（春卯、夏午、秋酉、冬子），不采用旧名序列。',
        '季节按节令月划分（寅卯辰春、巳午未夏、申酉戌秋、亥子丑冬）。',
      ],
    },
    {
      id: 'xjbf-travel-0027',
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
  ] satisfies readonly RuleDefinition[],
}
