import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ログイン機能を廃止したため、cookieベースのセッション管理は不要。
// anonキーで直接Supabaseにアクセスするだけのシンプルなクライアント。
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
