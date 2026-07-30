/**
 * Renders `docs/releases/*.md` into this folder: `index.html` + one page per note.
 *
 * Validates on EVERY run, not just under `--check`: the phase-5 lifecycle step runs
 * the plain command, so a dead ref or a duplicate number must fail there rather than
 * ship. Output is deterministic — no timestamps, no network — so re-running with no
 * doc changes is a no-op.
 *
 *   node ReleaseNotes/generate.mjs            write index.html + note pages
 *   node ReleaseNotes/generate.mjs --check    validate only, write nothing
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNotes, REPO_ROOT } from './parse.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_ONLY = process.argv.includes('--check');

// ─────────────────────────────────────────────────────────────────────────────
// escaping — text and attribute context, applied before any markup is added
// ─────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// ─────────────────────────────────────────────────────────────────────────────
// links
// ─────────────────────────────────────────────────────────────────────────────
function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * The remote is read once and is injectable: `RELEASE_NOTES_REMOTE=""` forces
 * relative mode, so both link modes are exercisable in a repo that has a GitHub
 * remote.
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

/** A repo-relative docs path → href. GitHub blob URL when we can, relative otherwise. */
function hrefFor(path, anchor) {
  const frag = anchor ? `#${anchor}` : '';
  return BASE ? `${BASE}/blob/${BRANCH}/${path}${frag}` : `../${path}${frag}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// markdown subset — escape first, then whitelist
// ─────────────────────────────────────────────────────────────────────────────
function inline(md) {
  let h = esc(md);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // `u` is already escaped by esc() above — escaping again would double-encode &.
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
// pages
// ─────────────────────────────────────────────────────────────────────────────
const STYLE = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 ui-sans-serif,system-ui,'Segoe UI',sans-serif;background:#0f1115;color:#e6e8ee}
main{max-width:820px;margin:0 auto;padding:40px 24px 80px}
h1{font-size:26px;margin:0 0 6px}
h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8b93a7;margin:32px 0 10px}
a{color:#7aa2f7;text-decoration:none} a:hover{color:#9db4ff;text-decoration:underline}
.meta{color:#8b93a7;font-size:13px;margin-bottom:28px}
.tag{display:inline-block;padding:1px 8px;border:1px solid #2a3040;border-radius:999px;font-size:12px;color:#b8c0d4}
ul{padding-left:20px;margin:0} li{margin:6px 0}
code{background:#1a1f2b;padding:1px 5px;border-radius:4px;font-size:13px}
.row{display:flex;gap:14px;align-items:baseline;padding:14px 0;border-bottom:1px solid #1e2430}
.row .num{color:#8b93a7;font-variant-numeric:tabular-nums;font-size:13px}
.row .ttl{font-weight:600;font-size:16px}
.sum{color:#8b93a7;font-size:13px;margin-top:2px}
.back{display:inline-block;margin-bottom:24px;font-size:13px}
`;

const page = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><main>${body}</main></body></html>
`;

function notePage(n) {
  const related = n.related.length
    ? `<h2>Related docs</h2><ul>${n.related
        .map((r) => `<li><a href="${esc(hrefFor(r.path, r.anchor))}">${esc(r.label)}</a></li>`)
        .join('')}</ul>`
    : '';
  const files = n.filesTouched.length
    ? `<h2>Files touched</h2><ul>${n.filesTouched.map((f) => `<li>${inline(f)}</li>`).join('')}</ul>`
    : '';
  return page(
    `${n.num} — ${n.title}`,
    `
    <a class="back" href="index.html">← All release notes</a>
    <h1>${esc(n.num)} — ${esc(n.title)}</h1>
    <div class="meta">${esc(n.released)} · <span class="tag">${esc(n.type)}</span>${n.pr ? ` · PR #${esc(n.pr)}` : ''}</div>
    <h2>What changed</h2>
    <ul>${n.bullets.map((b) => `<li>${inline(b)}</li>`).join('')}</ul>
    ${related}
    ${files}`,
  );
}

function indexPage(notes) {
  const rows = notes
    .map(
      (n) => `
    <div class="row">
      <span class="num">${esc(n.num)}</span>
      <span>
        <a class="ttl" href="${esc(`${n.num}-${n.slug}.html`)}">${esc(n.title)}</a>
        <div class="sum">${esc(n.released)} · ${esc(n.type)}${n.pr ? ` · PR #${esc(n.pr)}` : ''}${n.bullets[0] ? ` — ${esc(n.bullets[0])}` : ''}</div>
      </span>
    </div>`,
    )
    .join('');
  return page(
    'Release notes',
    `
    <h1>Release notes</h1>
    <div class="meta">One note per merge · newest first · generated from <code>docs/releases/</code></div>
    ${notes.length ? rows : '<p class="sum">No release notes yet.</p>'}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// run
// ─────────────────────────────────────────────────────────────────────────────
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
const current = new Set(notes.map((n) => `${n.num}-${n.slug}.html`));
for (const n of notes) writeFileSync(join(HERE, `${n.num}-${n.slug}.html`), notePage(n));

// Prune orphans: a renamed or deleted note must not leave a stale committed page
// that the index no longer links but that is still reachable by URL.
const orphans = readdirSync(HERE).filter((f) => /^\d{4}-.*\.html$/.test(f) && !current.has(f));
for (const f of orphans) rmSync(join(HERE, f));

console.log(
  `Wrote index.html + ${notes.length} note page(s).${orphans.length ? ` Pruned ${orphans.length} stale page(s).` : ''}`,
);
