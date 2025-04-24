import { Provider } from '@/types'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import { SettingSubtitle } from '..'

interface Props {
  provider: Provider
}

const GraphRAGSettings: FC<Props> = ({ provider }) => {
  const modalId = provider.models.filter((model) => model.id.includes('global'))[0]?.id
  const { t } = useTranslation()

  if (!modalId) {
    return null
  }

  return (
    <Container>
      <SettingSubtitle>{t('words.knowledgeGraph')}</SettingSubtitle>
    </Container>
  )
}

const Container = styled.div``

export default GraphRAGSettings
