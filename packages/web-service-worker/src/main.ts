import { WebDavClient } from './webDav'
import { Logger } from './logger'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching"

declare const self: any

precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/.*/]
})

self.addEventListener('install', (): void => {
  self.skipWaiting()
})
addEventListener('message', async (event): Promise<void> => {
  if (event.data.type === 'health') {
    event.ports[0].postMessage(true)
    Logger.success('up and running')
  }
  if (event.data.type === 'copy') {
    const data = event.data
    const sourceSpaceId = data.sourceSpaceId
    const sourcePath = data.sourcePath
    const targetSpaceId = data.targetSpaceId
    const targetPath = data.targetPath
    const token = data.token

    Logger.info(`copy file from ${sourcePath} to ${targetPath}`)
    await WebDavClient.moveFile(sourceSpaceId, sourcePath, targetSpaceId, targetPath, token)
  }
})

