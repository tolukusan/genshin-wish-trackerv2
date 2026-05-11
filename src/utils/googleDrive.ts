// Google Drive App Data folder sync
// Uses GIS (Google Identity Services) — no backend required.
// App Data folder is hidden from the user's Drive, only accessible by this app.

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
          revoke: (token: string, done?: () => void) => void
        }
      }
    }
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'
const FILE_NAME = 'teyvat-planner.json'
const GIS_URL = 'https://accounts.google.com/gsi/client'

let accessToken: string | null = null

function loadGIS(): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.accounts) { resolve(); return }
    const script = document.createElement('script')
    script.src = GIS_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

export async function driveSignIn(clientId: string): Promise<void> {
  await loadGIS()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (res) => {
        if (res.error || !res.access_token) { reject(new Error(res.error ?? 'No token')); return }
        accessToken = res.access_token
        resolve()
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export function driveSignOut(): void {
  if (accessToken) {
    window.google?.accounts.oauth2.revoke(accessToken)
    accessToken = null
  }
}

export function driveIsSignedIn(): boolean {
  return accessToken !== null
}

async function findFileId(): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27${FILE_NAME}%27&fields=files(id,modifiedTime)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Drive list failed: ${res.status}`)
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

export async function driveSave(content: object): Promise<void> {
  if (!accessToken) throw new Error('Not signed in')
  const body = JSON.stringify(content, null, 2)
  const fileId = await findFileId()

  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body,
      }
    )
    if (!res.ok) throw new Error(`Drive update failed: ${res.status}`)
  } else {
    const metadata = { name: FILE_NAME, parents: ['appDataFolder'] }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([body], { type: 'application/json' }))
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    )
    if (!res.ok) throw new Error(`Drive create failed: ${res.status}`)
  }
}

export async function driveLoad(): Promise<object | null> {
  if (!accessToken) throw new Error('Not signed in')
  const fileId = await findFileId()
  if (!fileId) return null
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Drive read failed: ${res.status}`)
  return res.json()
}

export async function driveCheckExists(clientId: string): Promise<boolean> {
  try {
    await loadGIS()
    return new Promise((resolve) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (res) => {
          if (res.error || !res.access_token) { resolve(false); return }
          accessToken = res.access_token
          try {
            const fileId = await findFileId()
            resolve(fileId !== null)
          } catch {
            resolve(false)
          }
        },
      })
      // prompt: '' = silent if already authorized
      client.requestAccessToken({ prompt: '' })
    })
  } catch {
    return false
  }
}

// Persist client ID and last sync time outside Zustand so they survive resets
const STORAGE_KEY_CLIENT_ID = 'gdrive_client_id'
const STORAGE_KEY_LAST_SYNC = 'gdrive_last_sync'

export function getStoredClientId(): string {
  return localStorage.getItem(STORAGE_KEY_CLIENT_ID) ?? ''
}

export function setStoredClientId(id: string): void {
  localStorage.setItem(STORAGE_KEY_CLIENT_ID, id)
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC)
}

export function setLastSyncTime(): void {
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString())
}
