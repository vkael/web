import AppBar from 'web-app-files/src/components/AppBar/AppBar.vue'
import { mock, mockDeep } from 'jest-mock-extended'
import { Resource } from 'web-client'
import {
  createStore,
  defaultComponentMocks,
  defaultPlugins,
  getActionMixinMocks,
  shallowMount,
  defaultStoreMockOptions,
  RouteLocation
} from 'web-test-helpers'
import { ViewModeConstants } from 'web-app-files/src/composables'

const selectors = {
  ocBreadcrumbStub: 'oc-breadcrumb-stub',
  batchActionsStub: 'batch-actions-stub',
  sharesNavigationStub: 'shares-navigation-stub',
  viewOptionsStub: 'view-options-stub',
  sidebarToggleStub: 'sidebar-toggle-stub'
}

const selectedFiles = [mockDeep<Resource>(), mockDeep<Resource>()]
const actionSlot = "<button class='action-slot'>Click</button>"
const contentSlot = "<div class='content-slot'>Foo</div>"

const mixins = [
  '$_clearSelection_items',
  '$_acceptShare_items',
  '$_declineShare_items',
  '$_downloadArchive_items',
  '$_downloadFile_items',
  '$_move_items',
  '$_copy_items',
  '$_emptyTrashBin_items',
  '$_delete_items',
  '$_restore_items'
]

const breadcrumbItems = [
  { text: 'Example1', to: '/' },
  { text: 'Example2', to: '/foo' }
]
const breadCrumbItemWithContextActionAllowed = {
  text: 'Example Special',
  to: '/bar',
  allowContextActions: true
}

describe('AppBar component', () => {
  describe('renders', () => {
    it('by default no breadcrumbs, no bulkactions, no sharesnavigation but viewoptions and sidebartoggle', () => {
      const { wrapper } = getShallowWrapper()
      expect(wrapper.html()).toMatchSnapshot()
    })
    describe('breadcrumbs', () => {
      it('if given, by default without breadcrumbsContextActionsItems', () => {
        const { wrapper } = getShallowWrapper([], {}, { breadcrumbs: breadcrumbItems })
        expect(wrapper.find(selectors.ocBreadcrumbStub).exists()).toBeTruthy()
        expect(wrapper.findComponent<any>(selectors.ocBreadcrumbStub).props('items')).toEqual(
          breadcrumbItems
        )
      })
      it('if given, with breadcrumbsContextActionsItems if allowed on last breadcrumb item', () => {
        const { wrapper } = getShallowWrapper(
          [],
          {},
          { breadcrumbs: [...breadcrumbItems, breadCrumbItemWithContextActionAllowed] }
        )
        expect(wrapper.find(selectors.ocBreadcrumbStub).exists()).toBeTruthy()
        expect(wrapper.findComponent<any>(selectors.ocBreadcrumbStub).props('items')).toEqual([
          ...breadcrumbItems,
          breadCrumbItemWithContextActionAllowed
        ])
      })
    })
    describe('bulkActions', () => {
      it('if enabled', () => {
        const { wrapper } = getShallowWrapper(selectedFiles, {}, { hasBulkActions: true })
        expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
      })
      it('if 1 file selected on trash routes', () => {
        const { wrapper } = getShallowWrapper(
          [selectedFiles[0]],
          {},
          { hasBulkActions: true },
          'files-trash-generic'
        )
        expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
      })
      it('not if 1 file selected', () => {
        const { wrapper } = getShallowWrapper([selectedFiles[0]], {}, { hasBulkActions: true })
        expect(wrapper.find(selectors.batchActionsStub).exists()).toBeFalsy()
      })
    })
    describe('sharesNavigation', () => {
      it('if enabled', () => {
        const { wrapper } = getShallowWrapper([], {}, { hasSharesNavigation: true })
        expect(wrapper.find(selectors.sharesNavigationStub).exists()).toBeTruthy()
      })
    })
    describe('viewoptions and sidebartoggle', () => {
      it('only viewoptions if sidebartoggle is disabled', () => {
        const { wrapper } = getShallowWrapper([], {}, { hasSidebarToggle: false })
        expect(wrapper.find(selectors.viewOptionsStub).exists()).toBeTruthy()
        expect(wrapper.find(selectors.sidebarToggleStub).exists()).toBeFalsy()
      })
      it('only sidebartoggle if viewoptions is disabled', () => {
        const { wrapper } = getShallowWrapper([], {}, { hasViewOptions: false })
        expect(wrapper.find(selectors.viewOptionsStub).exists()).toBeFalsy()
        expect(wrapper.find(selectors.sidebarToggleStub).exists()).toBeTruthy()
      })
      it('neither if both are disabled', () => {
        const { wrapper } = getShallowWrapper(
          [],
          {},
          { hasSidebarToggle: false, hasViewOptions: false }
        )
        expect(wrapper.find(selectors.viewOptionsStub).exists()).toBeFalsy()
        expect(wrapper.find(selectors.sidebarToggleStub).exists()).toBeFalsy()
      })
      it('passes viewModes array to ViewOptions', () => {
        const viewModes = [ViewModeConstants.tilesView]
        const { wrapper } = getShallowWrapper([], {}, { hasViewOptions: true, viewModes })
        expect(wrapper.findComponent<any>(selectors.viewOptionsStub).props('viewModes')).toEqual(
          viewModes
        )
      })
    })
    it('if given, with content in the actions slot', () => {
      const { wrapper } = getShallowWrapper([], { actions: actionSlot })
      expect(wrapper.html()).toMatchSnapshot()
    })
    it('if given, with content in the content slot', () => {
      const { wrapper } = getShallowWrapper([], { content: contentSlot })
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
})

function getShallowWrapper(
  selected = [],
  slots = {},
  props: { [key: string]: any } = {
    breadcrumbs: [],
    displayViewModeSwitch: false,
    hasBulkActions: false,
    hasSharesNavigation: false,
    hasSidebarToggle: true,
    hasViewOptions: true
  },
  currentRouteName = 'files-spaces-generic'
) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: currentRouteName })
    }),
    ...getActionMixinMocks({ actions: mixins })
  }
  mocks.$route.meta.title = 'ExampleTitle'
  const storeOptions = defaultStoreMockOptions
  storeOptions.modules.Files.getters.selectedFiles.mockImplementation(() => selected)
  const store = createStore(storeOptions)
  return {
    wrapper: shallowMount(
      { ...AppBar, mixins },
      {
        props: { ...props },
        slots,
        global: {
          plugins: [...defaultPlugins(), store],
          mocks
        }
      }
    )
  }
}
