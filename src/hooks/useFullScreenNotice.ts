import {useEffect} from 'react'
import {useTranslation} from 'react-i18next'

export function useFullScreenNotice() {
  const {t} = useTranslation()

  useEffect(() => {
    return () => {}
  }, [t])
}

export default useFullScreenNotice
