import {FormOutlined, SearchOutlined} from '@ant-design/icons'
import {Navbar, NavbarLeft, NavbarRight} from '@/components/app/Navbar'
import {HStack} from '@/components/Layout'
import SearchPopup from '@/components/Popups/SearchPopup'
import {useAssistant} from '@/hooks/useAssistant'
import {modelGenerating, useRuntime} from '@/hooks/useRuntime'
import {useSettings} from '@/hooks/useSettings'
import {useShortcut} from '@/hooks/useShortcuts'
import {useShowAssistants, useShowTopics} from '@/hooks/useStore'
import {EVENT_NAMES, EventEmitter} from '@/services/EventService'
import {useAppDispatch} from '@/store'
import {setNarrowMode} from '@/store/settings'
import {Assistant, Topic} from '@/types'
import {Tooltip} from 'antd'
import {t} from 'i18next'
import {FC} from 'react'
import styled from 'styled-components'
import { relaunch } from '@tauri-apps/plugin-process'
import SelectModelButton from './components/SelectModelButton'
import UpdateAppButton from './components/UpdateAppButton'

interface Props {
  activeAssistant: Assistant
  activeTopic: Topic
  setActiveTopic: (topic: Topic) => void
}

const HeaderNavbar: FC<Props> = ({activeAssistant}) => {
  const {assistant} = useAssistant(activeAssistant.id)
  const {showAssistants, toggleShowAssistants} = useShowAssistants()
  const {topicPosition, narrowMode} = useSettings()
  const {showTopics, toggleShowTopics} = useShowTopics()
  const {update} = useRuntime()
  const dispatch = useAppDispatch()

  useShortcut('toggle_show_assistants', () => {
    toggleShowAssistants()
  })

  useShortcut('toggle_show_topics', () => {
    if (topicPosition === 'right') {
      toggleShowTopics()
    } else {
      EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR).then()
    }
  })

  useShortcut('search_message', () => {
    SearchPopup.show().then()
  })

  const handleNarrowModeToggle = async () => {
    await modelGenerating()
    dispatch(setNarrowMode(!narrowMode))
  }

  let downloaded = 0
  let contentLength: number

  return (
    <Navbar className="home-navbar">
      {showAssistants && (
        <NavbarLeft style={{justifyContent: 'space-between', borderRight: 'none', padding: 0}}>
          <Tooltip title={t('navbar.hide_sidebar')} mouseEnterDelay={0.8}>
            <NavbarIcon onClick={toggleShowAssistants} style={{marginLeft: window.isMac ? 16 : 0}}>
              <i className="iconfont icon-hide-sidebar"/>
            </NavbarIcon>
          </Tooltip>
          <Tooltip title={t('settings.shortcuts.new_topic')} mouseEnterDelay={0.8}>
            <NavbarIcon onClick={() => EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC)}>
              <FormOutlined/>
            </NavbarIcon>
          </Tooltip>
        </NavbarLeft>
      )}
      <NavbarRight style={{justifyContent: 'space-between', flex: 1}} className="home-navbar-right">
        <HStack alignItems="center">
          {!showAssistants && (
            <Tooltip title={t('navbar.show_sidebar')} mouseEnterDelay={0.8}>
              <NavbarIcon
                onClick={() => toggleShowAssistants()}
                style={{marginRight: 8, marginLeft: window.isMac ? 4 : -12}}>
                <i className="iconfont icon-show-sidebar"/>
              </NavbarIcon>
            </Tooltip>
          )}
          <SelectModelButton assistant={assistant}/>
        </HStack>
        <HStack alignItems="center" gap={8}>
          <UpdateAppButton onProgress={(event)=>{
            switch (event.event) {
              case 'Started':
                contentLength = event.data.contentLength || 1
                console.log(`started downloading ${event.data.contentLength} bytes`)
                update.downloading = true
                break
              case 'Progress':
                console.log(`downloaded ${downloaded} from ${contentLength}`)
                update.downloadProgress = downloaded / contentLength
                break
              case 'Finished':
                setTimeout(() => {
                  update.downloading = false
                  relaunch().then()
                }, 1000)
                break
            }
          }}/>
          <Tooltip title={t('chat.assistant.search.placeholder')} mouseEnterDelay={0.8}>
            <NarrowIcon onClick={() => SearchPopup.show()}>
              <SearchOutlined/>
            </NarrowIcon>
          </Tooltip>
          <Tooltip title={t('navbar.expand')} mouseEnterDelay={0.8}>
            <NarrowIcon onClick={handleNarrowModeToggle}>
              <i className="iconfont icon-icon-adaptive-width"></i>
            </NarrowIcon>
          </Tooltip>
          {topicPosition === 'right' && (
            <NarrowIcon onClick={toggleShowTopics}>
              <i className={`iconfont icon-${showTopics ? 'show' : 'hide'}-sidebar`}/>
            </NarrowIcon>
          )}
        </HStack>
      </NavbarRight>
    </Navbar>
  )
}

export const NavbarIcon = styled.div`
    -webkit-app-region: none;
    border-radius: 8px;
    height: 30px;
    padding: 0 7px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    transition: all 0.2s ease-in-out;
    cursor: pointer;

    .iconfont {
        font-size: 18px;
        color: var(--color-icon);
    }
    
    &:hover {
        background-color: var(--color-background-mute);
        color: var(--color-icon-white);
    }
`

const NarrowIcon = styled(NavbarIcon)`
    @media (max-width: 1000px) {
        display: none;
    }
`

export default HeaderNavbar
