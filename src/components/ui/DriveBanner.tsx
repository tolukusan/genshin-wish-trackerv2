import { useState, useEffect } from 'react'
import { usePlannerStore, migratePersistedState } from '@/store/usePlannerStore'
import {
  driveCheckExists, driveLoad,
  getStoredClientId, getLastSyncTime, setLastSyncTime,
} from '@/utils/googleDrive'

export function DriveBanner() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const clientId = getStoredClientId()
    if (!clientId) return

    driveCheckExists(clientId).then((exists) => {
      if (exists) setShow(true)
    })
  }, [])

  if (!show) return null

  async function useDriveData() {
    setLoading(true)
    try {
      const loaded = await driveLoad()
      if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) return
      // Drive data may have been saved by an older app version: upgrade it the
      // same way browser-stored data is upgraded before using it.
      const data = migratePersistedState(loaded)
      usePlannerStore.setState({
        ...(data.player && { player: data.player }),
        ...(data.config && { config: data.config }),
        ...(data.patches && { patches: data.patches }),
        ...(data.target !== undefined && { target: data.target }),
        ...(data.scenarios && { scenarios: data.scenarios }),
        ...(data.chain && { chain: data.chain }),
      })
      setLastSyncTime()
    } catch (err) {
      console.error('Failed to load Drive data', err)
    } finally {
      setShow(false)
    }
  }

  const lastSync = getLastSyncTime()

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.25rem',
      right: '1.25rem',
      zIndex: 50,
      backgroundColor: 'var(--color-surface)',
      border: '1px solid rgba(145,132,217,0.4)',
      borderRadius: '0.75rem',
      padding: '1rem 1.25rem',
      maxWidth: '22rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    }}>
      <div>
        <p className="text-sm font-semibold text-slate-900">Drive data found</p>
        {lastSync && (
          <p className="text-xs text-slate-500 mt-0.5">
            Last saved: {new Date(lastSync).toLocaleString()}
          </p>
        )}
        <p className="text-xs text-slate-600 mt-1">
          Use your saved Drive data, or keep the current browser data?
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary text-xs px-3 py-1.5 flex-1"
          onClick={useDriveData}
          disabled={loading}
        >
          {loading ? 'Loading…' : 'Use Drive data'}
        </button>
        <button
          className="btn-secondary text-xs px-3 py-1.5 flex-1"
          onClick={() => setShow(false)}
        >
          Keep browser data
        </button>
      </div>
    </div>
  )
}
