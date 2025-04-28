import {SyncOutlined} from '@ant-design/icons'
import {useRuntime} from '@/hooks/useRuntime'
import {Button} from 'antd'
import {FC} from 'react'
import {useTranslation} from 'react-i18next'
import styled from 'styled-components'
import type {DownloadEvent} from "@tauri-apps/plugin-updater";
import {setUpdateState} from "@/store/runtime.ts";
import {relaunch} from "@tauri-apps/plugin-process";
import {AppDispatch} from "@/store";

interface Props {
  onProgress: (progress: DownloadEvent) => void
}

export function makeOnProgress(dispatch: AppDispatch) {
  let downloaded = 0
  let contentLength: number

  return (event: any) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength || 1
        console.log(`started downloading ${contentLength} bytes`)
        dispatch(setUpdateState({downloading: true}))
        break
      case 'Progress':
        downloaded += event.data.chunkLength;
        console.log(`downloaded ${downloaded} from ${contentLength}`)
        dispatch(setUpdateState({downloadProgress: downloaded / contentLength}))
        break
      case 'Finished':
        dispatch(setUpdateState({downloading: false}))
        relaunch().then()
        break
    }
  }
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
        onClick={() => update.info && window.api.applyUpdate(update.info, onProgress)}
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
