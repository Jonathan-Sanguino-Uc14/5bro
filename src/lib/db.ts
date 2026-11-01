import { supabase } from './supabase';

const initDb = async () => {};

interface DbUser {
  id: string;
  businessName: string;
  userName: string | null;
  email: string | null;
}

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No autenticado');
  return session.user.id;
}

async function getUser(): Promise<DbUser | null> {
  try {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, business_name, user_name, email')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      businessName: data.business_name,
      userName: data.user_name,
      email: data.email,
    };
  } catch {
    return null;
  }
}

async function createUser(
  businessName: string,
  email?: string,
): Promise<DbUser> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, business_name: businessName.trim(), email: email?.trim() ?? '' })
    .select('id, business_name, user_name, email')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    businessName: data.business_name,
    userName: data.user_name,
    email: data.email,
  };
}

async function updateUser(
  _id: string,
  fields: { businessName?: string; userName?: string },
): Promise<void> {
  const userId = await getUserId();
  const update: Record<string, string | null> = {};
  if (fields.businessName !== undefined) update.business_name = fields.businessName.trim();
  if (fields.userName !== undefined) update.user_name = fields.userName.trim() || null;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

async function getSetting(key: string): Promise<string | null> {
  try {
    const userId = await getUserId();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

async function setSetting(key: string, value: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, key, value });
  if (error) throw new Error(error.message);
}

export { initDb, getUser, createUser, updateUser, getSetting, setSetting };
export type { DbUser };
