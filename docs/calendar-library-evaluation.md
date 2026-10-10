# `lunar-javascript@1.7.7` 技术评估

> 评估日期：2026-10-09
> 当前状态：**资料审查、Node/TypeScript 隔离、微信构建、包体积、开发者工具与 iOS 真机验证已完成；Android 真机验证待完成，当前为部分 Go。**
> 目标范围：微信小程序内的公历、农历、星期、干支基础字段与二十四节气；不评估也不采用库内宜忌、吉凶或命理能力。

## 1. 初步结论

建议对 `lunar-javascript@1.7.7` 作**部分 Go**：它无运行时第三方依赖，提供 CommonJS/UMD 入口，基础公农历和节气 API 能覆盖 V1.0 需求；微信小程序构建、主包体积、UTC+8 一致性、权威样本准确性和 iOS 真机已经过本项目实测。Android 真机仍是生产采用前的最后一项环境门禁。

生产结论必须保持为“待定”，原因包括：

- 该包是单体 CommonJS 入口，未声明 ESM、`exports` 或 TypeScript 类型，裁剪效果与微信构建行为必须实测。[v1.7.7 `package.json`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/package.json)、[v1.7.7 文件列表](https://github.com/6tail/lunar-javascript/tree/v1.7.7)
- 源码的 `fromDate` 读取宿主环境的本地年月日时分秒，没有显式时区参数；公开 issue 也有跨时区结果不一致的未解决报告。适配器必须以 UTC+8 先归一化，再调用 `Solar.fromYmd`/`Solar.fromYmdHms`，不得直接传入业务 `Date`。[源码 `Solar.fromDate`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L13-L15)、[Issue #65](https://github.com/6tail/lunar-javascript/issues/65)
- v1.7.6 刚修复过“闰月及后续月份的干支错误”；v1.7.1 与 v1.7.5 还调整过节气计算使用的 ΔT 参数。闰月、立春和节气临界点必须成为阻断性回归项。[v1.7.7 CHANGELOG](https://github.com/6tail/lunar-javascript/blob/v1.7.7/CHANGELOG.md#L22-L44)
- 公开 issue 中仍有 v1.7.7 节气异常与节气秒级偏差报告。issue 只是风险线索，不等于已经证实的缺陷，但必须在准入前本地复现或排除。[Issue #66](https://github.com/6tail/lunar-javascript/issues/66)、[Issue #70](https://github.com/6tail/lunar-javascript/issues/70)
- 作者官网说明 `lunar` 后续不再增加新特性、仅修复 bug，并推荐长期支持的 Tyme；这不是立即弃用理由，但属于长期维护风险。[作者官网概览](https://6tail.cn/calendar/overview.html)

## 2. 版本、许可证与包结构

| 项目 | 审查结论 | 来源 |
| --- | --- | --- |
| 固定候选版本 | `1.7.7`；发布说明为新增 2026 年法定假日数据 | [v1.7.7 Release](https://github.com/6tail/lunar-javascript/releases/tag/v1.7.7)、[CHANGELOG](https://github.com/6tail/lunar-javascript/blob/v1.7.7/CHANGELOG.md#L43-L44) |
| 许可证 | MIT；分发时必须保留版权声明和许可文本，且软件按“原样”提供、不作担保 | [v1.7.7 LICENSE](https://github.com/6tail/lunar-javascript/blob/v1.7.7/LICENSE) |
| 运行时依赖 | `package.json` 没有 `dependencies`；只有测试用 `jest` 开发依赖 | [v1.7.7 `package.json`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/package.json#L44-L52) |
| npm 入口 | `main: index.js`；`index.js` 使用 `require('./lunar.js')` 和 `module.exports`，属于 CommonJS | [`package.json`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/package.json#L1-L6)、[`index.js`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/index.js) |
| 浏览器形态 | `lunar.js` 使用 UMD 包装，可走 AMD、CommonJS 或挂到全局对象 | [`lunar.js` UMD 入口](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L1-L11) |
| TypeScript | 包元数据未声明 `types`，仓库 v1.7.7 文件列表也没有 `.d.ts`；项目需要把最小类型声明限制在适配器边界 | [`package.json`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/package.json)、[v1.7.7 文件列表](https://github.com/6tail/lunar-javascript/tree/v1.7.7) |
| Tree-shaking/体积 | 单体 CommonJS 对按能力裁剪不友好；已有小程序使用者报告未使用模块仍被打包。该报告不是本项目测量结果，实际增量待本地构建统计 | [Issue #60](https://github.com/6tail/lunar-javascript/issues/60) |

### 微信小程序兼容性判断

源码没有显式依赖 Node 核心模块，CommonJS 形态也为小程序 npm 构建提供了兼容线索；但仓库没有对微信小程序作官方兼容承诺。因此必须以微信开发者工具实际构建和真机运行作为唯一准入证据，不能仅凭 Node 测试通过下结论。

本地实验结果（2026-10-09 更新，数字见第 8 节）：

- [x] 微信开发者工具可完成“构建 npm”并正常编译：TS 模板结构（`miniprogramRoot: "miniprogram/"` 与根目录 `package.json` 分离）必须配置 `packNpmManually: true` 与 `packNpmRelationList`，否则报 `NPM packages not found`。
- [x] Skyline 与 WebView 两种渲染路径中，适配器运行结果一致：基础库 3.17.2 + 「开启 Skyline 渲染调试」，首页与日期详情显示与 WebView 一致。
- [ ] 开发者工具、iOS 真机、Android 真机对相同 UTC+8 输入输出一致：开发者工具与 iOS 真机通过，Android 真机待补。
- [x] 记录安装前后 `miniprogram_npm`、主包及上传包体积变化；确认未突破项目预算。
- [x] 确认构建产物没有动态执行、Node 核心模块或浏览器 DOM 依赖：产物为开发者工具的 CommonJS 包装，无 `eval`、`new Function`、Node 核心模块或 DOM 引用。

## 3. 权威校验基准

准确性验收按以下优先级执行：

1. **GB/T 33661-2017**：国家标准目前为现行状态，2023-12-28 复审结论为继续有效，主管/归口单位为中国科学院，主要起草单位为中国科学院紫金山天文台。[全国标准信息公共服务平台](https://std.samr.gov.cn/gb/search/gbDetailed?id=n4aXcLrEnvA%3D&mode=p)
2. **紫金山天文台历书资料**：标准解读明确以北京时间为标准时间，以朔日为月首，含冬至之月为十一月，存在 13 个农历月时取最先不含中气之月为闰月；年度日历资料是项目核验中国大陆口径的首要样本。[标准解读材料](https://pmo.cas.cn/xwdt2019/kpdt2019/202203/P020240201504886119982.pdf)、[紫金山天文台历书查询](https://www.pmo.cas.cn/xwdt2019/kpdt2019/202203/t20220309_6386774.html)、[2026 年日历资料](https://www.pmo.cas.cn/xwdt2019/kpdt2019/202203/P020251230620718707826.pdf)
3. **香港天文台对照表**：用于 1901–2100 的第二交叉源，而不是覆盖中国大陆标准。香港天文台明确提示，远期新月或节气接近午夜时可能出现一日差异，并列出若干高风险年份/日期。[1901–2100 公农历对照表](https://www.hko.gov.hk/sc/gts/time/conversion.htm)

紫金山天文台说明农历以朔所在日期为月首，闰月由中气规则确定；因此测试不能只抽普通日期，还必须覆盖朔日、闰月首尾和中气边界。[历书基本术语简介](https://www.pmo.cas.cn/xwdt2019/kpdt2019/202203/t20220314_6389637.html)

历史区间需要单独解释：紫金山天文台的 1900–2025 历表说明，1949–2025 按现行国家标准模型整理，而 1900–1911 沿用清代《时宪书》、1912–1948 沿用民国时期历书。因而 1901–1948 的产品夹具应验证“官方颁行历表一致性”，不能把现代模型反推值直接覆盖历史颁行结果。[1900–2025 历表编制说明](https://www.pmo.cas.cn/xwdt2019/kpdt2019/202203/P020250414456381274062.pdf)

## 4. 受控 API 白名单

第三方对象不得离开 `lunar-adapter`。页面、store、fixture 和其他 service 只能接收项目自有的普通对象。

### 4.1 第一批允许调用

| 目的 | 允许 API | 约束 |
| --- | --- | --- |
| 构造纯公历日期 | `Solar.fromYmd(year, month, day)` | 输入先由项目代码做严格公历合法性和 1901–2100 范围校验；不解析日期字符串 |
| 构造含时刻日期 | `Solar.fromYmdHms(...)` | 只接收已经换算为 UTC+8 的数字字段；仅用于节气/干支临界实验 |
| 公历基础字段 | `getYear()`、`getMonth()`、`getDay()`、`getWeek()`、`getWeekInChinese()`、`toYmd()` | 输出复制为项目类型，不返回库对象 |
| 公历转农历 | `solar.getLunar()` | 只在适配器内部持有结果 |
| 农历基础字段 | `getYear()`、`getMonth()`、`getDay()`、`getYearInChinese()`、`getMonthInChinese()`、`getDayInChinese()` | 源码以负月份表示闰月，适配器必须显式转换为 `isLeapMonth` + 正数月份；中文月名只作展示值 |
| 星期 | `solar.getWeek()` / `getWeekInChinese()` | 项目统一定义 0–6 含义并写测试，避免页面自行解释 |
| 当日节气 | `lunar.getJieQi()` | 只有通过年度 24 节气日期核对后才可进入页面 |

这些方法可从 v1.7.7 源码直接确认：[`Solar` 构造及基础字段](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L200-L223)、[`Solar.getLunar`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L462-L464)、[`Lunar` 基础字段与中文名](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L889-L964)、[`getJieQi`](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L1272-L1279)。

### 4.2 干支口径：2026-10-09 定案，年/月统一按日

库同时提供多套干支字段，不能混成一个 `ganzhi`。**V1.0 采用按日口径**：交节当天整日按新值计算，不采用时刻口径。理由：V1.0 没有时刻输入，方案 6.4 已规定“仅有日期而无时刻时，交节边界规则不得参与筛选”，时刻口径字段在 V1.0 没有消费方；且源码中按日的月干本就由按立春日的年干推出，两种按日字段天然配套，混用两套口径会产出任何单一体系下都不存在的组合。

| 项目字段 | 准入 API | 口径 |
| --- | --- | --- |
| `yearLunarNewYear` | `getYearInGanZhi()` | 按农历正月初一换年，用于普通农历展示 |
| `yearLiChun` | `getYearInGanZhiByLiChun()` | 按立春**所在公历日**换年；源码比较 `toYmd()` |
| `monthJieQi` | `getMonthInGanZhi()` | 按节令**所在公历日**换月；源码 `_computeMonth` 第一个循环比较 `toYmd()`，月干由 `yearGanIndexByLiChun` 推出 |
| `dayCivil` | `getDayInGanZhiExact2()` | 民用日午夜换日，不在 23:00 推进；库方法名不解释业务含义，由适配器改成项目术语 |

未准入的时刻与其他口径 API：`getYearInGanZhiExact()`、`getMonthInGanZhiExact()`、`getDayInGanZhi()`、`getDayInGanZhiExact()`。若未来支持时刻输入或迁移 Tyme，须按同样“口径写进字段名”的原则重新评审。

源码依据：[年/月/日干支方法](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L915-L941)、[立春与节令比较逻辑](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L666-L729)、[23:00 换日逻辑](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L731-L754)

节气白名单：`getCurrentJieQi()`（仅节气当日返回，源码按年月日比较）与 `getNextJieQi(wholeDay)` 已随适配器准入，`2025-12-21`、`2026-01-02`、`2026-01-05` 三个风险样本通过；秒级精度与连续 10 年 24 节气逐条比对仍是阻断项。`getJieQiTable()`、`getPrevJieQi()` 未准入。[节气表及相邻节气 API](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L1577-L1616)

### 4.3 明确禁止

以下 API/能力不得进入 V1.0 业务路径：

- `getDayYi()`、`getDayJi()`、`getTimeYi()`、`getTimeJi()`；
- `getDayJiShen()`、`getDayXiongSha()`；
- `getZhiXing()`、`getDayTianShen()`、`getDayTianShenType()`、`getDayTianShenLuck()` 及黄黑道/吉凶派生值；
- `getEightChar()`、八字、十神、五行、命盘、运势相关对象；
- 彭祖百忌、冲煞、吉神方位、胎神、纳音等高层传统字段；
- `HolidayUtil` 的法定节假日数据以及库内 `getFestivals()`，除非后续单独建立来源、版本和年度更新机制；
- `Solar.fromDate()` / `Lunar.fromDate()` 作为核心业务输入；
- `toFullString()` 作为页面数据来源，因为它混合了未经准入的高风险字段。

源码能确认宜忌、吉凶神煞、八字等能力确实存在。[宜忌和吉凶神煞 API](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L1404-L1467)、[八字 API](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L1719-L1723)。v1.7.0、v1.7.1、v1.7.5 与 v1.7.6 多次修改宜忌或吉神凶煞，且仍有公开错误报告，所以这些字段不能被当作权威规则结果。[CHANGELOG](https://github.com/6tail/lunar-javascript/blob/v1.7.7/CHANGELOG.md#L18-L41)、[Issue #63](https://github.com/6tail/lunar-javascript/issues/63)

## 5. 已知风险与隔离措施

### 5.1 输入合法性

`Solar.fromYmdHms` 的构造逻辑检查月份是否为 1–12、日期是否为 1–31，但没有在该入口按月份校验 2 月 30 日、4 月 31 日等组合。项目不能把“库没有抛错”当作输入有效，必须先由自己的纯函数做严格公历校验。[构造参数检查源码](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L59-L109)

### 5.2 时区

GB/T 33661 解读材料要求以北京时间为标准时间；库的 `fromDate` 则读取宿主本地时间。隔离措施：

- 业务日期 key 固定为 `YYYY-MM-DD`，不得由 `new Date('YYYY-MM-DD')` 解析。
- “今天”先按 UTC+8 取得年、月、日，再调用 `Solar.fromYmd`。
- 节气时刻统一输出 ISO 8601 带 `+08:00` 偏移，并同时保存 `localDate`。
- 自动化测试至少在 `TZ=Asia/Shanghai` 与另一个不同时区环境运行，结果必须一致。

作者 FAQ 也要求各环境统一使用 GMT+8；这与国家标准的北京时间要求一致，但不能替代本项目的跨时区自动化验证。[作者 FAQ](https://6tail.cn/calendar/faq.html)

### 5.3 节气精度与日期归属

库内部先计算节气儒略日，再转成 `Solar`；年份和月份的精确干支也直接依赖这些时刻。[节气计算入口](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L625-L633)、[精确干支边界](https://github.com/6tail/lunar-javascript/blob/v1.7.7/lunar.js#L648-L729)

香港天文台提示，远期月相/节气计算可能有数分钟误差，接近午夜时会导致日期相差一天，并点名 2057-09-28、2089-09-04、2097-08-07 的新月，以及 2051 春分、2083 立春、2084 春分等情形。这些日期应作为“模型边界观察样本”；若香港与中国大陆权威数据冲突，以 GB/T 33661 和紫金山天文台口径为准。[香港天文台说明](https://www.hko.gov.hk/sc/gts/time/conversion.htm)

### 5.4 闰月及干支

v1.7.6 修复过闰月及后续月份干支错误，因此不能只验证闰月第一天，还要覆盖闰月前一日、首日、末日、后一日，以及闰月后的整个月干支。[CHANGELOG](https://github.com/6tail/lunar-javascript/blob/v1.7.7/CHANGELOG.md#L39-L41)

### 5.5 包体积与长期维护

包以完整 `lunar.js` 暴露大量 V1.0 不使用的能力。适配器可以控制调用面，但不保证构建器能删除未调用代码。必须记录安装前后主包体积；若超预算且无法可靠裁剪，应判定 No-Go，而不是复制并私改第三方源码。

## 6. 建议测试夹具

### 6.1 阻断性样本

| 类别 | 样本 | 预期/权威来源 |
| --- | --- | --- |
| 公历世纪闰年 | `2000-02-28/29`、`2000-03-01`；`2100-02-28`、`2100-03-01` | 2000 可有 2 月 29 日；2100 不可有。`2100-02-29` 必须由适配器拒绝 |
| 非法日期 | `2025-02-29`、`2026-04-31`、月 0/13、日 0/32 | 必须返回项目统一错误，不能把库容忍行为泄漏到页面 |
| 已知闰日 | `2000-02-29` | 应为农历正月廿五、星期二；[HKO 2000 文本历表](https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2000c.txt) |
| 2023 闰二月 | `2023-03-21/22`、`2023-04-19/20` | 二月三十 → 闰二月初一 → 闰二月廿九 → 三月初一；[HKO 2023 文本历表](https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2023c.txt) |
| 春节边界 | `2025-01-28/29/30`、`2026-02-16/17/18` | 连续核对农历年、月、日与年干支；[HKO 2025](https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2025.pdf)、[HKO 2026](https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2026.pdf) |
| 2025 闰六月 | `2025-07-24/25`、`2025-08-22/23` | 核对普通六月末、闰六月首尾、七月首日、`isLeapMonth` 与月干支；[HKO 2025](https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2025.pdf) |
| 当前首页日期 | `2026-10-08/09/10` | 八月廿八（寒露、星期四）→ 八月廿九 → 九月初一；[HKO 2026](https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt) |
| 更多闰月 | 在 1901–2100 内再选至少 5 个不同闰月，各测首日、末日、相邻日 | 逐个对照紫金山/HKO；不能只依赖库自身反向转换 |
| 公历跨年 | 每个抽样年的 `12-31` 与下一年 `01-01` | 公历年变化不应误触发农历岁首或立春换年 |
| 立春边界 | ~~2026 立春交节前 1 秒、交节时刻、后 1 秒~~ → 改为按日口径验证 | 已被 4.2 的「统一按日」决策取代：适配器不输出时刻口径干支，改为断言立春当天整日切换（2026-02-04 年柱丙午、月柱庚寅），并验证交节时刻本身与紫金山一致（04:02） |
| 节令换月 | ~~至少选立春、惊蛰、清明等节令，各测前 1 秒/当时刻/后 1 秒~~ → 改为按日口径验证 | 同上：只保留 `monthJieQi` 按日字段（2026-03-05 惊蛰当天月柱辛卯），时刻口径 API 未准入 |
| 24 节气日期 | 连续至少 10 年，每年 24 个节气逐条比对 | 中国大陆口径以紫金山年度资料为主，HKO 为交叉源 |
| 产品范围 | `1901-01-01`、`2100-12-31`；以及范围外相邻日 | 边界内可计算，边界外返回明确错误；[HKO 1901](https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/1901.pdf)、[HKO 2100](https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2100.pdf) |
| 时区一致性 | 同一绝对时刻分别在 UTC、UTC+8、UTC-8 宿主环境执行 | 业务 `localDate` 和基础历法结果都必须按 UTC+8 一致 |
| 已公开风险复现 | `2025-12-21`、`2026-01-02`、`2026-01-05` 及 2026 立春时刻 | 依次应为冬至、无当日节气、小寒；明确调用哪个 API、是否传 `wholeDay`，复现或排除 Issue #66/#70 |

### 6.2 全量抽样策略

- 公农历转换：1901–2100 每年固定抽取 1 月 1 日、2 月末、6 月 30 日、12 月 31 日，并加入所有农历月首。
- 双向一致性：公历 → 农历 → 公历必须回到原始日期；该性质测试只能发现内部不一致，不能替代权威资料。
- 闰月：全区间所有闰月首尾和相邻日全量测试。
- 节气：~~至少连续 10 年与紫金山年度资料逐条比对~~ 已完成（2017—2026，见第 8 节）；2051、2083、2084 的近午夜风险年份仍待单独记录。
- 干支：春节、立春日与立春时刻、节令换月、23:00 前后分别断言各自口径，禁止用一个期望值覆盖所有字段。

## 7. Go / No-Go 条件

### Go：允许进入生产适配器

以下条件必须全部满足：

1. 微信开发者工具构建、预览、真机运行均无新增错误或警告。
2. 固定精确版本 `1.7.7` 与 lockfile 完整性；保留 MIT 许可文本。
3. 安装前后主包体积增量已记录并处于项目预算内。
4. 第 6 节阻断性样本全部通过；连续 10 年 24 节气日期与紫金山资料一致。
5. UTC+8 归一化在不同宿主时区、开发者工具与真机上结果一致。
6. 适配器对非法日期和范围外日期返回统一 `AppResult` 错误，不传播第三方异常或对象。
7. 代码扫描确认只有 `lunar-adapter` 引用该包，且只调用已批准白名单。
8. 库内宜忌、吉凶、八字、节假日和节日数据没有进入页面、规则引擎或筛选器。

### No-Go：拒绝当前版本或拆分能力

出现任一情况即暂停生产采用：

- 公农历日期、闰月或节气所在日与 GB/T 33661/紫金山权威数据存在无法解释的差异。
- Issue #66 所述节气异常能在本项目计划使用的 API 路径稳定复现。
- 相同 UTC+8 输入在不同设备/宿主时区出现不同结果。
- 微信小程序无法稳定打包、运行，或包体积超过预算且无法通过受支持方式解决。
- 必须依赖未声明口径的 `Date` 解析、第三方对象泄漏或页面直接调用才能工作。
- 为达到产品要求不得不启用禁止的高风险 API。

可以按能力拆分结论：例如公农历转换通过但节气失败时，只准入基础转换，节气改用经过验证的数据源；不能因为部分能力通过而整体放行。

## 8. 本地实验回填区

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 安装版本与完整性 | 通过 | `package.json` 精确固定 `1.7.7`；`package-lock.json` 已写入完整性；`npm ls lunar-javascript --json` 确认为 `1.7.7`，无运行时子依赖 |
| 微信开发者工具版本 | 通过 | Stable 2.02.2608080（win32）；构建 npm 成功，配置见第 2 节 |
| Skyline 编译/运行 | 通过（开发者工具） | 基础库 3.17.2 + Skyline 渲染调试；首页与日期详情显示与 WebView 一致，控制台无异常 |
| WebView 编译/运行 | 通过（开发者工具 + iOS 真机） | 首页与日期详情显示农历、三柱干支、节气倒计时，与 Node 端输出一致；Android 真机待补 |
| 主包体积增量 | 通过 | 原始 `index.js + lunar.js` 共 `436,728` 字节 → 构建后 `miniprogram_npm/lunar-javascript/index.js` 为 `438,382` 字节（+`1,654`，+0.38%）；另有 `index.js.map` `488,256` 字节（源码定位用，不计入体积判断）。页面代码 `52,448` 字节，含产物共约 `479 KB`，远低于 2 MB 主包上限 |
| 产物依赖扫描 | 通过 | 构建产物无 `eval` / `new Function` / Node 核心模块 / DOM / 网络 API；未做 tree-shaking，库内禁用能力仍在产物中，靠适配器白名单与代码审查约束调用面 |
| TypeScript 隔离 | 通过 | 项目自有最小 `.d.ts` 只暴露白名单 API；`npm run typecheck` 通过 |
| UTC+8 跨时区测试 | Node 环境通过 | 同一日期在 `Asia/Shanghai`、`UTC`、`America/Los_Angeles` 三个宿主时区结果一致；开发者工具与真机待验证 |
| 权威日期夹具 | 初始集通过 | 11 组 HKO 公农历样本覆盖 1901/2100 边界、春节和 7 组闰月 |
| 二十四节气回归 | 通过（10 年主源 + 4 年交叉源） | 2017—2026 年逐年 24 节气与紫金山天文台《日历资料》（GB/T 33661—2017 编制）逐条比对：`240/240` 日期一致，交节时刻差值 `−30s ~ +31s`（来源只公布到分钟，最大 31 秒为取整效应）；2027—2030 年与香港天文台对照表比对 `96/96` 一致。两源在 2021—2026 重叠年份的 `144` 条日期完全一致。夹具：`tests/fixtures/solar-terms-authority.ts`，测试：`tests/solar-terms.test.ts`（全年逐日扫描，覆盖 5110 个日期） |
| 代码边界扫描 | 通过 | 只有 `adapters/lunar-adapter.ts` 引用第三方包（他处仅版本号字符串）；调用面全部落在白名单；`getDayYi`/`getDayJi`/`getJiShen`/`getEightChar`/`HolidayUtil`/`getFestivals`/`fromDate`/`toFullString` 在业务路径零命中；`vendor/THIRD_PARTY_NOTICES.md` 保留 MIT 全文 |
| 干支口径 | 已定案：年/月统一按日 | 见 4.2；`yearLiChun` 用 `getYearInGanZhiByLiChun`、`monthJieQi` 用 `getMonthInGanZhi`，交节日整日切换；`tests/lunar-adapter.test.ts` 覆盖立春（2026-02-04）与惊蛰（2026-03-05）当日边界 |
| Issue #66/#70 复现 | 日期级路径通过 | `2025-12-21` 为冬至、`2026-01-02` 无当日节气、`2026-01-05` 为小寒；秒级精度和立春临界仍待权威时刻核验 |
| 自动化结果 | 通过 | 2026-10-10 全量质量门禁共 15 个测试文件、263 项测试通过；除历法、节气、日期、格式、节日、最近节日和收藏外，已覆盖规则事实层、完整出行条目、有限支持门禁、找日子分批查询、冲突日期清单、单日规则解释与结果表述层。后续以 `npm run check` 的最新输出为准。 |
| 最终决定 | 部分 Go（仅剩 Android 真机） | 微信构建、包体积、产物扫描、Skyline + WebView 双路径、iOS 真机、10 年 24 节气回归、代码边界扫描均已通过；生产采用前还需 Android 真机复验 |

## 9. 升级规则

- 生产代码固定精确版本，不使用 `^` 或 `~`。
- 升级前逐条阅读 Release/CHANGELOG 和相关 issue，并重跑全部权威夹具；不能只跑库自带测试。
- 如果未来迁移到 Tyme 或其他库，项目自有 `DateInfo` 与 service 接口保持不变，仅替换适配器。
- 所有来源、算法版本、产品支持范围和已知限制应随发布版本记录，页面不得把未经验证的结果描述为国家标准结论。
