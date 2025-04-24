import { DownloadOutlined, LinkOutlined } from '@ant-design/icons'
import { extractTitle } from '@/utils/formats'
import { Button } from 'antd'
import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {openPath} from "@tauri-apps/plugin-opener";

interface Props {
  html: string
}

const Artifacts: FC<Props> = ({ html }) => {
  const { t } = useTranslation()
  const title = extractTitle(html) || 'Artifacts ' + t('chat.artifacts.button.preview')

  /**
   * 外部链接打开
   */
  const handleOpenExternal = async () => {
    const path = await window.api.file.write('artifacts-preview.html', html)
    await openPath(path)
  }

  /**
   * 下载文件
   */
  const onDownload = () => {
    window.api.file.save(`${title}.html`, html).then()
  }

  return (
    <Container>
      <Button icon={<LinkOutlined />} onClick={handleOpenExternal}>
        {t('chat.artifacts.button.openExternal')}
      </Button>

      <Button icon={<DownloadOutlined />} onClick={onDownload}>
        {t('chat.artifacts.button.download')}
      </Button>
    </Container>
  )
}

const Container = styled.div`
  margin: 10px;
  display: flex;
  flex-direction: row;
  gap: 8px;
`

export default Artifacts
