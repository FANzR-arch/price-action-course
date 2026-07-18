# 价格行为交易 · 入门课

一套面向**完全新手**的、图文可交互的价格行为（Price Action）交易入门课程。纯静态网站，无需后端、无需构建工具，双击即可看，任意静态托管即可上线。

## 目录结构

```
price-action-course/
├── index.html              课程首页（课程目录 + 学习路径）
├── lessons/
│   └── lesson-01.html      第一课：读懂一根 K 线
├── assets/
│   ├── css/site.css        全站共享样式（设计令牌 + 组件）
│   └── js/candles.js       共享 K 线绘制引擎（window.PA）
├── .nojekyll               GitHub Pages 用（避免忽略某些文件）
└── README.md
```

- **改样式** → 只动 `assets/css/site.css`，全站生效。
- **改 K 线画法 / 颜色约定 / 图表** → 只动 `assets/js/candles.js`（`window.PA`）。
- **加新课** → 在 `lessons/` 下复制 `lesson-01.html` 改内容，再到 `index.html` 的 `CURRICULUM` 数组里把对应课程的 `live:true` 打开、填上 `href`。

## 课程体系（六阶段 / 24 课）

完整覆盖 Al Brooks 式价格行为，由浅入深：

1. **看懂图（地基）**：读懂一根 K 线 → K 线信号 → 支撑阻力 → 市场三态
2. **趋势**：趋势解剖 → H1H2/L1L2 计数 → 通道 → Always In/均线 → 测量移动
3. **交易区间与突破**：区间交易 → 真假突破 → 突破失败 → 无交易环境
4. **形态**：楔形三推 → 三角形 → 双顶双底 → 最终旗形
5. **反转**：主要趋势反转 MTR → 磁力位 → 二次入场
6. **风控与执行**：止损止盈仓位 → 交易者方程/盈亏比 → 逐棒检查单/二元决策 → 交易计划与复盘

目前第一课（读懂一根 K 线）已完成，其余在 `index.html` 的 `CURRICULUM` 中登记、逐课上线。

## 本地预览

直接双击 `index.html` 即可（现代浏览器支持 file:// 打开）。若个别浏览器对本地 JS 有限制，可用任意静态服务器：

```bash
# 任选其一，在项目根目录执行
python -m http.server 8080      # 然后浏览器打开 http://localhost:8080
npx serve .
```

## 部署成静态网站

所有资源都用**相对路径**，放进任意子目录都能用。三种常见方式：

**A. GitHub Pages（免费）**
1. 把这个文件夹推到一个 GitHub 仓库；
2. 仓库 Settings → Pages → Source 选 `main` 分支、根目录 `/`；
3. 稍等即可通过 `https://<用户名>.github.io/<仓库名>/` 访问。
   （已含 `.nojekyll`，无需额外配置。）

**B. Netlify**
- 登录后把整个文件夹**拖进** Netlify 的 Deploys 页面即可，或连接 GitHub 仓库自动部署。构建命令留空，发布目录填 `.`（根目录）。

**C. Vercel**
- `New Project` → 导入该仓库 → Framework 选 `Other`，Output/Root 用默认根目录即可。

## 免责声明

本课程仅用于交易知识的入门学习，不构成任何投资建议，也不承诺任何收益。交易有风险，任何方法都应在模拟盘充分练习并验证后，再考虑投入亏得起的极小资金，盈亏后果自负。课程内颜色、价格均为教学演示，非真实行情。
