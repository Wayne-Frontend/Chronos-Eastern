interface AboutSource {
  readonly number: string
  readonly category: string
  readonly title: string
  readonly publisher: string
  readonly summary: string
  readonly reason: string
  readonly boundary: string
}

const CALENDAR_SOURCES: readonly AboutSource[] = [
  {
    number: '01',
    category: '国家标准',
    title: 'GB/T 33661—2017《农历的编算和颁行》',
    publisher: '全国标准信息公共服务平台 · 现行国家标准',
    summary:
      '规定现代农历的编排原则，包括以北京时间为标准时间、朔日为月首、含冬至之月为十一月，以及通过中气规则安排闰月等内容。',
    reason:
      '它是中国大陆现代农历的基础口径，用于约束公历与农历转换、闰月和日期归属，避免以网络万年历的多数结果代替标准。',
    boundary: '该标准解决现代历法编算问题，不提供择日结论，也不为任何传统宜忌背书。',
  },
  {
    number: '02',
    category: '权威历书',
    title: '中国科学院紫金山天文台历书与年度日历资料',
    publisher: '中国科学院紫金山天文台',
    summary:
      '资料包含农历基本术语、编算口径、年度公农历日期及二十四节气交节时刻，是国家标准在具体年份中的重要校验材料。',
    reason:
      '应用以其年度资料作为中国大陆口径的主要校验源；当前已将 2017—2026 年的 240 个节气日期逐条用于回归核对。',
    boundary: '资料用于验证日期与节气，不直接生成页面中的传统宜忌结果。',
  },
  {
    number: '03',
    category: '交叉校验',
    title: '香港天文台公历与农历日期对照表',
    publisher: '香港天文台',
    summary:
      '提供 1901—2100 年公历、农历和二十四节气对照资料，并说明远期天文计算在接近午夜时可能出现日期差异。',
    reason:
      '它作为独立的第二来源，用来核对转换边界、闰月、春节和节气样本，帮助发现单一算法或单一资料源的偏差。',
    boundary: '当交叉资料与中国大陆现行口径不一致时，以国家标准和紫金山天文台资料为优先。',
  },
]

const CULTURE_SOURCES: readonly AboutSource[] = [
  {
    number: '01',
    category: '传统文献',
    title: '《钦定协纪辨方书》四库全书影印本',
    publisher: 'CADAL 浙江大学图书馆藏本 · Wikimedia Commons 影印资源',
    summary:
      '全书包含本原、义例、宜忌、用事、公规和辨讹等内容。当前规则校勘主要涉及卷三至卷六的义例、卷十「宜忌」的常例，以及卷十一的具体用事条目。',
    reason:
      '它为传统术语、规则条件和事项关系提供可定位的历史原文，使结果能够追溯到具体卷次与条目，而不是照搬网络黄历结论。',
    boundary:
      '原书不是一张可直接复制的每日宜忌表。转录文本只用于检索，正式录入需对照影印本；未完成校勘的内容不会参与查询。',
  },
  {
    number: '02',
    category: '文化资料',
    title: '国家级非物质文化遗产名录与代表性项目资料',
    publisher: '中国政府网 · 中国非物质文化遗产网',
    summary:
      '国务院公布的国家级非遗名录及项目页面，记录了春节、清明节、端午节、中秋节等传统节日与相关习俗的项目归属和文化背景。',
    reason: '用于核对传统节日的名称、性质和文化说明，让节日展示与有出处的公共文化资料保持一致。',
    boundary: '非遗名录说明文化价值，不等同于历法计算规则，也不用于推导个人宜忌。',
  },
  {
    number: '03',
    category: '法规资料',
    title: '《全国年节及纪念日放假办法》',
    publisher: '中国政府网 · 国务院公报（2024 年修订）',
    summary:
      '规定全体公民和部分公民放假的节日范围及对应天数，用于区分法定节假日、传统节日和纪念日。',
    reason: '应用需要避免把“传统节日”和“法定放假”混为一谈，因此以现行办法确认节日的法定属性。',
    boundary: '该办法不包含每一年的调休安排；没有当年官方通知时，应用不会预测放假或补班日期。',
  },
]

Component({
  data: {
    calendarSources: CALENDAR_SOURCES,
    cultureSources: CULTURE_SOURCES,
  },
})
