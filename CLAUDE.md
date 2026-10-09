# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

「岁月良辰」（package name `chronos-eastern`）是微信原生小程序：公历/农历/节气查询 + 基于已校勘古籍规则的「找日子」。V1.0 **无后端、无登录、无云开发**，全部本地计算，收藏走 `wx.setStorage`。

- WXML + SCSS + TypeScript；TS/Sass 由微信开发者工具内置编译插件处理（`project.config.json` → `useCompilerPlugins`），无 CLI 构建产物
- Skyline + glass-easel 渲染，`navigationStyle: custom`，每个页面顶部自己渲染 `<navigation-bar>`
- 唯一运行时依赖：`lunar-javascript`，**精确固定 `1.7.7`**（不用 `^`/`~`）

两份文档定义了本项目的硬边界，动手前先读：

- `docs/岁月良辰-V1.0-产品与技术方案.md`——产品/技术方案：四页职责、数据 schema、错误码、规则引擎语义、分阶段计划
- `docs/calendar-library-evaluation.md`——历法库准入评估：API 白名单、禁止 API、Go/No-Go 条件、待回填的实测表格

## 常用命令

```bash
npm run check        # 提交前总门禁：typecheck + lint + lint:styles + test + format:check
npm run typecheck    # tsc -p tsconfig.json 且 -p tsconfig.test.json（两份都必须过）
npm run lint         # ESLint（miniprogram/**、tests/**）
npm run lint:styles  # stylelint（miniprogram/**/*.scss）
npm test             # vitest run
npm run format       # prettier --write
```

单跑一个测试文件：`npx vitest run tests/date-key.test.ts`；只跑某个用例：`npx vitest run tests/date-key.test.ts -t "拒绝非闰年的 2 月 29 日"`。

编译与小程序的运行环境只能在微信开发者工具里验证（打开项目根目录）。改动 npm 依赖后必须执行「工具 → 构建 npm」生成 `miniprogram_npm/`（已 gitignore），否则 `import 'lunar-javascript'` 会报模块缺失。构建 npm 依赖 `project.config.json` 里的 `packNpmManually: true` + `packNpmRelationList`（TS 模板结构必需，删掉会报 `NPM packages not found`）。**Node 端测试通过 ≠ 生产可用**：真机、包体积、Skyline/WebView 差异都必须在开发者工具与真机复验，结果回填到评估文档第 8 节。

## 分层与调用规则

```text
pages / components  →  services（calendar-service 已建，其余待建）  →  adapters/lunar-adapter  →  lunar-javascript
                                     ↘  data/rules（待建）+ rule-engine（待建）
```

方案 5.1 的硬性约束（评审 diff 时按此判断）：

- **只有 `miniprogram/adapters/lunar-adapter.ts` 可以 import 第三方历法库**，且只调用白名单 API；库对象不得泄漏给页面
- 页面不得直接读写 `wx.setStorage`、不得直接解释规则 JSON、不得自己判断宜忌——只调用稳定的小型 service 函数
- 页面间只传 `YYYY-MM-DD`（如 `?date=YYYY-MM-DD&from=calendar`），禁止传时间戳

已存在：`pages/`（index、calendar、find-date、day-detail）、`components/`（empty-state、navigation-bar、calendar-grid）、`adapters/`、`services/`（calendar-service、festival-service、favorite-service、rule-engine、find-date-service）、`data/`（festivals、sources、event-types、rules/ 的 manifest 与 travel.v1）、`types/`（calendar、home、result、rule）、`utils/`（date-key、format、ganzhi、util）、`vendor/`。方案 5.3 列出的模块已全部创建，四页均已接入真实数据。
事项状态有四个：`supported`（规则完整、来源已定位、测试通过）、`limited`（已有 verified 规则可查询，但条目未收全）、`reviewing`（整理中，不可查询）、`unsupported`（本版本不提供）。**`supported` 与 `limited` 可查询，门禁只在 `data/event-types.ts` 的 `canQueryEventType()` 一处**，页面与服务不得各自比较字面量。当前出行是 `limited`（规则包 `xjbf-travel@1.17.1`，条目已收宜 16/16、忌 16/16；因天德在四仲月以四维记位、无值日可判，整包仍为 `partial`，**不升级为 `supported`**，见审计 §8.11）。
规则包的 `completeness`（`complete`/`partial`）与 `status` 正交：前者说整包是否收全，后者说包内单条规则是否过校勘；事项状态与它必须一一对应（`limited` ⟺ `partial`），有测试守这条不变量。`partial` 时事项入口（chip 标记 + 选中提示）、结果列表上方、详情页规则区**三处都必须显示覆盖范围**，统一用 `data/rules/manifest.ts` 的 `PARTIAL_COVERAGE_NOTICE`，不得让用户以为已收录全部古籍条款；结果卡展示依据时同时展示 `coverage`。

古籍规则的入库门槛：转录文本（维基文库等）只能用于检索定位，**必须回看影印件核对后才能标 `verified`**；每条规则的 `sourceIds` 指向 `data/sources.ts` 中已实际打开核对过的页面，`locator` 记录卷次与条目。规则包必须写 `coverage`，声明本版本收录了什么、哪些条款尚未收录，页面要向用户展示。

`components/navigation-bar/` 是官方模板自带文件（含 styles 覆写与大量原文注释），不要顺手"规范化"它的写法。tab 页用 `Component({ data, methods })` 声明，二级页 `day-detail` 用 `Page({...})`。

## 数据与历法口径约定

- **日期键**：全项目用 `DateKey`（`YYYY-MM-DD` 字符串，见 `types/calendar.ts`）。禁止 `new Date('YYYY-MM-DD')` 作为业务输入——不同环境可能按 UTC 解析；"今天"必须先按 UTC+8 取年月日再构造。时区固定 `Asia/Shanghai`
- **干支必须带口径**：`GanzhiDateParts` 拆成 `yearLunarNewYear`（正月初一换年）/ `yearLiChun`（立春换年）/ `monthJieQi`（节令换月）/ `dayCivil`（民用日）四个字段，其中年、月两级**统一按"日"切换**（交节当天整日按新值，V1.0 无时刻输入，定案见评估文档 4.2）。不要新增含糊的 `ganzhiYear`，也不要用一个期望值覆盖多个口径
- **节气**：输出 `{ name, instant(+08:00 的 ISO), localDate }`；只按日期展示时用 `localDate`，规则涉及交节前后必须比较 `instant`
- **返回值**：有失败路径的 service/适配器一律返回 `AppResult`（`types/result.ts`）判别联合，不抛异常；纯查表且无失败路径的模块（如 `matchFestivals`）直接返回结果，不制造不会发生的错误分支。错误码沿用方案 5.9：`INVALID_DATE`、`CALENDAR_OUT_OF_RANGE`、`CALENDAR_COMPUTE_FAILED`、`RULE_PACK_MISSING`、`RULE_CONFLICT`、`STORAGE_READ_FAILED`、`STORAGE_WRITE_FAILED`
- **支持年份**：1901-01-01 至 2100-12-31，范围判断属于 service 层（适配器只校验单个公历日的合法性）
- **类型声明**：`typings/lunar-javascript/index.d.ts` 是手写的最小声明，只暴露白名单方法。要用新的库 API，必须同时改这里 + 更新评估文档白名单
- 改库版本时要同步 `adapterVersion: 'lunar-javascript@1.7.7'`、`typings/`、评估文档，并重跑全部权威夹具
- 收藏 storage key 约定为 `syliangchen:favorites:v1`，schema 带 `schemaVersion`；读取失败或版本不识别时**保留原值、不清空**

`tsconfig.json` 覆盖 `miniprogram/**` + `typings/**`（含 wx 类型，用的就是仓库里 `typings/types/wx` 这份，不是 npm 包的；该副本是 2021 年版，缺少基础库 2.20.1 之后的接口，新用到的 wx API 先补进 `typings/wx-supplement.d.ts`，整份 typings 升级后该文件整体删除）；`tsconfig.test.json` 只 include `tests/**` 与 `miniprogram/{adapters,services,types,utils}`——测试若要引用其他目录（如未来的 `data/`），需先把它加进 `tsconfig.test.json`。

## 历法库红线（禁止进入业务路径）

以下 API 一律不得出现在页面、规则引擎或任何 service 中：`getDayYi` / `getDayJi` / `getTimeYi` / `getTimeJi`、`getDayJiShen` / `getDayXiongSha`、`getZhiXing` / `getDayTianShen*`（黄黑道）、`getEightChar` 及八字命理相关、`HolidayUtil` 与库内 `getFestivals()`、`Solar.fromDate` / `Lunar.fromDate`、`toFullString`。

即：库内**宜忌、吉神凶煞、黄黑道、八字、法定节假日、节日数据全部禁用**；宜忌只能来自项目自己校勘过的 `verified` 规则包。方案 6.6 与评估文档 4.3 是这条线的依据，改动前请重读。

规则相关语义（方案 6.7）：`unknown`（缺输入）不等于"未命中"，不得当作通过；同级纳入/排除冲突且无来源裁决时返回 unresolved，该日不进入结果；规则不计算吉凶分、不按命中条数排序、结果只按日期升序；规则包版本不匹配则整次查询失败。

冲突不能只给计数：`findDates` 除 `summary.conflictDays` 外还必须返回 `conflictDates`，找日子页要逐日列出并可跳到详情看双方依据。原因：随规则增多，冲突日占比已到约 10%，只显示计数等于让日期凭空消失。

**`unresolved` 不是权宜之计**：卷十「宜忌」的常例就是宜忌并见且无德神裁决时"两者皆不注"，与本项目语义一致（见 `docs/conflict-adjudication-audit.md`）。原书另外给出了德合并临、六等第、宜忌等第表等例外，但**射程不全**（「巳日」这类用事自带的日支忌不在卷十体系内）且需要跨条件裁决能力，本版一律按常例处理，偏保守。**不得在引擎里自行加"忌优先"或"德神优先"**；要加必须先补完该审计列的流程。文案不要写"来源未提供裁决顺序"——原书有常例，措辞要如实。规则状态机 `draft → located → transcribed → interpreted → reviewed → verified → deprecated`，只有 `verified` 参与筛选，改规则要递增规则包版本。

## 测试

- `vitest`，无配置文件，测试在 `tests/`（node 环境），当前覆盖 `date-key`、`format`、`ganzhi`、`lunar-adapter`、`calendar-service`、`festival-service`、`favorite-service`、`rule-engine`、`rule-explanation-service`、`find-date-service`、`event-types` 与 `solar-terms`（共 190 项，约 1 秒）；测 Storage 相关代码用 `vi.stubGlobal('wx', ...)` 注入假存储，测 partial 等异常分支用 `vi.mock` 改造 `calendar-service`
- 权威样本夹具：`tests/fixtures/calendar-authority.ts`（公农历，HKO）与 `tests/fixtures/solar-terms-authority.ts`（2017–2026 紫金山含交节时刻、2027–2030 HKO），每条样本都带 `source`。新增样本必须能定位到权威来源（紫金山天文台 / GB/T 33661 优先，HKO 为交叉源），**不得用两个同源网络黄历互证，也不得拿库自身输出当期望值**
- 现有测试已覆盖：闰月首日、春节边界、1901/2100 范围边界、双年干支口径、立春/惊蛰当日按日换年换月、节气名称与时刻、连续 10 年 24 节气逐日扫描（紫金山主源，交节时刻分钟级一致）、跨宿主时区（`TZ` 三值）一致、"今天"按 UTC+8 换日、库星期与公历推算交叉核对、非法日期不外泄库异常、世纪闰年 2100、service 层统一错误码
- 评估文档第 6 节列出尚未补齐的阻断样本（2051/2083/2084 近午夜风险日、交节时刻秒级精度、历史区间 1901–1948 的官方颁行历表一致性）——扩展夹具时优先从这里取

## 视觉与代码规范

- 设计令牌是 `miniprogram/app.scss` 里 `page` 上的 CSS 变量（`--color-*`、`--font-size-*`、`--space-*`、`--radius-*`、`--shadow-card`），新页面样式复用变量，不要散落硬编码色值。中文注释/文档里的色值可能与实现有细微偏差，**以 app.scss 为准**
- 共享类：`.page-shell`、`.page-content`、`.section-card`、`.page-intro`、`.primary-button`/`.secondary-button`、`.button-pressed`（按压态统一用 `hover-class`）
- Prettier：无分号、单引号、width 100、trailingComma all；`*.wxml` 与 `docs/`、`typings/` 不在格式化范围内（wxml 也没有任何 lint/检查，改 wxml 只能靠人工与开发者工具）
- ESLint：`no-console` 与 `@typescript-eslint/no-explicit-any` 均为 error，未使用参数用 `_` 前缀；tsconfig 为 strict + `noUnusedLocals` / `noUnusedParameters` / `noImplicitReturns`
- 环境：所有文件 UTF-8 无 BOM、LF（`.editorconfig` + `.gitattributes`）

## 产品合规红线（影响文案与功能取舍）

- 禁止命理/预测/效果保证类表达：算命、改运、消灾、灵验、"最佳吉日"、"百无禁忌"、对婚姻/财富/健康/事故作预测；不得出现星级、百分比、综合吉凶分
- 找日子只对 `supported`/`limited` 事项开放查询，`reviewing`/`unsupported` 事项必须置灰且不可触发查询；无规则时显示"资料整理中"，**不得回退到第三方库宜忌**
- `limited` 事项的结果不得呈现为完整传统结论：事项入口、结果列表上方、详情页规则区三处都必须显示覆盖范围
- 数据缺失、规则冲突、计算失败时宁可不出结果，并区分"无数据/无匹配/有明确排除"三种语义
- 详情页每个宜忌标签都要能展开到 `verified` 规则与来源定位；不得把库内所有宜忌称为《协纪辨方书》结论
- 不新增依赖（尤其历法/UI/状态管理/请求库）前先说明原因、替代方案与影响范围；`vendor/THIRD_PARTY_NOTICES.md` 的 MIT 文本必须随代码保留
