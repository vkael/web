import ViewOptions from 'web-app-files/src/components/AppBar/ViewOptions.vue'
import { useRouteQueryPersisted } from 'web-pkg/src/composables/router'
import { ref } from 'vue'
import {
  createStore,
  defaultPlugins,
  defaultStoreMockOptions,
  defaultComponentMocks,
  mount
} from 'web-test-helpers'
import { ViewModeConstants } from 'web-app-files/src/composables'

jest.mock('web-pkg/src/composables/router')
const selectors = {
  pageSizeSelect: '.oc-page-size',
  hiddenFilesSwitch: '[data-testid="files-switch-hidden-files"]',
  fileExtensionsSwitch: '[data-testid="files-switch-files-extensions-files"]',
  viewModeSwitchBtns: '.viewmode-switch-buttons',
  tileSizeSlider: '[data-testid="files-tiles-size-slider"]'
}

describe('ViewOptions component', () => {
  describe('pagination', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasPagination: false } })
      expect(wrapper.find(selectors.pageSizeSelect).exists()).toBeFalsy()
    })
    it('sets the correct initial files page limit', () => {
      const perPage = '100'
      const { wrapper } = getWrapper({ perPage })
      expect(wrapper.findComponent<any>(selectors.pageSizeSelect).props().selected).toBe(perPage)
    })
  })
  describe('hidden files toggle', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasHiddenFiles: false } })
      expect(wrapper.find(selectors.hiddenFilesSwitch).exists()).toBeFalsy()
    })
    it('toggles the setting to show/hide hidden files', () => {
      const { wrapper, storeOptions } = getWrapper()
      ;(wrapper.findComponent<any>(selectors.hiddenFilesSwitch).vm as any).$emit(
        'update:checked',
        false
      )
      expect(storeOptions.modules.Files.mutations.SET_HIDDEN_FILES_VISIBILITY).toHaveBeenCalled()
    })
  })
  describe('file extension toggle', () => {
    it('does not show when disabled', () => {
      const { wrapper } = getWrapper({ props: { hasFileExtensions: false } })
      expect(wrapper.find(selectors.fileExtensionsSwitch).exists()).toBeFalsy()
    })
    it('toggles the setting to show/hide file extensions', () => {
      const { wrapper, storeOptions } = getWrapper()
      ;(wrapper.findComponent<any>(selectors.fileExtensionsSwitch).vm as any).$emit(
        'update:checked',
        false
      )
      expect(storeOptions.modules.Files.mutations.SET_FILE_EXTENSIONS_VISIBILITY).toHaveBeenCalled()
    })
  })
  describe('view mode switcher', () => {
    it('does not show initially', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.viewModeSwitchBtns).exists()).toBeFalsy()
    })
    it('shows if more than one viewModes are passed', () => {
      const { wrapper } = getWrapper({
        props: { viewModes: [ViewModeConstants.condensedTable, ViewModeConstants.default] }
      })
      expect(wrapper.find(selectors.viewModeSwitchBtns).exists()).toBeTruthy()
    })
  })
  describe('tile size slider', () => {
    it('does not show initially', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.find(selectors.tileSizeSlider).exists()).toBeFalsy()
    })
    it('shows if the viewModes include "resource-tiles"', () => {
      const { wrapper } = getWrapper({
        props: { viewModes: [ViewModeConstants.tilesView] }
      })
      expect(wrapper.find(selectors.tileSizeSlider).exists()).toBeTruthy()
    })
    it.each([1, 2, 3, 4, 5, 6])('applies the correct rem size via css', (tileSize) => {
      getWrapper({
        tileSize: tileSize.toString(),
        props: { viewModes: [ViewModeConstants.tilesView] }
      })
      const rootStyle = (document.querySelector(':root') as HTMLElement).style
      expect(rootStyle.getPropertyValue('--oc-size-tiles-resize-step')).toEqual(
        `${tileSize * 12}rem`
      )
    })
  })
})

function getWrapper({
  perPage = '100',
  viewMode = ViewModeConstants.default.name,
  tileSize = '1',
  props = {}
} = {}) {
  jest.mocked(useRouteQueryPersisted).mockImplementationOnce(() => ref(perPage))
  jest.mocked(useRouteQueryPersisted).mockImplementationOnce(() => ref(viewMode))
  jest.mocked(useRouteQueryPersisted).mockImplementationOnce(() => ref(tileSize))

  const storeOptions = { ...defaultStoreMockOptions }
  const store = createStore(storeOptions)
  const mocks = { ...defaultComponentMocks() }
  return {
    storeOptions,
    mocks,
    wrapper: mount(ViewOptions, {
      props: { ...props },
      global: {
        mocks,
        stubs: { OcButton: true, OcPageSize: false, OcSelect: true },
        plugins: [...defaultPlugins(), store]
      }
    })
  }
}
