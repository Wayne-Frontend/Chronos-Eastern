export interface SourceEntry {
  id: string
  title: string
  publisher: string
  url: string
  kind: 'government-document' | 'institution-page' | 'classic-scan' | 'transcription'
}

/**
 * 节日与规则的来源台账。
 * 原因：产品要求每条数据可回溯到稳定来源；这里只登记已实际打开核对过的页面。
 * 边界：来源不含放假调休安排，调休属年度行政安排，无当年官方数据时不展示。
 */
export const SOURCES: readonly SourceEntry[] = [
  {
    id: 'src-ich-batch-1',
    title: '国务院关于公布第一批国家级非物质文化遗产名录的通知（国发〔2006〕18号）',
    publisher: '中国政府网 · 国务院公报',
    url: 'https://www.gov.cn/gongbao/content/2006/content_334718.htm',
    kind: 'government-document',
  },
  {
    id: 'src-ich-batch-2',
    title: '国务院关于公布第二批国家级非物质文化遗产名录的通知（国发〔2008〕19号）',
    publisher: '中国政府网 · 国务院公报',
    url: 'https://www.gov.cn/gongbao/content/2008/content_1025937.htm',
    kind: 'government-document',
  },
  {
    id: 'src-ich-batch-4',
    title: '国务院关于公布第四批国家级非物质文化遗产代表性项目名录的通知（国发〔2014〕59号）',
    publisher: '中国政府网 · 国务院公报',
    url: 'https://www.gov.cn/gongbao/content/2014/content_2792636.htm',
    kind: 'government-document',
  },
  {
    id: 'src-ich-laba',
    title: '国家级非物质文化遗产代表性项目 · 腊八节习俗（Ⅹ-174，浙江省，2021 年第五批）',
    publisher: '中国非物质文化遗产网',
    url: 'https://www.ihchina.cn/project_details/23622.html',
    kind: 'institution-page',
  },
  {
    id: 'src-holiday-regulation',
    title: '全国年节及纪念日放假办法（国务院令第795号，2024年修订）',
    publisher: '中国政府网 · 国务院公报',
    url: 'https://www.gov.cn/gongbao/2024/issue_11726/202411/content_6989774.html',
    kind: 'government-document',
  },
  {
    id: 'src-xjbf-vol3-scan',
    title: '钦定协纪辨方书·卷三（影印本，义例一：岁神，含岁刑）',
    publisher: 'Wikimedia Commons · CADAL 浙江大学图书馆藏本',
    url: 'https://commons.wikimedia.org/wiki/File:CADAL06056504_欽定協紀辨方書·卷三.djvu',
    kind: 'classic-scan',
  },
  {
    id: 'src-xjbf-vol4-scan',
    title: '钦定协纪辨方书·卷四（影印本，义例二：建除十二神、建除同位异名、月厌、厌对、阴阳不将）',
    publisher: 'Wikimedia Commons · CADAL 浙江大学图书馆藏本',
    url: 'https://commons.wikimedia.org/wiki/File:CADAL06056505_欽定協紀辨方書·卷四.djvu',
    kind: 'classic-scan',
  },
  {
    id: 'src-xjbf-vol5-scan',
    title: '钦定协纪辨方书·卷五（影印本，义例三：天德、月德、天德合、月德合、天赦等）',
    publisher: 'Wikimedia Commons · CADAL 浙江大学图书馆藏本',
    url: 'https://commons.wikimedia.org/wiki/File:CADAL06056506_欽定協紀辨方書·卷五.djvu',
    kind: 'classic-scan',
  },
  {
    id: 'src-xjbf-vol6-scan',
    title:
      '钦定协纪辨方书·卷六（影印本，义例四：驿马、劫煞、灾煞、月煞、月刑、天吏、天贼、往亡等）',
    publisher: 'Wikimedia Commons · CADAL 浙江大学图书馆藏本',
    url: 'https://commons.wikimedia.org/wiki/File:CADAL06056507_欽定協紀辨方書·卷六.djvu',
    kind: 'classic-scan',
  },
  {
    id: 'src-xjbf-vol11-scan',
    title: '钦定协纪辨方书·卷十一（影印本，用事：行幸遣使·出行同、嫁娶、般移·移徙同、开市等）',
    publisher: 'Wikimedia Commons · CADAL 浙江大学图书馆藏本',
    url: 'https://commons.wikimedia.org/wiki/File:CADAL06056511_欽定協紀辨方書·卷十一~卷十二.djvu',
    kind: 'classic-scan',
  },
  {
    id: 'src-xjbf-vol4-text',
    title: '钦定协纪辨方书·卷四（维基文库转录，仅用于检索定位）',
    publisher: '维基文库',
    url: 'https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷04',
    kind: 'transcription',
  },
  {
    id: 'src-xjbf-vol11-text',
    title: '钦定协纪辨方书·卷十一（维基文库转录，仅用于检索定位）',
    publisher: '维基文库',
    url: 'https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷11',
    kind: 'transcription',
  },
]

export function findSource(sourceId: string): SourceEntry | null {
  return SOURCES.find((source) => source.id === sourceId) ?? null
}
