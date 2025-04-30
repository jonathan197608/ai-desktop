import {GithubOutlined} from '@ant-design/icons'
import {GlobalOutlined} from '@ant-design/icons'
import IndicatorLight from '@/components/IndicatorLight'
import {HStack} from '@/components/Layout'
import {APP_NAME, AppLogo} from '@/config/env'
import {useTheme} from '@/context/ThemeProvider'
import {useRuntime} from '@/hooks/useRuntime'
import {useSettings} from '@/hooks/useSettings'
import {useAppDispatch} from '@/store'
import {setUpdateState} from '@/store/runtime'
import {setAutoCheckUpdate} from '@/store/settings'
import {compareVersions, runAsyncFunction} from '@/utils'
import {Avatar, Button, Progress, Row, Switch, Tag} from 'antd'
import {debounce} from 'lodash'
import {FC, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import Markdown from 'react-markdown'
import styled from 'styled-components'

import {SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingTitle} from '.'
import {makeOnProgress} from "@/pages/home/components/UpdateAppButton.tsx";

const AboutSettings: FC = () => {
  const [version, setVersion] = useState('')
  const {t} = useTranslation()
  const {autoCheckUpdate} = useSettings()
  const {theme} = useTheme()
  const dispatch = useAppDispatch()
  const {update} = useRuntime()

  const onCheckUpdate = debounce(
    async () => {
      if (update.checking || update.downloading) {
        return
      }

      dispatch(setUpdateState({checking: true}))

      try {
        const updateInfo = await window.api.checkForUpdate()
        if (updateInfo) {
          dispatch(setUpdateState({info: updateInfo, available: true}))
          await window.api.applyUpdate(updateInfo, makeOnProgress(dispatch))
        } else {
          window.message.info(t('settings.about.updateNotAvailable'))
        }
      } catch (error) {
        window.message.error(t('settings.about.updateError'))
      }

      dispatch(setUpdateState({checking: false}))
    },
    2000,
    {leading: true, trailing: false}
  )

  const onOpenWebsite = (url: string) => {
    window.api.openWebsite(url)
  }

  const hasNewVersion = update?.info?.version && version ? compareVersions(update.info.version, version) > 0 : false

  useEffect(() => {
    runAsyncFunction(async () => {
      const appInfo = await window.api.getAppInfo()
      setVersion(appInfo.version)
    }).then()
  }, [])

  return (
    <SettingContainer theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>
          {t('settings.about.title')}
          <HStack alignItems="center">
              <GithubOutlined style={{marginRight: 4, color: 'var(--color-text)', fontSize: 20}}
                onClick={() => onOpenWebsite('https://github.com/jonathan197608/ai-desktop')}
              />
          </HStack>
        </SettingTitle>
        <SettingDivider/>
        <AboutHeader>
          <Row align="middle">
            <AvatarWrapper onClick={() => onOpenWebsite('https://gitee.com/jonathan1976/ai-desktop')}>
              {update.downloadProgress > 0 && (
                <ProgressCircle
                  type="circle"
                  size={84}
                  percent={update.downloadProgress}
                  showInfo={false}
                  strokeLinecap="butt"
                  strokeColor="#67ad5b"
                />
              )}
              <Avatar src={AppLogo} size={80} style={{minHeight: 80}}/>
            </AvatarWrapper>
            <VersionWrapper>
              <Title>{APP_NAME}</Title>
              <Description>{t('settings.about.description')}</Description>
              <Tag
                onClick={() => onOpenWebsite('https://gitee.com/jonathan1976/ai-desktop/releases')}
                color="cyan"
                style={{marginTop: 8, cursor: 'pointer'}}>
                v{version}
              </Tag>
            </VersionWrapper>
          </Row>
          <CheckUpdateButton
            onClick={onCheckUpdate}
            loading={update.checking}
            disabled={update.downloading || update.checking}>
            {update.downloading
              ? t('settings.about.downloading')
              : update.available
                ? t('settings.about.checkUpdate.available')
                : t('settings.about.checkUpdate')}
          </CheckUpdateButton>
        </AboutHeader>
        <SettingDivider/>
        <SettingRow>
          <SettingRowTitle>{t('settings.general.auto_check_update.title')}</SettingRowTitle>
          <Switch value={autoCheckUpdate} onChange={(v) => dispatch(setAutoCheckUpdate(v))}/>
        </SettingRow>
      </SettingGroup>
      {hasNewVersion && update.info && (
        <SettingGroup theme={theme}>
          <SettingRow>
            <SettingRowTitle>
              {t('settings.about.updateAvailable', {version: update.info.version})}
              <IndicatorLight color="green"/>
            </SettingRowTitle>
          </SettingRow>
          <UpdateNotesWrapper>
            <Markdown>
              {update.info.date || ''}
            </Markdown>
          </UpdateNotesWrapper>
        </SettingGroup>
      )}
      <SettingGroup theme={theme}>
        <SettingRow>
          <SettingRowTitle>
            <GlobalOutlined/>
            {t('settings.about.website.title')}
          </SettingRowTitle>
          <Button
            onClick={() => onOpenWebsite('https://jonathan197608.github.io/ai-desktop/')}>{t('settings.about.website.button')}</Button>
        </SettingRow>
        <SettingDivider/>
        <SettingRow>
          <SettingRowTitle>
            <GithubOutlined/>
            {t('settings.about.feedback.title')}
          </SettingRowTitle>
          <Button onClick={() => onOpenWebsite('https://gitee.com/jonathan1976/ai-desktop/issues')}>
            {t('settings.about.feedback.button')}
          </Button>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}

const AboutHeader = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 5px 0;
`

const VersionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 80px;
    justify-content: center;
    align-items: flex-start;
`

const Title = styled.div`
    font-size: 20px;
    font-weight: bold;
    color: var(--color-text-1);
    margin-bottom: 5px;
`

const Description = styled.div`
    font-size: 14px;
    color: var(--color-text-2);
    text-align: center;
`

const CheckUpdateButton = styled(Button)``

const AvatarWrapper = styled.div`
    position: relative;
    cursor: pointer;
    margin-right: 15px;
`

const ProgressCircle = styled(Progress)`
    position: absolute;
    top: -2px;
    left: -2px;
`

export const SettingRowTitle = styled.div`
    font-size: 14px;
    line-height: 18px;
    color: var(--color-text-1);
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
`

const UpdateNotesWrapper = styled.div`
    padding: 12px 0;
    margin: 8px 0;
    border-radius: 6px;

    p {
        margin: 0;
        color: var(--color-text-2);
        font-size: 14px;
    }
`

export default AboutSettings
