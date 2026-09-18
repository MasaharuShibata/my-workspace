import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * service_role キーを使う管理者クライアント。RLSを無視して書き込めるため、
 * サーバー専用コード(Server Action / Route Handler)からのみ呼び出すこと。
 * ブラウザに渡したり、クライアントコンポーネントから呼び出したりしないこと。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
