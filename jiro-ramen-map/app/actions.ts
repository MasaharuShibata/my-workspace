"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeGlobalAverage, computeScore } from "@/lib/score";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}

export async function addShop(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const prefecture = String(formData.get("prefecture") ?? "").trim() || null;

  if (!name || !address) {
    return { error: "店名と住所を入力してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const { error } = await supabase
    .from("shops")
    .insert({ name, address, prefecture, created_by: user.id });

  if (error) {
    return { error: "登録に失敗しました。時間をおいて再度お試しください。" };
  }

  revalidatePath("/");
  return { error: null };
}

export async function toggleFavorite(shopId: string, isFavorited: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。" };
  }

  if (isFavorited) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("shop_id", shopId);
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, shop_id: shopId });
  }

  revalidatePath("/");
  revalidatePath("/favorites");
  return { error: null };
}

type PlaceSearchResult = {
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location?: { lat: number; lng: number } };
};

async function fetchPlaceData(query: string, apiKey: string): Promise<PlaceSearchResult | null> {
  const searchUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  searchUrl.searchParams.set("input", query);
  searchUrl.searchParams.set("inputtype", "textquery");
  searchUrl.searchParams.set("fields", "place_id");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  const searchJson = await searchRes.json();
  const placeId = searchJson?.candidates?.[0]?.place_id;
  if (!placeId) return null;

  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", placeId);
  detailsUrl.searchParams.set("fields", "place_id,rating,user_ratings_total,geometry");
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetch(detailsUrl.toString());
  const detailsJson = await detailsRes.json();
  return detailsJson?.result ?? null;
}

/**
 * ログイン中のユーザーが押す「データを更新」ボタンから呼ばれる。
 * 各店舗をGoogle Places APIで検索し、評価・口コミ数・座標を取得して保存、
 * 全店舗そろった時点でおすすめスコアを再計算する。
 */
export async function syncShopData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ログインが必要です。" };
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { error: "Google Maps APIキーが設定されていません。" };
  }

  const admin = createAdminClient();
  const { data: shops, error: fetchError } = await admin.from("shops").select("*");
  if (fetchError || !shops) {
    return { error: "店舗データの取得に失敗しました。" };
  }

  for (const shop of shops) {
    try {
      const result = await fetchPlaceData(`${shop.name} ${shop.address}`, apiKey);
      if (!result) continue;

      await admin
        .from("shops")
        .update({
          google_place_id: result.place_id ?? shop.google_place_id,
          rating: result.rating ?? shop.rating,
          review_count: result.user_ratings_total ?? shop.review_count,
          lat: result.geometry?.location?.lat ?? shop.lat,
          lng: result.geometry?.location?.lng ?? shop.lng,
          synced_at: new Date().toISOString(),
        })
        .eq("id", shop.id);
    } catch {
      // 1件失敗しても他の店舗の同期は継続する
      continue;
    }
  }

  const { data: refreshed } = await admin.from("shops").select("id, rating, review_count");
  if (refreshed) {
    const globalAverage = computeGlobalAverage(refreshed);
    for (const shop of refreshed) {
      if (shop.rating === null || shop.review_count === null) continue;
      const score = computeScore(shop.rating, shop.review_count, globalAverage);
      await admin.from("shops").update({ score }).eq("id", shop.id);
    }
  }

  revalidatePath("/");
  return { error: null };
}
