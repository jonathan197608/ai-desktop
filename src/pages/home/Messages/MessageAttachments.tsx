import {
  CopyOutlined,
  DownloadOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  SwapOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons'
import FileManager from '@/services/FileManager'
import { FileType, FileTypes, Message } from '@/types'
import { download } from '@/utils/download'
import { Image as AntdImage, Space, Upload } from 'antd'
import { FC } from 'react'
import styled from 'styled-components'
import {convertFileSrc} from "@tauri-apps/api/core";
import {openPath} from "@tauri-apps/plugin-opener";

interface Props {
  message: Message
}

const MessageAttachments: FC<Props> = ({ message }) => {
  const handleCopyImage = async (image: FileType) => {
    const data = await FileManager.readFile(image)
    const blob = new Blob([data], { type: 'image/png' })
    const item = new ClipboardItem({ [blob.type]: blob })
    await navigator.clipboard.write([item])
  }

  if (!message.files) {
    return null
  }

  if (message?.files && message.files[0]?.type === FileTypes.IMAGE) {
    return (
      <Container style={{ marginBottom: 8 }}>
        {message.files?.map((image) => (
          <Image
            src={convertFileSrc(image.path)}
            key={image.id}
            width="33%"
            preview={{
              toolbarRender: (
                _,
                {
                  transform: { scale },
                  actions: { onFlipY, onFlipX, onRotateLeft, onRotateRight, onZoomOut, onZoomIn, onReset }
                }
              ) => (
                <ToobarWrapper size={12} className="toolbar-wrapper">
                  <SwapOutlined rotate={90} onClick={onFlipY} />
                  <SwapOutlined onClick={onFlipX} />
                  <RotateLeftOutlined onClick={onRotateLeft} />
                  <RotateRightOutlined onClick={onRotateRight} />
                  <ZoomOutOutlined disabled={scale === 1} onClick={onZoomOut} />
                  <ZoomInOutlined disabled={scale === 50} onClick={onZoomIn} />
                  <UndoOutlined onClick={onReset} />
                  <CopyOutlined onClick={() => handleCopyImage(image)} />
                  <DownloadOutlined onClick={() => download(convertFileSrc(image.path))} />
                </ToobarWrapper>
              )
            }}
          />
        ))}
      </Container>
    )
  }
  let filePath: Record<string, string> = {}
  for (let file of message.files) {
    filePath[file.id] = file.path
  }
  return (
    <Container style={{ marginTop: 2, marginBottom: 8 }} className="message-attachments">
      <Upload
        listType="text"
        disabled
        onPreview={async (file)=> await openPath(filePath[file.uid])}
        fileList={message.files?.map((file) => ({
          uid: file.id,
          url: 'javascript:void(0)',
          status: 'done',
          name: FileManager.formatFileName(file)
        }))}
      />
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
  margin-top: 8px;
`

const Image = styled(AntdImage)`
  border-radius: 10px;
`

const ToobarWrapper = styled(Space)`
  padding: 0 24px;
  color: #fff;
  font-size: 20px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 100px;
`

export default MessageAttachments
