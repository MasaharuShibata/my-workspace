// ===== デモ撮影用のスタブ =====
// 本物の lib/claude.ts は Claude API を呼ぶ。撮影で課金を発生させないため、
// 同じ型の決め打ちレシピを、あえて2秒待ってから返す(「考案中...」を映すため)。
import type { Genre, Recipe } from "@/lib/types";

const CANNED: Recipe[] = [
  {
    title: "鶏むね肉と白菜の生姜炒め",
    cookingTime: "20分",
    servings: "2人分",
    ingredients: [
      "鶏むね肉 250g",
      "白菜 1/4個",
      "しょうが 1かけ",
      "酒 大さじ1",
      "片栗粉 大さじ1",
      "醤油 大さじ1.5",
      "ごま油 小さじ1",
    ],
    steps: [
      "鶏むね肉を一口大のそぎ切りにし、酒と片栗粉をもみ込んで10分おく。",
      "白菜は芯と葉に分け、芯は細切り、葉はざく切りにする。しょうがはせん切り。",
      "フライパンにごま油を熱し、鶏肉を中火で両面3分ずつ焼いて取り出す。",
      "同じフライパンでしょうがと白菜の芯を炒め、しんなりしたら葉を加える。",
      "鶏肉を戻し、醤油を回しかけて全体を1分炒め合わせる。",
    ],
  },
  {
    title: "鶏むねと白菜のとろみスープ",
    cookingTime: "25分",
    servings: "2人分",
    ingredients: [
      "鶏むね肉 200g",
      "白菜 1/6個",
      "しょうが 1かけ",
      "鶏がらスープの素 小さじ2",
      "水 600ml",
      "片栗粉 大さじ1",
    ],
    steps: [
      "鶏むね肉を薄いそぎ切りにする。白菜は1cm幅に切る。",
      "鍋に水と鶏がらスープの素、せん切りのしょうがを入れて沸かす。",
      "鶏肉を1枚ずつ入れ、白菜を加えて7分ほど煮る。",
      "水溶き片栗粉を回し入れ、とろみをつけて火を止める。",
    ],
  },
];

export async function generateRecipe(
  _ingredients: string[],
  _genre: Genre,
  avoidTitle?: string
): Promise<Recipe> {
  await new Promise((r) => setTimeout(r, 3000));
  const picked = avoidTitle ? CANNED.find((r) => r.title !== avoidTitle) : CANNED[0];
  return picked ?? CANNED[0];
}
