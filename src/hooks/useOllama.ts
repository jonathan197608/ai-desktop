import store, { useAppSelector } from '@/store'
import { setOllamaKeepAliveTime } from '@/store/llm'
import { useDispatch } from 'react-redux'

export function useOllamaSettings() {
  const settings = useAppSelector((state) => state.llm.settings.ollama)
  const dispatch = useDispatch()

  return { ...settings, setKeepAliveTime: (time: number) => dispatch(setOllamaKeepAliveTime(time)) }
}

export function getOllamaKeepAliveTime() {
  return store.getState().llm.settings.ollama.keepAliveTime + 'm'
}
