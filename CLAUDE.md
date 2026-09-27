# Shift — project memory for Claude

Shift is Arash's personal notes/task-management PWA. He is **not technical** —
explain things in plain, step-by-step language, don't assume he knows git/CLI
jargon, and confirm before doing anything destructive or hard to undo.

He builds this app entirely by describing bugs/features in chat; there is no
other developer. Treat yourself as the sole maintainer.

## What this repo is

- Repo: `ayrus57/shift-notes-app` (his personal GitHub account, not the
  `menew-be` org he's also a member of — don't confuse the two).
- This repo **is the deployment source**: Netlify is connected to it directly
  (Git-based auto-deploy), so pushing to `main` auto-deploys the live site.
  There is no manual file hand-off anymore — always push here instead.
- Netlify build settings on the connected site: Base directory empty, Build
  command empty, Publish directory empty/`.` (repo root). No Netlify
  functions are used.

## Repo layout

```
index.html              <- the built, deployable PWA (this is what Netlify serves)
manifest.webmanifest
sw.js
icon-192.png, icon-512.png
netlify.toml
source/
  sift-notes-app.jsx    <- the actual React source of truth (single component, ~5300 lines)
  entry.jsx             <- tiny mount wrapper (createRoot + render), NOT part of the app component itself
```

`sift-notes-app.jsx` has no mount code of its own — it's
`export default function ShiftApp() {...}` with nothing calling
`createRoot(...).render(...)`. `entry.jsx` is the bundler's actual entry point:

```jsx
import { createRoot } from "react-dom/client";
import ShiftApp from "./sift-notes-app.jsx";
createRoot(document.getElementById("root")).render(<ShiftApp />);
```

## How to ship a change (every time)

1. Edit `source/sift-notes-app.jsx` directly.
2. Build the bundle:
   ```
   esbuild source/entry.jsx --bundle --format=esm --target=es2020 --jsx=automatic --minify \
     --external:react --external:react-dom/client --external:react/jsx-runtime --external:lucide-react \
     --outfile=/tmp/app.js
   ```
   (esbuild is globally installed; if missing, `npm i -g esbuild`.) A successful
   build with no errors is a good sanity check before anything else.
3. Splice the freshly built bundle into `index.html`, replacing only the
   contents of the existing `<script type="module">...</script>` block (the
   rest of `index.html` — importmap, manifest links, body markup — stays
   untouched). A short Python script using
   `re.compile(r'(<script type="module">).*?(</script>)', re.DOTALL)` and
   `pattern.subn(...)` does this cleanly.
4. Sanity check: `grep -c "createRoot" index.html` should print exactly `1`.
5. `git add index.html source/sift-notes-app.jsx` (plus any other changed
   asset), commit with a plain-language message, `git push origin main`.
6. Netlify auto-deploys from the push — no further action needed. Tell Arash
   in plain language what shipped; he doesn't need to know about the build
   step, just that it's live.

Never hand him raw files to upload manually again unless he explicitly asks
for that — the whole point of this repo is to avoid that.

## App architecture notes (things that aren't obvious from a quick read)

- **State persistence pattern**: `useLocalObject`/`useLocalValue` are
  localStorage-backed hooks for per-device UI prefs that don't need cloud
  sync (e.g. `shift-view-prefs`, `shift-active-section`).
- **Cloud sync pattern**: a `loadKey`/`saveKey` pair per synced piece of
  state, guarded by a `skipNextSaveRef` (to avoid re-saving data that was
  just loaded from a realtime event), plus a realtime handler map keyed by
  storage-key-name. Backed by Supabase (project `fvxnrhomkaybmasecuus`,
  Tokyo region) — table `shift_kv`, RLS per-user, plus `shift-files` storage
  bucket and an `mcp` edge function exposing note-editing tools to Claude
  conversations inside the app (list_notes, get_note, create_note,
  propose_edit/confirm_edit, add_to_structure, link_notes, etc.).
- **View prefs are per-Section**: sort/group/filters/taskScope/etc. are
  stored in `viewPrefsBySection`, keyed by `activeSectionId || "everything"`,
  via `setViewPref(key, value)` — always thread new view-level settings
  through this, not a bare `useState`, or they won't persist per-section
  across a refresh like everything else does.
- **Threshold filters** (Priority/Effort/Queue/Date, next to Sort/Group in
  the notes header) each act as a one-sided threshold on that field's own
  scale, not an exact-match filter:
  - Priority: keep this priority **and anything more urgent** (numeric `<=`,
    since `1 = Urgent` is the top of the scale).
  - Effort: keep this effort **and anything easier** (numeric `<=`).
  - Queue: keep this queue stage **and anything later** (`QUEUES` array
    index `>=`).
  - Date: keep notes due **at or before** the picked date/time (i.e.
    everything closer to today), using `noteRefDate(n)` — the earliest of a
    note's deadline / date-trigger / suggested date.
- **Overlay/modal close guard**: every modal backdrop (`st.overlay` divs)
  uses `overlayMouseDown` + `overlayClickClose(fn)` (a ref tracking whether
  the mousedown that started the gesture actually originated on the
  backdrop itself, not a descendant). This exists because dragging from
  inside a modal card and releasing on the backdrop used to close the
  modal — browsers retarget that `click` event's target to the nearest
  common ancestor (the backdrop), so a naive `onClick={closeFn}` on the
  backdrop is NOT safe. Reuse this pattern for any new modal.
- **Extra-description editor** (the long-form Markdown field) is a
  **per-line block editor**: each line of `editor.extra` is its own
  auto-growing `<textarea rows={1}>`, not one big textarea/contentEditable.
  This is intentional — it's how heading lines (`# `/`## `) get real
  larger-font WYSIWYG rendering while typing, which an overlay/highlight
  trick can't do. Consequences to know about:
  - `extraLineMarker(line)` recognizes heading (`#`/`##`) and numbered-list
    (`N. `) prefixes and hides them from the editable text (rendered as a
    fixed, non-editable label instead) so the cursor can never land in
    front of them. Bullet/checklist/quote prefixes are **not** protected
    this way yet (not reported as broken; would follow the same pattern if
    ever asked for).
  - Native text selection can't span multiple `<textarea>`s, so a
    **cross-line drag-select** is hand-rolled: `extraLineMouseDown(i)` +
    document-level `mousemove`/`mouseup` listeners compute which line the
    mouse is over via bounding rects, blur the focused textarea and
    highlight the spanned range in `extraLineSel`. A document `keydown`
    listener then makes Backspace/Delete/typing/copy/cut act on that range.
    If you touch this editor again, keep this mechanism in mind — it's not
    a standard controlled-textarea pattern.

## Recent work log (most recent first)

- Threshold filters (Priority/Effort/Queue/Date) added next to Sort/Group.
- Fixed: dragging out of a modal's borders no longer closes it (see overlay
  guard above) — applied to all 8 modals in the app, not just the note editor.
- Fixed: numbered-list `N.` prefix is now a protected label, not editable text.
- Added real cross-line drag-select in the extra-description editor.
- Earlier in the project's history (all shipped, not pending): recurring
  routines, People groups management, Discover-type Queue field, a proper
  Daily Summary dashboard layout, WYSIWYG heading rendering while typing,
  bigger extra-description editor, a custom confirm-popover replacing all
  `window.confirm()` calls, a searchable People sidebar for >10 contacts, a
  fixed "Group by type" in List view (no more duplicate headers), map pins
  showing note names for items due within 7 days, and per-Section view-pref
  persistence.

## Open items / things to follow up on

- Arash was in the middle of connecting this repo to Netlify via "New site
  from Git" when this session ended. Two things worth checking with him:
  1. Whether that created a **second, new** Netlify site (new URL) instead
     of relinking his **existing** site to this repo — if he wants to keep
     his old URL, the fix is Site settings → Build & deploy → Link
     repository on the *existing* site, not a fresh "Add new site" flow.
  2. Whether the first deploy actually shows the current Shift app (not a
     blank page or an old cached version) — worth a live check.
- He explicitly wants to **learn GitHub** as part of this, so keep
  explanations of what a commit/push/deploy did in plain terms rather than
  skipping straight to "done."
