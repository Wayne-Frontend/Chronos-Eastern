# 岁月良辰 · Chronos Eastern

微信原生小程序，提供公农历、节气、月历、传统节日和基于已校勘古籍的日期参考。业务数据在本机计算，无后端、登录或云开发；收藏仅保存在当前设备。

## 当前功能

- 首页今日信息、42 格月历与日期详情；历法范围为 1901—2100 年，日期按 UTC+8 处理。
- 找日子开放出行、搬家、开业、婚嫁、订婚、提亲六事项，查询今天起 1—90 天；按日期升序展示候选，冲突及其他未入选日期可分类查看依据。首次查询展示完整版使用说明。
- 每个事项保留来源、适用边界和规则版本；卷十裁决原因及出处在详情中展示。`supported` / `complete` 表示当前事项条目收全，不表示复现全部传统体系，也不预测现实结果。
- 本地收藏列表、详情收藏、只含公开日期的中性分享。找日子页面只展示上述六个已开放事项。
- 六个页面、四个 Tab；关于页含来源说明和免责声明。

当前工作区的发布资料、规则版本和待验证项以 [发布检查单](docs/release-checklist.md) 为准。

## 本地开发

本轮验证环境为 Windows、Node.js `20.19.4`、npm `10.8.2`。小程序使用 WXML、SCSS、TypeScript；微信开发者工具负责 TypeScript/Sass 编译，没有网页开发服务器。

1. 安装依赖：`npm ci`。运行时依赖固定为 `lunar-javascript@1.7.7`。
2. 在微信开发者工具中打开项目根目录，使用项目 AppID 的开发权限。
3. 执行「工具 → 构建 npm」，产物位于 `miniprogram/miniprogram_npm/`。保留 `project.config.json` 的手动 npm 构建关联配置。
4. 编译并验证页面。`project.config.json` 的基础库配置为 `2.32.3`；本轮本地私有配置与模拟器实际使用 `3.17.4`，不能将该结果视为最低基础库兼容性证明。

```powershell
npm run check         # 类型、代码、样式、测试、格式检查
npm test              # Vitest
npm run typecheck
npm run lint
npm run lint:styles
npm run format:check
```

2026-10-19 最近一次完整门禁：**23 个测试文件、400 项测试通过**，其余检查通过。测试数量是该日期的记录，后续以命令输出为准。

## 模拟器与人工验收

在微信开发者工具中验证六个页面、六事项查询、裁决出处、收藏与分享导航。已测范围及未覆盖项统一记录在 [发布检查单](docs/release-checklist.md)。Android 与 iPhone 真机本轮由用户明确跳过，后续自行整体验证。

## 目录与维护

| 路径 | 用途 |
| --- | --- |
| `miniprogram/pages`、`components` | 页面和组件 |
| `miniprogram/services` | 历法、查询、规则、解释、收藏服务 |
| `miniprogram/adapters` | 唯一可调用第三方历法库的边界 |
| `miniprogram/data` | 节日、事项、版本化规则和来源 |
| `tests` | 单元及页面状态回归测试 |
| `docs` | 产品方案、来源、规则审计及发布检查 |

业务与校勘约束见 [CLAUDE.md](CLAUDE.md)，六事项待核内容及入宅、安葬准入路径见 [规则缺口清单](docs/rule-gap-inventory.md)，历法 API 白名单见 [历法库评估](docs/calendar-library-evaluation.md)，影印来源见 [来源台账](docs/sources-ledger.md)。第三方 MIT 声明位于 [THIRD_PARTY_NOTICES.md](miniprogram/vendor/THIRD_PARTY_NOTICES.md)，发布时保留。
