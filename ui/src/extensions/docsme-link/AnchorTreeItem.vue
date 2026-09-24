<script setup lang="ts">
import { ref } from 'vue'
import RiArrowRightSLine from '~icons/ri/arrow-right-s-line'
import RiHashtag from '~icons/ri/hashtag'
import type { AnchorNode, HeadingAnchor } from './docsme'

const props = withDefaults(
  defineProps<{
    node: AnchorNode
    depth?: number
    selectedId?: string
    /** 嵌入文档树时,选中标识为 "文档名#锚点id" */
    idPrefix?: string
  }>(),
  { depth: 0, selectedId: '', idPrefix: '' }
)

const emit = defineEmits<{
  select: [anchor: HeadingAnchor]
}>()

const hasChildren = () => props.node.children.length > 0

const expanded = ref(true)

function handleChevronClick(event: Event) {
  event.stopPropagation()
  expanded.value = !expanded.value
}

function isSelected() {
  const key = props.idPrefix ? `${props.idPrefix}#${props.node.id}` : props.node.id
  return props.selectedId === key
}
</script>

<template>
  <div class="anchor-node">
    <div
      class="anchor-node__row"
      :class="{ 'anchor-node__row--selected': isSelected() }"
      :style="{ paddingLeft: `${0.5 + depth * 1.125}rem` }"
      @click="emit('select', node)"
    >
      <span
        class="anchor-node__chevron"
        :class="{
          'anchor-node__chevron--expanded': expanded,
          'anchor-node__chevron--hidden': !hasChildren(),
        }"
        @click="hasChildren() && handleChevronClick($event)"
      >
        <RiArrowRightSLine />
      </span>
      <RiHashtag class="anchor-node__icon" />
      <span class="anchor-node__text">H{{ node.level }} · {{ node.text }}</span>
    </div>
    <template v-if="expanded">
      <AnchorTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :id-prefix="idPrefix"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.anchor-node__row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding-top: 0.3rem;
  padding-bottom: 0.3rem;
  padding-right: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.anchor-node__row:hover {
  background-color: #f3f4f6;
}

.anchor-node__row--selected {
  background-color: #eff6ff;
}

.anchor-node__chevron {
  display: inline-flex;
  width: 1rem;
  flex-shrink: 0;
  color: #9ca3af;
  transition: transform 0.15s ease;
  cursor: pointer;
}

.anchor-node__chevron--expanded {
  transform: rotate(90deg);
}

.anchor-node__chevron--hidden {
  visibility: hidden;
}

.anchor-node__icon {
  flex-shrink: 0;
  color: #93c5fd;
}

.anchor-node__text {
  font-size: 0.8125rem;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
