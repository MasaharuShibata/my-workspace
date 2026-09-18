import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// メールのマジックリンク(?token_hash=...&type=...)の飛び先。
// OAuthの ?code= によるPKCE交換とは異なり、token_hashによる検証はブラウザをまたいでも
// (スマホのメールアプリが別ブラウザでリンクを開いても)正しく完了する。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const redirectTo = new URL(next, origin);
      redirectTo.searchParams.set("login", "success");
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
