# note-atlas

现代纸币收藏进度的 PWA。一张按「已收 / 总数」梯度染色的世界地图，点国家进入「版别 → 券种」清单，三态标记进度；所有数据存在本机 IndexedDB，离线可用。

技术栈：React 19 + Vite + TypeScript + Tailwind CSS（暗色）+ Dexie + d3-maps + vite-plugin-pwa。

## 开发

```powershell
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build → dist/
npm run preview    # http://localhost:4173，PWA 必须用这个测
```

Node ≥ 22.12。

## 目录数据管线

目录不进代码，全部由 Numista API 在构建前导出：

```powershell
# 1) API key（免费、非商业）：https://en.numista.com/api/
#    写进项目根目录 .env.local（已 gitignore）：NUMISTA_API_KEY=…
node scripts/sync-numista.mjs --list-issuers --filter japan   # 确认 issuer code
node scripts/sync-numista.mjs --issuer japon --iso JP --since 1946

# 2) raw → public/data/*.json
node scripts/build-catalog.mjs
```

批量拉取当前维护的 42 个国家（1960+，叙利亚 1900 起）：

```powershell
node scripts/batch-sync.mjs --estimate     # 只统计，不写文件
node scripts/batch-sync.mjs --list-only    # 42 国打底：列表数据 + 标准流通钞，几乎不耗配额
node scripts/batch-sync.mjs --backfill     # 下月额度重置后，给列表数据补详情/变体
node scripts/batch-sync.mjs --only GB,BR   # 只跑一部分
```

小国没有系列结构时，`locales.mjs` 的 `fallbackSeries` 会兜底到「标准流通钞」，不会产生 unassigned。

- 原始数据：`data/raw/raw_<iso>.json`（可 commit，便于复现）
- 生成物：`public/data/{regions,series,notes,series_map}.json`（会被 PWA 预缓存）
- 人工兜底：`data/series_map.manual.json`，`{ "<type_id>": "<series_id>" }`，优先级最高；`"__skip__"` 表示排除
- 地区名/单位/券别规则：`scripts/locales.mjs`

静态素材生成（改国旗或背景后重跑）：

```powershell
node scripts/gen-flags.mjs       # public/flags/engraved/{cn,jp,us}.svg
node scripts/gen-guilloche.mjs   # public/bg/guilloche.svg
```

## 进度备份

顶栏齿轮 →「导出 JSON / 导入 JSON」。备份格式 v2，包含 `progress`（勾选）、`custom_notes`（自定义加钞）和 `synced_notes`（App 内 Numista 同步的数据）；导入按 id 合并恢复三张表，兼容旧的 v1（只含 progress）。iOS 清理 Safari 数据会清空 IndexedDB，清理前先导出。

## 部署（Vercel）

1. 仓库推到 GitHub，Vercel → New Project → Import。
2. Framework 选 **Vite**；Build Command `npm run build`；Output Directory `dist`（`vercel.json` 已写好，通常自动识别）。
3. Node 版本用 22.x（`package.json` 的 `engines`）。
4. 部署完成后用 HTTPS 域名访问；`vercel.json` 已配置：
   - `/assets/*` 长缓存（文件名带 hash）
   - `/sw.js`、`/workbox-*.js` 不缓存，保证更新
   - `/data/*.json` 不缓存，PWA 用 StaleWhileRevalidate 兜底
   - `manifest.webmanifest` 正确的 `application/manifest+json` 类型
5. 手机上「添加到主屏幕」，确认独立窗口启动、断网可打开。
6. 数据更新流程：本地 `sync` → `build` → `npm run build` → push，Vercel 自动重新部署；Service Worker 会在下次打开时自动更新（`autoUpdate`）。

无需在 Vercel 配置任何运行时环境变量：API key 只在本地跑数据时使用。

## 已知边界

- 图片不内嵌：Numista 图片站有人机校验，券种行使用本地占位块（面额 + 单位）。
- 只收录已同步的国家；新增国家 = 加 `locales.mjs` 规则 + `gen-flags` 旗 + 跑 sync/build。
- 目录是构建期快照，不是实时数据。
