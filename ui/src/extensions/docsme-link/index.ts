import {
  Extension,
  TEXT_BUBBLE_MENU_KEY,
  type Editor,
  type ExtensionOptions,
} from '@halo-dev/richtext-editor'
import { markRaw } from 'vue'
import DocsmeLinkBubbleItem from './DocsmeLinkBubbleItem.vue'
import DocsmeLinkToolbarItem from './DocsmeLinkToolbarItem.vue'

export const ExtensionDocsmeLink = Extension.create<ExtensionOptions>({
  name: 'docsmeLink',

  addOptions() {
    return {
      ...this.parent?.(),
      getToolbarItems({ editor }: { editor: Editor }) {
        return {
          priority: 150,
          component: markRaw(DocsmeLinkToolbarItem),
          props: {
            editor,
            isActive: editor.isActive('link'),
          },
        }
      },
      getBubbleMenu() {
        return {
          extendsKey: TEXT_BUBBLE_MENU_KEY,
          items: [
            {
              priority: 100,
              component: markRaw(DocsmeLinkBubbleItem),
              props: {},
            },
          ],
        }
      },
    }
  },
})
