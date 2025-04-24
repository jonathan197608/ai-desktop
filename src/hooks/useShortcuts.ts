import { useAppSelector } from '@/store'
import { orderBy } from 'lodash'
import { useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

interface UseShortcutOptions {
  preventDefault?: boolean
  enableOnFormTags?: boolean
  enabled?: boolean
  description?: string
}

const defaultOptions: UseShortcutOptions = {
  preventDefault: true,
  enableOnFormTags: true,
  enabled: true
}

export const useShortcut = (
  shortcutKey: string,
  callback: (e: KeyboardEvent) => void,
  options: UseShortcutOptions = defaultOptions
) => {
  const shortcuts = useAppSelector((state) => state.shortcuts.shortcuts)

  const formatShortcut = useCallback((shortcut: string[]) => {
    return shortcut
      .map((key) => {
        switch (key.toLowerCase()) {
          case 'command':
            return 'meta'
          default:
            return key.toLowerCase()
        }
      })
      .join('+')
  }, [])

  const shortcutConfig = shortcuts.find((s) => s.key === shortcutKey)

  useHotkeys(
    shortcutConfig?.enabled ? formatShortcut(shortcutConfig.shortcut) : 'none',
    (e) => {
      if (options.preventDefault) {
        e.preventDefault()
      }
      if (options.enabled !== false) {
        callback(e)
      }
    },
    {
      enableOnFormTags: options.enableOnFormTags,
      description: options.description || shortcutConfig?.key,
      enabled: !!shortcutConfig?.enabled
    }
  )
}

export function useShortcuts() {
  const shortcuts = useAppSelector((state) => state.shortcuts.shortcuts)
  return { shortcuts: orderBy(shortcuts, 'system', 'desc') }
}

export function useShortcutDisplay(key: string) {
  const formatShortcut = useCallback((shortcut: string[]) => {
    return shortcut
      .map((key) => {
        switch (key.toLowerCase()) {
          case 'control':
            return window.isMac ? '⌃' : 'Ctrl'
          case 'ctrl':
            return window.isMac ? '⌃' : 'Ctrl'
          case 'command':
            return window.isMac ? '⌘' : window.isWindows ? 'Win' : 'Super'
          case 'alt':
            return window.isMac ? '⌥' : 'Alt'
          case 'shift':
            return window.isMac ? '⇧' : 'Shift'
          case 'commandorcontrol':
            return window.isMac ? '⌘' : 'Ctrl'
          default:
            return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
        }
      })
      .join('+')
  }, [])
  const shortcuts = useAppSelector((state) => state.shortcuts.shortcuts)
  const shortcutConfig = shortcuts.find((s) => s.key === key)
  return shortcutConfig?.enabled ? formatShortcut(shortcutConfig.shortcut) : ''
}
