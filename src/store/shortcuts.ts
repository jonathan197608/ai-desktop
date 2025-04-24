import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Shortcut } from '@/types'
import { ZOOM_SHORTCUTS } from '@/shared/config/constant'

export interface ShortcutsState {
  shortcuts: Shortcut[]
}

const initialState: ShortcutsState = {
  shortcuts: [
    ...ZOOM_SHORTCUTS,
    {
      key: 'show_settings',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', ','],
      editable: false,
      enabled: true,
      system: true
    },
    {
      key: 'show_app',
      shortcut: [],
      editable: true,
      enabled: true,
      system: true
    },
    {
      key: 'mini_window',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', 'E'],
      editable: true,
      enabled: false,
      system: true
    },
    {
      key: 'new_topic',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', 'N'],
      editable: true,
      enabled: true,
      system: false
    },
    {
      key: 'toggle_show_assistants',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', '['],
      editable: true,
      enabled: true,
      system: false
    },
    {
      key: 'toggle_show_topics',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', ']'],
      editable: true,
      enabled: true,
      system: false
    },
    {
      key: 'copy_last_message',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', 'Shift', 'C'],
      editable: true,
      enabled: false,
      system: false
    },
    {
      key: 'search_message',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', 'F'],
      editable: true,
      enabled: true,
      system: false
    },
    {
      key: 'clear_topic',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', 'L'],
      editable: true,
      enabled: true,
      system: false
    },
    {
      key: 'toggle_new_context',
      shortcut: [window.isMac ? 'Command' : 'Ctrl', 'K'],
      editable: true,
      enabled: true,
      system: false
    }
  ]
}

const getSerializableShortcuts = (shortcuts: Shortcut[]) => {
  return shortcuts.map((shortcut) => ({
    key: shortcut.key,
    shortcut: [...shortcut.shortcut],
    enabled: shortcut.enabled,
    system: shortcut.system
  }))
}

const shortcutsSlice = createSlice({
  name: 'shortcuts',
  initialState,
  reducers: {
    updateShortcut: (state, action: PayloadAction<Shortcut>) => {
      state.shortcuts = state.shortcuts.map((s) => (s.key === action.payload.key ? action.payload : s))
      window.api.shortcuts.update(getSerializableShortcuts(state.shortcuts)).then()
    },
    toggleShortcut: (state, action: PayloadAction<string>) => {
      state.shortcuts = state.shortcuts.map((s) => (s.key === action.payload ? { ...s, enabled: !s.enabled } : s))
      window.api.shortcuts.update(getSerializableShortcuts(state.shortcuts)).then()
    },
    resetShortcuts: (state) => {
      state.shortcuts = initialState.shortcuts
      window.api.shortcuts.update(getSerializableShortcuts(state.shortcuts)).then()
    }
  }
})

export const { updateShortcut, toggleShortcut, resetShortcuts } = shortcutsSlice.actions
export default shortcutsSlice.reducer
export { initialState }
