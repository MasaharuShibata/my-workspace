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

# 絵文字はフォント依存で化けるため、図版はインラインSVGで描く。
ICONS = {
    "browser": """<svg viewBox="0 0 64 64" width="66" height="66" fill="none">
<rect x="6" y="12" width="52" height="40" rx="6" stroke="#2c231a" stroke-width="3"/>
<path d="M6 24h52" stroke="#2c231a" stroke-width="3"/>
<circle cx="14" cy="18" r="2.2" fill="#cf6a2c"/><circle cx="22" cy="18" r="2.2" fill="#ecdec4"/>
<rect x="14" y="31" width="24" height="4" rx="2" fill="#cf6a2c"/>
<rect x="14" y="40" width="34" height="4" rx="2" fill="#ecdec4"/></svg>""",
    "server": """<svg viewBox="0 0 64 64" width="66" height="66" fill="none">
<rect x="10" y="10" width="44" height="18" rx="4" stroke="#2c231a" stroke-width="3"/>
<rect x="10" y="36" width="44" height="18" rx="4" stroke="#2c231a" stroke-width="3"/>
<circle cx="20" cy="19" r="3" fill="#cf6a2c"/><circle cx="20" cy="45" r="3" fill="#cf6a2c"/>
<path d="M30 19h16M30 45h16" stroke="#ecdec4" stroke-width="3" stroke-linecap="round"/></svg>""",
    "database": """<svg viewBox="0 0 64 64" width="66" height="66" fill="none">
<ellipse cx="32" cy="16" rx="20" ry="7" stroke="#2c231a" stroke-width="3"/>
<path d="M12 16v32c0 3.9 9 7 20 7s20-3.1 20-7V16" stroke="#2c231a" stroke-width="3"/>
<path d="M12 32c0 3.9 9 7 20 7s20-3.1 20-7" stroke="#ecdec4" stroke-width="3"/></svg>""",
    "ai": """<svg viewBox="0 0 64 64" width="66" height="66" fill="none">
<rect x="12" y="18" width="40" height="32" rx="8" stroke="#2c231a" stroke-width="3"/>
<circle cx="24" cy="32" r="4" fill="#cf6a2c"/><circle cx="40" cy="32" r="4" fill="#cf6a2c"/>
<path d="M26 42h12" stroke="#2c231a" stroke-width="3" stroke-linecap="round"/>
<path d="M32 18v-8M24 10h16" stroke="#2c231a" stroke-width="3" stroke-linecap="round"/></svg>""",
    "key": """<svg viewBox="0 0 64 64" width="52" height="52" fill="none">
<circle cx="22" cy="32" r="11" stroke="#b3402c" stroke-width="4"/>
<path d="M33 32h21M46 32v9M54 32v7" stroke="#b3402c" stroke-width="4" stroke-linecap="round"/></svg>""",
    "thief": """<svg viewBox="0 0 64 64" width="54" height="54" fill="none">
<circle cx="32" cy="22" r="11" stroke="#b3402c" stroke-width="3"/>
<path d="M21 20h22" stroke="#b3402c" stroke-width="6"/>
<path d="M12 54c0-11 9-18 20-18s20 7 20 18" stroke="#b3402c" stroke-width="3"/></svg>""",
}


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


def reveal_attr(item, default=None):
    """dict なら 'at' を段階番号として取り出す。"""
    if isinstance(item, dict) and item.get("at") is not None:
        return ' data-reveal="%d"' % int(item["at"])
    if default is not None:
        return ' data-reveal="%d"' % default
    return ""


def render_hook(s):
    main = esc(s["main"]).replace("\n", "<br>")
    for w in s.get("mark", []):
        main = main.replace(esc(w), '<span class="mark">%s</span>' % esc(w))
    return ('<div class="body hook-slide">'
            '<div class="hook-kicker"%s>%s</div>'
            '<div class="hook-main"%s>%s</div>'
            '<div class="hook-sub"%s>%s</div></div>'
            % (' data-reveal="0"', esc(s.get("kicker", "")),
               ' data-reveal="0"', main,
               ' data-reveal="1"', esc(s.get("sub", "")).replace("\n", "<br>")))


def render_bigstat(s):
    cls = " calm" if s.get("tone") == "calm" else ""
    parts = ['<div class="value%s" data-reveal="0">%s<span class="unit">%s</span></div>'
             % (cls, esc(s["value"]), esc(s.get("unit", "")))]
    if s.get("formula"):
        parts.append('<div class="formula" data-reveal="1">%s</div>' % esc(s["formula"]))
    parts.append('<div class="caption" data-reveal="%d">%s</div>'
                 % (2 if s.get("formula") else 1, esc(s["caption"]).replace("\n", "<br>")))
    return '<div class="body"><div class="bigstat">%s</div></div>' % "".join(parts)


def render_punch(s):
    t = esc(s["text"]).replace("\n", "<br>")
    for w in s.get("em", []):
        t = t.replace(esc(w), '<span class="em">%s</span>' % esc(w))
    for w in s.get("ng", []):
        t = t.replace(esc(w), '<span class="ng">%s</span>' % esc(w))
    body = '<div class="punch" data-reveal="0">%s</div>' % t
    if s.get("sub"):
        body += '<div class="punch-sub" data-reveal="1">%s</div>' % esc(s["sub"])
    return '<div class="body">%s</div>' % body


def render_actors(s):
    cards = []
    for i, a in enumerate(s["actors"]):
        cards.append('<div class="actor %s" data-reveal="%d">'
                     '<div class="glyph">%s</div>'
                     '<div class="name">%s</div>'
                     '<div class="role">%s</div>'
                     '<div class="metaphor">%s</div></div>'
                     % (a.get("tone", ""), a.get("at", i),
                        ICONS.get(a.get("icon", "browser"), ""),
                        esc(a["name"]), esc(a.get("role", "")).replace("\n", "<br>"),
                        esc(a.get("metaphor", ""))))
    head = '<h2 class="heading" data-reveal="0">%s</h2>' % esc(s["heading"]) if s.get("heading") else ""
    return '<div class="body">%s<div class="actors">%s</div></div>' % (head, "".join(cards))


def render_verdict(s):
    sides = []
    for i, v in enumerate(s["sides"]):
        sides.append('<div class="side %s" data-reveal="%d">'
                     '<div class="badge">%s</div>'
                     '<div class="head">%s</div>'
                     '<div class="desc">%s</div></div>'
                     % (v.get("tone", ""), v.get("at", i), esc(v.get("badge", "")),
                        esc(v["head"]).replace("\n", "<br>"),
                        esc(v.get("desc", "")).replace("\n", "<br>")))
    head = '<h2 class="heading" data-reveal="0">%s</h2>' % esc(s["heading"]) if s.get("heading") else ""
    return '<div class="body">%s<div class="verdict">%s</div></div>' % (head, "".join(sides))


def render_agenda(s):
    qs = []
    for i, q in enumerate(s["items"]):
        state = q.get("state", "") if isinstance(q, dict) else ""
        text = q["text"] if isinstance(q, dict) else q
        at = q.get("at", i) if isinstance(q, dict) else i
        qs.append('<div class="q %s" data-reveal="%d"><div class="no">%d</div>'
                  '<div class="text">%s</div></div>' % (state, at, i + 1, esc(text)))
    head = '<h2 class="heading" data-reveal="0">%s</h2>' % esc(s["heading"]) if s.get("heading") else ""
    return '<div class="body">%s<div class="agenda">%s</div></div>' % (head, "".join(qs))


def render_split(s):
    head = '<h2 class="heading" data-reveal="0">%s</h2>' % esc(s["heading"]) if s.get("heading") else ""
    visual = ""
    if s.get("icon"):
        visual = '<div class="medallion">%s</div>' % ICONS.get(s["icon"], "")
    elif s.get("diagram"):
        visual = '<div class="diagram">%s</div>' % diagram_html(s["diagram"])
    body = ('<div class="split">'
            '<div class="split-visual" data-reveal="1">%s</div>'
            '<div class="split-text">'
            '<div class="big" data-reveal="1">%s</div>'
            '<div class="small" data-reveal="2">%s</div>'
            '</div></div>'
            % (visual, esc(s.get("big", "")).replace("\n", "<br>"),
               esc(s.get("small", "")).replace("\n", "<br>")))
    return '<div class="body">%s%s</div>' % (head, body)


ANIMS = {
    "request-response": """
window.__frames = FRAMES;
window.__anim = function (n) {
  var p = n / (FRAMES - 1);
  var pk = document.getElementById("pk");
  var cap = document.getElementById("cap");
  var x0 = 330, x1 = 1230;
  if (p < 0.5) {
    var q = p / 0.5;
    pk.style.left = (x0 + (x1 - x0) * q) + "px";
    pk.className = "packet";
    pk.textContent = "リクエスト  食材をください";
    cap.textContent = "① ブラウザが「お願い」を送る";
  } else {
    var q2 = (p - 0.5) / 0.5;
    pk.style.left = (x1 - (x1 - x0) * q2) + "px";
    pk.className = "packet back";
    pk.textContent = "レスポンス  はい、これです";
    cap.textContent = "② サーバーが「返事」を返す";
  }
};
""",
    "key-leak": """
window.__frames = FRAMES;
window.__anim = function (n) {
  var p = n / (FRAMES - 1);
  var cap = document.getElementById("cap");
  var thieves = [].slice.call(document.querySelectorAll(".thief"));
  var pks = [].slice.call(document.querySelectorAll(".packet.steal"));
  thieves.forEach(function (t, i) {
    var start = 0.25 + i * 0.13;
    t.style.opacity = p > start ? "1" : "0";
  });
  pks.forEach(function (pk, i) {
    var start = 0.3 + i * 0.13;
    var q = Math.max(0, Math.min(1, (p - start) / 0.28));
    pk.style.opacity = q > 0 ? "1" : "0";
    var tx = parseFloat(pk.dataset.tx), ty = parseFloat(pk.dataset.ty);
    pk.style.left = (330 + (tx - 330) * q) + "px";
    pk.style.top = (240 + (ty - 240) * q) + "px";
  });
  cap.textContent = p < 0.25
    ? "ブラウザのコードにAPIキーを書くと…"
    : "F12を押せば、誰でも読める";
};
""",
}


def render_anim(s):
    head = '<h2 class="heading">%s</h2>' % esc(s["heading"]) if s.get("heading") else ""
    name = s["name"]
    frames = int(s.get("frames", 24))
    if name == "request-response":
        stage = ('<div class="stage">'
                 '<div class="box" style="left:60px;top:200px"><div class="t">ブラウザ</div>'
                 '<div class="s">あなたのスマホ</div></div>'
                 '<div class="wire" style="left:330px;top:258px;width:1170px"></div>'
                 '<div class="box" style="right:60px;top:200px"><div class="t">サーバー</div>'
                 '<div class="s">世界のどこかのコンピューター</div></div>'
                 '<div class="packet" id="pk" style="left:330px;top:229px">リクエスト</div>'
                 '<div class="caption-under" id="cap"></div></div>')
    elif name == "key-leak":
        thieves, pks = [], []
        spots = [(1080, 60), (1320, 200), (1180, 400), (1420, 380)]
        for i, (x, y) in enumerate(spots):
            thieves.append('<div class="thief" style="left:%dpx;top:%dpx">%s</div>'
                           % (x, y, ICONS["thief"]))
            pks.append('<div class="packet steal" data-tx="%d" data-ty="%d" '
                       'style="left:330px;top:240px;opacity:0">APIキー</div>' % (x - 150, y + 10))
        stage = ('<div class="stage">'
                 '<div class="box danger" style="left:60px;top:190px">'
                 '<div class="t">ブラウザ</div>'
                 '<div class="s">%s ここにAPIキーを置くと…</div></div>'
                 '%s%s<div class="caption-under" id="cap"></div></div>'
                 % (ICONS["key"], "".join(thieves), "".join(pks)))
    else:
        stage = ""
    return '<div class="body">%s%s</div>' % (head, stage)


def render_body(s):
    k = s.get("kind", "points")
    parts = []

    if k == "hook":
        return render_hook(s)
    if k == "bigstat":
        return render_bigstat(s)
    if k == "punch":
        return render_punch(s)
    if k == "actors":
        return render_actors(s)
    if k == "verdict":
        return render_verdict(s)
    if k == "agenda":
        return render_agenda(s)
    if k == "split":
        return render_split(s)
    if k == "anim":
        return render_anim(s)

    if k == "title":
        return ('<div class="body title-slide">'
                '<div class="kicker">%s</div><h1>%s</h1><div class="sub">%s</div></div>'
                % (esc(s.get("kicker", "")), esc(s["heading"]), esc(s.get("sub", ""))))

    if k == "section":
        return ('<div class="body section-slide"><div class="num">%s</div>'
                '<div class="rule"></div><h1>%s</h1></div>'
                % (esc(s.get("num", "")), esc(s["heading"])))

    if s.get("heading"):
        parts.append('<h2 class="heading" data-reveal="0">%s</h2>' % esc(s["heading"]))
    if s.get("lead"):
        parts.append('<p class="lead" data-reveal="0">%s</p>'
                     % esc(s["lead"]).replace("\n", "<br>"))

    if k == "points":
        lis = []
        for i, it in enumerate(s.get("items", [])):
            rv = ' data-reveal="%d"' % (i + 1)
            if isinstance(it, dict):
                lis.append("<li%s>%s<span class=\"note\">%s</span></li>"
                           % (rv, esc(it["text"]), esc(it.get("note", ""))))
            else:
                lis.append("<li%s>%s</li>" % (rv, esc(it)))
        parts.append('<ul class="points">%s</ul>' % "".join(lis))

    elif k == "cards":
        cs = []
        for _ci, c in enumerate(s["cards"]):
            inner = ""
            if c.get("title"):
                inner += '<div class="card-title">%s</div>' % esc(c["title"])
            if c.get("text"):
                inner += '<div class="card-text">%s</div>' % esc(c["text"]).replace("\n", "<br>")
            if c.get("items"):
                inner += "<ul>%s</ul>" % "".join("<li>%s</li>" % esc(i) for i in c["items"])
            cs.append('<div class="card %s" data-reveal="%d">'
                      '<div class="card-label">%s</div>%s</div>'
                      % (c.get("tone", ""), c.get("at", _ci + 1),
                         esc(c.get("label", "")), inner))
        parts.append('<div class="cards">%s</div>' % "".join(cs))

    elif k == "table":
        head = "".join("<th>%s</th>" % esc(h) for h in s["head"])
        rows = []
        for _ri, row in enumerate(s["rows"]):
            tds = []
            for cell in row:
                cls = ""
                if isinstance(cell, str) and cell.startswith("*"):
                    cls, cell = ' class="em"', cell[1:]
                elif isinstance(cell, str) and cell.startswith("~"):
                    cls, cell = ' class="muted"', cell[1:]
                tds.append("<td%s>%s</td>" % (cls, esc(cell).replace("\n", "<br>")))
            rows.append('<tr data-reveal="%d">%s</tr>' % (_ri + 1, "".join(tds)))
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
        for _si, it in enumerate(s["steps"]):
            cls = ""
            text = it
            if isinstance(it, dict):
                cls = " " + it.get("state", "")
                who = '<span class="who">%s</span>' % esc(it["who"]) if it.get("who") else ""
                text = who + esc(it["text"])
            else:
                text = esc(it)
            lis.append('<li class="%s" data-reveal="%d">%s</li>'
                       % (cls.strip(), it.get("at", _si + 1) if isinstance(it, dict) else _si + 1,
                          text))
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
    """1スライドのHTMLを組み立てる。

    ページ内の window.__setStep(n) を呼ぶと、その段階までの要素だけが見える。
    撮影側(render.mjs)はこれを呼びながら1コマずつ撮る。
    """
    pct = (idx + 1) / total * 100
    now = s.get("section") or ""
    crumb = '<span class="dot"></span><span>%s</span>' % esc(meta.get("title", ""))
    if now and now != meta.get("title", ""):
        crumb += '<span class="sep">/</span><span class="now">%s</span>' % esc(now)

    body = render_body(s)
    anim_js = ""
    if s.get("kind") == "anim":
        anim_js = ANIMS.get(s["name"], "").replace("FRAMES", str(int(s.get("frames", 24))))

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
%s
(function () {
  /* 内容が本文領域に収まらないときだけ縮める。
     段階表示は opacity で隠すだけなので、どの段階でも寸法は変わらない。 */
  var b = document.querySelector(".body");
  if (b && b.children.length) {
    var kids = Array.prototype.slice.call(b.children);
    var top = Math.min.apply(null, kids.map(function (e) { return e.getBoundingClientRect().top; }));
    var bottom = Math.max.apply(null, kids.map(function (e) { return e.getBoundingClientRect().bottom; }));
    var need = bottom - top;
    var avail = b.getBoundingClientRect().height;
    if (need > avail && avail > 0) {
      var k = Math.max(0.5, avail / need);
      var inner = document.createElement("div");
      while (b.firstChild) inner.appendChild(b.firstChild);
      inner.style.transformOrigin = "top left";
      inner.style.transform = "scale(" + k + ")";
      inner.style.width = (100 / k) + "%%";
      b.style.justifyContent = "flex-start";
      b.appendChild(inner);
    }
  }
  window.__setStep = function (n) {
    var els = document.querySelectorAll("[data-reveal]");
    for (var i = 0; i < els.length; i++) {
      var r = parseInt(els[i].getAttribute("data-reveal"), 10);
      if (r > n) els[i].classList.add("hidden-step");
      else els[i].classList.remove("hidden-step");
    }
    if (window.__anim) window.__anim(n);
  };
  window.__setStep(0);
})();
</script>
</body></html>""" % (
        "file://" + CSS, crumb, body,
        esc(meta.get("footer", "")), idx + 1, total, pct, anim_js)


def step_count(html, s):
    """このスライドを何コマ撮るか。"""
    if s.get("kind") == "anim":
        return int(s.get("frames", 24))
    if s.get("reveal") is False:
        return 1
    found = [int(x) for x in re.findall(r'data-reveal="(\d+)"', html)]
    return (max(found) + 1) if found else 1


def demo_frames(s, out_dir):
    """`kind: demo` のコマ(実機デモの連写PNG)を並べる。

    コマはHTMLから描くのではなく、scripts/capture-demo.mjs が撮ったPNGを使う。
    `frames_dir` は out/ からの相対、または video/ からの相対で探す。
    """
    rel = s.get("frames_dir")
    if not rel:
        sys.exit("kind: demo には frames_dir が要ります: %r" % (s.get("heading") or s))

    for base in (out_dir, ROOT, ""):
        d = os.path.join(base, rel) if base else rel
        if os.path.isdir(d):
            break
    else:
        d = None
    if not d or not os.path.isdir(d):
        sys.exit("デモのコマが見つかりません: %s\n"
                 "  先に `node scripts/capture-demo.mjs out/demo` で撮影してください。" % rel)

    frames = sorted(f for f in os.listdir(d) if f.endswith(".png"))
    if not frames:
        sys.exit("デモのコマが1枚もありません: %s" % d)
    frames = [os.path.join(d, f) for f in frames]

    # ナレーションに対してコマが多すぎるときは、間引いて容量を抑える
    cap = int(s.get("max_frames", 0))
    if cap and len(frames) > cap:
        frames = [frames[int(round(i * (len(frames) - 1) / float(cap - 1)))]
                  for i in range(cap)]
    return frames


def step_times(n_steps, cues, duration, even):
    """各コマの開始時刻(スライド内の相対秒)を決める。

    通常はナレーションの文の切れ目に合わせる。
    アニメーションは等間隔に割る。
    """
    if n_steps <= 1:
        return [0.0]
    if even or not cues:
        return [duration * i / n_steps for i in range(n_steps)]
    starts = [0.0]
    for k in range(1, n_steps):
        idx = min(len(cues) - 1, int(round(k * len(cues) / float(n_steps))))
        t = cues[idx]["start"]
        starts.append(max(t, starts[-1] + 0.25))
    # 最後のコマが尺を超えないように詰める
    for i in range(len(starts)):
        starts[i] = min(starts[i], duration - 0.2 * (len(starts) - i))
    return starts


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
    voice = meta.get("voice", "ja-JP-NanamiNeural")
    rate = meta.get("rate", "+0%")

    cur = ""
    for s in slides:
        if s.get("kind") == "section":
            cur = s["heading"]
        s.setdefault("section", cur)

    # ---- 1) ナレーションを先に作る(コマ割りの時刻決めに必要) ----
    print("1/4 ナレーションを合成")
    durations, cue_sets = [], []
    for i, s in enumerate(slides):
        narration = (s.get("narration") or "").strip()
        mp3 = os.path.join(work, "s%03d.mp3" % i)
        wav = os.path.join(work, "s%03d.wav" % i)
        cue_cache = os.path.join(work, "s%03d.cues.json" % i)
        if narration:
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
        durations.append(d)
        cue_sets.append(cues)
        print("   %3d/%d  %5.1f秒  字幕%d件" % (i + 1, total, d, len(cues)))

    # ---- 2) コマ割りを決めて、まとめて描画 ----
    print("2/4 スライドを描画")
    jobs, segments = [], []
    for i, s in enumerate(slides):
        # 実機デモは撮影済みのPNGを流すだけ。HTMLの描画は要らない
        if s.get("kind") == "demo":
            frames = demo_frames(s, args.out)
            starts = step_times(len(frames), cue_sets[i], durations[i], True)
            for k, png in enumerate(frames):
                end = starts[k + 1] if k + 1 < len(frames) else durations[i]
                segments.append((png, max(0.02, end - starts[k])))
            continue

        html_path = os.path.join(work, "s%03d.html" % i)
        html = render_slide(meta, s, i, total)
        open(html_path, "w", encoding="utf-8").write(html)

        n = step_count(html, s)
        even = s.get("kind") == "anim"
        starts = step_times(n, cue_sets[i], durations[i], even)
        shots = []
        for k in range(n):
            png = os.path.join(work, "s%03d_%02d.png" % (i, k))
            # 段階表示を使わない指定のときは、最後まで出した状態で1枚だけ撮る
            shots.append({"png": png, "step": 9999 if (n == 1 and even is False) else k})
            end = starts[k + 1] if k + 1 < n else durations[i]
            segments.append((png, max(0.08, end - starts[k])))
        jobs.append({"html": html_path, "shots": shots})

    spec = os.path.join(work, "jobs.json")
    json.dump({"executablePath": chrome, "jobs": jobs},
              open(spec, "w", encoding="utf-8"))
    node = shutil.which("node") or "node"
    run([node, os.path.join(ROOT, "scripts", "render.mjs"), spec])
    print("   コマ数 %d (スライド %d枚)" % (len(segments), total))

    if args.slides_only:
        print("画像のみ生成しました: %s" % work)
        return

    # ---- 3) 字幕 ----
    print("3/4 字幕(SRT)を書き出し")
    srt_rows, clock = [], 0.0
    for i in range(total):
        srt_rows += build_cues(cue_sets[i], slides[i].get("narration") or "", clock)
        clock += durations[i]

    srt = os.path.join(args.out, stem + ".srt")
    with open(srt, "w", encoding="utf-8") as f:
        for n, (a, b, t) in enumerate(srt_rows, 1):
            nxt = srt_rows[n][0] if n < len(srt_rows) else None
            end = max(b, a + 0.5)
            if nxt is not None:
                end = min(end, max(nxt - 0.02, a + 0.3))
            f.write("%d\n%s --> %s\n%s\n\n" % (n, srt_time(a), srt_time(end), t))

    # ---- 4) 動画 ----
    print("4/4 動画を書き出し")
    concat_v = os.path.join(work, "video.txt")
    with open(concat_v, "w", encoding="utf-8") as f:
        for png, d in segments:
            f.write("file '%s'\nduration %.3f\n" % (png, d))
        f.write("file '%s'\n" % segments[-1][0])

    concat_a = os.path.join(work, "audio.txt")
    with open(concat_a, "w", encoding="utf-8") as f:
        for i in range(total):
            f.write("file '%s'\n" % os.path.join(work, "s%03d.wav" % i))

    mp4 = os.path.join(args.out, stem + ".mp4")
    run([ffmpeg, "-y", "-loglevel", "error",
         "-f", "concat", "-safe", "0", "-i", concat_v,
         "-f", "concat", "-safe", "0", "-i", concat_a,
         "-c:v", "libx264", "-preset", "medium", "-crf", "22",
         "-pix_fmt", "yuv420p", "-r", "24", "-tune", "stillimage",
         "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", mp4])

    dur = sum(durations)
    print("\n完成")
    print("  動画: %s  (%.1f MB / %d分%02d秒)"
          % (mp4, os.path.getsize(mp4) / 1e6, int(dur // 60), int(dur % 60)))
    print("  字幕: %s  (%d件)" % (srt, len(srt_rows)))


if __name__ == "__main__":
    main()
