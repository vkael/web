<template>
  <div>
    <oc-text-input
      id="groups-filter"
      v-model="filterTerm"
      class="oc-ml-m oc-my-s"
      :label="$gettext('Search')"
      autocomplete="off"
    />
    <oc-table
      ref="tableRef"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      :fields="fields"
      :data="data"
      :highlighted="highlighted"
      :sticky="true"
      :header-position="headerPosition"
      :hover="true"
      @sort="handleSort"
      @contextmenu-clicked="showContextMenuOnRightClick"
      @highlight="rowClicked"
    >
      <template #selectHeader>
        <oc-checkbox
          size="large"
          class="oc-ml-s"
          :label="$gettext('Select all groups')"
          :model-value="allGroupsSelected"
          hide-label
          @update:model-value="$emit('toggleSelectAllGroups')"
        />
      </template>
      <template #select="rowData">
        <oc-checkbox
          class="oc-ml-s"
          size="large"
          :model-value="isGroupSelected(rowData.item)"
          :option="rowData.item"
          :label="getSelectGroupLabel(rowData.item)"
          hide-label
          @update:model-value="$emit('toggleSelectGroup', rowData.item)"
          @click.stop
        />
      </template>
      <template #avatar="rowData">
        <avatar-image :width="32" :userid="rowData.item.id" :user-name="rowData.item.displayName" />
      </template>
      <template #members="rowData">
        {{ rowData.item.members.length }}
      </template>
      <template #actions="{ item }">
        <oc-button
          v-oc-tooltip="$gettext('Details')"
          appearance="raw"
          class="oc-mr-xs groups-table-btn-details oc-p-xs"
          @click="showDetails(item)"
        >
          <oc-icon name="information" fill-type="line" />
        </oc-button>
        <context-menu-quick-action
          ref="contextMenuButtonRef"
          :item="item"
          class="groups-table-btn-action-dropdown"
          @quick-action-clicked="showContextMenuOnBtnClick($event, item)"
        >
          <template #contextMenu>
            <slot name="contextMenu" :group="item" />
          </template>
        </context-menu-quick-action>
        <!-- Editing groups is currently not supported by backend
      <oc-button v-oc-tooltip="$gettext('Edit')" class="oc-ml-s" @click="$emit('clickEdit', item)">
        <oc-icon size="small" name="pencil" />
      </oc-button>
      -->
      </template>
      <template #footer>
        <div class="oc-text-nowrap oc-text-center oc-width-1-1 oc-my-s">
          <p class="oc-text-muted">{{ footerTextTotal }}</p>
          <p v-if="filterTerm" class="oc-text-muted">{{ footerTextFilter }}</p>
        </div>
      </template>
    </oc-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, unref } from 'vue'
import Fuse from 'fuse.js'
import Mark from 'mark.js'
import { displayPositionedDropdown, eventBus } from 'web-pkg'
import { SideBarEventTopics } from 'web-pkg/src/composables/sideBar'
import { Group } from 'web-client/src/generated'
import ContextMenuQuickAction from 'web-pkg/src/components/ContextActions/ContextMenuQuickAction.vue'

export default defineComponent({
  name: 'GroupsList',
  components: { ContextMenuQuickAction },
  props: {
    groups: {
      type: Array as PropType<Group[]>,
      required: true
    },
    selectedGroups: {
      type: Array as PropType<Group[]>,
      required: true
    },
    headerPosition: {
      type: Number,
      required: true
    }
  },
  emits: ['toggleSelectAllGroups', 'unSelectAllGroups', 'toggleSelectGroup'],
  setup(props, { emit }) {
    const contextMenuButtonRef = ref(undefined)

    const isGroupSelected = (group) => {
      return props.selectedGroups.some((s) => s.id === group.id)
    }
    const selectGroup = (group) => {
      emit('unSelectAllGroups')
      emit('toggleSelectGroup', group)
    }
    const showDetails = (group) => {
      selectGroup(group)
      eventBus.publish(SideBarEventTopics.open)
    }
    const rowClicked = (data) => {
      const group = data[0]
      selectGroup(group)
    }
    const showContextMenuOnBtnClick = (data, group) => {
      const { dropdown, event } = data
      if (dropdown?.tippy === undefined) {
        return
      }
      if (!isGroupSelected(group)) {
        selectGroup(group)
      }
      displayPositionedDropdown(dropdown.tippy, event, unref(contextMenuButtonRef))
    }
    const showContextMenuOnRightClick = (row, event, group) => {
      event.preventDefault()
      const dropdown = row.$el.getElementsByClassName('groups-table-btn-action-dropdown')[0]
      if (dropdown === undefined) {
        return
      }
      if (!isGroupSelected(group)) {
        selectGroup(group)
      }
      displayPositionedDropdown(dropdown._tippy, event, unref(contextMenuButtonRef))
    }

    return {
      showDetails,
      rowClicked,
      isGroupSelected,
      showContextMenuOnBtnClick,
      showContextMenuOnRightClick,
      contextMenuButtonRef
    }
  },
  data() {
    return {
      sortBy: 'displayName',
      sortDir: 'asc',
      markInstance: null,
      filterTerm: ''
    }
  },
  computed: {
    fields() {
      return [
        {
          name: 'select',
          title: '',
          type: 'slot',
          width: 'shrink',
          headerType: 'slot'
        },
        {
          name: 'avatar',
          title: '',
          type: 'slot',
          width: 'shrink'
        },
        {
          name: 'displayName',
          title: this.$gettext('Group name'),
          sortable: true
        },
        {
          name: 'members',
          title: this.$gettext('Members'),
          type: 'slot',
          sortable: true
        },
        {
          name: 'actions',
          title: this.$gettext('Actions'),
          sortable: false,
          type: 'slot',
          alignH: 'right'
        }
      ]
    },
    allGroupsSelected() {
      return this.groups.length === this.selectedGroups.length
    },
    footerTextTotal() {
      return this.$gettext('%{groupCount} groups in total', { groupCount: this.groups.length })
    },
    footerTextFilter() {
      return this.$gettext('%{groupCount} matching groups', { groupCount: this.data.length })
    },
    data() {
      return this.orderBy(
        this.filter(this.groups, this.filterTerm),
        this.sortBy,
        this.sortDir === 'desc'
      )
    },
    highlighted() {
      return this.selectedGroups.map((group) => group.id)
    }
  },
  watch: {
    filterTerm() {
      if (!this.markInstance) {
        return
      }
      this.markInstance.unmark()
      this.markInstance.mark(this.filterTerm, {
        element: 'span',
        className: 'highlight-mark',
        exclude: ['th *', 'tfoot *']
      })
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.markInstance = new Mark(this.$refs.tableRef.$el)
    })
  },
  methods: {
    filter(groups, filterTerm) {
      if (!(filterTerm || '').trim()) {
        return groups
      }
      const groupsSearchEngine = new Fuse(groups, {
        includeScore: true,
        useExtendedSearch: true,
        threshold: 0.3,
        keys: ['displayName']
      })

      return groupsSearchEngine.search(filterTerm).map((r) => r.item)
    },
    orderBy(list, prop, desc) {
      return [...list].sort((a, b) => {
        a = a[prop] || ''
        b = b[prop] || ''
        return desc ? b.localeCompare(a) : a.localeCompare(b)
      })
    },
    handleSort(event) {
      this.sortBy = event.sortBy
      this.sortDir = event.sortDir
    },
    getSelectGroupLabel(group) {
      return this.$gettext('Select %{ group }', { group: group.displayName }, true)
    }
  }
})
</script>

<style lang="scss">
#groups-filter {
  width: 16rem;
}

.highlight-mark {
  font-weight: 600;
}
</style>
