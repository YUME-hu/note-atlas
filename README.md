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
node scripts/gen-flags.mjs       # 手绘简化旗（14 面，48px 下最清楚）
node scripts/gen-flags-pack.mjs  # flag-icons (MIT) → 237 面重着色，public/flags/pack
node scripts/gen-guilloche.mjs   # public/bg/guilloche.svg
```

国旗来源：`flag-icons`（MIT），按暗色调色板重着色；带徽章/渐变/位图的 34 面自动跳过，前端回退 ISO 字母块。`src/lib/flag-src.ts` 决定每国用哪一套（手绘优先，其余走 pack）。

## 进度备份

顶栏齿轮 →「导出 JSON / 导入 JSON」。备份格式 v3，包含 `progress`（勾选）、`custom_notes`（自定义加钞）、`synced_notes`（App 内 Numista 同步）和 `custom_regions`（自建国家）；导入按 id 合并恢复四张表，兼容 v1（只含 progress）和 v2。iOS 清理 Safari 数据会清空 IndexedDB，清理前先导出。

## 自建国家（42 国之外）

设置 →「自建国家」→ 导入 JSON：

```json
{
  "region": { "iso": "RS", "name": "塞尔维亚", "unit": "第纳尔", "issuers": ["塞尔维亚国家银行"] },
  "notes": [
    { "denom": 10, "name": "10第纳尔 · 2006" },
    { "denom": 20, "name": "20第纳尔 · 2006" }
  ]
}
```

- `region.iso` 必须在 atlas 里才能点亮地图；否则只出现在国家索引。
- 国旗按 ISO 自动找 `flags/pack`，没有就回退 ISO 字母块。
- 导入的国家会出现在索引和面板里，可勾选、进备份；设置里可删除（连带券种和进度）。

## 按年代 / 自建版别

- 42 国是“列表级同步”，除 CN/JP/US 外没有详情里的版别信息，默认都归到「标准流通钞」。
- 面板的「按年代」标签会把券种按 1940s/1960s/…/2020s 分组，适合这些只有标准流通钞的国家。
- 「+ 添加自定义纸币」里可以填**单位**（如“新便士”）、选择「+ 新建版别…」并命名（如“武装部队券”），保存后会显示“✓ 已添加 …（版别）”，新版别排在列表最前。
- 已有的自定义券如果当时只能选标准流通钞，删掉重加一次即可挂到新版别；进度也会随之删除。

## Android APK（GitHub Actions，无需 Android Studio）

仓库已包含 Capacitor 的 `android/` 工程和 `.github/workflows/android.yml`。

1. 推到 GitHub 的 `main` 分支；
2. Actions → **Android Debug APK** → Run workflow（或直接 push 触发）；
3. 构建完成后在 Artifacts 下载 `note-atlas-debug-apk.zip`，解压安装 `app-debug.apk`。

- 工作流用 Node 22 + JDK 21 + Android SDK 36 + Gradle 8.14，自动 `npm run build` 和 `npx cap sync android`。
- 调试签名：CI 缓存 `~/.android/debug.keystore`，连续构建签名一致，可覆盖安装；缓存被 GitHub 清掉后需要卸载重装（先导出 v3 备份）。
- 应用图标是 Capacitor 默认图标；要换图标改 `android/app/src/main/res/mipmap-*`。
- MT 管理器改包只适用于 HBuilderX/5+App 的 `assets/apps/<id>/www`；Capacitor 包的网页资源在 `assets/public`，改完还要重签，不建议走这条路——Actions 重新构建已经足够快。

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
