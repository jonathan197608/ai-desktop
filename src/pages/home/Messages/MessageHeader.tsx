import { APP_NAME, isLocalAi } from '@/config/env'
import { useTheme } from '@/context/ThemeProvider'
import { useMessageStyle, useSettings } from '@/hooks/useSettings'
import { getMessageModelId } from '@/services/MessagesService'
import { getModelName } from '@/services/ModelService'
import { Assistant, Message, Model } from '@/types'
import { removeLeadingEmoji } from '@/utils'
import dayjs from 'dayjs'
import { CSSProperties, FC, memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  message: Message
  assistant: Assistant
  model?: Model
}

const MessageHeader: FC<Props> = memo(({ model, message }) => {
  const { theme } = useTheme()
  const { userName } = useSettings()
  const { t } = useTranslation()
  const { isBubbleStyle } = useMessageStyle()

  const getUserName = useCallback(() => {
    if (isLocalAi && message.role !== 'user') {
      return APP_NAME
    }

    if (message.role === 'assistant') {
      return getModelName(model) || getMessageModelId(message) || ''
    }

    return userName || t('common.you')
  }, [message, model, t, userName])

  const username = useMemo(() => removeLeadingEmoji(getUserName()), [getUserName])

  const avatarStyle: CSSProperties | undefined = isBubbleStyle
    ? {
        flexDirection: 'row-reverse',
        textAlign: 'right'
      }
    : undefined

  return (
    <Container className="message-header">
      <AvatarWrapper style={avatarStyle}>
        <UserWrap>
          <UserName isBubbleStyle={isBubbleStyle} theme={theme}>
            {username}
          </UserName>
          <MessageTime>{dayjs(message.createdAt).format('MM/DD HH:mm')}</MessageTime>
        </UserWrap>
      </AvatarWrapper>
    </Container>
  )
})

MessageHeader.displayName = 'MessageHeader'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: 4px;
`

const AvatarWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
`

const UserWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const UserName = styled.div<{ isBubbleStyle?: boolean; theme?: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.isBubbleStyle && props.theme === 'dark' ? 'white' : 'var(--color-text)')};
`

const MessageTime = styled.div`
  font-size: 10px;
  color: var(--color-text-3);
  font-family: 'Ubuntu';
`

export default MessageHeader
