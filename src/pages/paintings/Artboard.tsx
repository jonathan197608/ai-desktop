import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import { Painting } from '@/types'
import { download } from '@/utils/download'
import { Button, Dropdown, Spin } from 'antd'
import React, { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {convertFileSrc} from "@tauri-apps/api/core";
import ImagePreview from '../home/Markdown/ImagePreview'

interface ArtboardProps {
  painting: Painting
  isLoading: boolean
  currentImageIndex: number
  onPrevImage: () => void
  onNextImage: () => void
  onCancel: () => void
}

const Artboard: FC<ArtboardProps> = ({
  painting,
  isLoading,
  currentImageIndex,
  onPrevImage,
  onNextImage,
  onCancel
}) => {
  const { t } = useTranslation()

  const getCurrentImage = () => {
    const currentFile = painting.files[currentImageIndex]
    return currentFile ? currentFile.path : ''
  }

  const getCurrentImageUrl = () => {
    const currentFile = painting.files[currentImageIndex]
    return currentFile ? convertFileSrc(currentFile.path) : ''
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const getContextMenuItems = () => {
    return [
      {
        key: 'copy',
        label: t('common.copy'),
        icon: <CopyOutlined />,
        onClick: () => {
          navigator.clipboard.writeText(painting.urls[currentImageIndex]).then()
        }
      },
      {
        key: 'open',
        label: t('files.open'),
        icon: <DownloadOutlined />,
        onClick: () => download(getCurrentImage())
      }
    ]
  }

  return (
    <Container>
      <LoadingContainer spinning={isLoading}>
        {painting.files.length > 0 ? (
          <ImageContainer>
            {painting.files.length > 1 && (
              <NavigationButton onClick={onPrevImage} style={{ left: 10 }}>
                ←
              </NavigationButton>
            )}
            <Dropdown menu={{ items: getContextMenuItems() }} trigger={['contextMenu']}>
              <ImagePreview
                src={getCurrentImageUrl()}
                preview={{ mask: false }}
                onContextMenu={handleContextMenu}
                style={{
                  maxWidth: '70vh',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  backgroundColor: 'var(--color-background-soft)',
                  cursor: 'pointer'
                }}
              />
            </Dropdown>
            {painting.files.length > 1 && (
              <NavigationButton onClick={onNextImage} style={{ right: 10 }}>
                →
              </NavigationButton>
            )}
            <ImageCounter>
              {currentImageIndex + 1} / {painting.files.length}
            </ImageCounter>
          </ImageContainer>
        ) : (
          <ImagePlaceholder />
        )}
        {isLoading && (
          <LoadingOverlay>
            <Spin size="large" />
            <CancelButton onClick={onCancel}>{t('common.cancel')}</CancelButton>
          </LoadingOverlay>
        )}
      </LoadingContainer>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`

const ImagePlaceholder = styled.div`
  display: flex;
  width: 70vh;
  height: 70vh;
  background-color: var(--color-background-soft);
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const ImageContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .ant-spin {
    max-height: none;
  }
`

const NavigationButton = styled(Button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  opacity: 0.7;
  &:hover {
    opacity: 1;
  }
`

const ImageCounter = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
`

const LoadingContainer = styled.div<{ spinning: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: ${(props) => (props.spinning ? 0.5 : 1)};
  transition: opacity 0.3s;
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
`

const CancelButton = styled(Button)`
  margin-top: 10px;
  z-index: 1001;
`

export default Artboard
