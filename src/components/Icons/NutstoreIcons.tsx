import styled from 'styled-components'
import React from "react";

const IconSpan = styled.span`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`

export function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <IconSpan>
      <svg width="16px" height="16px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" {...props}>
        <title>folder</title>
        <path
          d="M396.5,185.7l22.7,27.2a36.1,36.1,0,0,0,27.7,12.7H906.8c29.4,0,53.2,22.8,53.2,50.9V800.1c0,28.1-23.8,50.9-53.2,50.9H117.2C87.8,851,64,828.2,64,800.1V223.9c0-28.1,23.8-50.9,53.2-50.9H368.8A36.1,36.1,0,0,1,396.5,185.7Z"
          style={{ fill: '#9fddff' }}
        />
        <path
          d="M64,342.5V797.8c0,29.4,24,53.2,53.6,53.2H906.4c29.6,0,53.6-23.8,53.6-53.2V342.5Z"
          style={{ fill: '#74c6ff' }}
        />
      </svg>
    </IconSpan>
  )
}
