'use client'

import { useState, useEffect } from 'react'
import AccessGate from '@/components/AccessGate'

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [verified, setVerified] = useState<boolean | null>(null)

  useEffect(() => {
    const isVerified = localStorage.getItem('accessVerified') === 'true'
    setVerified(isVerified)
  }, [])

  if (verified === null) return null
  if (!verified) return <AccessGate onSuccess={() => setVerified(true)} />
  return <>{children}</>
}
