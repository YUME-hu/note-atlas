/**
 * Loading / error block for the catalog. Left aligned, hairline separated,
 * no spinner and no colour — the map area simply has nothing to draw yet.
 */
export function CatalogNotice({
  title,
  detail,
  onRetry,
  tone = 'status',
}: {
  title: string
  detail?: string
  onRetry?: () => void
  tone?: 'status' | 'alert'
}) {
  return (
    <section
      role={tone === 'alert' ? 'alert' : 'status'}
      aria-live="polite"
      className="mt-8 border-t border-line pt-6"
    >
      <p className="label">目录</p>
      <h3 className="mt-3 text-[13px] font-medium">{title}</h3>
      {detail && (
        <p className="mt-1 max-w-[64ch] break-words text-[11px] leading-relaxed text-muted">
          {detail}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 border border-line px-4 py-2 text-[12px] transition-colors duration-150 hover:bg-elevated"
        >
          重试
        </button>
      )}
    </section>
  )
}
