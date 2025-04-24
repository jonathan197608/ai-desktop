import { useAppSelector } from '@/store'

export default function useAvatar() {
  return useAppSelector((state) => state.runtime.avatar)
}
