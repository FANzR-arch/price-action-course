# 价格行为交易 · 入门课

一套面向**完全新手**的、图文可交互的价格行为（Price Action）交易入门课程。纯静态网站，无需后端、无需构建工具，双击即可看，任意静态托管即可上线。

**线上地址：** https://price-action-course.vercel.app （连 GitHub 仓库，push 到 `main` 自动部署）

## 目录结构

```
price-action-course/
├── index.html              课程首页（CURRICULUM 数据驱动目录）
├── glossary.html           术语表
├── references.html         参考资料、课程简化原则与适用边界
├── 404.html                自定义 404 页
├── favicon.svg             站点图标（K 线）
├── lessons/
│   └── lesson-01.html … lesson-15.html   当前完成的 15 课
├── assets/
│   ├── css/site.css        全站共享样式（设计令牌 + 组件，扁平清爽）
│   ├── js/
│   │   ├── candles.js      K 线引擎：drawCandle / genSeries / mountChart / mountPlayground
│   │   ├── theme.js        深浅色主题：系统偏好、手动切换与本地记忆
│   │   ├── shell.js        课程外壳：顶栏 / 进度 / 章节高亮 / 颜色开关 / 上下课
│   │   └── widgets.js      交互组件库（candleLab / quiz / patternGallery / annotatedChart …）
│   ├── vendor/klinecharts.min.js   图表库（KLineChart v9，Apache-2.0）
│   └── og-cover.jpg        社交分享封面（1200×630）
├── .nojekyll               GitHub Pages 用（避免忽略某些文件）
├── PLAN.md                 开发规划（24 课 → 源底稿 → 组件 映射）
└── README.md
```

- **改样式** → 只动 `assets/css/site.css`，全站生效。
- **改 K 线画法 / 颜色约定 / 图表** → 只动 `assets/js/candles.js`（`window.PA`）。
- **加新课** → 在 `lessons/` 下复制现有课改内容，再到 `index.html` 的 `CURRICULUM` 数组里把对应课程的 `live:true` 打开、填上 `href`。

## 站点特性

- **无障碍**：跳到主内容 skip-link、图表 `role="img"` + `aria-label`、键盘焦点环、`prefers-reduced-motion`。
- **分享卡片**：每页 Open Graph / Twitter meta + 品牌封面图，链接分享到社媒有预览卡。
- **深浅色**：首次随系统偏好，之后可手动切换并记住选择。
- **视觉**：扁平清爽、无多余阴影与动效。

## 课程体系（六阶段 / 24 课）

课程选取 Al Brooks 价格行为体系中的基础概念，并按新手学习顺序组织为 24 课：

1. **看懂图（地基）**：读懂一根 K 线 → K 线信号 → 支撑阻力 → 市场三态
2. **趋势**：趋势解剖 → H1H2/L1L2 计数 → 通道 → Always In/均线 → 测量移动
3. **交易区间与突破**：区间交易 → 真假突破 → 突破失败 → 无交易环境
4. **形态**：楔形三推 → 三角形 → 双顶双底 → 最终旗形
5. **反转**：主要趋势反转 MTR → 磁力位 → 二次入场
6. **风控与执行**：止损止盈仓位 → 交易者方程/盈亏比 → 逐棒检查单/二元决策 → 交易计划与复盘

目前本地已完成**前 17 课**（阶段一至四全部），其余 7 课在 `index.html` 的 `CURRICULUM` 中登记、逐课更新（详见 `PLAN.md`）。线上内容以最近一次推送到 `main` 的版本为准；24 课也只是入门范围，不等于三本原著的完整替代。

## 本地预览

直接双击 `index.html` 即可（现代浏览器支持 file:// 打开）。若个别浏览器对本地 JS 有限制，可用任意静态服务器：

```bash
# 任选其一，在项目根目录执行
python -m http.server 8080      # 然后浏览器打开 http://localhost:8080
npx serve .
```

## 部署

**当前：Vercel（已连 GitHub，自动部署）**
- 仓库：https://github.com/FANzR-arch/price-action-course
- 改完代码 `git push` 到 `main` → Vercel 自动构建部署，约 10–30 秒后 https://price-action-course.vercel.app 即最新版。
- 手动部署：项目根目录执行 `vercel deploy --prod --yes`。
- `404.html` 会被 Vercel 自动用作找不到页面时的响应。

所有资源都用**相对路径**，也可放进任意静态托管（GitHub Pages / Netlify 等），构建命令留空、发布目录填根目录即可（已含 `.nojekyll`）。

## 免责声明

本课程仅用于交易知识的入门学习，不构成任何投资建议，也不承诺任何收益。图表与价格均为教学演示，未计入滑点、手续费、流动性与真实执行差异；历史回放和模拟结果不能代表未来实盘表现。主要书籍、公开资料和课程简化原则见 `references.html`。
