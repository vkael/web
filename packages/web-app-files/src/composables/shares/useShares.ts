import { computed, Ref } from 'vue'
import { Share } from 'web-client/src/helpers/share'
import { useStore } from 'web-pkg/src/composables'

export function useShares() {
  const store = useStore()
  const outgoingLinks: Ref<Share[]> = computed(() => store.getters['Files/outgoingLinks'])
  const outgoingCollaborators: Ref<Share[]> = computed(
    () => store.getters['Files/outgoingCollaborators']
  )
  return { outgoingCollaborators, outgoingLinks }
}
