<template>
  <div class="oc-mt-xl">
    <div v-if="noUsers" class="oc-flex user-info">
      <oc-icon name="user" size="xxlarge" />
      <p v-translate>Select a user to view details</p>
    </div>
    <div v-if="multipleUsers" class="oc-flex group-info">
      <oc-icon name="group" size="xxlarge" />
      <p>{{ multipleUsersSelectedText }}</p>
    </div>
    <div v-if="user">
      <UserInfoBox :user="user" />
      <table
        class="details-table"
        :aria-label="$gettext('Overview of the information about the selected user')"
      >
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('User name')" />
          <td v-text="user.onPremisesSamAccountName" />
        </tr>
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('First and last name')" />
          <td v-text="user.displayName" />
        </tr>
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('Email')" />
          <td>
            <span v-text="user.mail" />
          </td>
        </tr>
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('Role')" />
          <td>
            <span v-if="user.appRoleAssignments" v-text="roleDisplayName" />
          </td>
        </tr>
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('Login')" />
          <td>
            <span v-text="loginDisplayValue" />
          </td>
        </tr>
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('Quota')" />
          <td>
            <span v-if="showUserQuota" v-text="quotaDisplayValue" />
            <span v-else>
              <span class="oc-mr-xs">-</span>
              <oc-contextual-helper
                :text="
                  $gettext('To see an individual quota, the user needs to have logged in once.')
                "
              />
            </span>
          </td>
        </tr>
        <tr>
          <th scope="col" class="oc-pr-s" v-text="$gettext('Groups')" />
          <td>
            <span v-if="user.memberOf.length" v-text="groupsDisplayValue" />
            <span v-else>
              <span class="oc-mr-xs">-</span>
              <oc-contextual-helper :text="$gettext('No groups assigned.')" />
            </span>
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import UserInfoBox from './UserInfoBox.vue'
import { PropType } from 'vue'
import { User } from 'web-client/src/generated'
import { formatFileSize } from 'web-pkg/src/helpers'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'DetailsPanel',
  components: {
    UserInfoBox
  },
  props: {
    user: {
      type: Object as PropType<User>,
      required: false
    },
    users: {
      type: Array,
      required: true
    },
    roles: {
      type: Array,
      required: true
    }
  },
  setup() {
    const { $gettext, current: currentLanguage } = useGettext()

    return {
      $gettext,
      currentLanguage
    }
  },
  computed: {
    noUsers() {
      return !this.users.length
    },
    multipleUsers() {
      return this.users.length > 1
    },
    multipleUsersSelectedText() {
      return this.$gettext('%{count} users selected', {
        count: this.users.length
      })
    },
    roleDisplayName() {
      const assignedRole = this.user.appRoleAssignments[0]

      return this.$gettext(
        this.roles.find((role) => role.id === assignedRole.appRoleId)?.displayName || ''
      )
    },
    groupsDisplayValue() {
      return this.user.memberOf
        .map((group) => group.displayName)
        .sort()
        .join(', ')
    },
    showUserQuota() {
      return 'total' in (this.user.drive?.quota || {})
    },
    quotaDisplayValue() {
      return this.user.drive.quota.total === 0
        ? this.$gettext('No restriction')
        : formatFileSize(this.user.drive.quota.total, this.currentLanguage)
    },
    loginDisplayValue() {
      return this.user.accountEnabled === false
        ? this.$gettext('Forbidden')
        : this.$gettext('Allowed')
    }
  }
})
</script>
<style lang="scss">
.details-table {
  text-align: left;

  tr {
    height: 1.5rem;
  }

  th {
    font-weight: 600;
  }
}
</style>
