/**
 * Release-note parser — the single source of truth for `docs/releases/`.
 *
 * Two consumers: `ReleaseNotes/generate.mjs` (renders the HTML) and
 * `ProjectCommandCenter/collect.mjs` (the Releases panel). It is a pure reader:
 * it never writes, and it reports problems instead of throwing so each consumer
 * decides what to do with them.
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
    notes.push(parseOne({
      num,
      slug,
      file: name,
      md: readFileSync(join(dir, name), 'utf8'),
      root,
      problems,
    }));
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

  // A `## Related docs` section may list further docs by hand — `[label](path)`,
  // `path`, or `` `path` `` — for anything the Refs grammar doesn't name. These are
  // held to the same standard: a path that doesn't exist is a hard error.
  for (const line of bulletsOf(section(md, 'Related docs'))) {
    const link = manualLink(line);
    if (!link) {
      problems.push({ file, message: `related-docs entry "${line}" is not a repo path or [label](path)` });
      continue;
    }
    if (!existsSync(join(root, link.path))) {
      problems.push({ file, message: `related doc "${link.path}" does not exist` });
      continue;
    }
    related.push(link);
  }

  return {
    num,
    slug,
    file,
    title,
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

/** Body of a `## <heading>` section, up to the next `##` (or end of file). */
function section(md, heading) {
  // NB: JS RegExp has no \Z, and a bare `$` under /m matches every line end — which
  // would let the lazy body match nothing. `$(?![\s\S])` is true end-of-input only.
  const re = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=\\n##\\s|$(?![\\s\\S]))`, 'mi');
  return re.exec(md)?.[1] || '';
}

function bulletsOf(block) {
  return block
    .split('\n')
    .map((l) => /^[-*]\s+(.+)$/.exec(l.trim())?.[1])
    .filter(Boolean);
}

/** One `## Related docs` bullet → `{label, path, anchor}`, or null if it isn't a doc link. */
function manualLink(text) {
  const t = text.trim();
  const md = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t);
  const raw = md ? md[2] : t.replace(/^`|`$/g, '');
  const cleaned = raw.replace(/^\.\//, '');
  if (!/^[\w./-]+\.md(#[\w-]+)?$/i.test(cleaned)) return null;
  const [path, anchor] = cleaned.split('#');
  return { label: md ? md[1] : path, path, anchor: anchor || null };
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
      .filter((f) => f.endsWith('.md'))
      .sort()
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
