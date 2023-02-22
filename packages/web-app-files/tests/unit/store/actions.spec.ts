import actions from '../../../src/store/actions'
import { spaceRoleManager, ShareTypes, Share } from 'web-client/src/helpers/share'
import { mock, mockDeep } from 'jest-mock-extended'
import { OwnCloudSdk } from 'web-client/src/types'
import { Resource } from 'web-client'
import { SpaceResource } from 'web-client/src/helpers'
import { Language } from 'vue3-gettext'

jest.mock('../../../src/helpers/resources', () => {
  return {
    buildShare: (share) => share,
    buildCollaboratorShare: (share) => share
  }
})

const stateMock = {
  commit: jest.fn(),
  dispatch: jest.fn(),
  getters: {},
  rootGetters: {}
}
// we need to define $gettext explicitly to make it enumerable on the mock
const languageMock = mock<Language>({ $gettext: jest.fn() })

describe('vuex store actions', () => {
  describe('changeShare', () => {
    it('succeeds when resolved sucessfully', async () => {
      const clientMock = mockDeep<OwnCloudSdk>()
      clientMock.shares.updateShare.mockResolvedValue({})
      await actions.changeShare(stateMock, {
        ...languageMock,
        client: clientMock,
        share: mockDeep<Share>({ shareType: ShareTypes.user.value }),
        permissions: spaceRoleManager.bitmask(false),
        role: spaceRoleManager,
        expirationDate: null
      })

      expect(stateMock.commit).toHaveBeenCalledTimes(1)
    })
    it('fails on error', async () => {
      const clientMock = mockDeep<OwnCloudSdk>()
      clientMock.shares.updateShare.mockRejectedValue(new Error())
      await actions.changeShare(stateMock, {
        ...languageMock,
        client: clientMock,
        share: mockDeep<Share>({ shareType: ShareTypes.user.value }),
        permissions: spaceRoleManager.bitmask(false),
        role: spaceRoleManager,
        expirationDate: null
      })

      expect(stateMock.commit).toHaveBeenCalledTimes(0)
      expect(stateMock.dispatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('addShare', () => {
    it.each([
      { shareType: ShareTypes.user.value, shareMethod: 'shareFileWithUser' },
      { shareType: ShareTypes.group.value, shareMethod: 'shareFileWithGroup' }
    ])('succeeds when resolved sucessfully', async (data) => {
      const clientMock = mockDeep<OwnCloudSdk>()
      clientMock.shares[data.shareMethod].mockResolvedValue({})
      await actions.addShare(stateMock, {
        ...languageMock,
        client: clientMock,
        path: '/someFile.txt',
        shareWith: 'user',
        shareType: data.shareType,
        permissions: spaceRoleManager.bitmask(false),
        role: spaceRoleManager,
        expirationDate: null,
        storageId: null
      })

      expect(clientMock.shares[data.shareMethod]).toHaveBeenCalledTimes(1)
      expect(stateMock.commit).toHaveBeenCalledTimes(2)
    })
    it('fails on error', async () => {
      const clientMock = mockDeep<OwnCloudSdk>()
      clientMock.shares.shareFileWithUser.mockRejectedValue(new Error())
      await actions.addShare(stateMock, {
        ...languageMock,
        client: clientMock,
        path: '/someFile.txt',
        shareWith: 'user',
        shareType: ShareTypes.user.value,
        permissions: spaceRoleManager.bitmask(false),
        role: spaceRoleManager,
        expirationDate: null,
        storageId: null
      })

      expect(stateMock.commit).toHaveBeenCalledTimes(0)
      expect(stateMock.dispatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('deleteShare', () => {
    it('succeeds when resolved sucessfully', async () => {
      const clientMock = mockDeep<OwnCloudSdk>()
      clientMock.shares.deleteShare.mockResolvedValue({})
      await actions.deleteShare(stateMock, {
        client: clientMock,
        share: mockDeep<Share>({ shareType: ShareTypes.user.value }),
        path: '/someFile.txt'
      })

      expect(stateMock.commit).toHaveBeenCalledTimes(1)
    })
  })

  describe('loadShares', () => {
    const stateMock = {
      sharesLoading: false,
      outgoingShares: [],
      incomingShares: [],
      ancestorMetaData: {}
    }
    const gettersMock = {
      highlightedFile: () => mock<Resource>({ path: 'someFolder/someFile.txt' })
    }
    let outgoingShares = []
    let incomingShares = []
    const commitMock = jest.fn((mutation, value) => {
      if (mutation === 'OUTGOING_SHARES_SET') {
        outgoingShares.push(...value)
      }
      if (mutation === 'INCOMING_SHARES_SET') {
        incomingShares.push(...value)
      }
    })

    beforeEach(() => {
      outgoingShares = []
      incomingShares = []
    })

    it('fetches shares and sets them as in- and outgoing shares', async () => {
      const clientMock = mockDeep<OwnCloudSdk>()
      clientMock.shares.getShares.mockResolvedValueOnce([{ shareInfo: { id: 1 } }])
      clientMock.shares.getShares.mockResolvedValueOnce([{ shareInfo: { id: 3 } }])
      clientMock.shares.getShares.mockResolvedValueOnce([{ shareInfo: { id: 2 } }])
      clientMock.shares.getShares.mockResolvedValueOnce([{ shareInfo: { id: 4 } }])
      await actions.loadShares(
        { state: stateMock, getters: gettersMock, commit: commitMock },
        {
          client: clientMock,
          path: '/someFolder/someFile.txt',
          storageId: '1',
          useCached: false
        }
      )

      expect(outgoingShares).toEqual([
        { id: 1, outgoing: true, indirect: false },
        { id: 2, outgoing: true, indirect: true }
      ])
      expect(incomingShares).toEqual([
        { id: 3, outgoing: false, indirect: false },
        { id: 4, outgoing: false, indirect: true }
      ])
      expect(clientMock.shares.getShares).toHaveBeenCalledTimes(4)
    })
    it('uses the cache and only updates the "indirect" state', async () => {
      const loadedShare = { id: 1, outgoing: true, indirect: true, path: '/someFile.txt' }
      stateMock.outgoingShares = [loadedShare]
      const clientMock = mockDeep<OwnCloudSdk>()
      await actions.loadShares(
        { state: stateMock, getters: gettersMock, commit: commitMock },
        {
          client: clientMock,
          path: '/someFile.txt',
          storageId: '1',
          useCached: true
        }
      )

      expect(outgoingShares).toEqual([{ ...loadedShare, indirect: false }])
      expect(clientMock.shares.getShares).not.toHaveBeenCalled()
    })
  })

  describe('updateCurrentFileShareTypes', () => {
    const stateMock = { outgoingShares: [] }
    const commitSpy = jest.fn()

    it('updates the resource if given', () => {
      const getters = { highlightedFile: mockDeep<Resource>() }
      actions.updateCurrentFileShareTypes({ state: stateMock, getters, commit: commitSpy })
      expect(commitSpy).toHaveBeenCalledTimes(1)
    })
    it('does not update the resource if not given', () => {
      const getters = { highlightedFile: undefined }
      actions.updateCurrentFileShareTypes({ state: stateMock, getters, commit: commitSpy })
      expect(commitSpy).toHaveBeenCalledTimes(0)
    })
    it('does not update project space resources', () => {
      const getters = { highlightedFile: mockDeep<SpaceResource>({ driveType: 'project' }) }
      actions.updateCurrentFileShareTypes({ state: stateMock, getters, commit: commitSpy })
      expect(commitSpy).toHaveBeenCalledTimes(0)
    })
  })
})
