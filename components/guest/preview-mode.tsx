'use client'

import { createContext, useContext } from 'react'

// The guest components are rendered both on the real public site and inside
// the organizer's "Vista previa" iframe. Preview mode keeps the layout
// identical but neutralizes anything that would touch real guest state
// (sharing, checkout, the persisted cart).
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
