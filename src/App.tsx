import '@/databases'
import React from "react";
import store, {persistor} from '@/store'
import {Provider} from 'react-redux'
import {HashRouter, Route, Routes} from 'react-router-dom'
import {PersistGate} from 'redux-persist/integration/react'

import Sidebar from './components/app/Sidebar'
import TopViewContainer from './components/TopView'
import AntdProvider from './context/AntdProvider'
import StyleSheetManager from './context/StyleSheetManager'
import {SyntaxHighlighterProvider} from './context/SyntaxHighlighterProvider'
import {ThemeProvider} from './context/ThemeProvider'
import NavigationHandler from './handler/NavigationHandler'
import FilesPage from './pages/files/FilesPage'
import HomePage from './pages/home/HomePage'
import PaintingsPage from './pages/paintings/PaintingsPage'
import SettingsPage from './pages/settings/SettingsPage'
import TranslatePage from './pages/translate/TranslatePage'

function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <StyleSheetManager>
        <ThemeProvider>
          <AntdProvider>
            <SyntaxHighlighterProvider>
              <PersistGate loading={null} persistor={persistor}>
                <TopViewContainer>
                  <HashRouter future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}>
                    <NavigationHandler/>
                    <Sidebar/>
                    <Routes>
                      <Route path="/" element={<HomePage/>}/>
                      <Route path="/paintings" element={<PaintingsPage/>}/>
                      <Route path="/translate" element={<TranslatePage/>}/>
                      <Route path="/files" element={<FilesPage/>}/>
                      <Route path="/settings/*" element={<SettingsPage/>}/>
                    </Routes>
                  </HashRouter>
                </TopViewContainer>
              </PersistGate>
            </SyntaxHighlighterProvider>
          </AntdProvider>
        </ThemeProvider>
      </StyleSheetManager>
    </Provider>
  )
}

export default App
