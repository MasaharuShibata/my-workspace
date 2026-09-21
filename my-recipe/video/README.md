# my-recipe 開発教材 動画版

`my-recipe/tutorial/` の教材を、スライド＋ナレーションの動画に変換する仕組みです。

台本(YAML)から、スライド画像・ナレーション音声・字幕を生成し、MP4に組み立てます。

## このディレクトリに何があるか

| パス | 中身 |
|---|---|
| `chapters/*.yaml` | 章ごとの台本。スライド1枚につき「画面に出す内容」と「ナレーション」を持つ |
| `scripts/build.py` | ビルド本体。台本 → 画像 → 音声 → MP4 + SRT |
| `scripts/render.mjs` | スライドの描画。1プロセスで全コマを撮る |
| `scripts/capture-demo.mjs` | 実機デモの撮影。アプリを操作しながら連写する |
| `scripts/slides.css` | スライドの見た目。配色はアプリ本体のデザイントークンを流用 |
| `out/` | 生成物。**Git管理しない**(`.gitignore`) |

**動画ファイル自体はリポジトリに入れていません。** 1章あたり数十MBになり、
全章ぶんをGitに入れると履歴から消せなくなるためです。必要なときに手元で生成してください。

## 必要なもの

- Python 3.9 以上
- Node.js（`ffmpeg-static` の取得に使う）
- Chromium（スライドの描画に使う）
- ネットワーク接続（音声合成とフォント取得）

## セットアップ

```
cd my-recipe/video
pip install pyyaml edge-tts
npm install ffmpeg-static playwright-core
```

Chromium は次の順で探します。見つからない場合は `CHROME_PATH` で指定してください。
描画は Playwright 経由で行うため、ビューポートは常に1920×1080ちょうどになります。

1. 環境変数 `CHROME_PATH`
2. `PLAYWRIGHT_BROWSERS_PATH`（既定 `/opt/pw-browsers`）配下
3. `PATH` 上の `chromium` / `chromium-browser` / `google-chrome`

⚠️ `scripts/capture-demo.mjs` はこの探索をせず、`CHROME_PATH` か playwright-core の
既定パスしか見ません。既定パスは playwright-core の版に紐づくため、環境に入っている
Chromium と食い違うと `Executable doesn't exist` で落ちます。撮影時は明示してください。

```
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  node scripts/capture-demo.mjs out/demo http://localhost:3000 --scenes input
```

Noto Sans JP と Roboto Mono は、初回実行時に `.fonts/` へ自動で取得します。

### プロキシ環境での音声合成

プロキシ経由の環境では、`edge-tts` が `certifi` のバンドルしか見ないため、
そのままだと `CERTIFICATE_VERIFY_FAILED` で止まります。足りない証明書を追記してください。

```
python3 - <<'EOF'
import certifi
ca = certifi.where()
cur = open(ca).read()
extra = open('/root/.ccr/ca-bundle.crt').read()
blocks = ["-----BEGIN CERTIFICATE-----" + b
          for b in extra.split("-----BEGIN CERTIFICATE-----")[1:]]
added = 0
with open(ca, "a") as f:
    for b in blocks:
        if b.strip() not in cur:
            f.write("\n" + b.strip() + "\n")
            added += 1
print("追加した証明書:", added)
EOF
```

⚠️ 「もう入っているか」を、ファイルの先頭や一部の文字列で判定しないこと。
`/root/.ccr/ca-bundle.crt` は **システムのルート証明書一式＋プロキシのCA** という
構成なので、先頭の証明書は `certifi` にも入っており、必ず誤判定します。
上のように**証明書ブロック単位**で比較してください。

## 使い方

```
python3 scripts/build.py chapters/01_web-app-overview.yaml
```

`out/01_web-app-overview.mp4` と `out/01_web-app-overview.srt` ができます。

台本に `kind: demo` のスライドがある章は、先にデモの撮影が要ります(後述)。

```
node scripts/capture-demo.mjs out/demo http://localhost:3000
```

確認用のオプションもあります。

```
# 先頭10枚だけ、画像だけ作る(台本を書きながらの確認用)
python3 scripts/build.py chapters/01_web-app-overview.yaml --slides-only --only 10
```

## 台本の書き方

1スライドが1つの要素です。`kind` で見た目が決まり、`narration` がそのまま
読み上げ音声と字幕になります。

```yaml
- kind: points
  heading: "この章のゴール"
  items:
  - text: "4つの登場人物の役割を、人に説明できる"
    note: "補足はここに書く"
  narration: |
    ゴールは3つです。……
```

使える `kind` は次のとおりです。**文字を減らし、図で見せる**ことを優先しています。

| kind | 用途 | 主なキー |
|---|---|---|
| `hook` | 冒頭の掴み。大きな一文 | `kicker` / `main` / `mark` / `sub` |
| `punch` | 一言で言い切る。話の節目に挟む | `text` / `em` / `ng` / `sub` |
| `bigstat` | 数字を大きく見せる | `value` / `unit` / `formula` / `caption` |
| `agenda` | 「3つの問い」の提示と進捗 | `items`（`text` / `state` / `at`） |
| `actors` | 登場人物をアイコン付きで並べる | `actors`（`icon` / `name` / `role` / `metaphor`） |
| `verdict` | ✕と○、AとBの対比を大きく | `sides`（`badge` / `head` / `desc` / `tone`） |
| `split` | 左に図・右に言葉 | `icon` または `diagram` / `big` / `small` |
| `anim` | コマ送りのアニメーション | `name` / `frames` |
| `demo` | 実機デモ(撮影済みのPNG列を流す) | `frames_dir` / `max_frames` |
| `title` | 表紙・次回予告 | `kicker` / `heading` / `sub` |
| `section` | 節の見出し | `num` / `heading` |
| `table` | 表 | `head` / `rows` |
| `code` | コード | `caption` / `code` |
| `callout` | 注意・強調 | `title` / `text` / `tone` |
| `flow` | 手順の流れ | `steps`（`who` / `text` / `state`） |
| `points` | 箇条書き（多用しない） | `items` |
| `cards` | 2〜3列の対比 | `cards` |
| `diagram` | 構成図 | `nodes` |

`icon` に指定できるのは `browser` / `server` / `database` / `ai` / `key` / `thief` です。
絵文字はフォント依存で化けるため、図版はインラインSVGで描いています。

### 段階表示（ナレーションに合わせて出す）

各スライドは、ナレーションの**文の切れ目に合わせて**要素が順に現れます。
箇条書き・表の行・カードなどは自動で段階が振られるので、台本側で指定は不要です。

一度に全部見せたいスライドは `reveal: false` を付けます。

順番を自分で決めたい場合は `at:` で段階番号を指定します（`0` はスライド表示と同時）。

```yaml
- kind: verdict
  sides:
  - { badge: "✕", head: "ブラウザにキーを置く", at: 1 }
  - { badge: "○", head: "サーバーにキーを置く", at: 2 }
```

### アニメーション

`kind: anim` は、1枚のスライドを `frames` 枚のコマとして撮り、尺に合わせて等間隔で流します。
用意してあるのは次の2つです。新しく足す場合は `build.py` の `ANIMS` に関数を書きます。

| name | 内容 |
|---|---|
| `request-response` | リクエストとレスポンスが往復する |
| `key-leak` | ブラウザに置いたAPIキーが外へ漏れていく |

### 実機デモ

`kind: demo` は、**アプリを実際に動かしているところ**をスライドとして挟みます。
コマはHTMLから描くのではなく、`scripts/capture-demo.mjs` が撮ったPNG列をそのまま流します。

#### 撮影の手順

撮影用のアプリは、スクリプトで組み立てます。**本番のアプリは触りません。**

```
bash demoapp/setup.sh                 # コピーを作り、スタブを当てて localhost:3000 で起動
node scripts/capture-demo.mjs out/demo http://localhost:3000 --scenes input,result
```

`setup.sh` は、アプリ一式を作業用ディレクトリへコピーし、外部サービスを呼ぶ層
(`lib/claude.ts` と `lib/supabase/server.ts`)だけを `demoapp/stubs/` のスタブに
差し替えて起動します。画面・CSS・操作は実物と同じままなので「実際のアプリ」です。

⚠️ **本番のアプリを撮らないこと。** Claude APIの課金が発生し、本番DBにテストデータが入り、
Vercelのレート制限を誘発します。必ず `setup.sh` で作ったコピーを撮ってください。

#### 撮れるシーン

シーンは `scripts/capture-demo.mjs` の `SCENES` に並んでいます。
`--scenes` で撮るものを絞れます（省略すると全部）。
**絞っても操作の流れは最初から最後まで通ります**（レシピが出ていないとお気に入り登録が
できない、といった前提があるため）。撮らないシーンは録画されないだけです。

| シーン | 内容 | 尺の目安 |
|---|---|---|
| `validation` | 空のまま送信 → エラー。11個入れて → エラー | 約10秒 |
| `input` | 食材を入力してジャンルを選び、ボタンを押す | 約8.5秒 |
| `thinking` | 「考案中...」。画面はほぼ静止する | 約3.5秒 |
| `result` | レシピが出る。スクロールして材料にチェック | 約14.5秒 |
| `save` | お気に入りに登録する | 約6.5秒 |
| `regenerate` | 別のレシピを提案してもらう | 約12.5秒 |
| `list` | 一覧を開く → カードを展開 → ジャンルで絞る | 約20秒 |
| `delete` | 一覧から削除する | 約7秒 |

どの章でどのシーンを使うかは `PROGRESS.md` の表で決めています。

シーンによっては、前のシーンが残した画面の状態を持ち越します（`validation` が出した
エラー文は、送信が通るまで消えません）。持ち越したくないシーンには `SCENES` の要素に
`{ reset: true }` を付けます。撮影を始める前にアプリを読み直すので、コマには写りません。

`out/demo/<シーン名>/0000.png ...` が出来るので、台本からはシーン名で指定します。

```yaml
- kind: demo
  frames_dir: "demo/input"
  narration: |
    冷蔵庫に残っている食材を打ち込んで、ジャンルを選びます。
```

画面下に出る番号付きのキャプションは、**実際に録画したシーンだけで採番**されます。
`--scenes` で絞っても 1 から連番になるので、章ごとに番号が飛ぶことはありません。

⚠️ **シーンの長さとナレーションの長さを合わせること。** コマは尺に合わせて等間隔に
引き伸ばされるため、ナレーションが撮影より長いとスロー再生になります。
文字入力やスクロールが入るシーンは、実時間の1.2倍を超えると目に見えて不自然です
(ほぼ静止している「考案中」のようなシーンは、2倍でも分かりません)。
撮影側の待ち時間を調整して合わせます。

なお、アプリ側の拡大は枠の `transform: scale()` ではなく、アプリ文書への
`zoom` で行っています。`transform` だとPlaywrightのクリック位置計算がずれて、
`<main> intercepts pointer events` で操作できなくなります。

細かい記法をいくつか。

- 表のセル先頭の `*` は強調（オレンジの太字）、`~` は淡いグレーになります
- 表は **5〜6行が上限**です。7行あたりから下端が切れ始めます（自動縮小は本文領域の
  高さを基準にするため、表のような縦長の要素では効ききりません）。
  行が増えるときは、まとめて行数を減らします（例: `1`〜`9` の9行 → `1 - 3` `4 - 5` … の4行）
- `cards` と `callout` の `tone` に `bad` / `danger` を指定すると赤系、`good` で緑系になります
- `flow` の `state` に `on` を指定すると強調、`dim` で背景に退きます。
  同じ手順を複数スライドに並べ、`on` の位置をずらすと、進行を追う演出になります
- 内容が1枚に収まらない場合は、収まる倍率まで自動で縮小されます

## 声とテンポ

台本の先頭で指定します。

```yaml
voice: "ja-JP-NanamiNeural"
rate: "+4%"
```

利用できる日本語の声は `edge-tts --list-voices | grep ja-JP` で確認できます。

## ⚠️ 音声合成について

ナレーションには `edge-tts` を使っています。これは Microsoft Edge の読み上げ機能を
利用するもので、**個人の学習用途を前提としています**。

公開配布や商用利用を検討する場合は、正規の音声合成サービス
（Azure Speech、Google Cloud Text-to-Speech など。APIキーと課金が必要）へ
差し替えてください。`scripts/build.py` の `synth()` だけを書き換えれば済むように
分離してあります。

## 既知の制約

- 動きは「コマ送り」です。フレーム間の補間(イージング)はありません
- ナレーション音声は毎回合成されるため、同じ台本でも尺が数百ミリ秒ずれることがあります
- 字幕は単語境界から文単位に組み直しています。固有名詞の区切りでずれる場合があります
