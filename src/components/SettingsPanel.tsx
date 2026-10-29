import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Download, RefreshCw, Upload, X } from 'lucide-react'
import { exportProgress, importProgress } from '@/lib/backup'
import { syncCountry } from '@/lib/sync'
import { cn } from '@/lib/utils'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  noteCount: number
  regionCount: number
}

type Status = { tone: 'idle' | 'ok' | 'error'; text: string }

/**
 * Settings popover. No radius, no shadow: a hairline-bordered sheet pinned under
 * the header, exactly like every other surface in the app.
 */
export function SettingsPanel({
  open,
  onClose,
  noteCount,
  regionCount,
}: SettingsPanelProps) {
  const [status, setStatus] = useState<Status>({ tone: 'idle', text: '' })
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('numista_api_key') ?? '',
  )
  const [iso, setIso] = useState('US')
  const [syncText, setSyncText] = useState('')
  const [syncing, setSyncing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setStatus({ tone: 'idle', text: '' })
      setBusy(null)
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  async function handleExport() {
    setBusy('export')
    try {
      const counts = await exportProgress()
      const total = counts.progress + counts.custom + counts.synced
      setStatus({
        tone: 'ok',
        text:
          total > 0
            ? `✓ 已导出 ${counts.progress} 条进度 · ${counts.custom} 条自定义 · ${counts.synced} 条同步`
            : '✓ 还没有数据，已导出空备份',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        text: `✕ 导出失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setBusy(null)
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('import')
    try {
      const counts = await importProgress(file)
      const total = counts.progress + counts.custom + counts.synced
      setStatus({
        tone: 'ok',
        text:
          total > 0
            ? `✓ 已恢复 ${counts.progress} 条进度 · ${counts.custom} 条自定义 · ${counts.synced} 条同步`
            : '✓ 文件里没有可导入的数据',
      })
    } catch (error) {
      setStatus({
        tone: 'error',
        text: `✕ 导入失败：${error instanceof Error ? error.message : '未知错误'}`,
      })
    } finally {
      setBusy(null)
    }
  }

  async function handleSync() {
    if (!apiKey.trim()) {
      setSyncText('✕ 先填 Numista API Key')
      return
    }
    setSyncing(true)
    setSyncText('准备中…')
    localStorage.setItem('numista_api_key', apiKey.trim())
    try {
      const result = await syncCountry(iso, apiKey, (progress) => {
        if (progress.phase === 'fetch') {
          setSyncText(
            `正在拉取第 ${progress.page}/${progress.pages} 页…（列表 ${progress.total ?? '?'} 条）`,
          )
        } else if (progress.phase === 'clean') {
          setSyncText(`清洗与归类：保留 ${progress.kept} 条 / 列表 ${progress.listed} 条`)
        } else if (progress.phase === 'done') {
          setSyncText(`✓ 已写入 ${progress.kept} 条，地图与清单已刷新`)
        }
      })
      setSyncText(
        `✓ ${iso.toUpperCase()} 同步完成：保留 ${result.kept} 条（列表 ${result.listed} 条）`,
      )
    } catch (error) {
      setSyncText(`✕ ${error instanceof Error ? error.message : '同步失败'}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="关闭设置"
        onClick={onClose}
        className="fixed inset-0 z-30 cursor-default bg-base/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="设置"
        className="fixed inset-x-4 top-24 z-40 max-h-[calc(100dvh-8rem)] overflow-y-auto border border-line bg-surface sm:inset-x-auto sm:right-6 sm:w-[344px]"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]">设置</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="-mr-2 flex size-8 items-center justify-center text-muted transition-colors duration-150 hover:bg-elevated hover:text-ink"
          >
            <X size={15} strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <section className="px-4 py-4">
          <p className="label">数据备份</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            备份包含收藏进度、自定义券和前端同步的数据。换设备或清理浏览器数据前先导出；
            导入按 id 合并恢复这三张表，未出现在文件里的记录保持不变。
          </p>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={busy !== null}
              className="flex h-9 flex-1 items-center justify-center gap-2 border border-line text-[12px] transition-colors duration-150 hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={13} strokeWidth={1.75} aria-hidden />
              导出 JSON
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
              className="flex h-9 flex-1 items-center justify-center gap-2 border border-line text-[12px] transition-colors duration-150 hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={13} strokeWidth={1.75} aria-hidden />
              导入 JSON
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => void handleImport(event)}
          />

          {status.text && (
            <p
              role={status.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'mt-3 text-[11px] leading-relaxed',
                status.tone === 'error' ? 'text-ink' : 'text-muted',
              )}
            >
              {status.text}
            </p>
          )}
        </section>

        <section className="border-t border-line px-4 py-4">
          <p className="label">数据同步</p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            在手机上直接拉取某个国家的 Numista 目录，结果存在本机并覆盖该国内置目录。
            Key 只存在本机 localStorage，仅在点“开始同步”时发送请求。
          </p>

          <label className="mt-3 block">
            <span className="text-[11px] text-muted">Numista API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value)
                localStorage.setItem('numista_api_key', event.target.value.trim())
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="粘贴 key"
              className="mt-1 h-9 w-full border border-line bg-base px-2 text-[13px] outline-none focus:border-ink"
            />
          </label>

          <div className="mt-3 flex items-end gap-2">
            <label className="w-20">
              <span className="text-[11px] text-muted">国家 ISO</span>
              <input
                type="text"
                value={iso}
                onChange={(event) =>
                  setIso(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))
                }
                maxLength={2}
                placeholder="US"
                className="mt-1 h-9 w-full border border-line bg-base px-2 text-[13px] uppercase outline-none focus:border-ink"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={syncing}
              className="flex h-9 flex-1 items-center justify-center gap-2 border border-line text-[12px] transition-colors duration-150 hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={13} strokeWidth={1.75} aria-hidden />
              {syncing ? '同步中…' : '开始同步'}
            </button>
          </div>

          {syncText && (
            <p role="status" className="mt-3 text-[11px] leading-relaxed text-muted">
              {syncText}
            </p>
          )}
        </section>

        <section className="border-t border-line px-4 py-4">
          <p className="label">关于</p>
          <dl className="mt-2 space-y-1 text-[11px] text-muted">
            <div className="flex justify-between gap-4">
              <dt>目录</dt>
              <dd className="tnum">
                {regionCount} 个地区 · {noteCount} 个券种
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>版本</dt>
              <dd className="tnum">0.5.0</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            目录数据来源 Numista。图片未内嵌，券种行使用本地占位块。除手动同步外，
            不发送任何网络请求，离线可用。
          </p>
        </section>
      </div>
    </>
  )
}
