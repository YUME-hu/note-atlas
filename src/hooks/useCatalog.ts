import { useCallback, useEffect, useState } from 'react'
import { loadCatalogData, type CatalogData } from '@/data/loader'

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; data: CatalogData }
  | { status: 'error'; message: string }

/** One in-flight request shared by every mount (StrictMode, re-mounts, …). */
let pending: Promise<CatalogData> | null = null

function load(): Promise<CatalogData> {
  pending ??= loadCatalogData().catch((error: unknown) => {
    pending = null // allow the retry button to start over
    throw error
  })
  return pending
}

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    load().then(
      (data) => {
        if (alive) setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (alive) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      },
    )
    return () => {
      alive = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    pending = null
    setAttempt((value) => value + 1)
  }, [])

  return { state, retry }
}
