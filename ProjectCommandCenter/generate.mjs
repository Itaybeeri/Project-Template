/**
 * generate.mjs — write static outputs from the current repo state.
 *
 *   node ProjectCommandCenter/generate.mjs
 *
 * Produces two files in ProjectCommandCenter/ (both git-ignored):
 *   • data.json      — the raw project-state snapshot (for tooling / the page's
 *                      offline fallback when served without /api/state).
 *   • snapshot.html  — a fully self-contained, single-file command center with the
 *                      state inlined (no server, no fetch). Open it directly or
 *                      share it — it renders the state as of generation time.
 *
 * Use this for a point-in-time artifact; use serve.mjs for the live view.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectState } from './collect.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const state = collectState();
const json = JSON.stringify(state, null, 2);
writeFileSync(join(HERE, 'data.json'), json + '\n');

// Inline the state into index.html so the snapshot needs no server.
const template = readFileSync(join(HERE, 'index.html'), 'utf8');
const inject = `<script>window.__STATE__ = ${JSON.stringify(state).replace(/</g, '\\u003c')};</script>`;
const snapshot = template.replace('</head>', `${inject}\n</head>`);
writeFileSync(join(HERE, 'snapshot.html'), snapshot);

console.log(`Project Command Center: wrote data.json + snapshot.html`);
console.log(`  ${state.project.name} · ${state.features.length} features · ${state.stats.active} in flight · ${state.stats.done} done · ${state.adrs.length} ADRs`);
