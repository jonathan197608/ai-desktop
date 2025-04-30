import {
  RotateLeftOutlined,
  RotateRightOutlined,
  SwapOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons'
import { Message } from '@/types'
import { Image as AntdImage, Space } from 'antd'
import { FC } from 'react'
import styled from 'styled-components'

interface Props {
  message: Message
}

const MessageImage: FC<Props> = ({ message }) => {
  return (
    <Container style={{ marginBottom: 8 }}>
      {message.metadata?.generateImage!.images.map((image, index) => (
        <Image
          src={image}
          key={`image-${index}`}
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
              </ToobarWrapper>
            )
          }}
        />
      ))}
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

export default MessageImage
