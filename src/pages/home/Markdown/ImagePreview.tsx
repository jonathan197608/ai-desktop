import {
  RotateLeftOutlined,
  RotateRightOutlined,
  SwapOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons'
import { Image as AntImage, ImageProps as AntImageProps, Space } from 'antd'
import React from 'react'
import styled from 'styled-components'

interface ImagePreviewProps extends AntImageProps {
  src: string
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, ...props }) => {
  return (
    <AntImage
      src={src}
      {...props}
      preview={{
        mask: typeof props.preview === 'object' ? props.preview.mask : false,
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
  )
}

const ToobarWrapper = styled(Space)`
  padding: 0 24px;
  color: #fff;
  font-size: 20px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 100px;
`

export default ImagePreview
