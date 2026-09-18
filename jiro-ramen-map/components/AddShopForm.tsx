"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addShop } from "@/app/actions";

export default function AddShopForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    const result = await addShop(formData);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    formRef.current?.reset();
    router.push("/");
  }

  return (
    <form ref={formRef} action={handleSubmit} className="add-shop-form">
      <label>
        店名
        <input name="name" required placeholder="例: ラーメン二郎 三田本店" />
      </label>
      <label>
        住所
        <input name="address" required placeholder="例: 東京都港区芝5-24-4" />
      </label>
      <label>
        都道府県(任意)
        <input name="prefecture" placeholder="例: 東京都" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "登録中..." : "登録する"}
      </button>
    </form>
  );
}
