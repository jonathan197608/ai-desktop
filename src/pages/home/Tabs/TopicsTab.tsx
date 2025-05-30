import {
  ClearOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  PushpinOutlined,
  QuestionCircleOutlined,
  UploadOutlined
} from '@ant-design/icons'
import DragableList from '@/components/DragableList'
import CopyIcon from '@/components/Icons/CopyIcon'
import PromptPopup from '@/components/Popups/PromptPopup'
import Scrollbar from '@/components/Scrollbar'
import { useAssistant, useAssistants } from '@/hooks/useAssistant'
import { modelGenerating } from '@/hooks/useRuntime'
import { useSettings } from '@/hooks/useSettings'
import { TopicManager } from '@/hooks/useTopic'
import { fetchMessagesSummary } from '@/services/ApiService'
import { EVENT_NAMES, EventEmitter } from '@/services/EventService'
import store from '@/store'
import { setGenerating } from '@/store/runtime'
import { Assistant, Topic } from '@/types'
import { copyTopicAsMarkdown } from '@/utils/copy'
import {
  exportMarkdownToJoplin,
  exportMarkdownToSiyuan,
  exportMarkdownToYuque,
  exportTopicAsMarkdown,
  exportTopicToNotion,
  topicToMarkdown
} from '@/utils/export'
import { hasTopicPendingRequests } from '@/utils/queue'
import { Dropdown, MenuProps, Tooltip } from 'antd'
import dayjs from 'dayjs'
import { findIndex } from 'lodash'
import React, {FC, useCallback, useMemo, useRef, useState} from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  activeTopic: Topic
  setActiveTopic: (topic: Topic) => void
}

const Topics: FC<Props> = ({ assistant: _assistant, activeTopic, setActiveTopic }) => {
  const { assistants } = useAssistants()
  const { assistant, removeTopic, moveTopic, updateTopic, updateTopics } = useAssistant(_assistant.id)
  const { t } = useTranslation()
  const { showTopicTime, topicPosition } = useSettings()

  const borderRadius = showTopicTime ? 12 : 'var(--list-item-border-radius)'

  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null)
  const deleteTimerRef = useRef<NodeJS.Timeout>(null)

  const pendingTopics = useMemo(() => {
    return new Set<string>()
  }, [])
  const isPending = useCallback(
    (topicId: string) => {
      const hasPending = hasTopicPendingRequests(topicId)
      if (topicId === activeTopic.id && !hasPending) {
        pendingTopics.delete(topicId)
        return false
      }
      if (pendingTopics.has(topicId)) {
        return true
      }
      if (hasPending) {
        pendingTopics.add(topicId)
        return true
      }
      return false
    },
    [activeTopic.id, pendingTopics]
  )

  const handleDeleteClick = useCallback((topicId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current)
    }

    setDeletingTopicId(topicId)

    deleteTimerRef.current = setTimeout(() => setDeletingTopicId(null), 2000)
  }, [])

  const onClearMessages = useCallback((topic: Topic) => {
    // window.keyv.set(EVENT_NAMES.CHAT_COMPLETION_PAUSED, true)
    store.dispatch(setGenerating(false))
    EventEmitter.emit(EVENT_NAMES.CLEAR_MESSAGES, topic).then()
  }, [])

  const handleConfirmDelete = useCallback(
    async (topic: Topic, e: React.MouseEvent) => {
      e.stopPropagation()
      if (assistant.topics.length === 1) {
        return onClearMessages(topic)
      }
      await modelGenerating()
      const index = findIndex(assistant.topics, (t) => t.id === topic.id)
      setActiveTopic(assistant.topics[index + 1 === assistant.topics.length ? index - 1 : index + 1])
      removeTopic(topic)
      setDeletingTopicId(null)
    },
    [assistant.topics, onClearMessages, removeTopic, setActiveTopic]
  )

  const onPinTopic = useCallback(
    (topic: Topic) => {
      const updatedTopic = { ...topic, pinned: !topic.pinned }
      updateTopic(updatedTopic)
    },
    [updateTopic]
  )

  const onDeleteTopic = useCallback(
    async (topic: Topic) => {
      await modelGenerating()
      if (topic.id === activeTopic?.id) {
        const index = findIndex(assistant.topics, (t) => t.id === topic.id)
        setActiveTopic(assistant.topics[index + 1 === assistant.topics.length ? index - 1 : index + 1])
      }
      removeTopic(topic)
    },
    [assistant.topics, removeTopic, setActiveTopic, activeTopic]
  )

  const onMoveTopic = useCallback(
    async (topic: Topic, toAssistant: Assistant) => {
      await modelGenerating()
      const index = findIndex(assistant.topics, (t) => t.id === topic.id)
      setActiveTopic(assistant.topics[index + 1 === assistant.topics.length ? 0 : index + 1])
      moveTopic(topic, toAssistant)
    },
    [assistant.topics, moveTopic, setActiveTopic]
  )

  const onSwitchTopic = useCallback(
    async (topic: Topic) => {
      // await modelGenerating()
      setActiveTopic(topic)
    },
    [setActiveTopic]
  )

  const getTopicMenuItems = useCallback(
    (topic: Topic) => {
      const menus: MenuProps['items'] = [
        {
          label: t('chat.topics.auto_rename'),
          key: 'auto-rename',
          icon: <i className="iconfont icon-business-smart-assistant" style={{ fontSize: '14px' }} />,
          async onClick() {
            const messages = await TopicManager.getTopicMessages(topic.id)
            if (messages.length >= 2) {
              const summaryText = await fetchMessagesSummary({ messages, assistant })
              if (summaryText) {
                updateTopic({ ...topic, name: summaryText, isNameManuallyEdited: false })
              }
            }
          }
        },
        {
          label: t('chat.topics.edit.title'),
          key: 'rename',
          icon: <EditOutlined />,
          async onClick() {
            const name = await PromptPopup.show({
              title: t('chat.topics.edit.title'),
              message: '',
              defaultValue: topic?.name || ''
            })
            if (name && topic?.name !== name) {
              updateTopic({ ...topic, name, isNameManuallyEdited: true })
            }
          }
        },
        {
          label: t('chat.topics.prompt'),
          key: 'topic-prompt',
          icon: <i className="iconfont icon-ai-model1" style={{ fontSize: '14px' }} />,
          extra: (
            <Tooltip title={t('chat.topics.prompt.tips')}>
              <QuestionIcon />
            </Tooltip>
          ),
          async onClick() {
            const prompt = await PromptPopup.show({
              title: t('chat.topics.prompt.edit.title'),
              message: '',
              defaultValue: topic?.prompt || '',
              inputProps: {
                rows: 8,
                allowClear: true
              }
            })
            prompt !== null && updateTopic({ ...topic, prompt: prompt.trim() })
          }
        },
        {
          label: topic.pinned ? t('chat.topics.unpinned') : t('chat.topics.pinned'),
          key: 'pin',
          icon: <PushpinOutlined />,
          onClick() {
            onPinTopic(topic)
          }
        },
        {
          label: t('chat.topics.clear.title'),
          key: 'clear-messages',
          icon: <ClearOutlined />,
          async onClick() {
            window.modal.confirm({
              title: t('chat.input.clear.content'),
              centered: true,
              onOk: () => onClearMessages(topic)
            })
          }
        },
        {
          label: t('chat.topics.copy.title'),
          key: 'copy',
          icon: <CopyIcon />,
          children: [
            {
              label: t('chat.topics.copy.image'),
              key: 'img',
              onClick: () => EventEmitter.emit(EVENT_NAMES.COPY_TOPIC_IMAGE, topic)
            },
            {
              label: t('chat.topics.copy.md'),
              key: 'md',
              onClick: () => copyTopicAsMarkdown(topic)
            }
          ]
        },
        {
          label: t('chat.topics.export.title'),
          key: 'export',
          icon: <UploadOutlined />,
          children: [
            {
              label: t('chat.topics.export.image'),
              key: 'image',
              onClick: () => EventEmitter.emit(EVENT_NAMES.EXPORT_TOPIC_IMAGE, topic)
            },
            {
              label: t('chat.topics.export.md'),
              key: 'markdown',
              onClick: () => exportTopicAsMarkdown(topic)
            },
            {
              label: t('chat.topics.export.notion'),
              key: 'notion',
              onClick: async () => {
                await exportTopicToNotion(topic)
              }
            },
            {
              label: t('chat.topics.export.yuque'),
              key: 'yuque',
              onClick: async () => {
                const markdown = await topicToMarkdown(topic)
                await exportMarkdownToYuque(topic.name, markdown)
              }
            },
            {
              label: t('chat.topics.export.joplin'),
              key: 'joplin',
              onClick: async () => {
                const markdown = await topicToMarkdown(topic)
                await exportMarkdownToJoplin(topic.name, markdown)
              }
            },
            {
              label: t('chat.topics.export.siyuan'),
              key: 'siyuan',
              onClick: async () => {
                const markdown = await topicToMarkdown(topic)
                await exportMarkdownToSiyuan(topic.name, markdown)
              }
            }
          ]
        }
      ]

      if (assistants.length > 1 && assistant.topics.length > 1) {
        menus.push({
          label: t('chat.topics.move_to'),
          key: 'move',
          icon: <FolderOutlined />,
          children: assistants
            .filter((a) => a.id !== assistant.id)
            .map((a) => ({
              label: a.name,
              key: a.id,
              onClick: () => onMoveTopic(topic, a)
            }))
        })
      }

      if (assistant.topics.length > 1 && !topic.pinned) {
        menus.push({ type: 'divider' })
        menus.push({
          label: t('common.delete'),
          danger: true,
          key: 'delete',
          icon: <DeleteOutlined />,
          onClick: () => onDeleteTopic(topic)
        })
      }

      return menus
    },
    [assistant, assistants, onClearMessages, onDeleteTopic, onPinTopic, onMoveTopic, t, updateTopic]
  )

  return (
    <Container right={topicPosition === 'right'} className="topics-tab">
      <DragableList list={assistant.topics} onUpdate={updateTopics}>
        {(topic) => {
          const isActive = topic.id === activeTopic?.id
          const topicName = topic.name.replace('`', '')
          const topicPrompt = topic.prompt
          const fullTopicPrompt = t('common.prompt') + ': ' + topicPrompt
          return (
            <Dropdown menu={{items: getTopicMenuItems(topic)}} trigger={['contextMenu']} key={topic.id}>
              <TopicListItem
                className={isActive ? 'active' : ''}
                onClick={() => onSwitchTopic(topic)}
                style={{borderRadius}}>
                {isPending(topic.id) && !isActive && <PendingIndicator/>}
                <TopicName className="name" title={topicName}>
                  {topicName}
                </TopicName>
                {topicPrompt && (
                  <TopicPromptText className="prompt" title={fullTopicPrompt}>
                    {fullTopicPrompt}
                  </TopicPromptText>
                )}
                {showTopicTime && (
                  <TopicTime className="time">{dayjs(topic.createdAt).format('MM/DD HH:mm')}</TopicTime>
                )}
                <MenuButton className="pin">{topic.pinned && <PushpinOutlined/>}</MenuButton>
                {isActive && !topic.pinned && (
                  <Tooltip
                    placement="bottom"
                    mouseEnterDelay={0.7}
                    title={
                      <div>
                        <div style={{fontSize: '12px', opacity: 0.8, fontStyle: 'italic'}}>
                          {t('chat.topics.delete.shortcut', {key: window.isMac ? '⌘' : 'Ctrl'})}
                        </div>
                      </div>
                    }>
                    <MenuButton
                      className="menu"
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          handleConfirmDelete(topic, e).then()
                        } else if (deletingTopicId === topic.id) {
                          handleConfirmDelete(topic, e).then()
                        } else {
                          handleDeleteClick(topic.id, e)
                        }
                      }}>
                      {deletingTopicId === topic.id ? (
                        <DeleteOutlined style={{color: 'var(--color-error)'}}/>
                      ) : (
                        <CloseOutlined/>
                      )}
                    </MenuButton>
                  </Tooltip>
                )}
              </TopicListItem>
            </Dropdown>
          )
        }}
      </DragableList>
      <div style={{ minHeight: '10px' }}></div>
    </Container>
  )
}

const Container = styled(Scrollbar)`
  display: flex;
  flex-direction: column;
  padding: 10px;
`

const TopicListItem = styled.div`
    padding: 7px 12px;
    border-radius: var(--list-item-border-radius);
    font-family: Ubuntu, serif;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    cursor: pointer;
    border: 1px solid transparent;
    width: calc(var(--assistants-width) - 20px);

    .menu {
        opacity: 0;
        color: var(--color-text-3);
    }

    &:hover {
        background-color: var(--color-background-soft);

        .name {
        }
    }

    &.active {
        background-color: var(--color-background-soft);
        border: 1px solid var(--color-border);

        .name {
        }

        .menu {
            opacity: 1;
            background-color: var(--color-background-soft);

            &:hover {
                color: var(--color-text-2);
            }
        }
    }
`

const TopicName = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 13px;
`

const PendingIndicator = styled.div.attrs({
  className: 'animation-pulse'
})`
  --pulse-size: 5px;
  width: 5px;
  height: 5px;
  position: absolute;
  left: 3px;
  top: 15px;
  border-radius: 50%;
  background-color: var(--color-primary);
`

const TopicPromptText = styled.div`
  color: var(--color-text-2);
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  ~ .prompt-text {
    margin-top: 10px;
  }
`

const TopicTime = styled.div`
  color: var(--color-text-3);
  font-size: 11px;
`

const MenuButton = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  min-width: 22px;
  min-height: 22px;
  position: absolute;
  right: 8px;
  top: 6px;
`
const QuestionIcon = styled(QuestionCircleOutlined)`
  font-size: 14px;
  cursor: pointer;
  color: var(--color-text-3);
`

export default Topics
