import { useTheme } from '@/context/ThemeProvider'
import { useMermaid } from '@/hooks/useMermaid'
import { useSettings } from '@/hooks/useSettings'
import { type CodeStyleVarious, ThemeMode } from '@/types'
import type React from 'react'
import { createContext, type PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react'
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki'
import { bundledLanguages, bundledThemes, createHighlighter } from 'shiki'

interface SyntaxHighlighterContextType {
  codeToHtml: (code: string, language: string) => Promise<string>
}

const SyntaxHighlighterContext = createContext<SyntaxHighlighterContextType | undefined>(undefined)

export const SyntaxHighlighterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { theme } = useTheme()
  const [highlighter, setHighlighter] = useState<HighlighterGeneric<BundledLanguage, BundledTheme> | null>(null)
  const { codeStyle } = useSettings()
  useMermaid()

  const highlighterTheme = useMemo(() => {
    if (!codeStyle || codeStyle === 'auto') {
      return theme === ThemeMode.light ? 'one-light' : 'material-theme-darker'
    }

    return codeStyle
  }, [theme, codeStyle])

  useEffect(() => {
    const initHighlighter = async () => {
      const commonLanguages = ['javascript', 'typescript', 'python', 'java', 'markdown']

      const hl = await createHighlighter({
        themes: [highlighterTheme],
        langs: commonLanguages
      })

      setHighlighter(hl)

      // Load all themes and languages
      // hl.loadTheme(...(Object.keys(bundledThemes) as BundledTheme[]))
      // hl.loadLanguage(...(Object.keys(bundledLanguages) as BundledLanguage[]))
    }

    initHighlighter().then()
  }, [highlighterTheme])

  const codeToHtml = useCallback(
    async (_code: string, language: string) => {
      {
        if (!highlighter) return ''

        const languageMap: Record<string, string> = {
          vab: 'vb'
        }

        const mappedLanguage = languageMap[language] || language

        const code = _code?.trimEnd() ?? ''
        const escapedCode = code?.replace(/[<>]/g, (char) => ({ '<': '&lt;', '>': '&gt;' })[char]!)

        try {
          if (!highlighter.getLoadedLanguages().includes(mappedLanguage as BundledLanguage)) {
            if (mappedLanguage in bundledLanguages || mappedLanguage === 'text') {
              await highlighter.loadLanguage(mappedLanguage as BundledLanguage)
            } else {
              return `<pre style="padding: 10px"><code>${escapedCode}</code></pre>`
            }
          }

          return highlighter.codeToHtml(code, {
            lang: mappedLanguage,
            theme: highlighterTheme
          })
        } catch (error) {
          console.warn(`Error highlighting code for language '${mappedLanguage}':`, error)
          return `<pre style="padding: 10px"><code>${escapedCode}</code></pre>`
        }
      }
    },
    [highlighter, highlighterTheme]
  )

  return <SyntaxHighlighterContext value={{ codeToHtml }}>{children}</SyntaxHighlighterContext>
}

export const useSyntaxHighlighter = () => {
  const context = use(SyntaxHighlighterContext)
  if (!context) {
    throw new Error('useSyntaxHighlighter must be used within a SyntaxHighlighterProvider')
  }
  return context
}

export const codeThemes = ['auto', ...Object.keys(bundledThemes)] as CodeStyleVarious[]
