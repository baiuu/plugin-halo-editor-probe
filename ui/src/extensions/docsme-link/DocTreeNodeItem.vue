<script setup lang="ts">
import { computed, ref } from 'vue'
import { VLoading } from '@halo-dev/components'
import RiArrowRightSLine from '~icons/ri/arrow-right-s-line'
import RiFolderLine from '~icons/ri/folder-line'
import RiFolderOpenLine from '~icons/ri/folder-open-line'
import RiFileTextLine from '~icons/ri/file-text-line'
import {
  buildAnchorTree,
  fetchDocHeadContent,
  parseHeadingAnchors,
  type DocTreeNode,
  type HeadingAnchor,
} from './docsme'
import AnchorTreeItem from './AnchorTreeItem.vue'

const props = withDefaults(
  defineProps<{
    node: DocTreeNode
    depth?: number
    selectedKey?: string
  }>(),
  { depth: 0, selectedKey: '' }
)

const emit = defineEmits<{
  select: [node: DocTreeNode]
  selectAnchor: [node: DocTreeNode, anchor: HeadingAnchor]
}>()

const isDoc = computed(() => props.node.spec.type === 'DOC')
// 目录页和文档页都有 permalink,都可以作为链接目标
const selectable = computed(() => !!props.node.status?.permalink)
// 有子节点时可展开;文档可展开查看自身的标题锚点
const expandable = computed(() => !!props.node.children?.length || (isDoc.value && selectable.value))

// 目录默认展开前两层;文档默认收起
const expanded = ref(!isDoc.value && props.depth < 2)

// 文档标题锚点, null 表示尚未加载
const anchors = ref<HeadingAnchor[] | null>(null)
const anchorsLoading = ref(false)
const anchorTree = computed(() => buildAnchorTree(anchors.value ?? []))

function handleClick() {
  if (selectable.value) {
    emit('select', props.node)
    return
  }
  toggle()
}

function handleChevronClick(event: Event) {
  event.stopPropagation()
  toggle()
}

async function toggle() {
  if (!expandable.value) {
    return
  }
  expanded.value = !expanded.value
  if (expanded.value && isDoc.value && anchors.value === null) {
    anchorsLoading.value = true
    try {
      anchors.value = props.node.spec.docName
        ? parseHeadingAnchors(await fetchDocHeadContent(props.node.spec.docName))
        : []
    } catch (error) {
      console.error('[halo-editor-probe] failed to load doc anchors', error)
      anchors.value = []
    } finally {
      anchorsLoading.value = false
    }
  }
}
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-node__row"
      :class="{
        'tree-node__row--selected': selectedKey === node.metadata.name,
        'tree-node__row--selectable': selectable,
        'tree-node__row--disabled': !selectable,
      }"
      :style="{ paddingLeft: `${0.5 + depth * 1.125}rem` }"
      @click="handleClick"
    >
      <span
        class="tree-node__chevron"
        :class="{
          'tree-node__chevron--expanded': expanded,
          'tree-node__chevron--hidden': !expandable,
        }"
        @click="handleChevronClick"
      >
        <RiArrowRightSLine />
      </span>
      <component
        :is="isDoc ? RiFileTextLine : expanded ? RiFolderOpenLine : RiFolderLine"
        class="tree-node__icon"
      />
      <span class="tree-node__title">{{ node.spec.title }}</span>
      <span v-if="!selectable" class="tree-node__badge">未发布</span>
    </div>

    <template v-if="expanded">
      <DocTreeNodeItem
        v-for="child in node.children ?? []"
        :key="child.metadata.name"
        :node="child"
        :depth="depth + 1"
        :selected-key="selectedKey"
        @select="emit('select', $event)"
        @select-anchor="(n, a) => emit('selectAnchor', n, a)"
      />

      <template v-if="isDoc">
        <div v-if="anchorsLoading" class="tree-node__loading" :style="{ paddingLeft: `${1.875 + depth * 1.125}rem` }">
          <VLoading />
        </div>
        <AnchorTreeItem
          v-for="anchorNode in anchorTree"
          :key="anchorNode.id"
          :node="anchorNode"
          :depth="depth + 1"
          :id-prefix="node.metadata.name"
          :selected-id="selectedKey"
          @select="(anchor) => emit('selectAnchor', node, anchor)"
        />
        <div
          v-if="anchors !== null && !anchorsLoading && anchors.length === 0"
          class="tree-node__empty"
          :style="{ paddingLeft: `${1.875 + depth * 1.125}rem` }"
        >
          无可用锚点
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.tree-node__row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  padding-right: 0.5rem;
  cursor: default;
  user-select: none;
}

.tree-node__row--selectable {
  cursor: pointer;
}

.tree-node__row--selectable:hover {
  background-color: #f3f4f6;
}

.tree-node__row--selected {
  background-color: #eff6ff;
}

.tree-node__row--disabled {
  opacity: 0.5;
}

.tree-node__chevron {
  display: inline-flex;
  width: 1rem;
  flex-shrink: 0;
  color: #9ca3af;
  transition: transform 0.15s ease;
  cursor: pointer;
}

.tree-node__chevron--expanded {
  transform: rotate(90deg);
}

.tree-node__chevron--hidden {
  visibility: hidden;
}

.tree-node__icon {
  flex-shrink: 0;
  color: #6b7280;
}

.tree-node__title {
  font-size: 0.8125rem;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node__badge {
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0 0.25rem;
}

.tree-node__loading {
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

.tree-node__empty {
  font-size: 0.75rem;
  color: #9ca3af;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}
</style>
