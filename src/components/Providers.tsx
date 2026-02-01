'use client'

import { AuthProvider } from './AuthProvider'
import { SimulationProvider } from './SimulationProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SimulationProvider>
        {children}
      </SimulationProvider>
    </AuthProvider>
  )
}
