import { TavilyClient } from '@agentic/tavily'
import { WebSearchProvider, WebSearchResponse } from '@/types'

import BaseWebSearchProvider from './BaseWebSearchProvider'

export default class TavilyProvider extends BaseWebSearchProvider {
  private tvly: TavilyClient

  constructor(provider: WebSearchProvider) {
    super(provider)
    if (!this.apiKey) {
      throw new Error('API key is required for Tavily provider')
    }
    this.tvly = new TavilyClient({ apiKey: this.apiKey })
  }

  public async search(query: string, maxResults: number, excludeDomains: string[]): Promise<WebSearchResponse> {
    if (!query.trim()) {
      throw new Error('Search query cannot be empty')
    }
    try {
      const result = await this.tvly.search({
        query,
        max_results: Math.max(1, maxResults),
        exclude_domains: excludeDomains || []
      })

      return {
        query: result.query,
        results: result.results.map((result) => ({
          title: result.title || 'No title',
          content: result.content || '',
          url: result.url || ''
        }))
      }
    } catch (error) {
      console.error('Tavily search failed:', error)
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
