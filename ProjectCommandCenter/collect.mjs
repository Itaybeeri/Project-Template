/**
 * collect.mjs — read the repo's docs + git and produce ONE project-state object.
 *
 * This is the single source of truth for the Project Command Center. It is deliberately
 * generic: it parses whatever `CLAUDE.md`, `docs/features/FEATURE-INDEX.md`,
 * per-feature folders, `docs/adr/ADR-INDEX.md`, `docs/CI-ROADMAP.md` and
 * `docs/IDEAS.md` a project has, and degrades gracefully when everything is still `<FILL:>`
 * template placeholders. Node built-ins only — no dependencies — so it copies
 * into the template and runs anywhere Node ≥ 18 does.
 *
 * Both entry points share it:
 *   • serve.mjs   → calls collectState() live on every /api/state request
 *   • generate.mjs → calls it once and inlines the result into a static page
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
/** Repo root = the ProjectCommandCenter folder's parent (the folder lives next to docs/). */
export const REPO_ROOT = resolve(HERE, '..');

/** The five lifecycle phases, in order (see docs/workflow/feature-lifecycle.md). */
export const PHASES = ['Brainstorm', 'Plan', 'Implement', 'Test', 'Review/Merge'];
/** Kanban columns: the pipeline plus the two terminal buckets. */
export const COLUMNS = ['Queued', 'Brainstorm', 'Plan', 'Implement', 'Test', 'Review/Merge', 'Done'];

// ─────────────────────────────────────────────────────────────────────────────
// tiny fs + markdown helpers (defensive: never throw on a missing/odd file)
// ─────────────────────────────────────────────────────────────────────────────

function read(...parts) {
  const p = join(REPO_ROOT, ...parts);
  try {
    // Normalize CRLF → LF so `\n\n` paragraph boundaries match on Windows too.
    return existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
  } catch {
    return null;
  }
}

const hasFill = (s) => !!s && /<FILL:|<PROJECT_NAME>/.test(s);

/** Strip a markdown link `[text](target)` → { text, target }; plain text passes through. */
function unlink(cell) {
  const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(cell);
  return m ? { text: m[1].trim(), target: m[2].trim() } : { text: cell.trim(), target: null };
}

/**
 * Find the first GitHub-flavored markdown table whose header row contains ALL
 * of `headerNeedles` (case-insensitive) and return its data rows as cell arrays.
 */
function parseTable(md, headerNeedles) {
  if (!md) return [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('|')) continue;
    const header = splitRow(lines[i]).map((c) => c.toLowerCase());
    const ok = headerNeedles.every((n) => header.some((h) => h.includes(n.toLowerCase())));
    if (!ok) continue;
    // next line must be the `---|---` separator
    if (!/^[\s|:-]+$/.test(lines[i + 1] || '')) continue;
    const rows = [];
    for (let j = i + 2; j < lines.length; j++) {
      const line = lines[j];
      if (!line.includes('|') || /^\s*$/.test(line)) break;
      rows.push(splitRow(line));
    }
    return rows;
  }
  return [];
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** Extract the first fenced ```code block``` that appears after `afterHeading`. */
function codeBlockAfter(md, afterHeading) {
  if (!md) return null;
  const idx = md.search(new RegExp(`^#{1,6}\\s.*${afterHeading}`, 'im'));
  const scope = idx >= 0 ? md.slice(idx) : md;
  const m = /```[^\n]*\n([\s\S]*?)```/.exec(scope);
  return m ? m[1].replace(/\s+$/, '') : null;
}

/** The paragraph(s) of prose directly under a `## Heading`, minus HTML comments. */
function sectionProse(md, heading) {
  if (!md) return null;
  const re = new RegExp(`^#{2,3}\\s+${heading}\\s*$`, 'im');
  const m = re.exec(md);
  if (!m) return null;
  const rest = md.slice(m.index + m[0].length);
  const stop = rest.search(/^#{2,3}\s+/m);
  const body = (stop >= 0 ? rest.slice(0, stop) : rest)
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  const firstPara = body.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('```'));
  return firstPara ? firstPara.replace(/\s+/g, ' ').trim() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// project overview (CLAUDE.md)
// ─────────────────────────────────────────────────────────────────────────────

function collectProject(index) {
  const claude = read('CLAUDE.md') || '';
  const titleMatch = /^#\s*CLAUDE\.md\s*[—–-]\s*(.+)$/m.exec(claude);
  let name = titleMatch ? titleMatch[1].trim() : null;
  if (!name || hasFill(name)) name = null;

  const statusMatch = /\*\*Status:\*\*\s*(.+)/.exec(claude);
  const status = statusMatch ? statusMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim() : null;

  const description = sectionProse(claude, 'Project');
  const mentalModelProse = sectionProse(claude, 'The core mental model.*');
  const mentalModelDiagram = codeBlockAfter(claude, 'core mental model');

  // Guiding principle can live in CLAUDE.md or the feature index.
  const gp =
    /\*\*Guiding principle[^:]*:\*\*\s*([\s\S]*?)(?:\n\n|$)/.exec(claude) ||
    /\*\*Guiding principle[^:]*:\*\*\s*([\s\S]*?)(?:\n\n|$)/.exec(index || '');
  const guidingPrinciple = gp ? gp[1].replace(/\s+/g, ' ').trim() : null;

  const initialized = !hasFill(claude) && !!name;

  return {
    name: name || 'Uninitialized project',
    initialized,
    status: status && !hasFill(status) ? status : initialized ? status : 'Template — not yet initialized',
    description: description && !hasFill(description) ? description : null,
    guidingPrinciple: guidingPrinciple && !hasFill(guidingPrinciple) ? guidingPrinciple : null,
    mentalModel: mentalModelProse && !hasFill(mentalModelProse) ? mentalModelProse : null,
    mentalModelDiagram: mentalModelDiagram && !hasFill(mentalModelDiagram) ? mentalModelDiagram : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// features (FEATURE-INDEX.md + per-feature folders)
// ─────────────────────────────────────────────────────────────────────────────

function collectFeatures(gitBranches) {
  const index = read('docs', 'features', 'FEATURE-INDEX.md');
  const rows = parseTable(index, ['#', 'name', 'status']);

  const features = rows
    .map((cells) => {
      const [numRaw, nameCell, statusCell, prCell, ...rest] = cells;
      const num = (numRaw || '').replace(/[^0-9]/g, '');
      if (!num) return null; // skip legend/example rows without a real number
      const { text: name, target } = unlink(nameCell || '');
      const slug = folderSlug(num, name, target);
      return {
        num,
        name: name && !hasFill(name) ? name : `feature ${num}`,
        slug,
        status: cleanStatus(statusCell),
        pr: parsePr(prCell),
        summary: (rest.join(' | ') || '').replace(/\s+/g, ' ').trim() || null,
      };
    })
    .filter(Boolean);

  for (const f of features) {
    enrichFromFolder(f);
    f.branch = `feat/${f.slug}`;
    f.branchExists = gitBranches.some((b) => b.endsWith(`feat/${f.slug}`) || b.endsWith(`feat/${f.num}`));
    f.commits = featureCommits(f.slug);
    const placed = derivePhase(f);
    f.phase = placed.phase;
    f.column = placed.column;
    f.phaseIndex = PHASES.indexOf(placed.phase);
  }

  // newest first for display convenience is done in the UI; keep index order here
  return features;
}

/** Best-effort: commits that mention this feature's slug (merge/branch/squash subjects). */
function featureCommits(slug) {
  const raw = git(['log', '--all', '-12', '--pretty=%h\x1f%ar\x1f%s', '-i', '--grep', slug]);
  if (!raw) return [];
  const seen = new Set();
  return raw
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [hash, rel, subject] = l.split('\x1f');
      return { hash, rel, subject };
    })
    .filter((c) => (seen.has(c.hash) ? false : seen.add(c.hash)));
}

function folderSlug(num, name, target) {
  if (target) {
    const m = /([0-9]{3,4}-[a-z0-9-]+)/i.exec(target);
    if (m) return m[1];
  }
  const dir = join(REPO_ROOT, 'docs', 'features');
  if (existsSync(dir)) {
    const hit = readdirSync(dir).find((d) => d.startsWith(`${num}-`));
    if (hit) return hit;
  }
  const clean = (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${num}-${clean || 'feature'}`;
}

function cleanStatus(s) {
  const v = (s || '').replace(/[*`]/g, '').trim();
  if (!v || hasFill(v)) return 'Planned';
  return v;
}

function parsePr(cell) {
  if (!cell) return null;
  const { text, target } = unlink(cell);
  const num = /#?(\d+)/.exec(text);
  if (!num) return null;
  return { number: num[1], url: target };
}

function enrichFromFolder(f) {
  const base = ['docs', 'features', f.slug];
  const brainstorm = read(...base, 'brainstorm.md');
  const spec = read(...base, 'spec.md');
  const planReview = read(...base, 'plan-review.md');

  f.docs = { brainstorm: !!brainstorm, spec: !!spec, planReview: !!planReview };
  f.hasFolder = !!(brainstorm || spec || planReview);
  // Full artifact text so the command center can show WHAT was done in each phase.
  f.artifacts = { brainstorm, spec, planReview };

  // Architect-review PASS is stamped in brainstorm.md and/or referenced in spec.md.
  f.architectReviewPassed = /architect-review\s+PASS/i.test((brainstorm || '') + (spec || ''));
  f.brainstormComplete =
    !!brainstorm &&
    (f.architectReviewPassed ||
      /\b(complete|ready for plan|notes for plan)\b/i.test(brainstorm));

  // plan-review rounds: "## Round N — DATE — VERDICT: X"
  f.planReviewRounds = [];
  if (planReview) {
    const re = /##\s*Round\s*(\d+)\s*[—–-]\s*([\d-]+)?\s*[—–-]?\s*VERDICT:\s*([A-Z-]+)/gi;
    let m;
    while ((m = re.exec(planReview))) {
      f.planReviewRounds.push({ round: Number(m[1]), date: m[2] || null, verdict: m[3].toUpperCase() });
    }
  }
  f.planReviewVerdict = f.planReviewRounds.length
    ? f.planReviewRounds[f.planReviewRounds.length - 1].verdict
    : null;

  // spec status + related ADRs + acceptance criteria
  f.specStatus = null;
  f.relatedAdrs = [];
  f.acceptanceCriteria = [];
  if (spec) {
    const st = /\*\*Status:\*\*\s*([^\n<]+)/.exec(spec);
    f.specStatus = st ? st[1].trim() : null;
    f.relatedAdrs = [...new Set((spec.match(/ADR-\d{3,4}/g) || []))];
    f.acceptanceCriteria = parseAcceptanceCriteria(spec);
  }
}

function parseAcceptanceCriteria(spec) {
  const idx = spec.search(/^#{2,3}\s+Acceptance criteria/im);
  if (idx < 0) return [];
  const rest = spec.slice(idx);
  const stop = rest.slice(3).search(/^#{2,3}\s+/m);
  const scope = stop >= 0 ? rest.slice(0, stop + 3) : rest;
  const out = [];
  const re = /^\s*(\d+)\.\s+\*\*([^*]+?)\.?\*\*\s*([^\n]*)/gm;
  let m;
  while ((m = re.exec(scope))) {
    const title = m[2].trim();
    const tagMatch = /\(([^)]*env-gated[^)]*|unit|component|integration)[^)]*\)/i.exec(
      title + ' ' + (m[3] || '')
    );
    out.push({ n: Number(m[1]), title, tag: tagMatch ? tagMatch[1].trim() : null });
  }
  return out;
}

/**
 * Place a feature into a lifecycle phase + kanban column, combining the coarse
 * FEATURE-INDEX status with the fine-grained evidence in its docs folder
 * (mirrors the phase table in .claude/commands/continue.md).
 */
function derivePhase(f) {
  const status = (f.status || '').toLowerCase();

  if (status.startsWith('done')) return { phase: 'Review/Merge', column: 'Done' };
  if (status.startsWith('reserved')) return { phase: 'Brainstorm', column: 'Queued' };
  if (!f.hasFolder) return { phase: 'Brainstorm', column: 'Queued' };

  // Folder exists → read the evidence.
  if (!f.docs.spec) {
    if (f.brainstormComplete) return { phase: 'Plan', column: 'Plan' };
    return { phase: 'Brainstorm', column: 'Brainstorm' };
  }
  // spec exists
  if (f.planReviewVerdict !== 'PASS') return { phase: 'Plan', column: 'Plan' };

  // plan-review PASS → in build. Use index status to distinguish build vs verify.
  if (status.includes('review')) return { phase: 'Review/Merge', column: 'Review/Merge' };
  if (status.includes('test')) return { phase: 'Test', column: 'Test' };
  // "In progress" with an approved plan → implementing.
  return { phase: 'Implement', column: 'Implement' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADRs + CI-roadmap
// ─────────────────────────────────────────────────────────────────────────────

function collectAdrs() {
  const index = read('docs', 'adr', 'ADR-INDEX.md');
  return parseTable(index, ['#', 'title', 'status'])
    .map((cells) => {
      const [num, title, status, fromFeature, ...rest] = cells;
      const n = (num || '').replace(/[^0-9]/g, '');
      if (!n) return null;
      return {
        num: n,
        title: unlink(title || '').text || `ADR-${n}`,
        status: cleanStatus(status),
        fromFeature: (fromFeature || '').replace(/[^0-9]/g, '') || null,
        summary: (rest.join(' | ') || '').replace(/\s+/g, ' ').trim() || null,
      };
    })
    .filter(Boolean)
    .filter((a) => !hasFill(a.title));
}

function collectCiRoadmap() {
  const md = read('docs', 'CI-ROADMAP.md');
  return parseTable(md, ['id', 'trigger'])
    .map((cells) => {
      const [id, item, why, trigger, status] = cells;
      if (!id || hasFill(item || '')) return null;
      return {
        id: id.replace(/[*`]/g, '').trim(),
        item: (item || '').trim(),
        why: (why || '').trim(),
        trigger: (trigger || '').trim(),
        status: cleanStatus(status),
      };
    })
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// ideas & thoughts (docs/IDEAS.md)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse the ideas notepad: an index table (`# | Idea | Status | Tag | Summary`)
 * plus one `### NNN — Title` memo section per idea. Returns idea objects that pair
 * each index row with its memo body (for the command center's drawer). Degrades to
 * an empty list when the file is missing or still a `<FILL>` placeholder.
 */
function collectIdeas() {
  const md = read('docs', 'IDEAS.md');
  const memos = ideaMemos(md);
  return parseTable(md, ['#', 'idea', 'status'])
    .map((cells) => {
      const [numRaw, ideaCell, statusCell, tagCell, ...rest] = cells;
      const num = (numRaw || '').replace(/[^0-9]/g, '');
      if (!num) return null; // skip legend/example rows without a real number
      const { text: title } = unlink(ideaCell || '');
      const tag = (tagCell || '').replace(/[*`]/g, '').trim();
      const summary = (rest.join(' | ') || '').replace(/\s+/g, ' ').trim() || null;
      if (hasFill(title) && hasFill(summary || '')) return null; // untouched example row
      return {
        num,
        title: title && !hasFill(title) ? title : `idea ${num}`,
        status: cleanStatus(statusCell),
        tag: tag && tag !== '—' && !hasFill(tag) ? tag : null,
        summary: summary && !hasFill(summary) ? summary : null,
        body: memos[num] || null,
      };
    })
    .filter(Boolean);
}

/** Map idea number → memo body text from the `### NNN — Title` sections (HTML comments stripped). */
function ideaMemos(md) {
  const out = {};
  if (!md) return out;
  const body = md.replace(/<!--[\s\S]*?-->/g, '');
  const re = /^#{3,4}\s+(\d+)\s*[—–-]\s*([^\n]*)\n([\s\S]*?)(?=^#{2,4}\s|$(?![\s\S]))/gm;
  let m;
  while ((m = re.exec(body))) {
    const num = m[1].replace(/[^0-9]/g, '');
    const text = m[3].replace(/\s+$/, '').trim();
    if (num && text) out[num] = text;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// git
// ─────────────────────────────────────────────────────────────────────────────

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function collectGit() {
  const isRepo = git(['rev-parse', '--is-inside-work-tree']) === 'true';
  if (!isRepo) return { isRepo: false, branch: null, commits: [], contributors: [], branches: [], defaultBranch: null };

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  // The remote this checkout actually publishes to — NOT a hardcoded `origin`.
  // A project scaffolded from a template can keep `origin` pointed at that
  // template repo while its real code lives on another remote; hardcoding
  // `origin` would then link commits to the wrong GitHub project.
  const remote = projectRemote();
  const defaultBranch =
    (git(['symbolic-ref', '--quiet', '--short', `refs/remotes/${remote}/HEAD`]) || '').replace(new RegExp(`^${remote}/`), '') ||
    (git(['branch', '--list', 'main']) ? 'main' : branch);

  const logRaw = git(['log', '-25', '--pretty=%h\x1f%an\x1f%ar\x1f%aI\x1f%s']) || '';
  const commits = logRaw
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const [hash, author, rel, iso, subject] = l.split('\x1f');
      return { hash, author, rel, iso, subject };
    });

  const contribRaw = git(['shortlog', '-sne', 'HEAD']) || git(['log', '--pretty=%an']) || '';
  const contributors = summarizeContributors(contribRaw);

  const branches = (git(['branch', '-a', '--format=%(refname:short)']) || '')
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean);

  const dirty = (git(['status', '--porcelain']) || '').split('\n').filter(Boolean).length;
  const remoteUrl = normalizeRemote(git(['config', '--get', `remote.${remote}.url`]));

  return { isRepo: true, branch, defaultBranch, commits, contributors, branches, dirtyCount: dirty, remoteUrl };
}

/**
 * Pick the remote this checkout truly belongs to. Preference order:
 *   1. the current branch's upstream remote (e.g. the remote in `<remote>/main`),
 *   2. `origin` if it exists,
 *   3. the first configured remote.
 * Deriving from the tracked upstream (not a hardcoded `origin`) keeps commit
 * links pointing at the real project repo even if `origin` ever points
 * elsewhere (e.g. a template the project was scaffolded from).
 */
function projectRemote() {
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  if (upstream && upstream.includes('/')) {
    const name = upstream.slice(0, upstream.indexOf('/'));
    if (git(['config', '--get', `remote.${name}.url`])) return name;
  }
  if (git(['config', '--get', 'remote.origin.url'])) return 'origin';
  const remotes = (git(['remote']) || '').split('\n').map((r) => r.trim()).filter(Boolean);
  return remotes[0] || 'origin';
}

/** Normalize any remote URL (git@, ssh://, https, with/without .git) → https base. */
function normalizeRemote(url) {
  if (!url) return null;
  let u = url.trim().replace(/\.git$/, '');
  const scp = /^git@([^:]+):(.+)$/.exec(u);
  if (scp) u = `https://${scp[1]}/${scp[2]}`;
  u = u.replace(/^ssh:\/\/git@/, 'https://').replace(/^git:\/\//, 'https://');
  return /^https?:\/\//.test(u) ? u : null;
}

function summarizeContributors(raw) {
  // shortlog -sne gives "  <count>\t<name> <email>"; plain log gives one name per line.
  const map = new Map();
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const m = /^(\d+)\s+(.+?)\s*(<[^>]+>)?$/.exec(t);
    if (m && /^\d+$/.test(m[1])) {
      const name = m[2].trim();
      map.set(name, (map.get(name) || 0) + Number(m[1]));
    } else {
      map.set(t, (map.get(t) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function collectState() {
  const indexMd = read('docs', 'features', 'FEATURE-INDEX.md');
  const gitState = collectGit();
  const project = collectProject(indexMd);
  project.defaultBranch = gitState.defaultBranch;
  project.currentBranch = gitState.branch;

  const features = collectFeatures(gitState.branches);
  const adrs = collectAdrs();
  const ciRoadmap = collectCiRoadmap();
  const ideas = collectIdeas();

  const byStatus = {};
  const byColumn = {};
  for (const c of COLUMNS) byColumn[c] = 0;
  for (const f of features) {
    byStatus[f.status] = (byStatus[f.status] || 0) + 1;
    byColumn[f.column] = (byColumn[f.column] || 0) + 1;
  }

  const totalAcs = features.reduce((n, f) => n + (f.acceptanceCriteria?.length || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    project,
    phases: PHASES,
    columns: COLUMNS,
    features,
    adrs,
    ciRoadmap,
    ideas,
    git: gitState,
    stats: {
      totalFeatures: features.length,
      byStatus,
      byColumn,
      done: features.filter((f) => f.column === 'Done').length,
      active: features.filter((f) => !['Queued', 'Done'].includes(f.column)).length,
      queued: features.filter((f) => f.column === 'Queued').length,
      adrs: adrs.length,
      ideas: ideas.length,
      openIdeas: ideas.filter((i) => !/graduated|dropped/i.test(i.status)).length,
      openCiItems: ciRoadmap.filter((i) => /defer/i.test(i.status)).length,
      totalAcceptanceCriteria: totalAcs,
    },
  };
}

// Allow `node collect.mjs` to dump the JSON for debugging.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(collectState(), null, 2) + '\n');
}
