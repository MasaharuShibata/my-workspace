import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Genre, Recipe } from "@/lib/types";

// レシピ考案という単純なテキスト生成タスクのため、最も安価なモデルを採用する
// (詳細設計書 3.1 参照)。拡張思考(thinking)・ストリーミングも使用しない。
const MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = `あなたは家庭料理のレシピを考案する料理アシスタントです。
与えられた食材を活かした、家庭で作りやすい料理のレシピを1つ考案してください。
塩・こしょう・醤油・油などの基本的な調味料は、リストに無くても使って構いません。
調理時間(目安)と人数(何人分)も必ず出力してください。
出力は指定された形式のみとし、それ以外の説明文は含めないでください。`;

const RecipeSchema = z.object({
  title: z.string().describe("レシピ名"),
  cookingTime: z.string().describe("調理時間の目安(例: 20分)"),
  servings: z.string().describe("何人分か(例: 2人分)"),
  ingredients: z.array(z.string()).describe("材料。1要素が1つの材料と量(例: 鶏むね肉 200g)"),
  steps: z.array(z.string()).describe("作り方の手順。1要素が1つの手順"),
});

const client = new Anthropic();

export async function generateRecipe(
  ingredients: string[],
  genre: Genre,
  avoidTitle?: string
): Promise<Recipe> {
  const genreInstruction =
    genre === "こだわりなし"
      ? ""
      : `ジャンルは「${genre}」の料理にしてください。\n`;
  const avoidInstruction = avoidTitle
    ? `直前に提案した「${avoidTitle}」とは別の料理を考えてください。\n`
    : "";

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${genreInstruction}${avoidInstruction}次の食材を使ったレシピを考えてください: ${ingredients.join("、")}`,
      },
    ],
    output_config: {
      format: zodOutputFormat(RecipeSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("レシピの形式を解析できませんでした。");
  }

  return response.parsed_output;
}
