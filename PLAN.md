# 价格行为入门课 · 开发规划（PLAN.md）

一套纯静态、可交互的价格行为（Price Action）课程。**内容以 `PA_Agent/prompt_engineering/` 为权威底稿，重写成新手大白话；不引入前端框架，保持零构建、任意静态托管即上线。**

## 站点现状（截至最近一次更新）

- **已上线：** https://price-action-course.vercel.app （GitHub `main` push 自动部署）。
- **进度：** 阶段一、二 + 阶段三前 2 课共 **11 课已上线**；12–24 课待建（见下表）。
- **站点级已完成：** favicon、社交分享卡片（OG/Twitter + 封面图）、图表无障碍（role/aria）、skip-link、扁平清爽视觉、全站文案精修。
- **待办（非课程内容）：** 自定义 404 页 ✅、深色模式手动切换钮（可选）、`rrCalculator` 组件（Phase F 需要）。

## 架构

```
index.html            课程首页（CURRICULUM 数据驱动目录）
lessons/lesson-NN.html 每课 = 内容 HTML + 一段配置脚本
assets/
  css/site.css        设计令牌 + 组件样式
  js/
    candles.js        底层引擎：drawCandle / genSeries / mountChart / mountPlayground
    shell.js          课程外壳：顶栏 / 进度 / 章节高亮 / 颜色开关 / 上下课 / 重绘登记
    widgets.js        交互组件库（见下）
  vendor/klinecharts.min.js   图表库（KLineChart v9，Apache-2.0）
```

**每课作者只写：正文 HTML + `PA.initLesson({...})` + 若干 `PA.widgets.xxx(容器, 配置)`。** 顶栏/进度/开关/上下课全部由 shell 自动生成。

## 交互组件库（widgets.js）

| 组件 | 用途 | 状态 |
|---|---|---|
| candleLab | 拖 OHLC 捏一根 K 线 + 结论 | ✅ |
| partHighlighter | 高亮实体/影线 | ✅ |
| quizChoice | 单选题 + 即时反馈 | ✅ |
| quizCandleGrid | 从几根 K 线里选 | ✅ |
| fillBlank | 填空 + 判定 | ✅ |
| patternGallery | 点一个形态/信号看一个（图 + 讲解切换） | ✅ |
| annotatedChart | 真实图上叠标注（S/R、通道、H1H2、MTR 箭头） | ✅ |
| drawOnChart | 用户在图上自己画线并判定 | ✅ |
| rrCalculator | 拖入场/止损/止盈算盈亏比+仓位+期望值 | ⏳ Phase F |

> 沙盘 `mountPlayground`（随机行情 + 参数拖动）在 candles.js，已可用。

## 24 课 → 源文件 → 组件 映射

| # | 课程 | 源底稿（prompt_engineering/） | 主组件 | 状态 |
|---|---|---|---|---|
| 01 | 读懂一根 K 线 | （原创基础） | candleLab / partHighlighter / quiz / fillBlank | ✅ 完成 |
| 02 | K 线信号：单根的语言 | 文件16-K线信号识别 | patternGallery / quizCandleGrid | ✅ 完成 |
| 03 | 支撑与阻力 | 市场诊断框架（节选） | annotatedChart / drawOnChart | ✅ 完成 |
| 04 | 市场三态：趋势·通道·区间 | 市场诊断框架 + 二元决策 | annotatedChart / playground | ✅ 完成 |
| 05 | 趋势的解剖 | 上涨/下跌通道分析识别 | annotatedChart | ✅ 完成 |
| 06 | H1/H2、L1/L2 计数 | 文件19-H1H2-L1L2计数 | annotatedChart | ✅ 完成 |
| 07 | 通道：窄 vs 宽 | 文件13-窄通道与宽通道策略 | annotatedChart | ✅ 完成 |
| 08 | 均线与 Always In | 文件20-AlwaysIn与20GB | annotatedChart | ✅ 完成 |
| 09 | 测量移动 | 文件23-MeasuredMove与结构目标 | annotatedChart | ✅ 完成 |
| 10 | 交易区间：高抛低吸 | 震荡区间分析识别/交易策略 | annotatedChart / drawOnChart | ✅ 完成 |
| 11 | 突破：真突破还是假突破 | 极速上涨/下跌分析识别 | annotatedChart | ✅ 完成 |
| 12 | 突破失败与突破测试 | 文件18-突破失败与突破测试 | patternGallery | ⏳ |
| 13 | 铁丝网与无交易环境 | 文件21-铁丝网与无交易环境 | annotatedChart | ⏳ |
| 14 | 楔形与三推 | 文件14-楔形形态分析交易 | patternGallery | ⏳ |
| 15 | 三角形与收敛形态 | 文件27-三角形与收敛形态 | patternGallery | ⏳ |
| 16 | 双重顶/底与微型结构 | 文件28-双重顶底与微型结构 | patternGallery | ⏳ |
| 17 | 最终旗形与趋势末端 | 文件24-最终旗形与趋势末端 | patternGallery | ⏳ |
| 18 | 主要趋势反转 MTR | 文件25-主要趋势反转MTR | annotatedChart | ⏳ |
| 19 | 信号失败后的磁力位 | 文件22-信号失败后的磁力位 | annotatedChart | ⏳ |
| 20 | 二次入场机会 | 文件15-二次入场机会 | patternGallery | ⏳ |
| 21 | 止损止盈与仓位管理 | 文件17-止损和止盈与仓位管理 | rrCalculator | ⏳ |
| 22 | 交易者方程与盈亏比 | 二元决策（节选） | rrCalculator | ⏳ |
| 23 | 逐棒检查单 & 二元决策 | 逐棒分析检查单 + 二元决策 | quizChoice 流程 | ⏳ |
| 24 | 交易计划、复盘与日志 | （原创落地） | fillBlank / checklist | ⏳ |

## 分阶段

- **Phase A（本轮）**：shell.js + widgets.js（6 旧组件 + patternGallery）+ lesson-01 迁到新外壳 + lesson-02。
- **Phase B**：阶段一收尾（03/04），建 drawOnChart、annotatedChart。
- **Phase C–E**：阶段二~五（趋势/区间/形态/反转）。
- **Phase F**：阶段六风控，建 rrCalculator。

## 原则

- 内容以 prompt_engineering 为准，**新手大白话重写**，不照抄术语。
- 不引框架；复用 KLineChart 的图表与 overlay 能力。
- 每加一课：写 `lessons/lesson-NN.html` → 到 index.html 的 `CURRICULUM` 把该课 `live:true` + 填 `href`。
- 免责声明每页保留；示例数据均为教学演示。
