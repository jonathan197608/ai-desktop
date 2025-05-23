import {
  ClearOutlined,
  ColumnHeightOutlined,
  FormOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  GlobalOutlined,
  HolderOutlined,
  PauseCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons'
import TranslateButton from '@/components/TranslateButton'
import {isFunctionCallingModel, isGenerateImageModel, isVisionModel, isWebSearchModel} from '@/config/models'
import db from '@/databases'
import {useAssistant} from '@/hooks/useAssistant'
import {useMessageOperations, useTopicLoading} from '@/hooks/useMessageOperations'
import {modelGenerating, useRuntime} from '@/hooks/useRuntime'
import {useMessageStyle, useSettings} from '@/hooks/useSettings'
import {useShortcut, useShortcutDisplay} from '@/hooks/useShortcuts'
import {addAssistantMessagesToTopic, getDefaultTopic} from '@/services/AssistantService'
import {EVENT_NAMES, EventEmitter} from '@/services/EventService'
import FileManager from '@/services/FileManager'
import {checkRateLimit, getUserMessage} from '@/services/MessagesService'
import {estimateMessageUsage, estimateTextTokens as estimateTxtTokens} from '@/services/TokenService'
import {translateText} from '@/services/TranslateService'
import WebSearchService from '@/services/WebSearchService'
import {useAppDispatch} from '@/store'
import {sendMessage as _sendMessage} from '@/store/messages'
import {setSearching} from '@/store/runtime'
import {Assistant, FileType, MCPServer, Message, Model, Topic} from '@/types'
import {classNames, delay, getFileExtension} from '@/utils'
import {getFilesFromDropEvent} from '@/utils/input'
import {getTempPath} from '@/types/file'
import { writeFile } from '@tauri-apps/plugin-fs';
import {documentExts, imageExts, textExts} from '@/shared/config/constant'
import {Button, Popconfirm, Tooltip} from 'antd'
import TextArea, {TextAreaRef} from 'antd/es/input/TextArea'
import {info, error} from '@tauri-apps/plugin-log'

const Logger = {info, error}
import {debounce, isEmpty} from 'lodash'
import React, {CSSProperties, FC, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'
import styled from 'styled-components'

import NarrowLayout from '../Messages/NarrowLayout'
import AttachmentButton from './AttachmentButton'
import AttachmentPreview from './AttachmentPreview'
import GenerateImageButton from './GenerateImageButton'
import MCPToolsButton from './MCPToolsButton'
import MentionModelsButton from './MentionModelsButton'
import MentionModelsInput from './MentionModelsInput'
import NewContextButton from './NewContextButton'
import SendMessageButton from './SendMessageButton'
import TokenCount from './TokenCount'

interface Props {
  assistant: Assistant
  setActiveTopic: (topic: Topic) => void
  topic: Topic
}

let _text = ''
let _files: FileType[] = []

const Inputbar: FC<Props> = ({assistant: _assistant, setActiveTopic, topic}) => {
  const [text, setText] = useState(_text)
  const [inputFocus, setInputFocus] = useState(false)
  const {assistant, addTopic, model, setModel, updateAssistant} = useAssistant(_assistant.id)
  const {
    targetLanguage,
    sendMessageShortcut,
    fontSize,
    pasteLongTextAsFile,
    pasteLongTextThreshold,
    showInputEstimatedTokens,
    autoTranslateWithSpace
  } = useSettings()
  const [expended, setExpend] = useState(false)
  const [estimateTokenCount, setEstimateTokenCount] = useState(0)
  const [contextCount, setContextCount] = useState({current: 0, max: 0})
  const textareaRef = useRef<TextAreaRef>(null)
  const [files, setFiles] = useState<FileType[]>(_files)
  const {t} = useTranslation()
  const containerRef = useRef(null)
  const {searching} = useRuntime()
  const {isBubbleStyle} = useMessageStyle()
  const {pauseMessages} = useMessageOperations(topic)
  const loading = useTopicLoading(topic)
  const dispatch = useAppDispatch()
  const [spaceClickCount, setSpaceClickCount] = useState(0)
  const spaceClickTimer = useRef<NodeJS.Timeout>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [mentionModels, setMentionModels] = useState<Model[]>([])
  const [enabledMCPs, setEnabledMCPs] = useState<MCPServer[]>([])
  const [isMentionPopupOpen, setIsMentionPopupOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [textareaHeight, setTextareaHeight] = useState<number>()
  const startDragY = useRef<number>(0)
  const startHeight = useRef<number>(0)
  const currentMessageId = useRef<string>('')
  const isVision = useMemo(() => isVisionModel(model), [model])
  const supportExts = useMemo(() => [...textExts, ...documentExts, ...(isVision ? imageExts : [])], [isVision])
  const navigate = useNavigate()

  const showMCPToolsIcon = isFunctionCallingModel(model)

  const [tokenCount, setTokenCount] = useState(0)

  const [mentionFromKeyboard, setMentionFromKeyboard] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedEstimate = useCallback(
    debounce((newText) => {
      if (showInputEstimatedTokens) {
        const count = estimateTxtTokens(newText) || 0
        setTokenCount(count)
      }
    }, 500),
    [showInputEstimatedTokens]
  )

  useEffect(() => {
    debouncedEstimate(text)
  }, [text, debouncedEstimate])

  const inputTokenCount = showInputEstimatedTokens ? tokenCount : 0

  const newTopicShortcut = useShortcutDisplay('new_topic')
  const cleanTopicShortcut = useShortcutDisplay('clear_topic')
  const inputEmpty = isEmpty(text.trim()) && files.length === 0

  _text = text
  _files = files

  const resizeTextArea = useCallback(() => {
    const textArea = textareaRef.current?.resizableTextArea?.textArea
    if (textArea) {
      // 如果已经手动设置了高度,则不自动调整
      if (textareaHeight) {
        return
      }
      textArea.style.height = 'auto'
      textArea.style.height = textArea?.scrollHeight > 400 ? '400px' : `${textArea?.scrollHeight}px`
    }
  }, [textareaHeight])

  const sendMessage = useCallback(async () => {
    if (inputEmpty || loading) {
      return
    }
    if (checkRateLimit(assistant)) {
      return
    }

    await EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE)

    try {
      // Dispatch the sendMessage action with all options
      const uploadedFiles = await FileManager.uploadFiles(files)
      const userMessage = getUserMessage({assistant, topic, type: 'text', content: text})

      if (uploadedFiles) {
        userMessage.files = uploadedFiles
      }

      if (mentionModels) {
        userMessage.mentions = mentionModels
      }

      if (enabledMCPs) {
        userMessage.enabledMCPs = enabledMCPs
      }

      userMessage.usage = await estimateMessageUsage(userMessage)
      currentMessageId.current = userMessage.id

      dispatch(
        _sendMessage(userMessage, assistant, topic, {
          mentions: mentionModels
        })
      )

      // Clear input
      setText('')
      setFiles([])
      setTimeout(() => setText(''), 500)
      setTimeout(() => resizeTextArea(), 0)
      setExpend(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [
    assistant,
    dispatch,
    enabledMCPs,
    files,
    inputEmpty,
    loading,
    mentionModels,
    resizeTextArea,
    text,
    topic
  ])

  const translate = async () => {
    if (isTranslating) {
      return
    }

    try {
      setIsTranslating(true)
      const translatedText = await translateText(text, targetLanguage)
      translatedText && setText(translatedText)
      setTimeout(() => resizeTextArea(), 0)
    } catch (error) {
      console.error('Translation failed:', error)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isEnterPressed = event.key === 'Enter'

    if (event.key === '@') {
      const textArea = textareaRef.current?.resizableTextArea?.textArea
      if (textArea) {
        const cursorPosition = textArea.selectionStart
        const textBeforeCursor = text.substring(0, cursorPosition)
        if (cursorPosition === 0 || textBeforeCursor.endsWith(' ')) {
          setMentionFromKeyboard(true)
          EventEmitter.emit(EVENT_NAMES.SHOW_MODEL_SELECTOR).then()
          setIsMentionPopupOpen(true)
          return
        }
      }
    }

    if (event.key === 'Escape' && isMentionPopupOpen) {
      setIsMentionPopupOpen(false)
      return
    }

    if (autoTranslateWithSpace) {
      if (event.key === ' ') {
        setSpaceClickCount((prev) => prev + 1)

        if (spaceClickTimer.current) {
          clearTimeout(spaceClickTimer.current)
        }

        spaceClickTimer.current = setTimeout(() => {
          setSpaceClickCount(0)
        }, 200)

        if (spaceClickCount === 2) {
          console.log('Triple space detected - trigger translation')
          setSpaceClickCount(0)
          setIsTranslating(true)
          translate().then()
          return
        }
      }
    }

    if (expended) {
      if (event.key === 'Escape') {
        return onToggleExpended()
      }
    }

    if (isEnterPressed && !event.shiftKey && sendMessageShortcut === 'Enter') {
      if (isMentionPopupOpen) {
        return event.preventDefault()
      }
      sendMessage().then()
      return event.preventDefault()
    }

    if (sendMessageShortcut === 'Shift+Enter' && isEnterPressed && event.shiftKey) {
      if (isMentionPopupOpen) {
        return event.preventDefault()
      }
      sendMessage().then()
      return event.preventDefault()
    }

    if (sendMessageShortcut === 'Ctrl+Enter' && isEnterPressed && event.ctrlKey) {
      if (isMentionPopupOpen) {
        return event.preventDefault()
      }
      sendMessage().then()
      return event.preventDefault()
    }

    if (sendMessageShortcut === 'Command+Enter' && isEnterPressed && event.metaKey) {
      if (isMentionPopupOpen) {
        return event.preventDefault()
      }
      sendMessage().then()
      return event.preventDefault()
    }

    if (event.key === 'Backspace' && text.trim() === '' && mentionModels.length > 0) {
      setMentionModels((prev) => prev.slice(0, -1))
      return event.preventDefault()
    }
  }

  const addNewTopic = useCallback(async () => {
    await modelGenerating()

    const topic = getDefaultTopic(assistant.id)

    await db.topics.add({id: topic.id, messages: []})
    await addAssistantMessagesToTopic({assistant, topic})

    // Reset to assistant default model
    assistant.defaultModel && setModel(assistant.defaultModel)

    addTopic(topic)
    setActiveTopic(topic)

    setTimeout(() => EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR), 0)
  }, [addTopic, assistant, setActiveTopic, setModel])

  const onPause = async () => {
    await pauseMessages()
  }

  const clearTopic = async () => {
    if (loading) {
      await onPause()
      await delay(1)
    }
    await EventEmitter.emit(EVENT_NAMES.CLEAR_MESSAGES)
  }

  const onNewContext = async () => {
    if (loading) {
      await onPause()
      return
    }
    await EventEmitter.emit(EVENT_NAMES.NEW_CONTEXT)
  }

  const onToggleExpended = () => {
    const isExpended = !expended
    setExpend(isExpended)
    const textArea = textareaRef.current?.resizableTextArea?.textArea

    if (textArea) {
      if (isExpended) {
        textArea.style.height = '70vh'
      } else {
        resetHeight()
      }
    }

    textareaRef.current?.focus()
  }

  const onInput = () => !expended && resizeTextArea()

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)

    // Check if @ was deleted
    const textArea = textareaRef.current?.resizableTextArea?.textArea
    if (textArea) {
      const cursorPosition = textArea.selectionStart
      const textBeforeCursor = newText.substring(0, cursorPosition)
      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex === -1 || textBeforeCursor.slice(lastAtIndex + 1).includes(' ')) {
        setIsMentionPopupOpen(false)
      }
    }
  }

  const onPaste = useCallback(
    async (event: ClipboardEvent) => {
      const clipboardText = event.clipboardData?.getData('text')
      if (clipboardText) {
        // Prioritize the text when pasting.
        // handled by the default event
      } else {
        for (const file of event.clipboardData?.files || []) {
          event.preventDefault()

          if (file.name === '') {
            if (file.type.startsWith('image/') && isVisionModel(model)) {
              const tempFilePath = await getTempPath(file.name)
              const arrayBuffer = await file.arrayBuffer()
              const uint8Array = new Uint8Array(arrayBuffer)
              await writeFile(tempFilePath, uint8Array)
              const selectedFile = await window.api.file.get(tempFilePath)
              selectedFile && setFiles((prevFiles) => [...prevFiles, selectedFile])
              break
            } else {
              window.message.info({
                key: 'file_not_supported',
                content: t('chat.input.file_not_supported')
              })
            }
          }

          if (file.name) {
            if (supportExts.includes(getFileExtension(file.name))) {
              const selectedFile = await window.api.file.get(file.name)
              selectedFile && setFiles((prevFiles) => [...prevFiles, selectedFile])
            } else {
              window.message.info({
                key: 'file_not_supported',
                content: t('chat.input.file_not_supported')
              })
            }
          }
        }
      }

      if (pasteLongTextAsFile) {
        const item = event.clipboardData?.items[0]
        if (item && item.kind === 'string' && item.type === 'text/plain') {
          item.getAsString(async (pasteText) => {
            if (pasteText.length > pasteLongTextThreshold) {
              const tempFilePath = await getTempPath('pasted_text.txt')
              await window.api.file.write(tempFilePath, pasteText)
              const selectedFile = await window.api.file.get(tempFilePath)
              selectedFile && setFiles((prevFiles) => [...prevFiles, selectedFile])
              setText(text)
              setTimeout(() => resizeTextArea(), 0)
            }
          })
        }
      }
    },
    [model, pasteLongTextAsFile, pasteLongTextThreshold, resizeTextArea, supportExts, t, text]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const files = await getFilesFromDropEvent(e).catch((err) => {
      Logger.error('[src/renderer/src/pages/home/Inputbar/Inputbar.tsx] handleDrop:', err)
      return null
    })

    if (files) {
      files.forEach((file) => {
        if (supportExts.includes(getFileExtension(file.path))) {
          setFiles((prevFiles) => [...prevFiles, file])
        }
      })
    }
  }

  const onTranslated = (translatedText: string) => {
    setText(translatedText)
    setTimeout(() => resizeTextArea(), 0)
  }

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startDragY.current = e.clientY
    const textArea = textareaRef.current?.resizableTextArea?.textArea
    if (textArea) {
      startHeight.current = textArea.offsetHeight
    }
  }

  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const delta = startDragY.current - e.clientY // 改变计算方向
      const viewportHeight = window.innerHeight
      const maxHeightInPixels = viewportHeight * 0.7

      const newHeight = Math.min(maxHeightInPixels, Math.max(startHeight.current + delta, 30))
      const textArea = textareaRef.current?.resizableTextArea?.textArea
      if (textArea) {
        textArea.style.height = `${newHeight}px`
        setExpend(newHeight == maxHeightInPixels)
        setTextareaHeight(newHeight)
      }
    },
    [isDragging]
  )

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag)
      document.addEventListener('mouseup', handleDragEnd)
    }
    return () => {
      document.removeEventListener('mousemove', handleDrag)
      document.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging, handleDrag, handleDragEnd])

  useShortcut('new_topic', () => {
    addNewTopic().then()
    EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR).then()
    textareaRef.current?.focus()
  })

  useShortcut('clear_topic', () => {
    clearTopic().then()
  })

  useEffect(() => {
    const _setEstimateTokenCount = debounce(setEstimateTokenCount, 100, {leading: false, trailing: true})
    const unsubscribes = [
      EventEmitter.on(EVENT_NAMES.EDIT_MESSAGE, (message: Message) => {
        setText(message.content)
        textareaRef.current?.focus()
        setTimeout(() => resizeTextArea(), 0)
      }),
      EventEmitter.on(EVENT_NAMES.ESTIMATED_TOKEN_COUNT, ({tokensCount, contextCount}) => {
        _setEstimateTokenCount(tokensCount)
        setContextCount({current: contextCount.current, max: contextCount.max}) // 现在contextCount是一个对象而不是单个数值
      }),
      EventEmitter.on(EVENT_NAMES.ADD_NEW_TOPIC, addNewTopic),
      EventEmitter.on(EVENT_NAMES.QUOTE_TEXT, (quotedText: string) => {
        setText((prevText) => {
          const newText = prevText ? `${prevText}\n${quotedText}\n` : `${quotedText}\n`
          setTimeout(() => resizeTextArea(), 0)
          return newText
        })
        textareaRef.current?.focus()
      })
    ]
    return () => unsubscribes.forEach((unsub) => unsub())
  }, [addNewTopic, resizeTextArea])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [assistant])

  useEffect(() => {
    setTimeout(() => resizeTextArea(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (spaceClickTimer.current) {
        clearTimeout(spaceClickTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('focus', () => {
      textareaRef.current?.focus()
    })
  }, [])

  const textareaRows = window.innerHeight >= 1000 || isBubbleStyle ? 2 : 1

  const onMentionModel = (model: Model, fromKeyboard: boolean = false) => {
    const textArea = textareaRef.current?.resizableTextArea?.textArea
    if (textArea) {
      if (fromKeyboard) {
        const cursorPosition = textArea.selectionStart
        const textBeforeCursor = text.substring(0, cursorPosition)
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')

        if (lastAtIndex !== -1) {
          const newText = text.substring(0, lastAtIndex) + text.substring(cursorPosition)
          setText(newText)
        }
      }

      setMentionModels((prev) => [...prev, model])
      setIsMentionPopupOpen(false)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 0)
      setMentionFromKeyboard(false)
    }
  }

  const handleRemoveModel = (model: Model) => {
    setMentionModels(mentionModels.filter((m) => m.id !== model.id))
  }

  const toggelEnableMCP = (mcp: MCPServer) => {
    setEnabledMCPs((prev) => {
      const exists = prev.some((item) => item.id === mcp.id)
      if (exists) {
        return prev.filter((item) => item.id !== mcp.id)
      } else {
        return [...prev, mcp]
      }
    })
  }

  const onEnableWebSearch = () => {
    if (!isWebSearchModel(model)) {
      if (!WebSearchService.isWebSearchEnabled()) {
        window.modal.confirm({
          title: t('chat.input.web_search.enable'),
          content: t('chat.input.web_search.enable_content'),
          centered: true,
          okText: t('chat.input.web_search.button.ok'),
          onOk: () => {
            navigate('/settings/web-search')
          }
        })
        return
      }
    }

    updateAssistant({...assistant, enableWebSearch: !assistant.enableWebSearch})
  }

  const onEnableGenerateImage = () => {
    updateAssistant({...assistant, enableGenerateImage: !assistant.enableGenerateImage})
  }

  useEffect(() => {
    if (!isWebSearchModel(model) && !WebSearchService.isWebSearchEnabled() && assistant.enableWebSearch) {
      updateAssistant({...assistant, enableWebSearch: false})
    }
    if (!isGenerateImageModel(model) && assistant.enableGenerateImage) {
      updateAssistant({...assistant, enableGenerateImage: false})
    }
  }, [assistant, model, updateAssistant])

  const resetHeight = () => {
    if (expended) {
      setExpend(false)
    }
    setTextareaHeight(undefined)
    requestAnimationFrame(() => {
      const textArea = textareaRef.current?.resizableTextArea?.textArea
      if (textArea) {
        textArea.style.height = 'auto'
        const contentHeight = textArea.scrollHeight
        textArea.style.height = contentHeight > 400 ? '400px' : `${contentHeight}px`
      }
    })
  }

  return (
    <Container onDragOver={handleDragOver} onDrop={handleDrop} className="inputbar">
      <NarrowLayout style={{width: '100%'}}>
        <InputBarContainer
          id="inputbar"
          className={classNames('inputbar-container', inputFocus && 'focus')}
          ref={containerRef}>
          <AttachmentPreview files={files} setFiles={setFiles}/>
          <MentionModelsInput selectedModels={mentionModels} onRemoveModel={handleRemoveModel}/>
          <Textarea
            value={text}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={isTranslating ? t('chat.input.translating') : t('chat.input.placeholder')}
            autoFocus
            contextMenu="true"
            variant="borderless"
            spellCheck={false}
            rows={textareaRows}
            ref={textareaRef}
            style={{
              fontSize,
              height: textareaHeight ? `${textareaHeight}px` : undefined
            }}
            styles={{textarea: TextareaStyle}}
            onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              setInputFocus(true)
              const textArea = e.target
              if (textArea) {
                const length = textArea.value.length
                textArea.setSelectionRange(length, length)
              }
            }}
            onBlur={() => setInputFocus(false)}
            onInput={onInput}
            disabled={searching}
            onPaste={(e) => onPaste(e.nativeEvent)}
            onClick={() => searching && dispatch(setSearching(false))}
          />
          <DragHandle onMouseDown={handleDragStart}>
            <HolderOutlined/>
          </DragHandle>
          <Toolbar>
            <ToolbarMenu>
              <Tooltip placement="top" title={t('chat.input.new_topic', {Command: newTopicShortcut})} arrow>
                <ToolbarButton type="text" onClick={addNewTopic}>
                  <FormOutlined/>
                </ToolbarButton>
              </Tooltip>
              <AttachmentButton model={model} files={files} setFiles={setFiles} ToolbarButton={ToolbarButton}/>
              <Tooltip placement="top" title={t('chat.input.web_search')} arrow>
                <ToolbarButton type="text" onClick={onEnableWebSearch}>
                  <GlobalOutlined
                    style={{color: assistant.enableWebSearch ? 'var(--color-link)' : 'var(--color-icon)'}}
                  />
                </ToolbarButton>
              </Tooltip>
              {showMCPToolsIcon && (
                <MCPToolsButton
                  enabledMCPs={enabledMCPs}
                  toggelEnableMCP={toggelEnableMCP}
                  ToolbarButton={ToolbarButton}
                />
              )}
              <GenerateImageButton
                model={model}
                assistant={assistant}
                onEnableGenerateImage={onEnableGenerateImage}
                ToolbarButton={ToolbarButton}
              />
              <MentionModelsButton
                mentionModels={mentionModels}
                onMentionModel={(model) => onMentionModel(model, mentionFromKeyboard)}
                ToolbarButton={ToolbarButton}
              />
              <Tooltip placement="top" title={t('chat.input.clear', {Command: cleanTopicShortcut})} arrow>
                <Popconfirm
                  title={t('chat.input.clear.content')}
                  placement="top"
                  onConfirm={clearTopic}
                  okButtonProps={{danger: true}}
                  icon={<QuestionCircleOutlined style={{color: 'red'}}/>}
                  okText={t('chat.input.clear.title')}>
                  <ToolbarButton type="text">
                    <ClearOutlined style={{fontSize: 17}}/>
                  </ToolbarButton>
                </Popconfirm>
              </Tooltip>
              <Tooltip placement="top" title={expended ? t('chat.input.collapse') : t('chat.input.expand')} arrow>
                <ToolbarButton type="text" onClick={onToggleExpended}>
                  {expended ? <FullscreenExitOutlined/> : <FullscreenOutlined/>}
                </ToolbarButton>
              </Tooltip>
              {textareaHeight && (
                <Tooltip placement="top" title={t('chat.input.auto_resize')} arrow>
                  <ToolbarButton type="text" onClick={resetHeight}>
                    <ColumnHeightOutlined/>
                  </ToolbarButton>
                </Tooltip>
              )}
              <NewContextButton onNewContext={onNewContext} ToolbarButton={ToolbarButton}/>
              <TokenCount
                estimateTokenCount={estimateTokenCount}
                inputTokenCount={inputTokenCount}
                contextCount={contextCount}
                ToolbarButton={ToolbarButton}
                onClick={onNewContext}
              />
            </ToolbarMenu>
            <ToolbarMenu>
              <TranslateButton text={text} onTranslated={onTranslated} isLoading={isTranslating}/>
              {loading && (
                <Tooltip placement="top" title={t('chat.input.pause')} arrow>
                  <ToolbarButton type="text" onClick={onPause} style={{marginRight: -2, marginTop: 1}}>
                    <PauseCircleOutlined style={{color: 'var(--color-error)', fontSize: 20}}/>
                  </ToolbarButton>
                </Tooltip>
              )}
              {!loading && <SendMessageButton sendMessage={sendMessage} disabled={loading || inputEmpty}/>}
            </ToolbarMenu>
          </Toolbar>
        </InputBarContainer>
      </NarrowLayout>
    </Container>
  )
}

// Add these styled components at the bottom
const DragHandle = styled.div`
    position: absolute;
    top: -3px;
    left: 0;
    right: 0;
    height: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: row-resize;
    color: var(--color-icon);
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 1;

    &:hover {
        opacity: 1;
    }
`

const Container = styled.div`
    display: flex;
    flex-direction: column;
`

const InputBarContainer = styled.div`
    border: 1px solid var(--color-border);
    transition: all 0.3s ease;
    position: relative;
    margin: 12px 20px 14px;
    border-radius: 15px;
    padding-top: 6px; // 为拖动手柄留出空间
    background-color: var(--color-background-opacity);
`

const TextareaStyle: CSSProperties = {
  paddingLeft: 0,
  padding: '4px 15px 8px' // 减小顶部padding
}

const Textarea = styled(TextArea)`
    padding: 0;
    border-radius: 0;
    display: flex;
    flex: 1;
    font-family: Ubuntu,serif;
    resize: none !important;
    overflow: auto;
    width: 100%;
    box-sizing: border-box;
`

const Toolbar = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 0 8px;
    margin-bottom: 4px;
    height: 36px;
`

const ToolbarMenu = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 6px;
`

const ToolbarButton = styled(Button)`
    width: 30px;
    height: 30px;
    font-size: 16px;
    border-radius: 50%;
    transition: all 0.3s ease;
    color: var(--color-icon);
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    padding: 0;
    
    &:hover {
        background-color: var(--color-background-soft);
    }
`

export default Inputbar
