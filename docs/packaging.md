# 打包 APK（HBuilderX 云打包 · 无需 Android Studio）

Web 端是纯静态 SPA，数据全部随包。HBuilderX 的 5+App 用 **file://** 加载页面，
Chromium 在 file:// 下会拒绝外部 ES module，所以**不能直接把 `dist/` 塞进去**。
仓库里已经准备了专用构建：

```powershell
npm run build:app
```

产物是 `dist-app/`，其中 `index.html` 已经**内联全部 JS/CSS 和 42 国目录数据**
（约 1.7 MB，gzip 444 KB），运行时不再 fetch JSON；国旗/底纹仍是独立图片，file:// 可正常加载。

---

## 1. 建 HBuilderX 项目

1. HBuilderX → 文件 → 新建 → 项目 → **5+App**（默认模板，不要 uni-app）；
2. 删除模板自带的 `index.html`、`css/`、`js/`、`img/` 等内容；
3. 把 `dist-app/` 里的**全部内容**复制到项目根目录：
   ```
   index.html          ← 必须在根
   flags/
   bg/
   data/               （已内联，留着无妨）
   pwa-1024.png / pwa-512.png / ...
   ```
4. 用 HBuilderX 打开项目，确认根目录直接能看到 `index.html`。

## 2. manifest.json

双击 `manifest.json`：

### 基础配置

- 应用名称：`note-atlas`
- **AppID**：点右侧「重新获取」，HBuilderX 登录 DCloud 账号后会填入（不要手写）
- 版本名称：`0.6.0`，版本号：`2`
- 包名（Android）：`app.noteatlas`（与 `capacitor.config.ts` 一致，避免以后冲突）

### 图标配置

- 图标：选 `pwa-1024.png`（项目根目录里就有）
- HBuilderX 会自动生成各尺寸；Android 自适应图标可留默认
- 启动图：选「无」或纯色 `#141418`，不要用白底，否则启动瞬间会闪白

### 页面设置 / 状态栏（解决白字看不清）

- **取消勾选「全屏显示」**（不要用沉浸式）——状态栏独立占一行，不会压住顶栏；
- 状态栏背景：`#141418`
- 状态栏前景：**白色 / 浅色**（我们的页面是深色，白字才看得清）
- 如果只能选「沉浸式」：保持状态栏透明，但把启动图和页面背景都设为 `#141418`；
  此时白色状态栏文字压在深色顶栏上仍然可读。

### 权限

不需要任何权限：不联网时也能用；同步只在点按钮时发请求。

## 3. 云打包

1. HBuilderX → 发行 → **原生App-云打包**；
2. 平台选 **Android**；
3. 证书：
   - 第一次/自己用：选 **「使用 DCloud 公共测试证书」**（免费、无需 keystore）；
   - 以后要覆盖安装/上架：选「使用自有证书」，生成并保存 keystore，**证书必须一直用同一个**，否则不能覆盖安装；
4. 包名确认 `app.noteatlas`；
5. 点「打包」，等 3–10 分钟，下载 `.apk` 安装。

## 4. 装到手机后验收

- [ ] 打开不白屏，地图 42 国可点；
- [ ] 点英国 → 316 条，能勾选；
- [ ] 面板底部「+ 添加自定义纸币」→ 保存后面额/名称出现，能勾选；
- [ ] 设置 → 填 Numista Key → ISO `SG` → 开始同步 → 出现“✓ 保留 58 条”；
- [ ] 杀进程重开，勾选和自定义券都还在（IndexedDB）；
- [ ] 飞行模式重开，地图/清单仍可用。

## 5. 常见问题

**白屏 / 只有背景色**
→ 用错构建了。必须 `npm run build:app`（单文件），不是 `npm run build`。
检查项目根目录 `index.html`，以及 `flags/`、`bg/` 是否一起复制。

**状态栏白字看不清**
→ manifest → 页面设置：状态栏背景改 `#141418`，前景改白色；关闭全屏。

**同步报 CORS**
→ 5+App 的 WebView 默认不做 CORS 限制；网页版（localhost）Numista 也返回 `Access-Control-Allow-Origin: *`，实测可用。
若真遇到，检查 Key 是否有效（401）或触发限流（429）。

**APK 里 Key 安全吗**
→ Key 存在 WebView 的 localStorage，仅本机；不要把自己的 Key 打进公开分发的包。
公共测试证书的包只适合自己安装测试。

---

## 备选：Capacitor + GitHub Actions（不装 Android Studio 也能出 APK）

HBuilderX 的 5+App 容器较老；如果遇到兼容问题，用 Capacitor + GitHub Actions：

```powershell
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli
npx cap add android
npm run build
npx cap sync android
```

GitHub Actions 用 `android-actions/setup-android` + `./gradlew assembleDebug`，把
`android/app/build/outputs/apk/debug/app-debug.apk` 作为 artifact 上传，手机上直接下载安装。
`capacitor.config.ts` 已经写好（`webDir: dist`、`androidScheme: https`）。
