import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Download, Upload, X } from 'lucide-react'
import { exportProgress, importProgress } from '@/lib/backup'
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
      const count = await exportProgress()
      setStatus({
        tone: 'ok',
        text: count > 0 ? `✓ 已导出 ${count} 条记录` : '✓ 还没有收藏记录，已导出空备份',
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
      const count = await importProgress(file)
      setStatus({
        tone: 'ok',
        text: count > 0 ? `✓ 已导入 ${count} 条记录` : '✓ 文件里没有记录',
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
            收藏进度只存在这台设备的 IndexedDB。换设备或清理浏览器数据前先导出，
            导入按券种覆盖同名记录，未出现的券种保持不变。
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
              <dd className="tnum">0.4.0</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            目录数据来源 Numista。图片未内嵌，券种行使用本地占位块。离线可用，
            不发送任何网络请求。
          </p>
        </section>
      </div>
    </>
  )
}
