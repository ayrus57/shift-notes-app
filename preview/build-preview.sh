#!/bin/sh
# Builds the self-contained live preview of Shift (React + TipTap + sample notes all
# inlined, no outside downloads, no cloud sync) into a single HTML file that can be
# published as a claude.ai Artifact.
#
# Usage (from anywhere):  sh preview/build-preview.sh [output-file]
# Default output:         ./shift-preview.html (do NOT commit it - it's throwaway)
#
# Needs: esbuild (npm i -g esbuild) and source/node_modules (cd source && npm ci).
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$PWD/shift-preview.html}"
TMP="$(mktemp -d)"

cd "$REPO"
[ -d source/node_modules ] || (cd source && npm ci)
esbuild source/entry.jsx --bundle --format=esm --target=es2020 --jsx=automatic --minify \
  --define:process.env.NODE_ENV='"production"' --outfile="$TMP/app.min.js" --log-level=warning

python3 - "$TMP/app.min.js" "$REPO/preview/sample-data.js" "$OUT" <<'PY'
import sys
js = open(sys.argv[1], encoding="utf-8").read()
seed = open(sys.argv[2], encoding="utf-8").read()
assert '</script' not in js.lower() and '</script' not in seed.lower()
html = '''<meta charset="utf-8">
<title>Shift</title>
<style>
  :root { color-scheme: dark; --ground: #12171C; }
  html, body, #root { height: 100%; margin: 0; background: var(--ground); }
  body { overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
  #boot { color:#8896A2; font:14px/1.6 system-ui; display:flex; height:100%;
          align-items:center; justify-content:center; flex-direction:column; gap:8px; padding:24px; text-align:center; }
  #boot code { color:#E08A7C; font-size:12px; word-break:break-all; max-width:90vw; display:block; }
  #preview-reset { position: fixed; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); z-index: 9999;
    font: 500 11px/1 system-ui, sans-serif; color: #8896A2; background: #1A2027; border: 1px solid #2E3841;
    border-radius: 999px; padding: 7px 11px; cursor: pointer; opacity: .85; }
  #preview-reset:hover, #preview-reset:focus-visible { opacity: 1; color: #E4EAEF; outline: 2px solid #7CA0E8; outline-offset: 1px; }
  #preview-reset[data-armed] { color: #E0B341; border-color: #E0B341; }
</style>
<script>''' + seed + '''
  function shiftFail(msg) {
    var b = document.getElementById("boot");
    if (b) b.innerHTML = "<div>Shift could not start.</div><code>" + String(msg) + "</code>";
  }
  window.addEventListener("error", function (e) { shiftFail(e.message); });
</script>
<div id="root"><div id="boot"><div>Loading Shift...</div></div></div>
<button id="preview-reset" type="button" title="Preview only: put the sample notes back">Reset sample notes</button>
<script>
  (function () {
    var b = document.getElementById("preview-reset"), t = null;
    b.addEventListener("click", function () {
      if (b.hasAttribute("data-armed")) { shiftResetSamples(); return; }
      b.setAttribute("data-armed", ""); b.textContent = "Click again to reset";
      clearTimeout(t); t = setTimeout(function () { b.removeAttribute("data-armed"); b.textContent = "Reset sample notes"; }, 3000);
    });
  })();
</script>
<script type="module">''' + js + '''</script>
'''
open(sys.argv[3], "w", encoding="utf-8").write(html)
PY
rm -rf "$TMP"
echo "Preview built: $OUT"
