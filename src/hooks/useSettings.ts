import store, { useAppDispatch, useAppSelector } from '@/store'
import {
  SendMessageShortcut,
  setLaunchOnBoot,
  setSendMessageShortcut as _setSendMessageShortcut,
  setShowAssistantIcon,
  setTargetLanguage,
  setTheme,
  SettingsState,
  setTopicPosition,
  setWindowStyle
} from '@/store/settings'
import { ThemeMode, TranslateLanguageVarious } from '@/types'

export function useSettings() {
  const settings = useAppSelector((state) => state.settings)
  const dispatch = useAppDispatch()

  return {
    ...settings,
    setSendMessageShortcut(shortcut: SendMessageShortcut) {
      dispatch(_setSendMessageShortcut(shortcut))
    },
    setLaunch(isLaunchOnBoot: boolean | undefined) {
      if (isLaunchOnBoot !== undefined) {
        dispatch(setLaunchOnBoot(isLaunchOnBoot))
        window.api.setLaunchOnBoot(isLaunchOnBoot).then()
      }
    },
    setTheme(theme: ThemeMode) {
      dispatch(setTheme(theme))
    },
    setWindowStyle(windowStyle: 'transparent' | 'opaque') {
      dispatch(setWindowStyle(windowStyle))
    },
    setTargetLanguage(targetLanguage: TranslateLanguageVarious) {
      dispatch(setTargetLanguage(targetLanguage))
    },
    setTopicPosition(topicPosition: 'left' | 'right') {
      dispatch(setTopicPosition(topicPosition))
    },
    setShowAssistantIcon(showAssistantIcon: boolean) {
      dispatch(setShowAssistantIcon(showAssistantIcon))
    }
  }
}

export function useMessageStyle() {
  const { messageStyle } = useSettings()
  const isBubbleStyle = messageStyle === 'bubble'

  return {
    isBubbleStyle
  }
}

export const getStoreSetting = (key: keyof SettingsState) => {
  return store.getState().settings[key]
}
