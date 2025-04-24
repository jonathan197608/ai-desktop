async function useNavBackgroundColor(windowStyle: string) {
  if ((window.isMac) && windowStyle === 'transparent') {
    return 'transparent'
  }
  return 'var(--navbar-background)'
}

export default useNavBackgroundColor
