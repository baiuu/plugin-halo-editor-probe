import { axiosInstance } from '@halo-dev/api-client'

// Docsme 自定义端点,详见 plugin-docsme 的 Endpoint 定义
const DOCSME_API_BASE = '/apis/api.uc.doc.halo.run/v1alpha1'

export interface DocsmeEditContext {
  projectName: string
  versionName: string
  docTreeName: string
}

export interface DocTreeNode {
  metadata: { name: string }
  spec: {
    title: string
    slug: string
    type: 'TREE' | 'DOC'
    parent?: string
    priority?: number
    /** type 为 DOC 时指向 Doc 的 metadata.name */
    docName?: string
  }
  status?: {
    permalink?: string
    published?: boolean
  }
  children?: DocTreeNode[]
}

export interface DocTree {
  metadata: { name: string }
  spec: { title: string; slug: string; docName?: string }
  status?: { permalink?: string }
}

/**
 * 从 Console / UC 的 Docsme 文档编辑页 URL 中解析上下文。
 * 路由形如 /console/docs/{projectName}?version={versionName}&name={docTreeName}
 */
export function resolveDocsmeEditContext(): DocsmeEditContext | null {
  const match = window.location.pathname.match(/^\/(?:console|uc)\/docs\/([^/?#]+)/)
  if (!match?.[1]) {
    return null
  }
  const params = new URLSearchParams(window.location.search)
  const versionName = params.get('version')
  if (!versionName) {
    return null
  }
  return {
    projectName: decodeURIComponent(match[1]),
    versionName,
    docTreeName: params.get('name') ?? '',
  }
}

export async function fetchDocTree(versionName: string): Promise<DocTreeNode[]> {
  const { data } = await axiosInstance.get<DocTreeNode[]>(
    `${DOCSME_API_BASE}/projectversions/${versionName}/tree`
  )
  return data
}

export async function fetchDocTreeNode(name: string): Promise<DocTree> {
  const { data } = await axiosInstance.get<DocTree>(`${DOCSME_API_BASE}/doctrees/${name}`)
  return data
}

/**
 * Docsme 的树接口返回扁平数组,按 spec.parent 指针组装成嵌套树,
 * 同级节点按 spec.priority 排序(与 Docsme 目录面板的 arrayToTree 逻辑一致)
 */
export function assembleDocTree(nodes: DocTreeNode[]): DocTreeNode[] {
  if (nodes.some((node) => node.children?.length)) {
    return nodes
  }
  const sorted = [...nodes].sort((a, b) => (a.spec.priority ?? 0) - (b.spec.priority ?? 0))
  const byName = new Map<string, DocTreeNode>()
  for (const node of sorted) {
    byName.set(node.metadata.name, { ...node, children: [] })
  }
  const roots: DocTreeNode[] = []
  for (const node of byName.values()) {
    const parent = node.spec.parent ? byName.get(node.spec.parent) : undefined
    if (parent) {
      parent.children = parent.children ?? []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

export interface HeadingAnchor {
  level: number
  text: string
  id: string
}

export interface AnchorNode extends HeadingAnchor {
  children: AnchorNode[]
}

/**
 * 将按文档顺序排列的扁平标题列表构造成层级树
 */
export function buildAnchorTree(anchors: HeadingAnchor[]): AnchorNode[] {
  const roots: AnchorNode[] = []
  const stack: AnchorNode[] = []
  for (const anchor of anchors) {
    const node: AnchorNode = { ...anchor, children: [] }
    let parent = stack.length > 0 ? stack[stack.length - 1] : undefined
    while (parent && parent.level >= anchor.level) {
      stack.pop()
      parent = stack.length > 0 ? stack[stack.length - 1] : undefined
    }
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
    stack.push(node)
  }
  return roots
}

/**
 * 获取文档当前内容(HTML),用于解析目标文档的标题锚点
 */
export async function fetchDocHeadContent(docName: string): Promise<string> {
  const { data } = await axiosInstance.get<{ content?: string }>(
    `${DOCSME_API_BASE}/docs/${docName}/head-content`
  )
  return data.content ?? ''
}

/**
 * 从渲染后的 HTML 中提取带 id 的标题作为锚点
 */
export function parseHeadingAnchors(html: string): HeadingAnchor[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const anchors: HeadingAnchor[] = []
  doc.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').forEach((el) => {
    anchors.push({
      level: Number(el.tagName[1]),
      text: el.textContent?.trim() ?? '',
      id: el.id,
    })
  })
  return anchors
}

/**
 * 由当前文档页和目标文档页的 permalink 计算浏览器可解析的相对地址。
 * 文档页 URL 的最后一段是文档自身 slug,因此 ./x 指向同级页面,../x 指向父级下的页面。
 */
export function computeRelativeHref(fromPermalink: string, toPermalink: string): string {
  const fromSegments = fromPermalink.split('/').filter(Boolean)
  const toSegments = toPermalink.split('/').filter(Boolean)
  // 以斜杠结尾的 URL 最后一段是目录而非文档自身,目录完整参与计算
  const fromDir = fromPermalink.endsWith('/') ? fromSegments : fromSegments.slice(0, -1)

  let common = 0
  while (common < fromDir.length && common < toSegments.length && fromDir[common] === toSegments[common]) {
    common++
  }

  const ups = fromDir.length - common
  const downs = toSegments.slice(common)
  if (ups === 0 && downs.length === 0) {
    return './'
  }
  const trailingSlash = toPermalink.endsWith('/') ? '/' : ''
  const relative = [...Array.from({ length: ups }, () => '..'), ...downs].join('/') + trailingSlash
  return relative.startsWith('..') ? relative : `./${relative}`
}
