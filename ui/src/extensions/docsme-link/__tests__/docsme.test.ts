import { describe, expect, it } from 'vitest'
import { assembleDocTree, buildAnchorTree, computeRelativeHref, parseHeadingAnchors, type DocTreeNode } from '../docsme'

describe('computeRelativeHref', () => {
  it('同级页面使用 ./ 前缀', () => {
    expect(
      computeRelativeHref('/docs/demo/v1/zh-CN/guide/getting-started', '/docs/demo/v1/zh-CN/guide/install')
    ).toBe('./install')
  })

  it('父级目录下的页面使用 ../ 前缀', () => {
    expect(
      computeRelativeHref('/docs/demo/v1/zh-CN/guide/getting-started', '/docs/demo/v1/zh-CN/faq')
    ).toBe('../faq')
  })

  it('跨多级目录时累加 ../', () => {
    expect(
      computeRelativeHref('/docs/demo/v1/zh-CN/guide/advanced/tuning', '/docs/demo/v1/zh-CN/faq')
    ).toBe('../../faq')
  })

  it('目标在子目录时直接下钻', () => {
    expect(
      computeRelativeHref('/docs/demo/v1/zh-CN/guide', '/docs/demo/v1/zh-CN/guide/install')
    ).toBe('./guide/install')
  })

  it('目标为当前页时指向自身', () => {
    expect(computeRelativeHref('/docs/demo/v1/zh-CN/guide', '/docs/demo/v1/zh-CN/guide')).toBe(
      './guide'
    )
  })

  it('跨语言时从语言目录回退', () => {
    expect(computeRelativeHref('/docs/demo/v1/zh-CN/guide', '/docs/demo/v1/en/guide')).toBe(
      '../en/guide'
    )
  })

  it('permalink 带尾部斜杠时按目录语义计算', () => {
    expect(
      computeRelativeHref('/docs/demo/v1/zh-CN/guide/', '/docs/demo/v1/zh-CN/faq/')
    ).toBe('../faq/')
    expect(
      computeRelativeHref('/docs/demo/v1/zh-CN/guide/', '/docs/demo/v1/zh-CN/guide/install')
    ).toBe('./install')
  })
})

describe('assembleDocTree', () => {
  it('按 spec.parent 组装扁平数组并按 priority 排序', () => {
    const flat: DocTreeNode[] = [
      { metadata: { name: 'doc-1' }, spec: { title: '版本-1.1.1', slug: 'v1', type: 'DOC', parent: 'folder-1', priority: 2 } },
      { metadata: { name: 'doc-2' }, spec: { title: '测试超链接', slug: 'test', type: 'DOC', priority: 3 } },
      { metadata: { name: 'folder-1' }, spec: { title: '更新版本', slug: 'version', type: 'TREE', priority: 1 } },
      { metadata: { name: 'doc-3' }, spec: { title: '更早的文档', slug: 'old', type: 'DOC', parent: 'folder-1', priority: 0 } },
    ]
    const tree = assembleDocTree(flat)
    expect(tree.map((n) => n.metadata.name)).toEqual(['folder-1', 'doc-2'])
    expect(tree[0]?.children?.map((n) => n.metadata.name)).toEqual(['doc-3', 'doc-1'])
  })

  it('parent 不存在时按根节点处理', () => {
    const flat: DocTreeNode[] = [
      { metadata: { name: 'doc-1' }, spec: { title: '孤儿', slug: 'orphan', type: 'DOC', parent: 'missing' } },
    ]
    expect(assembleDocTree(flat).map((n) => n.metadata.name)).toEqual(['doc-1'])
  })

  it('已经是嵌套结构时原样返回', () => {
    const nested: DocTreeNode[] = [
      {
        metadata: { name: 'folder' },
        spec: { title: '目录', slug: 'dir', type: 'TREE' },
        children: [{ metadata: { name: 'doc' }, spec: { title: '文档', slug: 'doc', type: 'DOC' } }],
      },
    ]
    expect(assembleDocTree(nested)).toBe(nested)
  })
})

describe('buildAnchorTree', () => {
  it('按标题层级嵌套', () => {
    const tree = buildAnchorTree([
      { level: 1, text: '一', id: 'a' },
      { level: 2, text: '一.一', id: 'b' },
      { level: 3, text: '一.一.一', id: 'c' },
      { level: 2, text: '一.二', id: 'd' },
      { level: 1, text: '二', id: 'e' },
    ])
    expect(tree.map((n) => n.id)).toEqual(['a', 'e'])
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['b', 'd'])
    expect(tree[0]?.children[0]?.children.map((n) => n.id)).toEqual(['c'])
    expect(tree[1]?.children).toEqual([])
  })

  it('层级跳跃时挂到最近的上级', () => {
    const tree = buildAnchorTree([
      { level: 1, text: '一', id: 'a' },
      { level: 3, text: '一跳三', id: 'b' },
    ])
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['b'])
  })
})

describe('parseHeadingAnchors', () => {
  it('提取带 id 的标题', () => {
    const html = `
      <h1 id="intro">介绍</h1>
      <h2 id="install">安装</h2>
      <h3>无 id 的标题</h3>
      <p>普通段落</p>
      <h2 id="config">配置</h2>
    `
    expect(parseHeadingAnchors(html)).toEqual([
      { level: 1, text: '介绍', id: 'intro' },
      { level: 2, text: '安装', id: 'install' },
      { level: 2, text: '配置', id: 'config' },
    ])
  })

  it('空内容返回空数组', () => {
    expect(parseHeadingAnchors('')).toEqual([])
    expect(parseHeadingAnchors('<p>没有标题</p>')).toEqual([])
  })
})
