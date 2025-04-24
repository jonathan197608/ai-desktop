import { useAppSelector } from '@/store'
import { setGPUStackKeepAliveTime } from '@/store/llm'
import { useDispatch } from 'react-redux'

export function useGPUStackSettings() {
  const settings = useAppSelector((state) => state.llm.settings.gpustack)
  const dispatch = useDispatch()

  return { ...settings, setKeepAliveTime: (time: number) => dispatch(setGPUStackKeepAliveTime(time)) }
}
