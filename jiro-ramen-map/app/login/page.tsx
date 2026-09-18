"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>ログイン</h1>
        <p className="auth-desc">
          メールアドレス宛に届くリンクをタップするだけでログインできます(パスワード不要)。
        </p>

        {status === "sent" ? (
          <p className="auth-sent">
            {email} 宛にログイン用のメールを送信しました。メール内のリンクを開いてください。
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "送信中..." : "ログインリンクを送る"}
            </button>
            {status === "error" && (
              <p className="auth-error">
                送信に失敗しました。{errorMessage && `(${errorMessage})`}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
