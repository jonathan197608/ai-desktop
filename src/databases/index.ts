import { FileType, Topic, TranslateHistory } from '@/types'
import { Dexie, type EntityTable } from 'dexie'

export const db = new Dexie('AIDesktop') as Dexie & {
  files: EntityTable<FileType, 'id'>
  topics: EntityTable<Pick<Topic, 'id' | 'messages'>, 'id'>
  settings: EntityTable<{ id: string; value: any }, 'id'>
  translate_history: EntityTable<TranslateHistory, 'id'>
}

db.version(10)
  .stores({
    files: 'id, name, origin_name, path, size, ext, type, created_at, count',
    topics: '&id, messages',
    settings: '&id, value',
    translate_history: '&id, sourceText, targetText, sourceLanguage, targetLanguage, createdAt'
  })

export default db
