<script setup lang="ts">
import { markRaw, ref } from 'vue'
import { ToolbarItem, type Editor } from '@halo-dev/richtext-editor'
import LucideLink2 from '~icons/lucide/link-2'
import LinkInsertModal from './LinkInsertModal.vue'

withDefaults(defineProps<{ editor: Editor; isActive?: boolean }>(), { isActive: false })

const visible = ref(false)
</script>

<template>
  <ToolbarItem
    :editor="editor"
    :is-active="isActive"
    :icon="markRaw(LucideLink2)"
    title="插入链接 / 锚点"
    :action="() => (visible = true)"
  />
  <LinkInsertModal v-model:visible="visible" :editor="editor" />
</template>
