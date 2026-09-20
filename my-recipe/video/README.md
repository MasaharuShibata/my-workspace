# my-recipe 開発教材 動画版

`my-recipe/tutorial/` の教材を、スライド＋ナレーションの動画に変換する仕組みです。

台本(YAML)から、スライド画像・ナレーション音声・字幕を生成し、MP4に組み立てます。

## このディレクトリに何があるか

| パス | 中身 |
|---|---|
| `chapters/*.yaml` | 章ごとの台本。スライド1枚につき「画面に出す内容」と「ナレーション」を持つ |
| `scripts/build.py` | ビルド本体。台本 → 画像 → 音声 → MP4 + SRT |
| `scripts/render.mjs` | スライドの描画。1プロセスで全コマを撮る |
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

Noto Sans JP と Roboto Mono は、初回実行時に `.fonts/` へ自動で取得します。

## 使い方

```
python3 scripts/build.py chapters/01_web-app-overview.yaml
```

`out/01_web-app-overview.mp4` と `out/01_web-app-overview.srt` ができます。

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

細かい記法をいくつか。

- 表のセル先頭の `*` は強調（オレンジの太字）、`~` は淡いグレーになります
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
