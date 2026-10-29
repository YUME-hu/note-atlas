# 打包 APK（最简路径）

Web 端已经是一个纯静态 SPA：`npm run build` 产出 `dist/`，不依赖任何服务端。
数据全部随包（`public/data` + `public/flags`），进度存本机 IndexedDB。

两种方式二选一：

---

## A. Android Studio + Capacitor（推荐）

需要：Node 22、Android Studio（含 SDK 35）、JDK 21。

```powershell
cd D:\note-atlas

# 一次性
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli

# 初始化（仓库里已有 capacitor.config.ts，npx cap init 可跳过）
npx cap add android

# 每次改完 Web 代码
npm run build
npx cap sync android
npx cap open android
```

Android Studio 里：

1. 等 Gradle sync 完成；
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**；
3. 产物在 `android/app/build/outputs/apk/debug/app-debug.apk`，直接装手机。

发布版（给自己用可跳过签名）：

- **Build → Generate Signed Bundle / APK → APK**，创建 keystore，选 release；
- 产物 `android/app/build/outputs/apk/release/app-release.apk`；
- keystore 和密码务必留好，覆盖安装必须同一个签名。

`capacitor.config.ts` 已设置：

- `appId: app.noteatlas`、`appName: note-atlas`
- `webDir: dist`
- `server.androidScheme: 'https'`（WebView 内是安全上下文，IndexedDB / SW 正常）
- 背景色 `#141418`，与 App 一致

注意：WebView 里 Service Worker 不保证注册成功，但资源已打进 APK，离线本来就不依赖 SW。

---

## B. HBuilderX 云打包（不装 Android Studio）

HBuilderX 走的是 DCloud 5+App 容器，不是 Capacitor。适合“只想快速拿一个 apk”。

1. HBuilderX → 新建 → **5+App** 项目（选“默认模板”，不要 uni-app）；
2. 删除模板自带的 css/js，把 `dist/` 里的**全部内容**复制到项目根目录（`index.html` 必须在根）；
3. 打开 `manifest.json`：
   - 基础配置：应用名称 `note-atlas`、AppID（点“重新获取”）、版本 `0.5.0`；
   - 图标配置：用 `public/pwa-512.png` 生成各尺寸；
   - 启动界面：选“无”或纯色 `#141418`；
   - 权限：不需要任何权限（无网络请求、无定位、无相机）；
4. **发行 → 原生App-云打包** → 选 Android → 使用 DCloud 公共证书（测试）或自己的证书 → 打包；
5. 下载 apk 安装。

HBuilderX 的注意点：

- 5+App 默认全屏，状态栏可能压住顶栏；可在 `manifest.json → 页面设置` 关闭全屏，或后续加 `padding-top: env(safe-area-inset-top)`；
- 没有 Capacitor 插件（本项目目前也不需要）；
- 云打包免费额度有限，测试够用。

---

## 验收清单

- [ ] 打开 App，地图 42 国可点；
- [ ] 点英国 → 316 条券种，能勾选；
- [ ] 杀掉进程重开，勾选还在（IndexedDB）；
- [ ] 飞行模式打开，地图和清单仍可用；
- [ ] 设置 → 导出 JSON，文件出现在“下载”里；
- [ ] 卸载重装后导入该 JSON，进度恢复。
