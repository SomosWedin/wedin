'use client'

import { createContext, useContext } from 'react'

const PreviewModeContext = createContext(false)

export function PreviewModeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PreviewModeContext.Provider value={true}>
      {children}
    </PreviewModeContext.Provider>
  )
}

export function useIsPreviewMode() {
  return useContext(PreviewModeContext)
}
