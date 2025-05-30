import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import assistants from './assistants'
import backup from './backup'
import copilot from './copilot'
import llm from './llm'
import mcp from './mcp'
import messagesReducer from './messages'
import migrate from './migrate'
import paintings from './paintings'
import runtime from './runtime'
import settings from './settings'
import shortcuts from './shortcuts'
import websearch from './websearch'

const rootReducer = combineReducers({
  assistants,
  backup,
  paintings,
  llm,
  settings,
  runtime,
  shortcuts,
  websearch,
  mcp,
  copilot,
  messages: messagesReducer
})

const persistedReducer = persistReducer(
  {
    key: 'ai-desktop',
    storage,
    version: 100,
    blacklist: ['runtime', 'messages'],
    migrate
  },
  rootReducer
)

const store = configureStore({
  // @ts-ignore store type is unknown
  reducer: persistedReducer as typeof rootReducer,
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
      }
    })
  },
  devTools: true
})

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch

export const persistor = persistStore(store)
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

window.store = store

export default store
