// @flow
import { createSwitchNavigator } from '@react-navigation/core'
import React from 'react'
import type { Store } from 'undux'

// TODO: Should we do this diferently?
import homeIcon from '../../assets/homeIcon.png'

import GDStore from '../../lib/undux/GDStore'
import Dashboard from '../dashboard/Dashboard'
import Profile from '../profile/Profile'

type AppNavigationProps = {
  navigation: any,
  store: Store
}

type AppNavigationState = {
  ready: boolean
}

const routes = {
  Dashboard: {
    screen: Dashboard,
    icon: homeIcon,
    display: false
  },
  Profile: {
    screen: Profile,
    display: false
  }
}

const initialRouteName = 'Dashboard'
const AppNavigator = createSwitchNavigator(routes, { initialRouteName })

/**
 * Switch navigation between all screens on the tabs. Each of this screen should be a StackNavigation
 * Dashboard is the initial route
 */
class AppNavigation extends React.Component<AppNavigationProps, AppNavigationState> {
  render() {
    return <AppNavigator navigation={this.props.navigation} screenProps={{ routes }} />
  }
}

const appNavigation = GDStore.withStore(AppNavigation)
appNavigation.router = AppNavigator.router

export default appNavigation
