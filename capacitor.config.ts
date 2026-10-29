/**
 * Capacitor shell for the Android APK.
 *
 * The web app is fully static: `npm run build` → dist/ → `npx cap sync android`.
 * No native plugins are required; IndexedDB holds the collection locally.
 */
const config = {
  appId: 'app.noteatlas',
  appName: 'note-atlas',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Serve the bundle over https://localhost inside the WebView: keeps it a
    // secure context (service worker, crypto, IndexedDB quotas).
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#141418',
  },
}

export default config
