import { ViewMode, type DocId, type ViewMode as ViewModeT } from '../types'

const ACTIVE_KEY = 'k-thread:lastActiveId'
const VIEW_KEY = 'k-thread:lastView'

export const readLastActiveId = (): DocId | '' => {
  try {
    const value = localStorage.getItem(ACTIVE_KEY)
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

export const writeLastActiveId = (id: DocId | '') => {
  try {
    if (id.length === 0) localStorage.removeItem(ACTIVE_KEY)
    else localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    /* private mode */
  }
}

export const readLastView = (): ViewModeT => {
  try {
    const value = localStorage.getItem(VIEW_KEY)
    if (value === ViewMode.Graph || value === ViewMode.Note) return value
  } catch {
    /* private mode */
  }
  return ViewMode.Note
}

export const writeLastView = (view: ViewModeT) => {
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    /* private mode */
  }
}
