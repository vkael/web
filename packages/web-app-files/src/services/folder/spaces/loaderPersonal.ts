import { FolderLoader, FolderLoaderTask, TaskContext } from '../../folder'
import Router from 'vue-router'
import { useTask } from 'vue-concurrency'
import { DavProperties } from 'web-pkg/src/constants'
import { buildResource, buildWebDavSpacesPath } from '../../../helpers/resources'
import { isLocationSpacesActive } from '../../../router'
import { Store } from 'vuex'
import { fetchResources } from '../util'
import get from 'lodash-es/get'

export class FolderLoaderSpacesPersonal implements FolderLoader {
  public isEnabled(store: Store<any>): boolean {
    return get(store, 'getters.capabilities.spaces.share_jail', false)
  }

  public isActive(router: Router): boolean {
    return isLocationSpacesActive(router, 'files-spaces-personal-home')
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { store, router, clientService } = context

    const graphClient = clientService.graphAuthenticated(
      store.getters.configuration.server,
      store.getters.getToken
    )

    return useTask(function* (signal1, signal2, ref, sameRoute, path = null) {
      try {
        store.commit('Files/CLEAR_CURRENT_FILES_LIST')

        const drivesResponse = yield graphClient.drives.listMyDrives('', 'driveType eq personal')
        if (!drivesResponse.data) {
          throw new Error('No personal space found')
        }

        let resources = yield fetchResources(
          clientService.owncloudSdk,
          buildWebDavSpacesPath(
            drivesResponse.data.value[0].id,
            path || router.currentRoute.params.item || ''
          ),
          DavProperties.Default
        )
        resources = resources.map(buildResource)

        const currentFolder = resources.shift()

        store.commit('Files/LOAD_FILES', {
          currentFolder,
          files: resources
        })

        // load indicators
        ;(() => {
          store.dispatch('Files/loadIndicators', {
            client: clientService.owncloudSdk,
            currentFolder: currentFolder.path
          })
        })()

        // fetch user quota
        ;(async () => {
          const user = await clientService.owncloudSdk.users.getUser(ref.user.id)
          store.commit('SET_QUOTA', user.quota)
        })()
      } catch (error) {
        store.commit('Files/SET_CURRENT_FOLDER', null)
        console.error(error)
      }

      ref.refreshFileListHeaderPosition()

      ref.accessibleBreadcrumb_focusAndAnnounceBreadcrumb(sameRoute)
      ref.scrollToResourceFromRoute()
    }).restartable()
  }
}