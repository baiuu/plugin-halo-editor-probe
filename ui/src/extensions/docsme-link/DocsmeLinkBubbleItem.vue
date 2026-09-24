<script setup lang="ts">
import { markRaw, ref } from 'vue'
import { BubbleItem, type Editor } from '@halo-dev/richtext-editor'
import LucideLink2 from '~icons/lucide/link-2'
import LinkInsertModal from './LinkInsertModal.vue'

defineProps<{ editor: Editor }>()

const visible = ref(false)
</script>

<template>
  <BubbleItem
    :editor="editor"
    :icon="markRaw(LucideLink2)"
    title="插入链接 / 锚点"
    :action="() => (visible = true)"
  />
  <LinkInsertModal v-model:visible="visible" :editor="editor" />
</template>
