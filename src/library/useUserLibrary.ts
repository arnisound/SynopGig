import { useEffect, useState } from 'react'
import type { DeviceTemplate } from '../types'
import { entryToTemplate, USER_LIBRARY_URL, type UserLibraryFile } from './userLibrary'

/**
 * Loads the USER library: the live file from the repository (updated as soon
 * as a user shares equipment), else the copy shipped with the site.
 */
export function useUserLibrary() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>('loading')

  useEffect(() => {
    let cancelled = false
    const load = async (url: string) => {
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as UserLibraryFile
      return (Array.isArray(data.entries) ? data.entries : []).map(entryToTemplate).filter((t) => t !== undefined)
    }
    load(USER_LIBRARY_URL)
      .then((list) => !cancelled && (setTemplates(list), setStatus('live')))
      .catch(() =>
        load(`${import.meta.env.BASE_URL}user-library.json`)
          .then((list) => !cancelled && (setTemplates(list), setStatus('offline')))
          .catch(() => !cancelled && setStatus('offline')),
      )
    return () => {
      cancelled = true
    }
  }, [])

  return { templates, status }
}
