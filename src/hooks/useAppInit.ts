import {isLocalAi} from '@/config/env'
import {useTheme} from '@/context/ThemeProvider'
import db from '@/databases'
import i18n from '@/i18n'
import {useAppDispatch} from '@/store'
import {setAvatar, setUpdateState} from '@/store/runtime'
import {delay, runAsyncFunction} from '@/utils'
import {useLiveQuery} from 'dexie-react-hooks'
import {useEffect} from 'react'

import {useDefaultModel} from './useAssistant'
import useFullScreenNotice from './useFullScreenNotice'
import {useSettings} from './useSettings'

export function useAppInit() {
  const dispatch = useAppDispatch()
  const {language, windowStyle, autoCheckUpdate, customCss} = useSettings()
  const {setDefaultModel, setTopicNamingModel, setTranslateModel} = useDefaultModel()
  const avatar = useLiveQuery(() => db.settings.get('image://avatar'))
  const {theme} = useTheme()

  useFullScreenNotice()

  useEffect(() => {
    avatar?.value && dispatch(setAvatar(avatar.value))
  }, [avatar, dispatch])

  useEffect(() => {
    runAsyncFunction(async () => {
      if (autoCheckUpdate) {
        await delay(2)
        const updateInfo = await window.api.checkForUpdate()
        if (updateInfo) {
          dispatch(setUpdateState({info: updateInfo}))
        }
      }
    }).then()
  }, [dispatch, autoCheckUpdate])

  useEffect(() => {
    i18n.changeLanguage(language || navigator.language || 'en-US').then()
  }, [language])

  useEffect(() => {
    (async () => {
      const transparentWindow = windowStyle === 'transparent' && window.isMac
      window.root.style.background = transparentWindow ? 'var(--navbar-background-mac)' : 'var(--navbar-background)'
    })()
  }, [windowStyle, theme])

  useEffect(() => {
    if (isLocalAi) {
      const model = JSON.parse(import.meta.env.VITE_RENDERER_INTEGRATED_MODEL)
      setDefaultModel(model)
      setTopicNamingModel(model)
      setTranslateModel(model)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const oldCustomCss = document.getElementById('user-defined-custom-css')
    if (oldCustomCss) {
      oldCustomCss.remove()
    }

    if (customCss) {
      const style = document.createElement('style')
      style.id = 'user-defined-custom-css'
      style.textContent = customCss
      document.head.appendChild(style)
    }
  }, [customCss])
}
