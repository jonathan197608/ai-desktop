import { ExaClient } from '@agentic/exa'
import { WebSearchProvider, WebSearchResponse } from '@/types'

import BaseWebSearchProvider from './BaseWebSearchProvider'

export default class ExaProvider extends BaseWebSearchProvider {
  private exa: ExaClient

  constructor(provider: WebSearchProvider) {
    super(provider)
    if (!this.apiKey) {
      throw new Error('API key is required for Exa provider')
    }
    this.exa = new ExaClient({ apiKey: this.apiKey })
  }

  public async search(query: string, maxResults: number): Promise<WebSearchResponse> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty')
    }
    try {
      const response = await this.exa.search({
        query,
        numResults: Math.max(1, maxResults),
        contents: {
          text: true
        }
      })

      return {
        query: response.autopromptString,
        results: response.results.map((result) => ({
          title: result.title || 'No title',
          content: result.text || '',
          url: result.url || ''
        }))
      }
    } catch (error) {
      console.error('Exa search failed:', error)
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
