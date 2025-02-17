<template>
  <div>
    <div v-if="sortFields.length" class="oc-tile-sorting oc-border-b oc-mb-m oc-pb-s">
      <span class="oc-mr-xs" v-text="$gettext('Sort by: ')" />
      <oc-button id="oc-tiles-sort-btn" appearance="raw" gap-size="none">
        <span v-text="$gettext(currentSortField.label)" />
        <oc-icon name="arrow-down-s" />
      </oc-button>
      <oc-drop
        ref="sortDrop"
        toggle="#oc-tiles-sort-btn"
        class="oc-tiles-sort-drop"
        mode="click"
        padding-size="small"
        close-on-click
      >
        <oc-list class="oc-tiles-sort-list">
          <li v-for="(field, index) in sortFields" :key="index" class="oc-my-xs">
            <oc-button
              appearance="raw"
              justify-content="space-between"
              class="oc-tiles-sort-list-item oc-p-s oc-width-1-1"
              :class="{
                'oc-background-primary-gradient': isSortFieldSelected(field),
                selected: isSortFieldSelected(field)
              }"
              :variation="isSortFieldSelected(field) ? 'inverse' : 'passive'"
              @click="selectSorting(field)"
            >
              <span v-text="$gettext(field.label)" />
              <oc-icon v-if="isSortFieldSelected(field)" name="check" />
            </oc-button>
          </li>
        </oc-list>
      </oc-drop>
    </div>
    <oc-list class="oc-tiles oc-flex" :class="resizable ? 'resizableTiles' : ''">
      <li v-for="resource in data" :key="resource.id" class="oc-tiles-item">
        <oc-tile
          :ref="(el) => (tileRefs.tiles[resource.id] = el)"
          :resource="resource"
          :resource-route="getRoute(resource)"
          :is-resource-selected="isResourceSelected(resource)"
          :is-extension-displayed="areFileExtensionsShown"
          :resource-icon-size="resourceIconSize"
          @vue:mounted="
            $emit('rowMounted', resource, tileRefs.tiles[resource.id], ImageDimension.Tile)
          "
          @contextmenu="showContextMenu($event, resource.id, tileRefs.tiles[resource.id])"
          @click="emitTileClick(resource)"
        >
          <template #selection>
            <oc-checkbox
              :label="getResourceCheckboxLabel(resource)"
              :hide-label="true"
              size="large"
              class="oc-flex-inline oc-p-s"
              :model-value="isResourceSelected(resource)"
              @click.stop.prevent="toggleSelection(resource)"
            />
          </template>
          <template #imageField>
            <slot name="image" :resource="resource" />
          </template>
          <template #actions>
            <slot name="actions" :resource="resource" />
          </template>
          <template #contextMenu>
            <context-menu-quick-action
              :ref="(el) => (tileRefs.dropBtns[resource.id] = el)"
              :item="resource"
              class="resource-tiles-btn-action-dropdown"
              @quick-action-clicked="showContextMenuOnBtnClick($event, resource, resource.id)"
            >
              <template #contextMenu>
                <slot name="contextMenuActions" :resource="resource" />
              </template>
            </context-menu-quick-action>
          </template>
        </oc-tile>
      </li>
    </oc-list>
    <div class="oc-tiles-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script lang="ts">
import { onBeforeUpdate, defineComponent, PropType, computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Resource, SpaceResource } from 'web-client'
import { useStore } from 'web-pkg/src/composables'
import { ImageDimension } from 'web-pkg/src/constants'
import { createFileRouteOptions } from 'web-pkg/src/helpers/router'
import { displayPositionedDropdown } from 'web-pkg/src/helpers/contextMenuDropdown'
import { createLocationSpaces } from 'web-app-files/src/router'
import ContextMenuQuickAction from 'web-pkg/src/components/ContextActions/ContextMenuQuickAction.vue'

// Constants should match what is being used in OcTable/ResourceTable
// Alignment regarding naming would be an API-breaking change and can
// Be done at a later point in time?
import { useResourceRouteResolver } from '../../composables/filesList'
import { SortDir, SortField, ViewModeConstants } from 'web-app-files/src/composables'

export default defineComponent({
  name: 'ResourceTiles',
  components: { ContextMenuQuickAction },
  props: {
    /**
     * Array of resources (spaces, folders, files) to be displayed as tiles
     */
    data: {
      type: Array as PropType<Resource[]>,
      default: () => []
    },
    resizable: {
      type: Boolean,
      default: false
    },
    selectedIds: {
      type: Array,
      default: () => []
    },
    targetRouteCallback: {
      type: Function,
      required: false,
      default: undefined
    },
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    },
    sortFields: {
      type: Array as PropType<SortField[]>,
      default: () => []
    },
    sortBy: {
      type: String,
      required: false,
      default: undefined
    },
    sortDir: {
      type: String,
      required: false,
      default: undefined,
      validator: (value: string) => {
        return (
          value === undefined || [SortDir.Asc.toString(), SortDir.Desc.toString()].includes(value)
        )
      }
    },
    viewSize: {
      type: Number,
      required: false,
      default: ViewModeConstants.tilesSizeDefault
    }
  },
  emits: ['fileClick', 'rowMounted', 'sort', 'update:selectedIds'],
  setup(props, context) {
    const store = useStore()
    const { $gettext } = useGettext()

    const areFileExtensionsShown = computed(() => store.state.Files.areFileExtensionsShown)

    const tileRefs = ref({
      tiles: [],
      dropBtns: []
    })

    const spaces = computed(() => {
      return store.getters['runtime/spaces/spaces']
    })

    const resourceRouteResolver = useResourceRouteResolver(
      {
        space: ref(props.space),
        spaces,
        targetRouteCallback: computed(() => props.targetRouteCallback)
      },
      context
    )

    const getRoute = (resource) => {
      if (resource.type === 'space') {
        return resource.disabled
          ? { path: '#' }
          : createLocationSpaces(
              'files-spaces-generic',
              createFileRouteOptions(resource as SpaceResource, {
                path: '',
                fileId: resource.fileId
              })
            )
      }
      if (resource.type === 'folder') {
        return resourceRouteResolver.createFolderLink({
          path: resource.path,
          fileId: resource.fileId,
          resource: resource
        })
      }
      return { path: '' }
    }

    const emitTileClick = (resource) => {
      if (resource.disabled && resource.type === 'space') {
        store.dispatch('showMessage', {
          title: $gettext('Disabled spaces cannot be entered'),
          status: 'warning'
        })
      }
      if (resource.type !== 'space' && resource.type !== 'folder') {
        resourceRouteResolver.createFileAction(resource)
      }
    }

    const showContextMenuOnBtnClick = (data, item, index) => {
      const { dropdown, event } = data
      if (dropdown?.tippy === undefined) {
        return
      }
      displayPositionedDropdown(dropdown.tippy, event, unref(tileRefs).dropBtns[index])
    }

    const showContextMenu = (event, index, reference) => {
      event.preventDefault()
      const drop = unref(tileRefs).tiles[index]?.$el.getElementsByClassName(
        'resource-tiles-btn-action-dropdown'
      )[0]

      if (drop === undefined) {
        return
      }
      displayPositionedDropdown(drop._tippy, event, reference)
    }

    const isResourceSelected = (resource) => {
      return props.selectedIds.includes(resource.id)
    }

    const toggleSelection = (resource) => {
      const selectedIds = !isResourceSelected(resource)
        ? [...props.selectedIds, resource.id]
        : props.selectedIds.filter((id) => id !== resource.id)
      context.emit('update:selectedIds', selectedIds)
    }

    const getResourceCheckboxLabel = (resource) => {
      switch (resource.type) {
        case 'folder':
          return $gettext('Select folder')
        case 'space':
          return $gettext('Select space')
        default:
          return $gettext('Select file')
      }
    }

    const currentSortField = computed(() => {
      return (
        props.sortFields.find((o) => o.name === props.sortBy && o.sortDir === props.sortDir) ||
        props.sortFields[0]
      )
    })
    const selectSorting = (field) => {
      context.emit('sort', { sortBy: field.name, sortDir: field.sortDir })
    }
    const isSortFieldSelected = (field) => {
      return unref(currentSortField) === field
    }

    const resourceIconSize = computed(() => {
      const sizeMap = {
        1: 'xlarge',
        2: 'xlarge',
        3: 'xxlarge',
        4: 'xxlarge',
        5: 'xxxlarge',
        6: 'xxxlarge'
      }
      return sizeMap[props.viewSize] ?? 'xlarge'
    })

    onBeforeUpdate(() => {
      tileRefs.value = {
        tiles: [],
        dropBtns: []
      }
    })

    return {
      areFileExtensionsShown,
      emitTileClick,
      getRoute,
      showContextMenuOnBtnClick,
      showContextMenu,
      tileRefs,
      isResourceSelected,
      toggleSelection,
      getResourceCheckboxLabel,
      selectSorting,
      isSortFieldSelected,
      currentSortField,
      resourceIconSize
    }
  },
  data() {
    return {
      ImageDimension
    }
  }
})
</script>

<style lang="scss" scoped>
.oc-tiles {
  column-gap: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(auto, var(--oc-size-tiles-default)));
  justify-content: flex-start;
  row-gap: 1rem;

  &.resizableTiles {
    grid-template-columns: repeat(auto-fill, minmax(auto, var(--oc-size-tiles-resize-step)));
  }

  @media only screen and (max-width: 640px) {
    grid-template-columns: 80%;
    justify-content: center;
    padding: var(--oc-space-medium) 0;

    &.resizableTiles {
      grid-template-columns: 80%;
    }
  }

  &-footer {
    color: var(--oc-color-text-muted);
    font-size: var(--oc-font-size-default);
    line-height: 1.4;
    padding: var(--oc-space-xsmall);
  }

  &-sort-drop {
    width: 200px;
  }

  &-sort-list {
    &:hover .oc-tiles-sort-list-item.selected:not(:hover),
    &:focus .oc-tiles-sort-list-item.selected:not(:focus) {
      color: var(--oc-color-swatch-passive-default);
    }

    &-item {
      &:hover,
      &:focus {
        background-color: var(--oc-color-background-hover);
        color: var(--oc-color-swatch-passive-default);
        text-decoration: none;
      }

      &.selected {
        color: var(--oc-color-swatch-inverse-default) !important;
      }
    }
  }
}
</style>
