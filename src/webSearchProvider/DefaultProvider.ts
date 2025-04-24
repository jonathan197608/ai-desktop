import { WebSearchResponse } from '@/types'

import BaseWebSearchProvider from './BaseWebSearchProvider'

export default class DefaultProvider extends BaseWebSearchProvider {
  search(): Promise<WebSearchResponse> {
    throw new Error('Method not implemented.')
  }
}
