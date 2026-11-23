export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/data/profiles'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getProfile(user.id)

  return (
    <div className="min-h-screen bg-background">
      <Header businessName={profile?.business_name ?? null} userEmail={user.email ?? null} />
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 shrink-0 border-r min-h-[calc(100vh-3.5rem)]">
          <Sidebar />
        </aside>
        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
