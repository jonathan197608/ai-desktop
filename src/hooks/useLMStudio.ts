import store, { useAppSelector } from '@/store'
import { setLMStudioKeepAliveTime } from '@/store/llm'
import { useDispatch } from 'react-redux'

export function useLMStudioSettings() {
  const settings = useAppSelector((state) => state.llm.settings.lmstudio)
  const dispatch = useDispatch()

  return { ...settings, setKeepAliveTime: (time: number) => dispatch(setLMStudioKeepAliveTime(time)) }
}

export function getLMStudioKeepAliveTime() {
  return store.getState().llm.settings.lmstudio.keepAliveTime + 'm'
}
