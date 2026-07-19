# 价格行为交易 · 入门课

一套面向**完全新手**的、图文可交互的价格行为（Price Action）交易入门课程。纯静态网站，无需后端、无需构建工具，双击即可看，任意静态托管即可上线。

**线上地址：** https://price-action-course.vercel.app （连 GitHub 仓库，push 到 `main` 自动部署）

## 目录结构

```
price-action-course/
├── index.html              课程首页（CURRICULUM 数据驱动目录）
├── 404.html                自定义 404 页
├── favicon.svg             站点图标（K 线）
├── lessons/
│   └── lesson-01.html … lesson-09.html   已上线的 9 课
├── assets/
│   ├── css/site.css        全站共享样式（设计令牌 + 组件，扁平清爽）
│   ├── js/
│   │   ├── candles.js      K 线引擎：drawCandle / genSeries / mountChart / mountPlayground
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
- **深浅色**：随系统自动切换（`prefers-color-scheme`）。
- **视觉**：扁平清爽、无多余阴影与动效。

## 课程体系（六阶段 / 24 课）

完整覆盖 Al Brooks 式价格行为，由浅入深：

1. **看懂图（地基）**：读懂一根 K 线 → K 线信号 → 支撑阻力 → 市场三态
2. **趋势**：趋势解剖 → H1H2/L1L2 计数 → 通道 → Always In/均线 → 测量移动
3. **交易区间与突破**：区间交易 → 真假突破 → 突破失败 → 无交易环境
4. **形态**：楔形三推 → 三角形 → 双顶双底 → 最终旗形
5. **反转**：主要趋势反转 MTR → 磁力位 → 二次入场
6. **风控与执行**：止损止盈仓位 → 交易者方程/盈亏比 → 逐棒检查单/二元决策 → 交易计划与复盘

目前**前 9 课已上线**（阶段一全部 + 阶段二全部），其余 15 课在 `index.html` 的 `CURRICULUM` 中登记、逐课上线（详见 `PLAN.md`）。

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

本课程仅用于交易知识的入门学习，不构成任何投资建议，也不承诺任何收益。交易有风险，任何方法都应在模拟盘充分练习并验证后，再考虑投入亏得起的极小资金，盈亏后果自负。课程内颜色、价格均为教学演示，非真实行情。
