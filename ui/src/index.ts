import { definePlugin } from '@halo-dev/ui-shared'
import { ExtensionDocsmeLink } from './extensions/docsme-link'

export default definePlugin({
  components: {},
  extensionPoints: {
    'default:editor:extension:create': () => {
      return [ExtensionDocsmeLink]
    },
  },
})
