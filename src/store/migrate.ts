import { createMigrate } from 'redux-persist'

import { RootState } from '.'

const migrateConfig = {
  '100': (state: RootState) => {
    try {
      return state
    } catch (error) {
      return state
    }
  }
}

const migrate = createMigrate(migrateConfig as any)

export default migrate
