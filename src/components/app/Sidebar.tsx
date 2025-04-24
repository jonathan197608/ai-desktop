import {
  FolderOutlined,
  PictureOutlined,
  TranslationOutlined
} from '@ant-design/icons'
import { UserAvatar } from '@/config/env'
import { useTheme } from '@/context/ThemeProvider'
import useAvatar from '@/hooks/useAvatar'
import { modelGenerating } from '@/hooks/useRuntime'
import { useSettings } from '@/hooks/useSettings'
import { isEmoji } from '@/utils'
import { Avatar, Tooltip } from 'antd'
import {FC, useEffect, useState} from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import UserPopup from '../Popups/UserPopup'
import useNavBackgroundColor from "@/hooks/useNavBackgroundColor.ts";

const Sidebar: FC = () => {
  const {pathname} = useLocation()
  const navigate = useNavigate()
  const { windowStyle } = useSettings()
  const [backgroundColor, setBackgroundColor] = useState<string>()

  const {theme, settingTheme, toggleTheme} = useTheme()
  const avatar = useAvatar()
  const {t} = useTranslation()

  const onEditUser = () => UserPopup.show()

  useEffect(() => {
    (async () => {
      setBackgroundColor(await useNavBackgroundColor(windowStyle))
    })()
  })

  const to = async (path: string) => {
    await modelGenerating()
    navigate(path)
  }

  return (
    <Container id="app-sidebar" style={{backgroundColor, zIndex: 'initial'}}>
      {isEmoji(avatar) ? (
        <EmojiAvatar onClick={onEditUser}>{avatar}</EmojiAvatar>
      ) : (
        <AvatarImg src={avatar || UserAvatar} draggable={false} className="nodrag" onClick={onEditUser}/>
      )}
      <MainMenusContainer>
        <Menus>
          <MainMenus/>
        </Menus>
      </MainMenusContainer>
      <Menus>
        <Tooltip
          title={t('settings.theme.title') + ': ' + t(`settings.theme.${settingTheme}`)}
          mouseEnterDelay={0.8}
          placement="right">
          <Icon theme={theme} onClick={() => toggleTheme()}>
            {theme === 'dark' ? (
              <i className="iconfont icon-theme icon-dark1"/>
            ) : (
              <i className="iconfont icon-theme icon-theme-light"/>
            )}
          </Icon>
        </Tooltip>
        <Tooltip title={t('settings.title')} mouseEnterDelay={0.8} placement="right">
          <StyledLink
            onClick={async () => {
              await modelGenerating()
              await to('/settings/provider')
            }}>
            <Icon theme={theme} className={pathname.startsWith('/settings') ? 'active' : ''}>
              <i className="iconfont icon-setting"/>
            </Icon>
          </StyledLink>
        </Tooltip>
      </Menus>
    </Container>
  )
}

const MainMenus: FC = () => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { sidebarIcons } = useSettings()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const isRoute = (path: string): string => (pathname === path ? 'active' : '')
  const isRoutes = (path: string): string => (pathname.startsWith(path) ? 'active' : '')

  const iconMap = {
    assistants: <i className="iconfont icon-chat" />,
    paintings: <PictureOutlined style={{ fontSize: 16 }} />,
    translate: <TranslationOutlined />,
    files: <FolderOutlined />
  }

  const pathMap = {
    assistants: '/',
    paintings: '/paintings',
    translate: '/translate',
    files: '/files'
  }

  const visibleIcons = sidebarIcons.visible

  return visibleIcons.map((icon) => {
    const path = pathMap[icon]
    const isActive = path === '/' ? isRoute(path) : isRoutes(path)

    return (
      <Tooltip key={icon} title={t(`${icon}.title`)} mouseEnterDelay={0.8} placement="right">
        <StyledLink
          onClick={async () => {
            await modelGenerating()
            navigate(path)
          }}>
          <Icon theme={theme} className={isActive}>
            {iconMap[icon]}
          </Icon>
        </StyledLink>
      </Tooltip>
    )
  })
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0 12px;
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: ${window.isMac ? 'calc(100vh - var(--navbar-height))' : '100vh'};
    -webkit-app-region: drag !important;
    margin-top: ${window.isMac ? 'var(--navbar-height)' : 0};
`

const AvatarImg = styled(Avatar)`
  width: 31px;
  height: 31px;
  background-color: var(--color-background-soft);
  margin-bottom: ${window.isMac ? '12px' : '12px'};
  margin-top: ${window.isMac ? '0' : '2px'};
  border: none;
  cursor: pointer;
`

const EmojiAvatar = styled.div`
    width: 31px;
    height: 31px;
    background-color: var(--color-background-soft);
    margin-bottom: ${window.isMac ? '12px' : '12px'};
    margin-top: ${window.isMac ? '0' : '2px'};
    border-radius: 20%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    cursor: pointer;
    -webkit-app-region: none;
    border: 1px solid var(--color-border);
`

const MainMenusContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
`

const Menus = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
`

const Icon = styled.div<{ theme: string }>`
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    -webkit-app-region: none;
    border: 1px solid transparent;

    .iconfont,
    .anticon {
        color: var(--color-icon);
        font-size: 20px;
        text-decoration: none;
    }

    .anticon {
        font-size: 17px;
    }

    &:hover {
        background-color: ${({theme}) => (theme === 'dark' ? 'var(--color-black)' : 'var(--color-white)')};
        opacity: 0.8;
        cursor: pointer;

        .iconfont,
        .anticon {
            color: var(--color-icon-white);
        }
    }

    &.active {
        background-color: ${({theme}) => (theme === 'dark' ? 'var(--color-black)' : 'var(--color-white)')};
        border: 1px solid var(--color-border);

        .iconfont,
        .anticon {
            color: var(--color-icon-white);
        }
    }

    @keyframes borderBreath {
        0% {
            border-color: var(--color-primary-mute);
        }
        50% {
            border-color: var(--color-primary);
        }
        100% {
            border-color: var(--color-primary-mute);
        }
    }
`

const StyledLink = styled.div`
  text-decoration: none;
  -webkit-app-region: none;
  &* {
    user-select: none;
  }
`

export default Sidebar
