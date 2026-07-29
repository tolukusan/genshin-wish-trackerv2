import { useState, useEffect } from 'react'
import { usePlannerStore } from '@/store/usePlannerStore'
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
      const data = await driveLoad() as any
      if (!data) { setShow(false); return }
      usePlannerStore.setState({
        ...(data.player && { player: data.player }),
        ...(data.config && { config: data.config }),
        ...(data.patches && { patches: data.patches }),
        ...(data.target !== undefined && { target: data.target }),
        ...(data.scenarios && { scenarios: data.scenarios }),
        ...(data.chain && { chain: data.chain }),
      })
      setLastSyncTime()
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
      backgroundColor: '#ffffff',
      border: '1px solid rgba(124,58,237,0.4)',
      borderRadius: '0.75rem',
      padding: '1rem 1.25rem',
      maxWidth: '22rem',
      boxShadow: '0 8px 32px rgba(15,23,42,0.15)',
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
