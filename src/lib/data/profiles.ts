import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, business_name, user_name, email')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[getProfile]', error.message)
    return null
  }
  return data as Profile
}
