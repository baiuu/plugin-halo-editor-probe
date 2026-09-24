<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VButton, VLoading, VModal, VTabItem, VTabs } from '@halo-dev/components'
import type { Editor } from '@halo-dev/richtext-editor'
import AnchorTreeItem from './AnchorTreeItem.vue'
import DocTreeNodeItem from './DocTreeNodeItem.vue'
import {
  assembleDocTree,
  buildAnchorTree,
  computeRelativeHref,
  fetchDocTree,
  fetchDocTreeNode,
  resolveDocsmeEditContext,
  type AnchorNode,
  type DocTreeNode,
  type DocsmeEditContext,
  type HeadingAnchor,
} from './docsme'

const props = defineProps<{
  editor: Editor
}>()

const visible = defineModel<boolean>('visible', { required: true })

const linkText = ref('')
const href = ref('')
const activeTab = ref<'doc' | 'anchor'>('doc')

const context = ref<DocsmeEditContext | null>(null)
const treeNodes = ref<DocTreeNode[]>([])
const currentPermalink = ref('')
const loading = ref(false)
const loadError = ref('')

// 当前文档(编辑器内)的标题锚点树
const anchorTree = ref<AnchorNode[]>([])

// 当前选中项:文档为 node name,锚点为 "name#id"
const selectedKey = ref('')

const hasDocContext = computed(() => context.value !== null)

watch(visible, (value) => {
  if (value) {
    init()
  }
})

function collectHeadings(): HeadingAnchor[] {
  const result: HeadingAnchor[] = []
  props.editor.state.doc.descendants((node) => {
    if (node.type.name === 'heading' && node.attrs.id) {
      result.push({
        level: node.attrs.level as number,
        text: node.textContent,
        id: node.attrs.id as string,
      })
    }
  })
  return result
}

async function init() {
  const { state } = props.editor
  linkText.value = state.selection.empty
    ? ''
    : state.doc.textBetween(state.selection.from, state.selection.to)
  href.value = props.editor.getAttributes('link').href ?? ''
  anchorTree.value = buildAnchorTree(collectHeadings())
  selectedKey.value = ''

  context.value = resolveDocsmeEditContext()
  activeTab.value = hasDocContext.value ? 'doc' : 'anchor'

  if (context.value) {
    loading.value = true
    loadError.value = ''
    try {
      const { versionName, docTreeName } = context.value
      const [tree, current] = await Promise.all([
        fetchDocTree(versionName),
        docTreeName ? fetchDocTreeNode(docTreeName) : Promise.resolve(null),
      ])
      treeNodes.value = pruneCurrentDoc(assembleDocTree(tree), docTreeName)
      currentPermalink.value = current?.status?.permalink ?? ''
    } catch (error) {
      loadError.value = '加载文档树失败,请确认 Docsme 插件已启用且当前账号有访问权限'
      console.error('[halo-editor-probe] failed to load docsme doc tree', error)
    } finally {
      loading.value = false
    }
  }
}

/**
 * 从树中移除正在编辑的文档节点,其子节点提升到原位置,避免链接指向当前页自身
 */
function pruneCurrentDoc(nodes: DocTreeNode[], currentName: string): DocTreeNode[] {
  const result: DocTreeNode[] = []
  for (const node of nodes) {
    const children = node.children ? pruneCurrentDoc(node.children, currentName) : []
    if (node.metadata.name === currentName) {
      result.push(...children)
      continue
    }
    result.push({ ...node, children })
  }
  return result
}

function pageHref(node: DocTreeNode): string {
  const permalink = node.status?.permalink ?? ''
  return currentPermalink.value ? computeRelativeHref(currentPermalink.value, permalink) : permalink
}

function selectPage(node: DocTreeNode) {
  selectedKey.value = node.metadata.name
  href.value = pageHref(node)
  if (!linkText.value) {
    linkText.value = node.spec.title
  }
}

function selectDocAnchor(node: DocTreeNode, anchor: HeadingAnchor) {
  selectedKey.value = `${node.metadata.name}#${anchor.id}`
  href.value = `${pageHref(node)}#${anchor.id}`
  if (!linkText.value) {
    linkText.value = node.spec.title
  }
}

function selectAnchor(anchor: HeadingAnchor) {
  selectedKey.value = anchor.id
  href.value = `#${anchor.id}`
  if (!linkText.value) {
    linkText.value = anchor.text
  }
}

function handleInsert() {
  const finalHref = href.value.trim()
  if (!finalHref) {
    return
  }
  const editor = props.editor
  if (editor.state.selection.empty) {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: linkText.value.trim() || finalHref,
        marks: [{ type: 'link', attrs: { href: finalHref } }],
      })
      .run()
  } else {
    editor.chain().focus().setLink({ href: finalHref }).run()
  }
  visible.value = false
}
</script>

<template>
  <VModal
    v-model:visible="visible"
    title="插入链接 / 锚点"
    :width="640"
    mount-to-body
    @close="visible = false"
  >
    <div class="docsme-link-form">
      <FormKit v-model="linkText" type="text" label="链接文本" placeholder="留空则使用目标标题" />

      <VTabs v-if="hasDocContext" v-model:active-id="activeTab" type="outline">
        <VTabItem id="doc" label="站内文档">
          <div v-if="loading" class="form-loading"><VLoading /></div>
          <p v-else-if="loadError" class="form-hint form-hint--error">{{ loadError }}</p>
          <p v-else-if="!treeNodes.length" class="form-hint">当前版本暂无文档</p>
          <div v-else class="doc-tree">
            <DocTreeNodeItem
              v-for="node in treeNodes"
              :key="node.metadata.name"
              :node="node"
              :selected-key="selectedKey"
              @select="selectPage"
              @select-anchor="selectDocAnchor"
            />
          </div>
          <p v-if="treeNodes.length && !currentPermalink" class="form-hint">
            当前文档尚未生成访问地址(可能未发布),选择后已回退为绝对路径
          </p>
          <p v-if="treeNodes.length" class="form-hint">
            点击文档选中链接;展开文档节点可继续选择其标题锚点,生成"文档 + 锚点"组合链接
          </p>
        </VTabItem>
        <VTabItem id="anchor" label="页面锚点">
          <p v-if="!anchorTree.length" class="form-hint">当前文档没有可用作锚点的标题</p>
          <div v-else class="doc-tree">
            <AnchorTreeItem
              v-for="node in anchorTree"
              :key="node.id"
              :node="node"
              :selected-id="selectedKey"
              @select="selectAnchor"
            />
          </div>
        </VTabItem>
      </VTabs>

      <template v-else>
        <p class="form-hint">为选中文字挂载超链接,直接输入完整链接地址;也可以选择本文档的标题锚点</p>
        <div v-if="anchorTree.length" class="doc-tree">
          <AnchorTreeItem
            v-for="node in anchorTree"
            :key="node.id"
            :node="node"
            :selected-id="selectedKey"
            @select="selectAnchor"
          />
        </div>
      </template>

      <FormKit
        v-model="href"
        type="text"
        label="链接地址"
        :placeholder="hasDocContext ? './other-page、../parent/page 或 #heading-id' : 'https://example.com/page 或 #heading-id'"
      />
    </div>

    <template #footer>
      <div class="modal-footer">
        <VButton @click="visible = false">取消</VButton>
        <VButton type="primary" :disabled="!href.trim()" @click="handleInsert">插入</VButton>
      </div>
    </template>
  </VModal>
</template>

<style scoped>
.docsme-link-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-hint {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.5;
}

.form-hint--error {
  color: #dc2626;
}

.form-loading {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.doc-tree {
  max-height: 18rem;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.25rem 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  /* 与 Docsme 页面的深色主按钮保持一致 */
  --colors-primary: 17 24 39;
}
</style>
