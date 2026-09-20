// ===== デモ撮影用のスタブ =====
// 本物の lib/supabase/server.ts は Supabase に繋ぐ。撮影では本番DBを汚さないよう、
// メモリ上の配列で動く偽クライアントを返す。使うのは insert / select / delete の3系統。
type Row = Record<string, any>;

const g = globalThis as any;
if (!g.__demoRows) {
  g.__demoRows = [
    {
      id: "seed-1",
      title: "豚バラと大根のこっくり煮",
      genre: "和食",
      cooking_time: "40分",
      servings: "2人分",
      source_ingredients: "豚バラ肉、大根",
      ingredients: "豚バラ肉 200g\n大根 1/3本\n醤油 大さじ2\nみりん 大さじ2",
      steps: "大根を乱切りにする。\n豚バラを炒めて大根を加える。\n調味料を入れて20分煮る。",
      created_at: "2026-09-18T10:00:00.000Z",
    },
    {
      id: "seed-2",
      title: "白菜とベーコンのクリーム煮",
      genre: "洋食",
      cooking_time: "25分",
      servings: "2人分",
      source_ingredients: "白菜、ベーコン、牛乳",
      ingredients: "白菜 1/4個\nベーコン 60g\n牛乳 300ml\n薄力粉 大さじ2",
      steps: "白菜とベーコンを炒める。\n薄力粉を振り入れて炒める。\n牛乳を加えてとろみがつくまで煮る。",
      created_at: "2026-09-17T19:30:00.000Z",
    },
  ];
}
const rows: Row[] = g.__demoRows;

class Query implements PromiseLike<{ data: Row[] | null; error: null }> {
  private result: Row[];
  constructor(result: Row[]) {
    this.result = result;
  }
  select() {
    return this;
  }
  order(col: string, opt?: { ascending?: boolean }) {
    const asc = opt?.ascending ?? true;
    this.result = [...this.result].sort((a, b) =>
      asc ? String(a[col]).localeCompare(String(b[col])) : String(b[col]).localeCompare(String(a[col]))
    );
    return this;
  }
  eq(col: string, value: any) {
    this.result = this.result.filter((r) => r[col] === value);
    return this;
  }
  then<T1, T2>(
    onfulfilled?: ((v: { data: Row[] | null; error: null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve({ data: this.result, error: null }).then(onfulfilled, onrejected);
  }
}

class DeleteQuery implements PromiseLike<{ error: null }> {
  eq(col: string, value: any) {
    const i = rows.findIndex((r) => r[col] === value);
    if (i >= 0) rows.splice(i, 1);
    return this;
  }
  then<T1, T2>(
    onfulfilled?: ((v: { error: null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve({ error: null }).then(onfulfilled, onrejected);
  }
}

export function createClient() {
  return {
    from(_table: string) {
      return {
        insert(row: Row) {
          rows.unshift({
            id: "demo-" + Math.random().toString(36).slice(2, 9),
            created_at: new Date().toISOString(),
            ...row,
          });
          return Promise.resolve({ error: null });
        },
        select() {
          return new Query(rows);
        },
        delete() {
          return new DeleteQuery();
        },
      };
    },
  };
}
