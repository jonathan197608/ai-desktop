import { Provider } from '@/types'

import AnthropicProvider from './AnthropicProvider'
import BaseProvider from './BaseProvider'
import OpenAIProvider from './OpenAIProvider'

export default class ProviderFactory {
  static create(provider: Provider): BaseProvider {
    switch (provider.type) {
      case 'anthropic':
        return new AnthropicProvider(provider)
      default:
        return new OpenAIProvider(provider)
    }
  }
}

export function isOpenAIProvider(provider: Provider) {
  return !['anthropic'].includes(provider.type)
}
