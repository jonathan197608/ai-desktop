import { BarsOutlined, SettingOutlined } from '@ant-design/icons'
import { useSettings } from '@/hooks/useSettings'
import { useShowTopics } from '@/hooks/useStore'
import { EVENT_NAMES, EventEmitter } from '@/services/EventService'
import { Assistant, Topic } from '@/types'
import { Segmented as AntSegmented, SegmentedProps } from 'antd'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import Settings from './SettingsTab'
import Topics from './TopicsTab'

interface Props {
  activeAssistant: Assistant
  activeTopic: Topic
  setActiveAssistant: (assistant: Assistant) => void
  setActiveTopic: (topic: Topic) => void
  position: 'left' | 'right'
}

type Tab = 'topic' | 'settings'

const HomeTabs: FC<Props> = ({ activeAssistant, activeTopic, setActiveTopic, position }) => {
  const [tab, setTab] = useState<Tab>('topic')
  const { topicPosition } = useSettings()
  const { toggleShowTopics } = useShowTopics()

  const { t } = useTranslation()

  const borderStyle = '1px solid var(--color-border)'
  const border =
    position === 'left' ? { borderRight: borderStyle } : { borderLeft: borderStyle, borderTopLeftRadius: 0 }

  const showTab = !(position === 'left' && topicPosition === 'right')

  useEffect(() => {
    const unsubscribes = [
      EventEmitter.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, (): any => {
        showTab && setTab('topic')
      }),
      EventEmitter.on(EVENT_NAMES.SHOW_CHAT_SETTINGS, (): any => {
        showTab && setTab('settings')
      }),
      EventEmitter.on(EVENT_NAMES.SWITCH_TOPIC_SIDEBAR, () => {
        showTab && setTab('topic')
        if (position === 'left' && topicPosition === 'right') {
          toggleShowTopics()
        }
      })
    ]
    return () => unsubscribes.forEach((unsub) => unsub())
  }, [position, showTab, tab, toggleShowTopics, topicPosition])

  useEffect(() => {
    if (position === 'right' && topicPosition === 'right') {
      setTab('topic')
    }
  }, [position, tab, topicPosition])

  return (
    <Container style={border} className="home-tabs">
      {showTab && (
        <Segmented
          value={tab}
          style={{ borderRadius: '20px', padding: '10px', margin: '0 10px', gap: 2 }}
          options={
            [
              {
                label: t('common.topics'),
                value: 'topic',
                icon: <BarsOutlined />
              },
              {
                label: t('settings.title'),
                value: 'settings',
                icon: <SettingOutlined />
              }
            ].filter(Boolean) as SegmentedProps['options']
          }
          onChange={(value) => setTab(value as 'topic' | 'settings')}
          block
        />
      )}
      <TabContent className="home-tabs-content">
        {tab === 'topic' && (
          <Topics assistant={activeAssistant} activeTopic={activeTopic} setActiveTopic={setActiveTopic} />
        )}
        {tab === 'settings' && <Settings assistant={activeAssistant} />}
      </TabContent>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: var(--assistants-width);
  min-width: var(--assistants-width);
  height: calc(100vh - var(--navbar-height));
  background-color: var(--color-background);
  overflow: hidden;
`

const TabContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
`

const Segmented = styled(AntSegmented)`
  .ant-segmented-item-icon + * {
    margin-left: 4px;
  }
  /* These styles ensure the same appearance as before */
  border-radius: 0;
  box-shadow: none;
`

export default HomeTabs
