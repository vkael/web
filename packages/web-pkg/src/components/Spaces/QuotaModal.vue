<template>
  <portal to="app.runtime.modal">
    <oc-modal
      :title="modalTitle"
      :button-cancel-text="$gettext('Cancel')"
      :button-confirm-text="$gettext('Confirm')"
      :button-confirm-disabled="confirmButtonDisabled"
      @confirm="editQuota"
      @cancel="cancel"
    >
      <template #content>
        <quota-select
          :title="$gettext('Space quota')"
          :total-quota="selectedOption"
          :max-quota="maxQuota"
          @selected-option-change="changeSelectedQuotaOption"
        />
      </template>
    </oc-modal>
  </portal>
</template>

<script lang="ts">
import { defineComponent, unref, PropType } from 'vue'
import { mapActions, mapMutations } from 'vuex'
import { useGraphClient } from 'web-pkg/src/composables'
import QuotaSelect from 'web-pkg/src/components/QuotaSelect.vue'
import { SpaceResource } from 'web-client/src'
import { eventBus } from 'web-pkg/src'

export default defineComponent({
  name: 'SpaceQuotaModal',
  components: {
    QuotaSelect
  },
  props: {
    spaces: {
      type: Array as PropType<SpaceResource[]>,
      required: true
    },
    cancel: {
      type: Function,
      required: true
    },
    maxQuota: {
      type: Number,
      default: 0
    }
  },
  emits: ['spaceQuotaUpdated'],
  setup() {
    return {
      ...useGraphClient()
    }
  },
  data: function () {
    return {
      selectedOption: 0
    }
  },
  computed: {
    confirmButtonDisabled() {
      return !this.spaces.some((space) => space.spaceQuota.total !== this.selectedOption)
    },
    modalTitle() {
      if (this.spaces.length === 1) {
        return this.$gettext('Change quota for space %{name}', {
          name: this.spaces[0].name
        })
      }
      return this.$gettext('Change quota for %{count} spaces', {
        count: this.spaces.length
      })
    }
  },
  mounted() {
    this.selectedOption = this.spaces[0]?.spaceQuota?.total || 0
  },
  methods: {
    ...mapActions(['showMessage']),
    ...mapMutations('Files', ['UPDATE_RESOURCE_FIELD']),
    ...mapMutations('runtime/spaces', ['UPDATE_SPACE_FIELD']),

    changeSelectedQuotaOption(option) {
      this.selectedOption = option.value
    },
    async editQuota(): Promise<void> {
      const requests = this.spaces.map(async (space): Promise<void> => {
        const { data: driveData } = await this.graphClient.drives.updateDrive(
          space.id,
          { quota: { total: this.selectedOption } },
          {}
        )
        this.cancel()
        if (unref(this.$router.currentRoute).name === 'admin-settings-spaces') {
          eventBus.publish('app.admin-settings.spaces.space.quota.updated', {
            spaceId: space.id,
            quota: driveData.quota
          })
        }
        this.UPDATE_SPACE_FIELD({
          id: space.id,
          field: 'spaceQuota',
          value: driveData.quota
        })
        this.UPDATE_RESOURCE_FIELD({
          id: space.id,
          field: 'spaceQuota',
          value: driveData.quota
        })
      })
      const results = await Promise.allSettled<Array<unknown>>(requests)
      const succeeded = results.filter((r) => r.status === 'fulfilled')
      if (succeeded.length) {
        this.showMessage({
          title: this.$ngettext(
            'Space quota was changed successfully',
            'Space quota of %{count} spaces was changed successfully',
            succeeded.length,
            {
              count: succeeded.length
            }
          )
        })
      }
      const errors = results.filter((r) => r.status === 'rejected')
      if (errors.length) {
        errors.forEach(console.error)
        this.showMessage({
          title: this.$ngettext(
            'Failed to change space quota',
            'Failed to change space quota for %{count} spaces',
            errors.length,
            {
              count: errors.length
            }
          )
        })
      }
    }
  }
})
</script>
