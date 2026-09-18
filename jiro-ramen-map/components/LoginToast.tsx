"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginToastInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams.get("login") !== "success") return;

    setVisible(true);

    // URLから ?login=success を取り除く(リロード時に再表示されないように)
    const params = new URLSearchParams(searchParams.toString());
    params.delete("login");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });

    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return <div className="login-toast">ログインしました</div>;
}

export default function LoginToast() {
  return (
    <Suspense fallback={null}>
      <LoginToastInner />
    </Suspense>
  );
}
