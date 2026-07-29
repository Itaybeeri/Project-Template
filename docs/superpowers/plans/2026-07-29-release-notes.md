# Automatic Release Notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every merge ships a release note — an MD memo in `docs/releases/` rendered to committed HTML in `ReleaseNotes/`, linking back to the feature/ADR/idea docs it came from.

**Architecture:** `docs/releases/NNNN-slug.md` is the source of truth. `ReleaseNotes/parse.mjs` is the only parser (notes → objects, refs → real file paths, problems → structured list). `ReleaseNotes/generate.mjs` validates on every run, then renders `index.html` plus one page per note. `ProjectCommandCenter/collect.mjs` consumes the same parser through a guarded dynamic import for its Releases panel — the dependency runs Command Center → ReleaseNotes and never back.

**Tech Stack:** Node ≥ 18, zero dependencies, ES modules, `node:fs`/`node:path`/`node:child_process` only. Plain HTML/CSS/JS in the output, no build step, no CDN.

## Global Constraints

- **Zero dependencies.** No package.json, no npm install. `node:*` builtins only.
- **Clean template.** Only these files may be created: `ReleaseNotes/{parse.mjs,generate.mjs,README.md,index.html,0001-*.html,0002-*.html}`, `docs/releases/{TEMPLATE.md,0001-*.md,0002-*.md}`. Only these may be edited: `CLAUDE.md`, `docs/workflow/feature-lifecycle.md`, `docs/features/FEATURE-RULES.md`, `docs/GLOSSARY.md`, `README.md`, `ProjectCommandCenter/{collect.mjs,index.html,README.md}`, `.gitignore`. **No ADR, no `docs/features/<NNNN>/` folder, no FEATURE-INDEX/ADR-INDEX row, no test files, no CI workflow.**
- **No test runner exists in this repo, and the clean-template constraint forbids adding one.** Every task's test step is therefore a runnable command with exact expected output, run against fixtures in the scratchpad — never a committed test file. This is a deliberate deviation from TDD-with-a-suite, recorded in the spec's Verification section.
- **Deterministic output.** No timestamps, no `Date.now()`, no network calls in generated HTML. Running the generator twice must leave the output byte-identical.
- **Escaping.** All note-derived text is HTML-escaped (text *and* attribute context) before the Markdown subset is applied.
- **Note filename selector:** `^\d{4}-[a-z0-9-]+\.md$`. `TEMPLATE.md` and `README.md` are ignored; any other `.md` in `docs/releases/` is a hard error.
- **Scratchpad for fixtures:** `C:\Users\Itay\AppData\Local\Temp\claude\F--Development-project-template\17474613-bbc8-40a3-96f0-3ed579e0304c\scratchpad` — referred to below as `$SCRATCH`. Nothing there is ever committed.
- **Branch:** `feat/release-notes`, worktree `.worktrees/feat-release-notes`. Commit after every task.

---

### Task 1: The parser — `ReleaseNotes/parse.mjs`

**Files:**
- Create: `ReleaseNotes/parse.mjs`
- Test: none committed (fixtures under `$SCRATCH/fixtures/docs/releases/`)

**Interfaces:**
- Produces: `parseNotes({ root }) → { notes, problems }`
  - `note` = `{ num: '0001', slug: 'release-notes', file: '0001-release-notes.md', title: string, released: string, type: string, pr: string|null, refs: string[], bullets: string[], related: Array<{label, path, anchor}>, filesTouched: string[], body: string }`
  - `problem` = `{ file: string, message: string }`
- Consumes: nothing.

- [ ] **Step 1: Create the fixture tree that the parser must satisfy**

```bash
mkdir -p "$SCRATCH/fixtures/docs/releases" "$SCRATCH/fixtures/docs/features/0002-demo" "$SCRATCH/fixtures/docs/adr"
printf '# demo spec\n' > "$SCRATCH/fixtures/docs/features/0002-demo/spec.md"
printf '# ADR-0001 demo\n' > "$SCRATCH/fixtures/docs/adr/ADR-0001-demo.md"
printf '### 005 — Demo idea\n' > "$SCRATCH/fixtures/docs/IDEAS.md"
cat > "$SCRATCH/fixtures/docs/releases/0003-demo.md" <<'MD'
# 0003 — Demo note

**Released:** 2026-07-29 · **PR:** #4 · **Type:** Feature · **Refs:** Feature 0002, ADR-0001, Idea 005

## What changed

- First bullet.
- Second bullet.

## Files touched

- `CLAUDE.md`
MD
```

- [ ] **Step 2: Write the check that must fail first**

```bash
node -e "
import('F:/Development/project-template/.worktrees/feat-release-notes/ReleaseNotes/parse.mjs')
  .then(m => {
    const r = m.parseNotes({ root: process.env.SCRATCH + '/fixtures' });
    console.log(JSON.stringify(r, null, 2));
  });
"
```

Expected before implementation: FAIL — `ERR_MODULE_NOT_FOUND ... parse.mjs`.

- [ ] **Step 3: Implement `parse.mjs`**

```js
/**
 * Release-note parser — the single source of truth for docs/releases/.
 * Two consumers: ReleaseNotes/generate.mjs and ProjectCommandCenter/collect.mjs.
 * Pure reader: it never writes, and it reports problems instead of throwing so
 * both consumers can decide what to do with them.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(HERE, '..');

/** A file in docs/releases/ is a note only if its name matches this. */
const NOTE_FILE = /^(\d{4})-([a-z0-9-]+)\.md$/;
/** Non-note files that legitimately live in the folder. */
const IGNORED = new Set(['TEMPLATE.md', 'README.md']);
const TYPES = ['Feature', 'Fix', 'Docs', 'Chore', 'ADR', 'Idea'];

export function parseNotes({ root = REPO_ROOT } = {}) {
  const dir = join(root, 'docs', 'releases');
  const problems = [];
  const notes = [];
  if (!existsSync(dir)) return { notes, problems };

  const seen = new Map();
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.md') || IGNORED.has(name)) continue;
    const m = NOTE_FILE.exec(name);
    if (!m) {
      problems.push({ file: name, message: 'filename must match NNNN-slug.md (lowercase slug)' });
      continue;
    }
    const [, num, slug] = m;
    if (seen.has(num)) {
      problems.push({ file: name, message: `duplicate note number ${num} — also used by ${seen.get(num)}` });
      continue;
    }
    seen.set(num, name);
    notes.push(parseOne({ num, slug, file: name, md: readFileSync(join(dir, name), 'utf8'), root, problems }));
  }
  notes.sort((a, b) => b.num.localeCompare(a.num)); // newest first
  return { notes, problems };
}

function parseOne({ num, slug, file, md, root, problems }) {
  const title = (/^#\s+\S+\s+—\s+(.+)$/m.exec(md)?.[1] || /^#\s+(.+)$/m.exec(md)?.[1] || slug).trim();
  const meta = readMeta(md);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.Released || '')) {
    problems.push({ file, message: 'missing or malformed **Released:** (expected YYYY-MM-DD)' });
  }
  if (!TYPES.includes(meta.Type)) {
    problems.push({ file, message: `missing or unknown **Type:** (expected one of ${TYPES.join(', ')})` });
  }

  const refs = (meta.Refs || '').split(',').map((r) => r.trim()).filter(Boolean);
  const related = [];
  for (const ref of refs) {
    const hits = resolveRef(ref, root);
    if (!hits.length) problems.push({ file, message: `ref "${ref}" resolves to no file` });
    related.push(...hits);
  }

  return {
    num, slug, file, title,
    released: meta.Released || '',
    type: meta.Type || '',
    pr: meta.PR ? meta.PR.replace(/^#/, '') : null,
    refs,
    bullets: bulletsOf(section(md, 'What changed')),
    filesTouched: bulletsOf(section(md, 'Files touched')),
    related,
    body: md,
  };
}

/** The one metadata line: `**Released:** … · **PR:** … · **Type:** … · **Refs:** …` */
function readMeta(md) {
  const line = md.split('\n').find((l) => /^\*\*[A-Za-z]+:\*\*/.test(l.trim())) || '';
  const out = {};
  for (const m of line.matchAll(/\*\*([A-Za-z]+):\*\*\s*([^·]+)/g)) out[m[1]] = m[2].trim();
  return out;
}

/** Body of a `## <heading>` section, up to the next `##`. */
function section(md, heading) {
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|\\Z)`, 'mi');
  return re.exec(md)?.[1] || '';
}

function bulletsOf(block) {
  return block.split('\n')
    .map((l) => /^[-*]\s+(.+)$/.exec(l.trim())?.[1])
    .filter(Boolean);
}

/**
 * A ref names a thing elsewhere in the repo: `Feature 0002`, `ADR-0001`, `Idea 005`.
 * Returns every real file it points at — empty means the ref is dead (a hard error
 * upstream), so notes can never rot into broken links.
 */
function resolveRef(ref, root) {
  let m;
  if ((m = /^Feature\s+(\d{4})$/i.exec(ref))) {
    const base = join(root, 'docs', 'features');
    if (!existsSync(base)) return [];
    const folder = readdirSync(base).find((d) => d.startsWith(`${m[1]}-`));
    if (!folder) return [];
    return readdirSync(join(base, folder))
      .filter((f) => f.endsWith('.md')).sort()
      .map((f) => ({ label: `${folder}/${f}`, path: `docs/features/${folder}/${f}`, anchor: null }));
  }
  if ((m = /^ADR-(\d{4})$/i.exec(ref))) {
    const base = join(root, 'docs', 'adr');
    if (!existsSync(base)) return [];
    return readdirSync(base)
      .filter((f) => new RegExp(`^ADR-${m[1]}-.*\\.md$`).test(f))
      .map((f) => ({ label: f.replace(/\.md$/, ''), path: `docs/adr/${f}`, anchor: null }));
  }
  if ((m = /^Idea\s+(\d{3})$/i.exec(ref))) {
    const p = join(root, 'docs', 'IDEAS.md');
    if (!existsSync(p)) return [];
    const head = new RegExp(`^###\\s+${m[1]}\\s+—\\s+(.+)$`, 'm').exec(readFileSync(p, 'utf8'));
    if (!head) return [];
    const anchor = `${m[1]}-${head[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
    return [{ label: `Idea ${m[1]} — ${head[1].trim()}`, path: 'docs/IDEAS.md', anchor }];
  }
  return [];
}
```

- [ ] **Step 4: Run the check again — happy path**

Run the Step 2 command with `SCRATCH` set.
Expected: JSON with `problems: []`, one note, `bullets` of length 2, `related` of length 3 (`docs/features/0002-demo/spec.md`, `docs/adr/ADR-0001-demo.md`, `docs/IDEAS.md` with anchor `005-demo-idea`).

- [ ] **Step 5: Run the failure cases**

```bash
cp "$SCRATCH/fixtures/docs/releases/0003-demo.md" "$SCRATCH/fixtures/docs/releases/0003-copy.md"
printf 'x\n' > "$SCRATCH/fixtures/docs/releases/draft.md"
sed -i 's/Feature 0002/Feature 9999/' "$SCRATCH/fixtures/docs/releases/0003-demo.md"
```

Re-run the Step 2 command.
Expected: `problems` contains exactly three entries — duplicate number `0003`, `draft.md` filename, and dead ref `Feature 9999`.

```bash
rm "$SCRATCH/fixtures/docs/releases/0003-copy.md" "$SCRATCH/fixtures/docs/releases/draft.md"
sed -i 's/Feature 9999/Feature 0002/' "$SCRATCH/fixtures/docs/releases/0003-demo.md"
```

- [ ] **Step 6: Commit**

```bash
git add ReleaseNotes/parse.mjs
git commit -m "feat(releases): release-note parser with ref resolution and validation"
```

---

### Task 2: The generator — `ReleaseNotes/generate.mjs`

**Files:**
- Create: `ReleaseNotes/generate.mjs`
- Test: fixtures from Task 1

**Interfaces:**
- Consumes: `parseNotes({ root })` from Task 1.
- Produces: CLI `node ReleaseNotes/generate.mjs [--check]`; writes `ReleaseNotes/index.html` + `ReleaseNotes/<num>-<slug>.html`. Exit 1 on any problem, writing nothing.

- [ ] **Step 1: Write the check that must fail first**

```bash
node ReleaseNotes/generate.mjs --check
```

Expected before implementation: FAIL — `Cannot find module ... generate.mjs`.

- [ ] **Step 2: Implement `generate.mjs`**

```js
/**
 * Renders docs/releases/*.md into this folder: index.html + one page per note.
 * Validates on EVERY run (not just --check) — the phase-5 lifecycle step runs the
 * plain command, so a dead ref or a duplicate number must fail there, not ship.
 * Output is deterministic: no timestamps, no network, so re-running is a no-op.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNotes, REPO_ROOT } from './parse.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_ONLY = process.argv.includes('--check');

// ── escaping ────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── links ───────────────────────────────────────────────────────────────────
function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

/**
 * Remote is read once and is injectable: RELEASE_NOTES_REMOTE="" forces relative
 * mode, so both link modes are exercisable in a repo that has a GitHub remote.
 */
function remoteUrl() {
  if (process.env.RELEASE_NOTES_REMOTE !== undefined) return process.env.RELEASE_NOTES_REMOTE;
  return git(['remote', 'get-url', 'origin']);
}

/** Default branch resolved OFFLINE — a network/gh lookup would break idempotence. */
function defaultBranch() {
  const head = git(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  return head ? head.split('/').pop() : 'main';
}

function githubBase(url) {
  if (!url) return null;
  let u = url.trim().replace(/\.git$/, '');
  const scp = /^git@([^:]+):(.+)$/.exec(u);
  if (scp) u = `https://${scp[1]}/${scp[2]}`;
  u = u.replace(/^ssh:\/\/git@/, 'https://');
  return /^https?:\/\/github\.com\//i.test(u) ? u : null;
}

const BASE = githubBase(remoteUrl());
const BRANCH = BASE ? defaultBranch() : null;

/** docs path → href. GitHub blob URL when we can, repo-relative otherwise. */
function hrefFor(path, anchor) {
  const frag = anchor ? `#${anchor}` : '';
  return BASE ? `${BASE}/blob/${BRANCH}/${path}${frag}` : `../${path}${frag}`;
}

// ── markdown subset (escape first, then whitelist) ───────────────────────────
function inline(md) {
  let h = esc(md);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${esc(u)}">${t}</a>`);
  return h;
}

// ── pages ───────────────────────────────────────────────────────────────────
const STYLE = `
:root{color-scheme:light dark}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 ui-sans-serif,system-ui,'Segoe UI',sans-serif;background:#0f1115;color:#e6e8ee}
main{max-width:820px;margin:0 auto;padding:40px 24px 80px}
h1{font-size:26px;margin:0 0 6px} h2{font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:#8b93a7;margin:32px 0 10px}
a{color:#7aa2f7} a:hover{color:#9db4ff}
.meta{color:#8b93a7;font-size:13px;margin-bottom:28px}
.tag{display:inline-block;padding:1px 8px;border:1px solid #2a3040;border-radius:999px;font-size:12px;color:#b8c0d4}
ul{padding-left:20px;margin:0} li{margin:6px 0}
code{background:#1a1f2b;padding:1px 5px;border-radius:4px;font-size:13px}
.row{display:flex;gap:12px;align-items:baseline;padding:12px 0;border-bottom:1px solid #1e2430}
.row .num{color:#8b93a7;font-variant-numeric:tabular-nums}
.row .ttl{font-weight:600} .row .sum{color:#8b93a7;font-size:13px}
.back{display:inline-block;margin-bottom:24px;font-size:13px}
`;

const page = (title, body) =>
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><main>${body}</main></body></html>
`;

function notePage(n) {
  const related = n.related.length
    ? `<h2>Related docs</h2><ul>${n.related.map((r) => `<li><a href="${esc(hrefFor(r.path, r.anchor))}">${esc(r.label)}</a></li>`).join('')}</ul>`
    : '';
  const files = n.filesTouched.length
    ? `<h2>Files touched</h2><ul>${n.filesTouched.map((f) => `<li>${inline(f)}</li>`).join('')}</ul>`
    : '';
  return page(`${n.num} — ${n.title}`, `
    <a class="back" href="index.html">← All release notes</a>
    <h1>${esc(n.num)} — ${esc(n.title)}</h1>
    <div class="meta">${esc(n.released)} · <span class="tag">${esc(n.type)}</span>${n.pr ? ` · PR #${esc(n.pr)}` : ''}</div>
    <h2>What changed</h2>
    <ul>${n.bullets.map((b) => `<li>${inline(b)}</li>`).join('')}</ul>
    ${related}
    ${files}`);
}

function indexPage(notes) {
  const rows = notes.map((n) => `
    <div class="row">
      <span class="num">${esc(n.num)}</span>
      <span>
        <a class="ttl" href="${esc(`${n.num}-${n.slug}.html`)}">${esc(n.title)}</a>
        <div class="sum">${esc(n.released)} · ${esc(n.type)}${n.pr ? ` · PR #${esc(n.pr)}` : ''}${n.bullets[0] ? ` — ${esc(n.bullets[0])}` : ''}</div>
      </span>
    </div>`).join('');
  return page('Release notes', `
    <h1>Release notes</h1>
    <div class="meta">One note per merge · newest first · generated from <code>docs/releases/</code></div>
    ${notes.length ? rows : '<p class="sum">No release notes yet.</p>'}`);
}

// ── run ─────────────────────────────────────────────────────────────────────
const { notes, problems } = parseNotes({ root: REPO_ROOT });

if (problems.length) {
  for (const p of problems) console.error(`docs/releases/${p.file}: ${p.message}`);
  console.error(`\n${problems.length} problem(s) — no HTML written.`);
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log(`OK — ${notes.length} release note(s), no problems.`);
  process.exit(0);
}

writeFileSync(join(HERE, 'index.html'), indexPage(notes));
for (const n of notes) writeFileSync(join(HERE, `${n.num}-${n.slug}.html`), notePage(n));
console.log(`Wrote index.html + ${notes.length} note page(s).`);
```

- [ ] **Step 3: Verify it fails cleanly with no notes folder content yet**

```bash
node ReleaseNotes/generate.mjs --check
```

Expected: `OK — 0 release note(s), no problems.` (exit 0; `docs/releases/` does not exist yet).

- [ ] **Step 4: Commit**

```bash
git add ReleaseNotes/generate.mjs
git commit -m "feat(releases): HTML generator with fail-fast validation and offline link resolution"
```

---

### Task 3: The notes themselves + folder docs

**Files:**
- Create: `docs/releases/TEMPLATE.md`, `docs/releases/0001-release-notes.md`, `docs/releases/0002-ideas-notepad.md`, `ReleaseNotes/README.md`
- Generated: `ReleaseNotes/index.html`, `ReleaseNotes/0001-release-notes.html`, `ReleaseNotes/0002-ideas-notepad.html`

**Interfaces:**
- Consumes: the note format from Task 1's parser.
- Produces: the two bootstrap notes the spec requires (AC9).

- [ ] **Step 1: Write `docs/releases/TEMPLATE.md`**

```markdown
# NNNN — <title>

**Released:** YYYY-MM-DD · **PR:** #N · **Type:** Feature · **Refs:** Feature NNNN, ADR-NNNN, Idea NNN

## What changed

- <what a reader of this project would want to know — the change and why, not the commit subject>

## Files touched

- `<path>`

<!--
Copy this file to docs/releases/NNNN-slug.md (lowercase slug) when a feature is about to open
its PR. Type is one of: Feature, Fix, Docs, Chore, ADR, Idea. PR and Refs are optional; every
Ref must resolve to a real file or `node ReleaseNotes/generate.mjs` fails. This TEMPLATE.md is
ignored by the parser.
-->
```

- [ ] **Step 2: Write `docs/releases/0001-release-notes.md`**

```markdown
# 0001 — Automatic release notes

**Released:** 2026-07-29 · **Type:** Feature

## What changed

- Every merge now ships a release note: an MD memo in `docs/releases/`, written on the feature branch before the PR opens, so it lands with the change it describes.
- `ReleaseNotes/` renders those memos to HTML — an index of every note plus one page per note, linking back to the feature, ADR, and idea docs each note references.
- The generator validates on every run: a dead ref, a duplicate note number, or a missing field fails the command and writes nothing, so notes cannot rot into broken links.
- The Project Command Center gained a Releases panel, so the newest notes show up where the rest of the project state already does.

## Files touched

- `ReleaseNotes/parse.mjs`, `ReleaseNotes/generate.mjs`, `ReleaseNotes/README.md`
- `docs/releases/TEMPLATE.md`
- `CLAUDE.md`, `docs/workflow/feature-lifecycle.md`, `docs/features/FEATURE-RULES.md`, `docs/GLOSSARY.md`
- `ProjectCommandCenter/collect.mjs`, `ProjectCommandCenter/index.html`
```

Note: no `PR:` line yet — it is filled in Task 6, once the PR number exists.

- [ ] **Step 3: Write `docs/releases/0002-ideas-notepad.md`**

```markdown
# 0002 — Ideas & thoughts notepad

**Released:** 2026-07-15 · **PR:** #3 · **Type:** Feature

## What changed

- Ideas and half-formed thoughts have a home: `docs/IDEAS.md` holds an index table plus one memo per idea, on its own number counter.
- Conversation drift is triaged instead of guessed at — the agent asks whether a tangent is a feature to build or an idea to record, and records it immediately either way.
- The Project Command Center shows the notepad as an Ideas panel, with each idea's memo in a click-through drawer.

## Files touched

- `docs/IDEAS.md`
- `CLAUDE.md`, `README.md`
- `ProjectCommandCenter/collect.mjs`, `ProjectCommandCenter/index.html`, `ProjectCommandCenter/README.md`
```

Backfilled for PR #3, which merges before this machinery exists (spec → Bootstrap).

- [ ] **Step 4: Write `ReleaseNotes/README.md`**

```markdown
# Release Notes

Rendered release notes. **Source of truth is `docs/releases/*.md`** — one MD memo per merge,
written on the feature branch before its PR opens. This folder holds the generated HTML, which
is committed so the notes are readable on any machine and on GitHub with nothing to run.

## Generate

```bash
node ReleaseNotes/generate.mjs            # writes index.html + one page per note
node ReleaseNotes/generate.mjs --check    # validate only, write nothing
```

Validation runs on **every** invocation. A dead ref, a duplicate note number, or a missing
required field exits non-zero and writes nothing.

## Files

| File | Role |
|------|------|
| `parse.mjs` | The parser — `docs/releases/*.md` → note objects, refs resolved to real paths. Shared with `ProjectCommandCenter/collect.mjs`. |
| `generate.mjs` | Validates, then renders `index.html` + `NNNN-slug.html`. |
| `index.html`, `NNNN-*.html` | Generated output (committed). |

## Writing a note

Copy `docs/releases/TEMPLATE.md` to `docs/releases/NNNN-slug.md`, take the next free number
**after** syncing with the default branch, lead with readable bullets, and reference related work
with `Refs: Feature NNNN, ADR-NNNN, Idea NNN` — each resolves to the real MD files and is linked
from the note's page. See `docs/workflow/feature-lifecycle.md` phase 5.
```

- [ ] **Step 5: Generate and inspect**

```bash
node ReleaseNotes/generate.mjs
```

Expected: `Wrote index.html + 2 note page(s).`

```bash
node ReleaseNotes/generate.mjs
git status --short ReleaseNotes/
```

Expected: identical message, and `git status` shows no change on the second run (AC6 — idempotent).

- [ ] **Step 6: Commit**

```bash
git add docs/releases ReleaseNotes/README.md ReleaseNotes/index.html ReleaseNotes/0001-release-notes.html ReleaseNotes/0002-ideas-notepad.html
git commit -m "feat(releases): bootstrap notes 0001 and 0002 with rendered HTML"
```

---

### Task 4: Wire the lifecycle — the "automatic" part

**Files:**
- Modify: `docs/workflow/feature-lifecycle.md` (phase 5 step list), `docs/features/FEATURE-RULES.md` (merge gate), `CLAUDE.md` (4 places), `docs/GLOSSARY.md`, `README.md`

**Interfaces:**
- Consumes: the command `node ReleaseNotes/generate.mjs` from Task 2.
- Produces: the documented obligation the agent follows on every merge.

- [ ] **Step 1: `docs/workflow/feature-lifecycle.md` — insert a new step between the current steps 3 and 4 of phase 5, renumbering the rest**

```markdown
4. **Write the release note (no approval asked — this is mandatory, every PR).**
   Take the next free number in `docs/releases/` (read it **after** the sync in step 2, so a
   note merged meanwhile is seen), copy `docs/releases/TEMPLATE.md` to
   `docs/releases/NNNN-slug.md`, lead with readable bullets of what changed and why, and
   reference the work with `Refs: Feature NNNN, ADR-NNNN, Idea NNN`. Then:
   ```
   node ReleaseNotes/generate.mjs
   ```
   It validates and fails on a dead ref, a duplicate number, or a missing field. Commit the note
   and the regenerated HTML onto the feature branch — the note ships with the change it describes.
```

- [ ] **Step 2: `docs/features/FEATURE-RULES.md` — add to the NON-NEGOTIABLE merge gate bullets (completion rule 4)**

```markdown
   - **No release note → no PR.** Every PR carries `docs/releases/NNNN-slug.md` plus the HTML
     regenerated by `node ReleaseNotes/generate.mjs`, committed on the feature branch. This is
     automatic and is never waived: trivial fixes and docs-only changes get a two-bullet note.
```

- [ ] **Step 3: `CLAUDE.md` — four edits**

Under **Where things live**, after the Ideas entry:

```markdown
- **Release notes:** `docs/releases/` — one MD note per merge (bullets first), rendered to
  committed HTML in `ReleaseNotes/` (`index.html` + one page per note, linking back to the
  feature/ADR/idea docs). Written automatically in phase 5, before the PR — see
  `ReleaseNotes/README.md`.
```

Under **Numbering**, replace the counter sentence:

```markdown
Feature, ADR, idea, and release-note numbers are FOUR SEPARATE counters. Before picking a feature
number, check `docs/features/FEATURE-INDEX.md` (lists used + **reserved** numbers); ideas have
their own `001…` counter in `docs/IDEAS.md`; release notes have their own `0001…` counter in
`docs/releases/`. Numbers are never reused.
```

Under **Workflow rules** → router-level invariants, add:

```markdown
- **Every PR ships a release note — automatically, without asking.** In phase 5, before the PR
  is opened, write `docs/releases/NNNN-slug.md` and run `node ReleaseNotes/generate.mjs`; commit
  both on the feature branch. No release note, no PR.
```

Under **Permission prompts**, in the allow-list sentence, add `node ReleaseNotes/generate.mjs` to
the list of frequent safe commands so the step never prompts.

In the **First session** section, add to the placeholder-filling instructions:

```markdown
Also clear the template's own release notes on first session: delete `docs/releases/0*.md` and
run `node ReleaseNotes/generate.mjs` so `ReleaseNotes/` reflects the new project, not the template.
```

- [ ] **Step 4: `docs/GLOSSARY.md` — add the canonical term**

```markdown
- **Release note** — the MD memo in `docs/releases/NNNN-slug.md` describing one merge in readable
  bullets. `ReleaseNotes/` is its rendered HTML output, not a second source of truth.
```

- [ ] **Step 5: `README.md` — add `docs/releases/` and `ReleaseNotes/` to the layout/what's-inside list**, one line each, matching the existing style.

- [ ] **Step 6: Verify the wiring**

```bash
grep -rn "ReleaseNotes/generate.mjs" CLAUDE.md docs/workflow/feature-lifecycle.md docs/features/FEATURE-RULES.md
grep -n "Release note" docs/GLOSSARY.md
```

Expected: at least one hit in each of the four files (AC8).

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md docs/workflow/feature-lifecycle.md docs/features/FEATURE-RULES.md docs/GLOSSARY.md README.md
git commit -m "docs(releases): make the release note a mandatory phase-5 step and merge-gate item"
```

---

### Task 5: Command Center — Releases panel

**Prerequisite:** PR #3 (Ideas panel) is merged, then `git fetch origin && git merge origin/main` on this branch. The Ideas panel is the pattern this task mirrors; do not start before the merge or you will write the panel twice.

**Files:**
- Modify: `ProjectCommandCenter/collect.mjs` (add `collectReleases()` + two state keys), `ProjectCommandCenter/index.html` (NAV entry, view section, panel, drawer), `ProjectCommandCenter/README.md` (one bullet)

**Interfaces:**
- Consumes: `parseNotes({ root })` from Task 1, via guarded dynamic import.
- Produces: state keys `releases: Note[]` and `releasesStatus: 'ok' | 'unavailable'` (+ `releasesError: string|null`), rendered by `index.html`.

- [ ] **Step 1: Sync with the merged default branch**

```bash
git fetch origin
git merge origin/main
```

Expected: clean merge (this branch has not touched `collect.mjs`/`index.html` yet).

- [ ] **Step 2: Add the collector to `collect.mjs`, above `collectState()`**

```js
/**
 * Release notes come from ReleaseNotes/parse.mjs — the same parser the generator
 * uses. The import is guarded so the Command Center still runs if that folder was
 * not copied along; 'unavailable' is reported distinctly from "no notes yet", so
 * an empty panel never hides a broken install.
 */
async function collectReleases() {
  try {
    const { parseNotes } = await import('../ReleaseNotes/parse.mjs');
    const { notes, problems } = parseNotes({ root: REPO_ROOT });
    return {
      releases: notes,
      releasesStatus: problems.length ? 'problems' : 'ok',
      releasesError: problems.length ? problems.map((p) => `${p.file}: ${p.message}`).join('; ') : null,
    };
  } catch (err) {
    return { releases: [], releasesStatus: 'unavailable', releasesError: String(err.message || err) };
  }
}
```

- [ ] **Step 3: Make `collectState()` async and merge the keys in**

`export function collectState()` becomes `export async function collectState()`; inside, add
`const rel = await collectReleases();` next to the other collectors, spread `...rel` into the
returned object, and add `releases: rel.releases.length` to `stats`. Update the three call sites —
`serve.mjs`, `generate.mjs`, and the `node collect.mjs` debug block at the bottom — to `await` it.

- [ ] **Step 4: Verify the state**

```bash
node ProjectCommandCenter/collect.mjs | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.releasesStatus, j.releases.length, j.releases[0]?.title)})"
```

Expected: `ok 2 Automatic release notes`.

- [ ] **Step 5: Add the panel to `index.html`**

Add `{ id: 'releases', label: 'Releases', icon: '⌂' }` to `NAV` after the Ideas entry; add
`<section class="view" id="view-releases" hidden>${releasesSection(s)}</section>` alongside the
other view sections; and implement `releasesSection(s)` mirroring the Ideas panel's card grid —
one card per note showing `num`, `title`, `released`, `type`, and the first bullet, opening the
note body in the existing drawer on click. Two empty states, distinct:

```js
if (s.releasesStatus === 'unavailable')
  return `<div class="sec-head"><h2>Releases</h2></div><div class="empty warn">Release-note parser unavailable — <code>ReleaseNotes/parse.mjs</code> could not be loaded. ${esc(s.releasesError || '')}</div>`;
if (!s.releases.length)
  return `<div class="sec-head"><h2>Releases</h2></div><div class="empty">No release notes yet — the first one lands with the next merge.</div>`;
```

- [ ] **Step 6: Verify both empty states in the browser**

```bash
node ProjectCommandCenter/serve.mjs
```

Open http://localhost:4317 → Releases: two cards, click one, drawer shows the note body.
Then `mv ReleaseNotes ../rn-aside && ` reload → the warning empty state; `mv ../rn-aside ReleaseNotes` to restore.
Then `mkdir $SCRATCH/empty` test is unnecessary — instead temporarily `mv docs/releases ../rel-aside`, reload → the ordinary empty state; restore (AC7).

- [ ] **Step 7: Add one bullet to `ProjectCommandCenter/README.md`** in the feature list:

```markdown
- **Releases** — the `docs/releases/` notes, newest first; click one to read it in a drawer.
```

- [ ] **Step 8: Commit**

```bash
git add ProjectCommandCenter/
git commit -m "feat(releases): Command Center Releases panel"
```

---

### Task 6: Verify, clean, and open the PR

**Files:**
- Delete: `docs/superpowers/specs/2026-07-29-release-notes-design.md`, `docs/superpowers/specs/2026-07-29-release-notes-plan-review.md`, `docs/superpowers/plans/2026-07-29-release-notes.md` (D9 — planning docs never reach the merged template)
- Modify: `docs/releases/0001-release-notes.md` (add the PR number), regenerate HTML

- [ ] **Step 1: Run the full AC verification from the spec's Verification table**

Every row, in order, recording observed output. Specifically including:

```bash
RELEASE_NOTES_REMOTE="" node ReleaseNotes/generate.mjs && grep -c 'href="\.\./docs/' ReleaseNotes/0001-release-notes.html
node ReleaseNotes/generate.mjs && grep -c 'github.com/.*/blob/' ReleaseNotes/0001-release-notes.html
```

Expected: relative hrefs in the first run, GitHub blob URLs in the second (AC4).

```bash
printf '# 0009 — XSS probe\n\n**Released:** 2026-07-29 · **Type:** Chore\n\n## What changed\n\n- <script>alert(1)</script>\n' > docs/releases/0009-xss-probe.md
node ReleaseNotes/generate.mjs && grep -c '&lt;script&gt;' ReleaseNotes/0009-xss-probe.html
rm docs/releases/0009-xss-probe.md ReleaseNotes/0009-xss-probe.html && node ReleaseNotes/generate.mjs
```

Expected: `1` — the script tag is escaped text, not markup (AC10).

- [ ] **Step 2: Delete the planning docs**

```bash
git rm -r docs/superpowers
```

- [ ] **Step 3: Sync with the default branch and re-run the gate**

```bash
git fetch origin
git merge origin/main
node ReleaseNotes/generate.mjs --check
node ProjectCommandCenter/collect.mjs > /dev/null && echo "command center OK"
```

Expected: `OK — 2 release note(s), no problems.` and `command center OK`.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "chore(releases): drop planning docs before the PR"
git push -u origin feat/release-notes
```

- [ ] **Step 5: Open the PR, then backfill its number into note 0001**

```bash
gh pr create --title "feat(releases): automatic release notes on every merge" --body "<summary + AC table>"
```

Then add `**PR:** #N` to `docs/releases/0001-release-notes.md`'s metadata line, regenerate, and:

```bash
git add docs/releases/0001-release-notes.md ReleaseNotes/
git commit -m "docs(releases): record PR number in note 0001"
git push
```

- [ ] **Step 6: Check `docs/CI-ROADMAP.md`** for items whose trigger now holds (the merge gate is
  now machine-checkable via `--check`, which is a candidate CI job) and **surface them to the
  human** — do not act on them. The agent does not merge the PR.

---

## Self-review

**Spec coverage:** AC1 → Task 3; AC2/AC3 → Tasks 2–3 + Task 6 Step 1; AC4 → Task 2 (`RELEASE_NOTES_REMOTE`) + Task 6 Step 1; AC5 → Task 1 Step 5 + Task 2; AC6 → Task 3 Step 5; AC7 → Task 5 Steps 4–6; AC8 → Task 4 Step 6; AC9 → Task 3; AC10 → Task 6 Step 1. Bootstrap section → Task 3. Clean-template constraint → Task 6 Step 2.

**Placeholders:** none — every code step carries real code; the two prose-only steps (Task 4 Step 5, Task 5 Steps 5 and 7) name the exact file, the exact insertion point, and the exact text or the existing pattern to mirror.

**Type consistency:** `parseNotes({ root }) → { notes, problems }` is used identically in Task 2 (`generate.mjs`) and Task 5 (`collectReleases`). Note fields (`num`, `slug`, `title`, `released`, `type`, `pr`, `bullets`, `related`, `filesTouched`) are spelled the same in the parser, the renderer, and the panel. `hrefFor(path, anchor)` matches the `{label, path, anchor}` shape `resolveRef` returns.
