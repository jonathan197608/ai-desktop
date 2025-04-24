import {FileType, FileTypes} from '@/types'
import {formatFileSize} from '@/utils'
import {Col, Image, Row} from 'antd'
import {t} from 'i18next'
import VirtualList from 'rc-virtual-list'
import React, {memo} from 'react'
import styled from 'styled-components'

import FileItem from './FileItem'
import {convertFileSrc} from "@tauri-apps/api/core";

interface FileItemProps {
  id: FileTypes | 'all' | string
  list: {
    key: FileTypes | 'all' | string
    file: React.ReactNode
    files?: FileType[]
    count?: number
    size: string
    ext: string
    created_at: string
    actions: React.ReactNode
  }[]
  files?: FileType[]
}

const FileList: React.FC<FileItemProps> = ({id, list, files}) => {
  if (id === FileTypes.IMAGE && files?.length && files?.length > 0) {
    return (
      <div style={{padding: 16}}>
        <Image.PreviewGroup>
          <Row gutter={[16, 16]}>
            {files?.map((file) => (
              <Col key={file.id} xs={24} sm={12} md={8} lg={4} xl={3}>
                <ImageWrapper>
                  <Image
                    src={convertFileSrc(file.path)}
                    style={{height: '100%', objectFit: 'cover', cursor: 'pointer'}}
                    preview={{mask: false, visible: true}}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement
                      img.parentElement?.classList.add('loaded')
                    }}
                  />
                  <ImageInfo>
                    <div>{formatFileSize(file.size)}</div>
                  </ImageInfo>
                </ImageWrapper>
              </Col>
            ))}
          </Row>
        </Image.PreviewGroup>
      </div>
    )
  }

  return (
    <VirtualList
      data={list}
      height={window.innerHeight - 100}
      itemHeight={80}
      itemKey="key"
      style={{padding: '0 16px 16px 16px'}}
      styles={{
        verticalScrollBar: {
          width: 6
        },
        verticalScrollBarThumb: {
          background: 'var(--color-scrollbar-thumb)'
        }
      }}>
      {(item) => (
        <div
          style={{
            height: '80px',
            paddingTop: '12px'
          }}>
          <FileItem
            key={item.key}
            fileInfo={{
              name: item.file,
              ext: item.ext,
              extra: `${item.created_at} · ${t('files.count')} ${item.count} · ${item.size}`,
              actions: item.actions
            }}
          />
        </div>
      )}
    </VirtualList>
  )
}

const ImageWrapper = styled.div`
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    background-color: var(--color-background-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    
    &:hover {
        div:last-child {
            opacity: 1;
        }
    }
`

const ImageInfo = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 5px 8px;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-size: 12px;

    > div:first-child {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`

export default memo(FileList)
