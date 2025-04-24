import i18n from '@/i18n'
import store from '@/store'

export function getProviderName(id: string) {
  const provider = store.getState().llm.providers.find((p) => p.id === id)
  if (!provider) {
    return ''
  }

  if (provider.isSystem) {
    return i18n.t(`provider.${provider.id}`, { defaultValue: provider.name })
  }

  return provider?.name
}
