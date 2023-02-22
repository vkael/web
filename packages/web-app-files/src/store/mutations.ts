import { set, has } from 'lodash-es'
import { getIndicators } from '../helpers/statusIndicators'
import { Resource, SpaceResource } from 'web-client/src/helpers'

export default {
  LOAD_FILES(state, { currentFolder, files }) {
    state.currentFolder = currentFolder
    state.files = files
  },
  SET_CURRENT_FOLDER(state, currentFolder) {
    state.currentFolder = currentFolder
  },
  CLEAR_FILES(state) {
    state.files = []
  },
  LOAD_FILES_SEARCHED(state, files) {
    state.filesSearched = files
  },
  REMOVE_FILES_FROM_SEARCHED(state, files) {
    if (!state.filesSearched) {
      return
    }

    state.filesSearched = state.filesSearched.filter((i) => !files.find((f) => f.id === i.id))
  },
  CLEAR_FILES_SEARCHED(state) {
    state.filesSearched = null
  },
  CLEAR_CLIPBOARD(state) {
    state.clipboardSpace = null
    state.clipboardResources = []
    state.clipboardAction = null
  },
  CLIPBOARD_SELECTED(state, { space, resources }: { space: SpaceResource; resources: Resource[] }) {
    state.clipboardSpace = space
    state.clipboardResources = resources
  },
  SET_CLIPBOARD_ACTION(state, action) {
    state.clipboardAction = action
  },
  SET_LATEST_SELECTED_FILE_ID(state, fileId) {
    state.latestSelectedId = fileId
  },
  SET_FILE_SELECTION(state, selectedFiles) {
    const latestSelected = selectedFiles.find((i) => !state.selectedIds.includes(i.id))
    if (latestSelected) {
      state.latestSelectedId = latestSelected.id
    }
    state.selectedIds = selectedFiles.map((f) => f.id)
  },
  SET_SELECTED_IDS(state, selectedIds) {
    const latestSelectedId = selectedIds.find((id) => !state.selectedIds.includes(id))
    if (latestSelectedId) {
      state.latestSelectedId = latestSelectedId
    }
    state.selectedIds = selectedIds
  },
  ADD_FILE_SELECTION(state, file) {
    const selected = [...state.selectedIds]
    const fileIndex = selected.findIndex((id) => {
      return id === file.id
    })
    state.latestSelectedId = file.id
    if (fileIndex === -1) {
      selected.push(file.id)
      state.selectedIds = selected
    }
  },
  REMOVE_FILE_SELECTION(state, file) {
    const selected = [...state.selectedIds]
    state.latestSelectedId = file.id
    if (selected.length > 1) {
      state.selectedIds = selected.filter((id) => file.id !== id)
      return
    }
    state.selectedIds = []
  },
  RESET_SELECTION(state) {
    state.selectedIds = []
  },
  REMOVE_FILES(state, removedFiles) {
    state.files = [...state.files].filter((file) => !removedFiles.find((r) => r.id === file.id))
  },
  OUTGOING_SHARES_SET(state, shares) {
    state.outgoingShares = shares
  },
  OUTGOING_SHARES_REMOVE(state, share) {
    state.outgoingShares = state.outgoingShares.filter((s) => share.id !== s.id)
  },
  OUTGOING_SHARES_UPSERT(state, share) {
    const fileIndex = state.outgoingShares.findIndex((s) => {
      return s.id === share.id
    })

    if (fileIndex >= 0) {
      state.outgoingShares[fileIndex] = share
    } else {
      // share was not present in the list while updating, add it instead
      state.outgoingShares.push(share)
    }
  },
  INCOMING_SHARES_SET(state, shares) {
    state.incomingShares = shares
  },
  SHARES_LOADING(state, loading) {
    state.sharesLoading = loading
  },

  CLEAR_CURRENT_FILES_LIST(state) {
    state.currentFolder = null
    state.selectedIds = []
    // release blob urls
    state.files.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
        window.URL.revokeObjectURL(item.previewUrl)
      }
    })
    state.files = []
  },

  SET_VERSIONS(state, versions) {
    state.versions = versions
  },

  LOAD_INDICATORS(state, path) {
    const files = state.files.filter((f) => f.path.startsWith(path))
    for (const resource of files) {
      const indicators = getIndicators({ resource, ancestorMetaData: state.ancestorMetaData })
      if (!indicators.length && !resource.indicators.length) {
        continue
      }

      this.commit('Files/UPDATE_RESOURCE_FIELD', {
        id: resource.id,
        field: 'indicators',
        value: indicators
      })
    }
  },

  /**
   * Inserts or updates the given resource, depending on whether or not the resource is already loaded.
   * Updating the resource always takes precedence, so that we don't duplicate resources in the store
   * accidentally.
   *
   * @param state Current state of this store module
   * @param resource A new or updated resource
   */
  UPSERT_RESOURCE(state, resource) {
    $_upsertResource(state, resource, true)
  },

  /**
   * Updates the given resource in the store. If the resource doesn't exist in the store, the update
   * will be ignored. If you also want to allow inserts, use UPSERT_RESOURCE instead.
   *
   * @param state Current state of this store module
   * @param resource An updated resource
   */
  UPDATE_RESOURCE(state, resource) {
    $_upsertResource(state, resource, false)
  },

  /**
   * Updates a single resource field. If the resource with given id doesn't exist nothing will happen.
   *
   * @param state Current state of this store module
   * @param params.id Id of the resource to be updated
   * @param params.field the resource field that the value should be applied to
   * @param params.value the value that will be attached to the key
   */
  UPDATE_RESOURCE_FIELD(state, params) {
    let fileSource = state.filesSearched || state.files
    let index = fileSource.findIndex((r) => r.id === params.id)
    if (index < 0) {
      if (state.currentFolder?.id === params.id) {
        fileSource = [state.currentFolder]
        index = 0
      } else {
        return
      }
    }

    const resource = fileSource[index]
    const isReactive = has(resource, params.field)
    const newResource = set(resource, params.field, params.value)

    if (isReactive) {
      return
    }

    fileSource[index] = newResource
  },

  SET_HIDDEN_FILES_VISIBILITY(state, value) {
    state.areHiddenFilesShown = value

    window.localStorage.setItem('oc_hiddenFilesShown', value)
  },

  SET_FILE_EXTENSIONS_VISIBILITY(state, value) {
    state.areFileExtensionsShown = value

    window.localStorage.setItem('oc_fileExtensionsShown', value)
  },

  SET_ANCESTOR_META_DATA(state, value) {
    state.ancestorMetaData = value
  }
}

// eslint-disable-next-line camelcase
function $_upsertResource(state, resource, allowInsert) {
  const files = [...state.files]
  let index = files.findIndex((r) => r.id === resource.id)
  if (resource.webDavPath && resource.webDavPath.length && index === -1) {
    index = files.findIndex((r) => r.webDavPath === resource.webDavPath)
  }
  const found = index > -1

  state.filesSearched = null

  if (!found && !allowInsert) {
    return
  }

  if (found) {
    Object.assign(files[index], resource)
  } else {
    files.push(resource)
  }
  state.files = files
}
