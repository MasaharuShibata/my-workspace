#!/usr/bin/env bash
# デモ撮影用アプリを組み立てて起動する。
#
#   bash my-recipe/video/demoapp/setup.sh [作業ディレクトリ]
#
# アプリ本体をコピーし、外部サービスを呼ぶ層だけを stubs/ のスタブに差し替えて
# http://localhost:3000 で起動する。**本番アプリは一切触らない。**
# 理由は CLAUDE.md「実機デモを差し込むとき」を参照(課金・本番DB汚染・レート制限)。
#
# 作業ディレクトリの既定はスクラッチパッド配下。コンテナが破棄されると消えるので、
# 撮影のたびにこのスクリプトを流し直すこと。

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$HERE/../.." && pwd)"          # my-recipe/
WORK="${1:-${TMPDIR:-/tmp}/demoapp}"

echo "アプリ: $APP"
echo "作業先: $WORK"

# ---- 1) アプリ本体をコピー ----
rm -rf "$WORK"
mkdir -p "$WORK"
cp -r "$APP"/app "$APP"/components "$APP"/lib "$APP"/supabase \
      "$APP"/package.json "$APP"/tsconfig.json "$APP"/next-env.d.ts "$WORK"/

# ---- 2) 外部サービスを呼ぶ層だけスタブに差し替え ----
cp "$HERE"/stubs/lib/claude.ts          "$WORK"/lib/claude.ts
cp "$HERE"/stubs/lib/supabase/server.ts "$WORK"/lib/supabase/server.ts
cp "$HERE"/stubs/next.config.mjs        "$WORK"/next.config.mjs

# ---- 3) スタブにしたぶんの依存を外す(インストールを軽くする) ----
python3 - "$WORK/package.json" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
for k in ("@anthropic-ai/sdk", "@supabase/supabase-js", "zod"):
    d["dependencies"].pop(k, None)
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
PY

# ---- 4) 起動 ----
cd "$WORK"
npm install --no-audit --no-fund >/dev/null 2>&1
# setsid で切り離す。そうしないと呼び出し元のシェルが終わるときに巻き添えで死ぬ
(setsid nohup npm run dev > "$WORK/dev.log" 2>&1 < /dev/null &)

for i in $(seq 1 24); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --noproxy '*' http://localhost:3000/ 2>/dev/null || true)"
  if [ "$code" = "200" ]; then
    echo "起動しました: http://localhost:3000"
    exit 0
  fi
  sleep 5
done

echo "起動できませんでした。ログ:" >&2
tail -30 "$WORK/dev.log" >&2
exit 1
