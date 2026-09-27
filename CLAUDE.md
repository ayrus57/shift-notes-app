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
  package.json          <- build-time deps (TipTap editor, bundled INTO the app); react/react-dom/
                           lucide-react are devDeps only so the preview can bundle them too
preview/
  sample-data.js        <- fake notes for the live preview only (never loaded by the live app)
```

`package.json` lives in `source/` (not the repo root) on purpose: with one at
the root, Netlify would start running `npm install` on every deploy.

`sift-notes-app.jsx` has no mount code of its own — it's
`export default function ShiftApp() {...}` with nothing calling
`createRoot(...).render(...)`. `entry.jsx` is the bundler's actual entry point:

```jsx
import { createRoot } from "react-dom/client";
import ShiftApp from "./sift-notes-app.jsx";
createRoot(document.getElementById("root")).render(<ShiftApp />);
```

## How to ship a change (every time)

1. Edit `source/sift-notes-app.jsx` directly. If `source/node_modules` is
   missing (fresh session), run `npm ci` inside `source/` first.
2. Build the bundle:
   ```
   esbuild source/entry.jsx --bundle --format=esm --target=es2020 --jsx=automatic --minify \
     --external:react --external:react-dom/client --external:react/jsx-runtime --external:lucide-react \
     --outfile=/tmp/app.js
   ```
   (esbuild is globally installed; if missing, `npm i -g esbuild`.) A successful
   build with no errors is a good sanity check before anything else. TipTap
   is NOT external — it gets bundled in (~630 KB minified bundle); only
   react, react-dom/client, react/jsx-runtime and lucide-react come from the
   importmap. Don't add new externals without adding importmap entries.
3. Splice the freshly built bundle into `index.html`, replacing only the
   contents of the existing `<script type="module">...</script>` block (the
   rest of `index.html` — importmap, manifest links, body markup — stays
   untouched). A short Python script using
   `re.compile(r'(<script type="module">).*?(</script>)', re.DOTALL)` and
   `pattern.subn(...)` does this cleanly.
4. Sanity check: `grep -c "createRoot" index.html` should print exactly `1`.
5. **Draft first, then confirm (Arash's standing preference).**
   `git add index.html source/sift-notes-app.jsx` (plus any other changed
   asset), commit with a plain-language message, and push to the session's
   working branch — **not** `main`. Show him a preview of the change (see
   "Previewing the app" below), then ask whether to put it live. Only after
   he says yes, bring the change into `main` and push `main`.
6. Netlify auto-deploys from the push to `main` — no further action needed.
   Tell Arash in plain language what shipped; he doesn't need to know about
   the build step, just that it's live.

### Previewing the app

Arash wants a **live, clickable preview in the chat's side panel** (a
published Artifact), not screenshots. His preview artifact is
https://claude.ai/artifact/Sy3vFFDXMayC76wqgw5QH1 — republish to that same
URL after each draft change (pass it as `url` from a new session) and open it.

How to build it: `esm.sh` (where `index.html`'s importmap loads React and
lucide-react) is blocked both in cloud sessions and inside artifacts, so the
preview must be fully self-contained: bundle `source/entry.jsx` with esbuild
**without** the `--external` flags (add
`--minify --define:process.env.NODE_ENV='"production"'`); React etc. resolve
from `source/node_modules` (devDependencies). Then write an HTML
page with a `<title>Shift</title>`, the same `<style>` and boot/error script
as `index.html`, a `#root` div, and the bundle inlined in a
`<script type="module">`. Leave out `window.__SHIFT_CLOUD` so the preview
never touches his real Supabase data. Anything typed there stays only in
that browser. This preview file is throwaway: never commit it.

The preview is seeded with **sample notes** (fake, preview-only) so every
feature can be tested: `preview/sample-data.js` (kept in the repo, never
loaded by the live app), inlined as a plain `<script>` before the app bundle,
writes `shift::sift-notes`, `shift::sift-contacts`, `shift::sift-places`,
`shift::sift-labels`, `shift::sift-sections` and `shift::sift-people-groups`
into localStorage when a `shift-preview-seed` version marker doesn't match,
plus a small "Reset sample notes" pill (click twice) that clears those keys
and reloads. Sample notes cover every type, domain/category, priority,
effort, queue, status, deadlines/suggested dates, all three trigger kinds,
one-off and repeating reminders, routines (daily/weekly/monthly),
checklists, parent/child and blocker links, labels, >10 contacts, places,
two Sections, RTL text, and unfiled/archived/done/trashed notes. Use dates
relative to "today" so Due soon / Weekly Plan always have content. Field
formats to match: dates `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`; `doneAt` is an
ISO string (and done notes are also `archived: true`); `trashedAt` is a ms
timestamp; set both `triggers` and legacy `trigger` (= `triggers[0]`).

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
- **Extra-description editor** is a **TipTap (v3) rich-text editor**
  (`MarkdownEditor` component: `@tiptap/core` + StarterKit + TaskList/TaskItem
  + Placeholder + the official `@tiptap/markdown` extension). It shows
  headings/lists/checklists formatted while typing (Notion-style: typing
  `# `, `1. `, `- `, `[ ] `, `> `, `**bold**` converts), but its value in
  and out is **plain Markdown** (`contentType: "markdown"`,
  `editor.getMarkdown()`), so storage, the card view's own `Markdown`
  renderer, sync and the Claude connector all still deal in Markdown. The
  toolbar calls TipTap commands on the instance handed up via `onEditor`;
  Undo uses TipTap's own history. It's keyed on `undoEpoch` so it remounts
  per opened note. The serializer writes blank lines between blocks and
  backslash-escapes literal Markdown characters (e.g. `\[`), which
  `mdInline` un-escapes for display.
  History: Arash rejected both a hand-rolled per-line WYSIWYG editor (buggy
  numbered lists and drag-select) and a plain Markdown textarea (headings
  don't look like headings). **Don't hand-roll editor behavior** — use
  TipTap's extensions/commands.
- **Focus rings**: buttons, links, dropdowns and `[tabindex]` elements never
  show an outline when clicked/tapped (Arash asked for the "stroke after
  click" to be gone everywhere). A `kbd-nav` class on `<html>` (added on Tab,
  removed on any pointerdown) brings a green ring back for keyboard users
  only. Text inputs keep their normal focus ring. Don't add per-button
  outline styles; the global rule covers new buttons automatically.
- **Undo buttons**: the description field uses `undoHist` /
  `undoField("content")`: an effect watches `editor.content` and pushes the
  previous value, grouping edits less than
  `UNDO_GROUP_MS` apart into one step. History resets on every note open
  (`resetAux` bumps `undoEpoch`).

## Recent work log (most recent first)

- Removed the focus outline ("stroke") that appeared on buttons after
  clicking, app-wide.
- Extra description is now a TipTap rich-text editor that stores Markdown
  (replaced the buggy per-line block editor), and both description fields
  got Undo buttons.
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

- ~~Netlify hookup checks~~ — **done.** Arash confirmed Netlify deploys
  correctly from GitHub and the live site shows the current Shift app.
- He explicitly wants to **learn GitHub** as part of this, so keep
  explanations of what a commit/push/deploy did in plain terms rather than
  skipping straight to "done."
