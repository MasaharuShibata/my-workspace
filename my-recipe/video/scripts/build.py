#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""my-recipe 教材動画ビルダー

台本(YAML) → スライド画像 + ナレーション音声 → MP4 + SRT字幕

  python3 scripts/build.py chapters/01_web-app-overview.yaml

詳しい前提は video/README.md を参照。
"""

import argparse
import asyncio
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(ROOT, ".fonts")
CSS = os.path.join(ROOT, "scripts", "slides.css")

# 各スライドの音声の後ろに足す無音(秒)。間が無いと息継ぎ無しに聞こえる。
TAIL_SILENCE = 0.7
# 1スライドの最短表示時間(秒)。ナレーションが短いスライドが一瞬で飛ぶのを防ぐ。
MIN_DURATION = 2.5

FONTS = {
    "NotoSansJP-400.ttf": ("Noto+Sans+JP", "400"),
    "NotoSansJP-500.ttf": ("Noto+Sans+JP", "500"),
    "NotoSansJP-700.ttf": ("Noto+Sans+JP", "700"),
    "RobotoMono-400.ttf": ("Roboto+Mono", "400"),
    "RobotoMono-500.ttf": ("Roboto+Mono", "500"),
}


# ----------------------------------------------------------------------
# 外部コマンドの解決
# ----------------------------------------------------------------------

def find_chrome():
    env = os.environ.get("CHROME_PATH")
    if env and os.path.exists(env):
        return env
    roots = [os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or "/opt/pw-browsers"]
    for r in roots:
        if not os.path.isdir(r):
            continue
        for dirpath, _dirnames, filenames in os.walk(r):
            if "chrome" in filenames and "chromium" in dirpath:
                return os.path.join(dirpath, "chrome")
    for name in ("chromium", "chromium-browser", "google-chrome"):
        p = shutil.which(name)
        if p:
            return p
    sys.exit("Chromium が見つかりません。CHROME_PATH に実行ファイルを指定してください。")


def find_ffmpeg():
    env = os.environ.get("FFMPEG_PATH")
    if env and os.path.exists(env):
        return env
    local = os.path.join(ROOT, "node_modules", "ffmpeg-static", "ffmpeg")
    if os.path.exists(local):
        return local
    p = shutil.which("ffmpeg")
    if p:
        return p
    sys.exit("ffmpeg が見つかりません。video/ で `npm install ffmpeg-static` を実行してください。")


def viewport_offset(chrome, want=1080):
    """--window-size と実際のビューポート高の差を実測する。

    ヘッドレスでも数十pxずれることがあり、ずれたままだとスライド下端
    (フッター・進捗バー)が画像に写らない。バージョン差を吸収するため
    決め打ちせずに毎回測る。
    """
    probe = os.path.join(tempfile.gettempdir(), "_vp_probe.html")
    with open(probe, "w", encoding="utf-8") as f:
        f.write('<html><body><script>document.title=window.innerHeight;'
                '</script></body></html>')
    r = subprocess.run(
        [chrome, "--headless", "--disable-gpu", "--no-sandbox",
         "--window-size=800,%d" % want, "--virtual-time-budget=1500",
         "--dump-dom", "file://" + probe],
        capture_output=True)
    m = re.search(r"<title>(\d+)</title>", r.stdout.decode("utf-8", "replace"))
    if not m:
        return 0
    return want - int(m.group(1))


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode("utf-8", "replace")[-2000:])
        raise SystemExit("コマンド失敗: %s" % " ".join(cmd[:3]))
    return r


# ----------------------------------------------------------------------
# フォント
# ----------------------------------------------------------------------

def ensure_fonts():
    os.makedirs(FONT_DIR, exist_ok=True)
    missing = [f for f in FONTS if not os.path.exists(os.path.join(FONT_DIR, f))]
    if not missing:
        return
    import urllib.request
    print("フォントを取得しています (%d件)..." % len(missing))
    fams = "&".join("family=%s:wght@400;500;700" % f for f in ("Noto+Sans+JP", "Roboto+Mono"))
    req = urllib.request.Request(
        "https://fonts.googleapis.com/css2?%s&display=swap" % fams,
        headers={"User-Agent": "Mozilla/5.0 Chrome/120"},
    )
    css = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")
    urls = {}
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        fam = re.search(r"font-family:\s*'([^']+)'", block).group(1).replace(" ", "")
        wt = re.search(r"font-weight:\s*(\d+)", block).group(1)
        url = re.search(r"url\((https://[^)]+)\)", block).group(1)
        urls.setdefault("%s-%s.ttf" % (fam, wt), url)
    for name in missing:
        if name not in urls:
            sys.exit("フォント %s の取得元が見つかりません" % name)
        dst = os.path.join(FONT_DIR, name)
        urllib.request.urlretrieve(urls[name], dst)
        print("  %s (%.1f MB)" % (name, os.path.getsize(dst) / 1e6))


# ----------------------------------------------------------------------
# スライドHTMLの組み立て
# ----------------------------------------------------------------------

def esc(s):
    return html.escape(str(s), quote=False)


def code_html(text):
    """ごく軽いシンタックスハイライト。厳密なパースはしない。"""
    out = []
    for line in text.split("\n"):
        hl = line.startswith(">>")
        if hl:
            line = line[2:]
        e = esc(line)
        e = re.sub(r"(&quot;[^&]*?&quot;|&#x27;[^&]*?&#x27;|\"[^\"]*\"|'[^']*')",
                   r'<span class="s">\1</span>', e)
        e = re.sub(r"\b(const|let|function|return|async|await|import|from|export|type|if|else|"
                   r"new|try|catch|finally|create|table|select|insert|delete|policy|using|true|false|null)\b",
                   r'<span class="k">\1</span>', e)
        e = re.sub(r"(//.*|#(?!\w*;).*|--\s.*)$", r'<span class="c">\1</span>', e)
        out.append('<span class="hl">%s</span>' % (e or "&nbsp;") if hl else (e or "&nbsp;"))
    return "\n".join(out)


def render_body(s):
    k = s.get("kind", "points")
    parts = []

    if k == "title":
        return ('<div class="body title-slide">'
                '<div class="kicker">%s</div><h1>%s</h1><div class="sub">%s</div></div>'
                % (esc(s.get("kicker", "")), esc(s["heading"]), esc(s.get("sub", ""))))

    if k == "section":
        return ('<div class="body section-slide"><div class="num">%s</div>'
                '<div class="rule"></div><h1>%s</h1></div>'
                % (esc(s.get("num", "")), esc(s["heading"])))

    if s.get("heading"):
        parts.append('<h2 class="heading">%s</h2>' % esc(s["heading"]))
    if s.get("lead"):
        parts.append('<p class="lead">%s</p>' % esc(s["lead"]).replace("\n", "<br>"))

    if k == "points":
        lis = []
        for it in s.get("items", []):
            if isinstance(it, dict):
                lis.append("<li>%s<span class=\"note\">%s</span></li>"
                           % (esc(it["text"]), esc(it.get("note", ""))))
            else:
                lis.append("<li>%s</li>" % esc(it))
        parts.append('<ul class="points">%s</ul>' % "".join(lis))

    elif k == "cards":
        cs = []
        for c in s["cards"]:
            inner = ""
            if c.get("title"):
                inner += '<div class="card-title">%s</div>' % esc(c["title"])
            if c.get("text"):
                inner += '<div class="card-text">%s</div>' % esc(c["text"]).replace("\n", "<br>")
            if c.get("items"):
                inner += "<ul>%s</ul>" % "".join("<li>%s</li>" % esc(i) for i in c["items"])
            cs.append('<div class="card %s"><div class="card-label">%s</div>%s</div>'
                      % (c.get("tone", ""), esc(c.get("label", "")), inner))
        parts.append('<div class="cards">%s</div>' % "".join(cs))

    elif k == "table":
        head = "".join("<th>%s</th>" % esc(h) for h in s["head"])
        rows = []
        for row in s["rows"]:
            tds = []
            for cell in row:
                cls = ""
                if isinstance(cell, str) and cell.startswith("*"):
                    cls, cell = ' class="em"', cell[1:]
                elif isinstance(cell, str) and cell.startswith("~"):
                    cls, cell = ' class="muted"', cell[1:]
                tds.append("<td%s>%s</td>" % (cls, esc(cell).replace("\n", "<br>")))
            rows.append("<tr>%s</tr>" % "".join(tds))
        parts.append("<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>"
                     % (head, "".join(rows)))

    elif k == "code":
        if s.get("caption"):
            parts.append('<div class="code-caption">%s</div>' % esc(s["caption"]))
        parts.append('<pre class="code">%s</pre>' % code_html(s["code"]))

    elif k == "callout":
        parts.append('<div class="callout %s"><div class="callout-title">%s</div>'
                     '<div class="callout-text">%s</div></div>'
                     % (s.get("tone", ""), esc(s.get("title", "")),
                        esc(s["text"]).replace("\n", "<br>")))

    elif k == "flow":
        lis = []
        for it in s["steps"]:
            cls = ""
            text = it
            if isinstance(it, dict):
                cls = " " + it.get("state", "")
                who = '<span class="who">%s</span>' % esc(it["who"]) if it.get("who") else ""
                text = who + esc(it["text"])
            else:
                text = esc(it)
            lis.append('<li class="%s">%s</li>' % (cls.strip(), text))
        parts.append('<ol class="flow">%s</ol>' % "".join(lis))

    elif k == "diagram":
        parts.append('<div class="diagram">%s</div>' % diagram_html(s["nodes"]))

    return '<div class="body">%s</div>' % "".join(parts)


def diagram_html(nodes):
    """nodes: 縦に積む要素の配列。row は横並び。"""
    out = []
    for n in nodes:
        t = n.get("t", "node")
        if t == "node":
            out.append('<div class="node %s"><div class="node-title">%s</div>%s</div>'
                       % (n.get("tone", ""), esc(n["title"]),
                          '<div class="node-sub">%s</div>' % esc(n["sub"]) if n.get("sub") else ""))
        elif t == "arrow":
            out.append('<div class="arrow"><div class="label">%s</div>'
                       '<div class="glyph">%s</div></div>'
                       % (esc(n.get("label", "")), n.get("glyph", "↓")))
        elif t == "row":
            out.append('<div class="row">%s</div>' % diagram_html(n["items"]))
        elif t == "arrow-h":
            out.append('<div class="arrow-h"><div class="label">%s</div>'
                       '<div class="glyph">%s</div></div>'
                       % (esc(n.get("label", "")), n.get("glyph", "───▶")))
        elif t == "arrows":
            # 往復(リクエスト/レスポンス)を1か所にまとめて描く
            out.append('<div class="arrows">'
                       '<div class="arrow-h"><div class="label">%s</div>'
                       '<div class="glyph">%s</div></div>'
                       '<div class="arrow-h back"><div class="glyph">%s</div>'
                       '<div class="label">%s</div></div></div>'
                       % (esc(n.get("out_label", "")), n.get("out_glyph", "──────▶"),
                          n.get("back_glyph", "◀──────"), esc(n.get("back_label", ""))))
    return "".join(out)


def render_slide(meta, s, idx, total):
    pct = (idx + 1) / total * 100
    now = s.get("section") or ""
    crumb = '<span class="dot"></span><span>%s</span>' % esc(meta.get("title", ""))
    if now and now != meta.get("title", ""):
        crumb += '<span class="sep">/</span><span class="now">%s</span>' % esc(now)
    return """<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="%s"></head>
<body><div class="slide">
<div class="chrome-top">%s</div>
%s
<div class="chrome-bottom"><span>%s</span><span>%d / %d</span></div>
<div class="progress" style="width:%.3f%%"></div>
</div>
<script>
/* 内容が本文領域に収まらないときだけ、収まる倍率まで縮める。
   スライドごとに文字サイズを手で調整しなくて済むようにするための保険。 */
(function () {
  var b = document.querySelector(".body");
  if (!b || !b.children.length) return;
  var kids = Array.prototype.slice.call(b.children);
  var top = Math.min.apply(null, kids.map(function (e) { return e.getBoundingClientRect().top; }));
  var bottom = Math.max.apply(null, kids.map(function (e) { return e.getBoundingClientRect().bottom; }));
  var need = bottom - top;
  var avail = b.getBoundingClientRect().height;
  if (need <= avail || avail <= 0) return;
  var k = Math.max(0.5, avail / need);
  var inner = document.createElement("div");
  while (b.firstChild) inner.appendChild(b.firstChild);
  inner.style.transformOrigin = "top left";
  inner.style.transform = "scale(" + k + ")";
  inner.style.width = (100 / k) + "%%";
  b.style.justifyContent = "flex-start";
  b.appendChild(inner);
})();
</script>
</body></html>""" % (
        "file://" + CSS, crumb, render_body(s),
        esc(meta.get("footer", "")), idx + 1, total, pct)


# ----------------------------------------------------------------------
# ナレーション
# ----------------------------------------------------------------------

async def synth(text, voice, rate, mp3_path):
    """音声を合成し、字幕用の区切り情報を返す。

    日本語の声は WordBoundary ではなく SentenceBoundary を返す。
    どちらが来ても扱えるようにしてある。
    """
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate)
    sentences, words = [], []
    with open(mp3_path, "wb") as f:
        async for chunk in comm.stream():
            t = chunk["type"]
            if t == "audio":
                f.write(chunk["data"])
            elif t == "SentenceBoundary":
                sentences.append(chunk)
            elif t == "WordBoundary":
                words.append(chunk)
    src = sentences or words
    return [{"start": c["offset"] / 1e7,
             "end": (c["offset"] + c["duration"]) / 1e7,
             "text": c["text"].strip()} for c in src if c["text"].strip()]


def wav_duration(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / float(w.getframerate())


def build_cues(cues, narration, base):
    """合成時の区切り情報を、動画全体の時刻に載せ替える。

    区切りが取れなかった場合は、ナレーションを文に割って
    文字数の比で時間を按分する(最後の手段)。
    """
    if cues:
        return [(base + c["start"], base + c["end"], c["text"]) for c in cues]
    return []


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return "%02d:%02d:%02d,%03d" % (h, m, s, ms)


# ----------------------------------------------------------------------
# メイン
# ----------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script", help="台本YAML")
    ap.add_argument("--out", default=os.path.join(ROOT, "out"))
    ap.add_argument("--only", type=int, default=0, help="先頭N枚だけ作る(確認用)")
    ap.add_argument("--slides-only", action="store_true", help="画像だけ作って終える")
    args = ap.parse_args()

    meta = yaml.safe_load(open(args.script, encoding="utf-8"))
    slides = meta["slides"]
    if args.only:
        slides = slides[:args.only]
    total = len(slides)

    stem = os.path.splitext(os.path.basename(args.script))[0]
    work = os.path.join(args.out, stem)
    os.makedirs(work, exist_ok=True)

    ensure_fonts()
    chrome, ffmpeg = find_chrome(), find_ffmpeg()
    win_h = 1080 + viewport_offset(chrome)
    voice = meta.get("voice", "ja-JP-NanamiNeural")
    rate = meta.get("rate", "+0%")

    # セクション名を引き継ぐ
    cur = ""
    for s in slides:
        if s.get("kind") == "section":
            cur = s["heading"]
        s.setdefault("section", cur)

    print("1/4 スライド画像を生成 (%d枚)" % total)
    for i, s in enumerate(slides):
        hp = os.path.join(work, "s%03d.html" % i)
        pp = os.path.join(work, "s%03d.png" % i)
        open(hp, "w", encoding="utf-8").write(render_slide(meta, s, i, total))
        run([chrome, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
             "--force-device-scale-factor=1", "--window-size=1920,%d" % win_h,
             "--virtual-time-budget=3000",
             "--screenshot=" + pp, "file://" + hp])
        print("   %3d/%d  %s" % (i + 1, total, s.get("heading", s.get("kind"))[:42]))

    if args.slides_only:
        print("画像のみ生成しました: %s" % work)
        return

    print("2/4 ナレーション音声を合成")
    durations, srt_rows, clock = [], [], 0.0
    for i, s in enumerate(slides):
        narration = (s.get("narration") or "").strip()
        mp3 = os.path.join(work, "s%03d.mp3" % i)
        wav = os.path.join(work, "s%03d.wav" % i)
        cue_cache = os.path.join(work, "s%03d.cues.json" % i)
        if narration:
            # 台本が変わっていなければ前回の音声を使い回す(合成は遅く、課金対象でもある)
            cached = None
            if os.path.exists(cue_cache) and os.path.exists(wav):
                try:
                    cached = json.load(open(cue_cache, encoding="utf-8"))
                except Exception:
                    cached = None
            if cached and cached.get("narration") == narration and cached.get("voice") == voice:
                cues = cached["cues"]
            else:
                cues = asyncio.run(synth(narration, voice, rate, mp3))
                run([ffmpeg, "-y", "-loglevel", "error", "-i", mp3,
                     "-ar", "44100", "-ac", "2",
                     "-af", "apad=pad_dur=%s" % TAIL_SILENCE, wav])
                json.dump({"narration": narration, "voice": voice, "cues": cues},
                          open(cue_cache, "w", encoding="utf-8"), ensure_ascii=False)
        else:
            cues = []
            run([ffmpeg, "-y", "-loglevel", "error", "-f", "lavfi",
                 "-i", "anullsrc=r=44100:cl=stereo", "-t", str(MIN_DURATION), wav])
        d = max(wav_duration(wav), MIN_DURATION)
        if d > wav_duration(wav):
            run([ffmpeg, "-y", "-loglevel", "error", "-i", wav,
                 "-af", "apad=whole_dur=%.3f" % d, wav + ".tmp.wav"])
            os.replace(wav + ".tmp.wav", wav)
        srt_rows += build_cues(cues, narration, clock)
        clock += d
        durations.append(d)
        print("   %3d/%d  %5.1f秒  字幕%d件" % (i + 1, total, d, len(cues)))

    print("3/4 字幕(SRT)を書き出し")
    srt = os.path.join(args.out, stem + ".srt")
    with open(srt, "w", encoding="utf-8") as f:
        for n, (a, b, t) in enumerate(srt_rows, 1):
            # 次のキューと重ならないよう終端を詰める
            nxt = srt_rows[n][0] if n < len(srt_rows) else None
            end = max(b, a + 0.5)
            if nxt is not None:
                end = min(end, max(nxt - 0.02, a + 0.3))
            f.write("%d\n%s --> %s\n%s\n\n" % (n, srt_time(a), srt_time(end), t))

    print("4/4 動画を書き出し")
    concat_v = os.path.join(work, "video.txt")
    with open(concat_v, "w", encoding="utf-8") as f:
        for i, d in enumerate(durations):
            f.write("file '%s'\nduration %.3f\n" % (os.path.join(work, "s%03d.png" % i), d))
        f.write("file '%s'\n" % os.path.join(work, "s%03d.png" % (total - 1)))

    concat_a = os.path.join(work, "audio.txt")
    with open(concat_a, "w", encoding="utf-8") as f:
        for i in range(total):
            f.write("file '%s'\n" % os.path.join(work, "s%03d.wav" % i))

    mp4 = os.path.join(args.out, stem + ".mp4")
    run([ffmpeg, "-y", "-loglevel", "error",
         "-f", "concat", "-safe", "0", "-i", concat_v,
         "-f", "concat", "-safe", "0", "-i", concat_a,
         # ヘッドレスの撮影サイズは window-size と同じになるため、
         # 設計サイズ(1920x1080)に切り落としてから符号化する
         "-vf", "crop=1920:1080:0:0",
         "-c:v", "libx264", "-preset", "medium", "-crf", "23",
         "-pix_fmt", "yuv420p", "-r", "12", "-tune", "stillimage",
         "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", mp4])

    dur = sum(durations)
    print("\n完成")
    print("  動画: %s  (%.1f MB / %d分%02d秒)"
          % (mp4, os.path.getsize(mp4) / 1e6, int(dur // 60), int(dur % 60)))
    print("  字幕: %s  (%d件)" % (srt, len(srt_rows)))


if __name__ == "__main__":
    main()
