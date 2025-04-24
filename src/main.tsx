import './assets/styles/index.scss'
import '@ant-design/v5-patch-for-react-19'
import {invoke} from '@tauri-apps/api/core'
import {createRoot} from 'react-dom/client'

import App from './App'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<App/>)

document.addEventListener("DOMContentLoaded", async () => {
  setTimeout(async () => {
    await invoke('set_complete', {task: 'frontend'})
  }, 1000)
});
