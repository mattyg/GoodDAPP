// @flow
import { ActionSheetProvider } from '@expo/react-native-action-sheet'
import React, { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import '../lib/shim'
import '../lib/gundb/gundb'
import { IS_LOGGED_IN } from '../lib/constants/localStorage'
import AsyncStorage from '../lib/utils/asyncStorage'

import Config from '../config/config'

import SimpleStore from '../lib/undux/SimpleStore'
import LanguageProvider from '../language/i18n'
import useUserContext from '../lib/hooks/useUserContext'
import { UserContextProvider } from '../lib/contexts/userContext'
import AppHot from './AppHot'

const AppHolder = () => {
  const [ready, setReady] = useState(false)
  const { update } = useUserContext()

  useEffect(() => {
    /**
     * decide if we need to clear storage
     */
    const upgradeVersion = async () => {
      const valid = ['phase1', null] //in case multiple versions are valid
      const current = 'phase' + Config.phase
      valid.push(current)
      const version = await AsyncStorage.getItem('GD_version')
      if (valid.includes(version)) {
        return
      }

      //remove all local data so its not cached and user will re-login
      await Promise.all([AsyncStorage.clear()])
      AsyncStorage.setItem('GD_version', current) // required for mnemonic recovery
    }

    const initStore = async () => {
      const isLoggedIn = await AsyncStorage.getItem(IS_LOGGED_IN)

      update({ isLoggedIn })
    }

    const initializeApp = async () => {
      if (Platform.OS === 'web') {
        await upgradeVersion()
      }

      await initStore()
      setReady(true)
    }

    if (ready) {
      return
    }

    initializeApp()
  }, [ready])

  if (!ready) {
    return null
  }

  return (
    <LanguageProvider>
      <ActionSheetProvider>
        <AppHot />
      </ActionSheetProvider>
    </LanguageProvider>
  )
}

export default () => (
  <UserContextProvider>
    <SimpleStore.Container>
      <AppHolder />
    </SimpleStore.Container>
  </UserContextProvider>
)
