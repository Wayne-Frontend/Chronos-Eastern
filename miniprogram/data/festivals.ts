export type FestivalCategory = 'traditional' | 'commemoration'

export const FESTIVAL_CATEGORY_LABELS: Record<FestivalCategory, string> = {
  traditional: '传统节日',
  commemoration: '纪念日',
}

export type FestivalMatch =
  | { type: 'lunar-fixed'; month: number; day: number; allowLeapMonth: boolean }
  | { type: 'solar-fixed'; month: number; day: number }
  | { type: 'solar-term'; term: string }
  /** 次日为指定农历月日的节日，用于除夕这类由历法动态决定的日期。 */
  | { type: 'lunar-eve'; month: number; day: number }

export interface FestivalEntry {
  id: string
  name: string
  category: FestivalCategory
  match: FestivalMatch
  sourceIds: readonly string[]
  status: 'verified' | 'reviewing'
}

/**
 * 本地节日数据。日期由历法规则推出，命名与收录依据见 `sources.ts`。
 * 原因：不采用第三方历法库的节日输出，每条节日都要能回溯到已核对来源。
 * 边界：传统节日默认不匹配闰月（allowLeapMonth: false）；法定调休不作预测。
 */
export const FESTIVALS: readonly FestivalEntry[] = [
  {
    id: 'festival-spring',
    name: '春节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 1, day: 1, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-1'],
    status: 'verified',
  },
  {
    id: 'festival-lantern',
    name: '元宵节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 1, day: 15, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-2'],
    status: 'verified',
  },
  {
    id: 'festival-qingming',
    name: '清明节',
    category: 'traditional',
    match: { type: 'solar-term', term: '清明' },
    sourceIds: ['src-ich-batch-1'],
    status: 'verified',
  },
  {
    id: 'festival-duanwu',
    name: '端午节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 5, day: 5, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-1'],
    status: 'verified',
  },
  {
    id: 'festival-qixi',
    name: '七夕节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 7, day: 7, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-1'],
    status: 'verified',
  },
  {
    id: 'festival-zhongyuan',
    name: '中元节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 7, day: 15, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-4'],
    status: 'verified',
  },
  {
    id: 'festival-mid-autumn',
    name: '中秋节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 8, day: 15, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-1'],
    status: 'verified',
  },
  {
    id: 'festival-chongyang',
    name: '重阳节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 9, day: 9, allowLeapMonth: false },
    sourceIds: ['src-ich-batch-1'],
    status: 'verified',
  },
  {
    id: 'festival-laba',
    name: '腊八节',
    category: 'traditional',
    match: { type: 'lunar-fixed', month: 12, day: 8, allowLeapMonth: false },
    sourceIds: ['src-ich-laba'],
    status: 'verified',
  },
  {
    id: 'festival-dongzhi',
    name: '冬至',
    category: 'traditional',
    match: { type: 'solar-term', term: '冬至' },
    sourceIds: ['src-ich-batch-1', 'src-ich-batch-4'],
    status: 'verified',
  },
  {
    id: 'festival-chuxi',
    name: '除夕',
    category: 'traditional',
    match: { type: 'lunar-eve', month: 1, day: 1 },
    sourceIds: ['src-ich-batch-1', 'src-holiday-regulation'],
    status: 'verified',
  },
  {
    id: 'festival-new-year',
    name: '元旦',
    category: 'commemoration',
    match: { type: 'solar-fixed', month: 1, day: 1 },
    sourceIds: ['src-holiday-regulation'],
    status: 'verified',
  },
  {
    id: 'festival-labour-day',
    name: '劳动节',
    category: 'commemoration',
    match: { type: 'solar-fixed', month: 5, day: 1 },
    sourceIds: ['src-holiday-regulation'],
    status: 'verified',
  },
  {
    id: 'festival-national-day',
    name: '国庆节',
    category: 'commemoration',
    match: { type: 'solar-fixed', month: 10, day: 1 },
    sourceIds: ['src-holiday-regulation'],
    status: 'verified',
  },
]
