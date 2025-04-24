import { FileType } from '@/types'
import { Upload as AntdUpload, UploadFile } from 'antd'
import { isEmpty } from 'lodash'
import { FC } from 'react'
import styled from 'styled-components'
import {convertFileSrc} from "@tauri-apps/api/core";
import {openPath} from "@tauri-apps/plugin-opener";

interface Props {
  files: FileType[]
  setFiles: (files: FileType[]) => void
}

const AttachmentPreview: FC<Props> = ({ files, setFiles }) => {
  if (isEmpty(files)) {
    return null
  }
  let filePath: Record<string, string> = {}
  for (let file of files) {
    filePath[file.id] = file.path
  }
  return (
    <ContentContainer>
      <Upload
        listType={files.length > 20 ? 'text' : 'picture-card'}
        fileList={files.map(
          (file) =>
            ({
              uid: file.id,
              url: convertFileSrc(file.path),
              status: 'done',
              name: file.name,
            }) as UploadFile
        )}
        onPreview={async (file)=> await openPath(filePath[file.uid])}
        onRemove={(item) => setFiles(files.filter((file) => item.uid !== file.id))}
      />
    </ContentContainer>
  )
}

const ContentContainer = styled.div`
  max-height: 40vh;
  overflow-y: auto;
  width: 100%;
  padding: 10px 15px 0;
`

const Upload = styled(AntdUpload)`
`

export default AttachmentPreview
