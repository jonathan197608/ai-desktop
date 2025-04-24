import {SyncOutlined} from '@ant-design/icons'
import {useRuntime} from '@/hooks/useRuntime'
import {Button} from 'antd'
import {FC} from 'react'
import {useTranslation} from 'react-i18next'
import styled from 'styled-components'
import type {DownloadEvent} from "@tauri-apps/plugin-updater";

interface Props {
  onProgress: (progress: DownloadEvent) => void
}

const UpdateAppButton: FC<Props> = ({onProgress}) => {
  const {update} = useRuntime()
  const {t} = useTranslation()

  if (!update || !update.info) {
    return null
  }

  return (
    <Container>
      <UpdateButton
        className="nodrag"
        onClick={() => update.info && window.api.showUpdateDialog(update.info, onProgress)}
        icon={<SyncOutlined/>}
        color="orange"
        variant="outlined"
        size="small">
        {t('button.update_available')}
      </UpdateButton>
    </Container>
  )
}

const Container = styled.div``

const UpdateButton = styled(Button)`
    border-radius: 24px;
    font-size: 12px;
    @media (max-width: 1000px) {
        display: none;
    }
`

export default UpdateAppButton
