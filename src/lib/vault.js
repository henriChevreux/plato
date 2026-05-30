// Obsidian vault access via the File System Access API.
// A FileSystemDirectoryHandle is NOT JSON-serializable, so it is persisted in
// IndexedDB (see idb.js) rather than localStorage. Chromium browsers only.

import { get as idbGet, set as idbSet, del as idbDel } from './idb'
import { getVaultName, setVaultName } from './storage'

const HANDLE_KEY = 'vault_handle'

export function isSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// Prompt the user to pick their vault folder; persist the handle.
export async function pickVault() {
  if (!isSupported()) throw new Error('File System Access API not supported in this browser')
  const handle = await window.showDirectoryPicker({ id: 'plato-vault', mode: 'readwrite' })
  await idbSet(HANDLE_KEY, handle)
  setVaultName(handle.name)
  return handle
}

export async function getStoredHandle() {
  return idbGet(HANDLE_KEY)
}

export async function forgetVault() {
  await idbDel(HANDLE_KEY)
  setVaultName('')
}

// 'granted' | 'prompt' | 'denied' | 'none' (no handle stored)
export async function vaultPermission() {
  const handle = await getStoredHandle()
  if (!handle) return 'none'
  return handle.queryPermission({ mode: 'readwrite' })
}

// Re-request permission (must be triggered by a user gesture on a fresh session).
export async function ensurePermission() {
  const handle = await getStoredHandle()
  if (!handle) return false
  if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

// Walk/create a nested directory path under the vault, returning the dir handle.
export async function ensureDir(segments) {
  const root = await getStoredHandle()
  if (!root) throw new Error('No vault connected')
  let dir = root
  for (const seg of segments) {
    if (!seg) continue
    dir = await dir.getDirectoryHandle(sanitize(seg), { create: true })
  }
  return dir
}

// Write (overwrite) a markdown file at Plato/<...path>/<file>.
// `pathSegments` is the directory chain; `filename` includes the extension.
export async function writeNote(pathSegments, filename, contents) {
  const dir = await ensureDir(pathSegments)
  const fileHandle = await dir.getFileHandle(sanitize(filename), { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(contents)
  await writable.close()
}

// Read a note's text, or null if it doesn't exist.
export async function readNote(pathSegments, filename) {
  try {
    const dir = await dirIfExists(pathSegments)
    if (!dir) return null
    const fileHandle = await dir.getFileHandle(sanitize(filename))
    const file = await fileHandle.getFile()
    return file.text()
  } catch {
    return null
  }
}

// List the .md filenames in a directory path, or [] if missing.
export async function listNotes(pathSegments) {
  const dir = await dirIfExists(pathSegments)
  if (!dir) return []
  const names = []
  for await (const [name, entry] of dir.entries()) {
    if (entry.kind === 'file' && name.endsWith('.md')) names.push(name)
  }
  return names
}

// List subdirectory names under a path, or [] if missing.
export async function listDirs(pathSegments) {
  const dir = await dirIfExists(pathSegments)
  if (!dir) return []
  const names = []
  for await (const [name, entry] of dir.entries()) {
    if (entry.kind === 'directory') names.push(name)
  }
  return names
}

async function dirIfExists(segments) {
  const root = await getStoredHandle()
  if (!root) return null
  let dir = root
  for (const seg of segments) {
    if (!seg) continue
    try {
      dir = await dir.getDirectoryHandle(sanitize(seg))
    } catch {
      return null
    }
  }
  return dir
}

// Strip characters that are illegal in file/dir names; keep it Obsidian-friendly.
export function sanitize(name) {
  return String(name).replace(/[\\/:*?"<>|#^[\]]/g, '').trim() || 'untitled'
}

export { getVaultName }
