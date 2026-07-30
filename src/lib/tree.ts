import type { Doc, DocId } from '../types'

export type TreeNote = {
  kind: 'note'
  name: string
  id: DocId
}

export type TreeFolder = {
  kind: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

export type TreeNode = TreeFolder | TreeNote

type MutableFolder = {
  kind: 'folder'
  name: string
  path: string
  children: MutableNode[]
  folders: Map<string, MutableFolder>
}

type MutableNode = MutableFolder | TreeNote

const sortNodes = (nodes: MutableNode[]): TreeNode[] =>
  [...nodes]
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map((node) => {
      if (node.kind === 'note') return node
      return {
        kind: 'folder' as const,
        name: node.name,
        path: node.path,
        children: sortNodes(node.children),
      }
    })

const ensureFolder = (root: MutableFolder, path: string): MutableFolder => {
  const parts = path.split('/').filter((p) => p.length > 0)
  let current = root
  let walked = ''
  for (const part of parts) {
    walked = walked.length === 0 ? part : `${walked}/${part}`
    let next = current.folders.get(part)
    if (!next) {
      next = {
        kind: 'folder',
        name: part,
        path: walked,
        children: [],
        folders: new Map(),
      }
      current.folders.set(part, next)
      current.children.push(next)
    }
    current = next
  }
  return current
}

export const buildNoteTree = (docs: readonly Doc[], folders: readonly string[]): TreeNode[] => {
  const root: MutableFolder = {
    kind: 'folder',
    name: '',
    path: '',
    children: [],
    folders: new Map(),
  }

  for (const folder of folders) {
    if (folder.length === 0) continue
    ensureFolder(root, folder)
  }

  for (const doc of docs) {
    const parts = doc.id.split('/').filter((p) => p.length > 0)
    const name = parts[parts.length - 1]
    if (typeof name !== 'string') continue
    const parentParts = parts.slice(0, -1)
    const parent =
      parentParts.length === 0 ? root : ensureFolder(root, parentParts.join('/'))
    parent.children.push({
      kind: 'note',
      name,
      id: doc.id,
    })
  }

  return sortNodes(root.children)
}

export const joinPath = (folder: string, name: string): string =>
  folder.length === 0 ? name : `${folder}/${name}`
