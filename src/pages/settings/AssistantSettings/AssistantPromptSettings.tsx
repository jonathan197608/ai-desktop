import 'emoji-picker-element'

import { CloseCircleFilled } from '@ant-design/icons'
import EmojiPicker from '@/components/EmojiPicker'
import { Box, HStack } from '@/components/Layout'
import { estimateTextTokens } from '@/services/TokenService'
import { Assistant, AssistantSettings } from '@/types'
import { getLeadingEmoji } from '@/utils'
import { Button, Input, Popover } from 'antd'
import TextArea from 'antd/es/input/TextArea'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant: Assistant
  updateAssistant: (assistant: Assistant) => void
  updateAssistantSettings: (settings: AssistantSettings) => void
  onOk: () => void
}

const AssistantPromptSettings: React.FC<Props> = ({ assistant, updateAssistant, onOk }) => {
  const [emoji, setEmoji] = useState(getLeadingEmoji(assistant.name) || assistant.emoji)
  const [name, setName] = useState(assistant.name.replace(getLeadingEmoji(assistant.name) || '', '').trim())
  const [prompt, setPrompt] = useState(assistant.prompt)
  const [tokenCount, setTokenCount] = useState(0)
  const { t } = useTranslation()

  useEffect(() => {
    const updateTokenCount = async () => {
      const count = estimateTextTokens(prompt)
      setTokenCount(count)
    }
    updateTokenCount().then()
  }, [prompt])

  const onUpdate = () => {
    const _assistant = { ...assistant, name: name.trim(), emoji, prompt }
    updateAssistant(_assistant)
  }

  const handleEmojiSelect = (selectedEmoji: string) => {
    setEmoji(selectedEmoji)
    const _assistant = { ...assistant, name: name.trim(), emoji: selectedEmoji, prompt }
    updateAssistant(_assistant)
  }

  const handleEmojiDelete = () => {
    setEmoji('')
    const _assistant = { ...assistant, name: name.trim(), prompt, emoji: '' }
    updateAssistant(_assistant)
  }

  return (
    <Container>
      <Box mb={8} style={{ fontWeight: 'bold' }}>
        {t('common.name')}
      </Box>
      <HStack gap={8} alignItems="center">
        <Popover content={<EmojiPicker onEmojiClick={handleEmojiSelect} />} arrow>
          <EmojiButtonWrapper>
            <Button style={{ fontSize: 20, padding: '4px', minWidth: '32px', height: '32px' }}>{emoji}</Button>
            {emoji && (
              <CloseCircleFilled
                className="delete-icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEmojiDelete()
                }}
                style={{
                  display: 'none',
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  fontSize: '16px',
                  color: '#ff4d4f',
                  cursor: 'pointer'
                }}
              />
            )}
          </EmojiButtonWrapper>
        </Popover>
        <Input
          placeholder={t('common.assistant') + t('common.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={onUpdate}
          style={{ flex: 1 }}
        />
      </HStack>
      <Box mt={8} mb={8} style={{ fontWeight: 'bold' }}>
        {t('common.prompt')}
      </Box>
      <TextAreaContainer>
        <TextArea
          rows={10}
          placeholder={t('common.assistant') + t('common.prompt')}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={onUpdate}
          spellCheck={false}
          style={{ minHeight: 'calc(80vh - 200px)', maxHeight: 'calc(80vh - 150px)' }}
        />
        <TokenCount>Tokens: {tokenCount}</TokenCount>
      </TextAreaContainer>
      <HStack width="100%" justifyContent="flex-end" mt="10px">
        <Button type="primary" onClick={onOk}>
          {t('common.close')}
        </Button>
      </HStack>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 5px;
`

const EmojiButtonWrapper = styled.div`
  position: relative;
  display: inline-block;

  &:hover .delete-icon {
    display: block !important;
  }
`

const TextAreaContainer = styled.div`
  position: relative;
  width: 100%;
`

const TokenCount = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: var(--color-background-soft);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-text-2);
  user-select: none;
`

export default AssistantPromptSettings
