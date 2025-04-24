import { ArrowRightOutlined, MessageOutlined } from '@ant-design/icons'
import { HStack } from '@/components/Layout'
import SearchPopup from '@/components/Popups/SearchPopup'
import useScrollPosition from '@/hooks/useScrollPosition'
import { useSettings } from '@/hooks/useSettings'
import { getAssistantById } from '@/services/AssistantService'
import { EVENT_NAMES, EventEmitter } from '@/services/EventService'
import { isGenerating, locateToMessage } from '@/services/MessagesService'
import NavigationService from '@/services/NavigationService'
import { Topic } from '@/types'
import { Button, Divider, Empty } from 'antd'
import { t } from 'i18next'
import React, { FC } from 'react'
import styled from 'styled-components'

import { default as MessageItem } from '../../home/Messages/Message'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  topic?: Topic
}

const TopicMessages: FC<Props> = ({ topic, ...props }) => {
  const navigate = NavigationService.navigate!
  const { handleScroll, containerRef } = useScrollPosition('TopicMessages')
  const { messageStyle } = useSettings()

  const isEmpty = (topic?.messages || []).length === 0

  if (!topic) {
    return null
  }

  const onContinueChat = async (topic: Topic) => {
    await isGenerating()
    SearchPopup.hide()
    const assistant = getAssistantById(topic.assistantId)
    navigate('/', { state: { assistant, topic } })
    setTimeout(() => EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR), 100)
  }

  return (
    <MessagesContainer {...props} ref={containerRef} onScroll={handleScroll} className={messageStyle}>
      <ContainerWrapper style={{ paddingTop: 30, paddingBottom: 30 }}>
        {topic?.messages.map((message) => (
          <div key={message.id} style={{ position: 'relative' }}>
            <MessageItem message={message} topic={topic} />
            <Button
              type="text"
              size="middle"
              style={{ color: 'var(--color-text-3)', position: 'absolute', right: 0, top: 5 }}
              onClick={() => locateToMessage(navigate, message)}
              icon={<ArrowRightOutlined />}
            />
            <Divider style={{ margin: '8px auto 15px' }} variant="dashed" />
          </div>
        ))}
        {isEmpty && <Empty />}
        {!isEmpty && (
          <HStack justifyContent="center">
            <Button onClick={() => onContinueChat(topic)} icon={<MessageOutlined />}>
              {t('history.continue_chat')}
            </Button>
          </HStack>
        )}
      </ContainerWrapper>
    </MessagesContainer>
  )
}

const MessagesContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: scroll;
`

const ContainerWrapper = styled.div`
  width: 800px;
  display: flex;
  flex-direction: column;
  .message {
    padding: 0;
  }
`

export default TopicMessages
