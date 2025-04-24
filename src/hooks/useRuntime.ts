import i18n from '@/i18n'
import store, { useAppSelector } from '@/store'

export function useRuntime() {
  return useAppSelector((state) => state.runtime)
}

export function modelGenerating() {
  const generating = store.getState().runtime.generating

  if (generating) {
    window.message.warning({ content: i18n.t('message.switch.disabled'), key: 'model-generating' }).then()
    return Promise.reject()
  }

  return Promise.resolve()
}
