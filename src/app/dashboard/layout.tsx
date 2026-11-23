'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getProfile } from '@/lib/data/profiles'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import type { Profile } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login/')
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then((p) => setProfile(p))
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        businessName={profile?.business_name ?? null}
        userEmail={user.email ?? null}
      />
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r min-h-[calc(100vh-3.5rem)]">
          <Sidebar />
        </aside>
        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
