#!/usr/bin/env node
/**
 * Fails the build when linkinator did not actually check a link.
 *
 * linkinator does NOT report an unreachable host as broken — it drops the
 * link from the run entirely. The summary still says "Successfully scanned",
 * the count just quietly falls. That has already produced two false passes on
 * this repo: medium.com and hashnode.dev (Cloudflare 403s automated clients),
 * and idowuseyi.dev itself while Bot Fight Mode was challenging CI's
 * datacenter IP — the run reported success for 7 links it never fetched.
 *
 * So the skip list must be explicit and exhaustive: every external host the
 * built site references is either CHECKED or DECLARED here. Nothing silent.
 *
 * Usage: node scripts/check-links.mjs <linkinator-json> <dist-dir> [skip,hosts]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const [jsonPath, distDir, skipArg = ''] = process.argv.slice(2);
const skipHosts = skipArg.split(',').map((s) => s.trim()).filter(Boolean);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(html|xml|txt)$/.test(name)) acc.push(full);
  }
  return acc;
}

// Every external host the built output LINKS TO. Deliberately attribute-scoped
// rather than a raw scan for `https?://`: a bare scan also picks up JSON-LD
// `@context`, XML namespaces (w3.org, sitemaps.org) and URLs built at runtime
// inside script template literals, none of which is a link anyone can follow
// and none of which linkinator crawls. Flagging those would train the reader
// to ignore this guard, which is how guards stop working.
const LINK_ATTR = /(?:href|src)="(https?:\/\/[^"]+)"/g;
const XML_LINK = /<(?:loc|link)>(https?:\/\/[^<]+)<\/(?:loc|link)>/g;

const referenced = new Set();
for (const file of walk(distDir)) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of [LINK_ATTR, XML_LINK]) {
    for (const [, url] of text.matchAll(pattern)) {
      try {
        referenced.add(new URL(url).hostname);
      } catch {
        /* not a parseable URL — ignore */
      }
    }
  }
}

const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
const links = report.links ?? [];

const broken = links.filter((l) => l.state === 'BROKEN');
const checkedHosts = new Set();
for (const link of links) {
  if (!/^https?:/.test(link.url ?? '')) continue;
  try {
    checkedHosts.add(new URL(link.url).hostname);
  } catch {
    /* ignore */
  }
}

const skipped = (host) => skipHosts.some((s) => host === s || host.endsWith(`.${s}`));
const unverified = [...referenced].filter((h) => !checkedHosts.has(h) && !skipped(h)).sort();

for (const link of broken) {
  console.error(`BROKEN  ${link.status}  ${link.url}`);
}
for (const host of unverified) {
  console.error(`NEVER CHECKED  ${host}  — referenced by the build, absent from the link report`);
}

console.log(`links checked: ${links.length}`);
console.log(`hosts referenced: ${referenced.size} | checked: ${checkedHosts.size} | declared-skip: ${skipHosts.join(', ') || '(none)'}`);

if (broken.length || unverified.length) {
  console.error(
    `\nFAIL: ${broken.length} broken, ${unverified.length} never checked.\n` +
      `A host that cannot be reached from CI must be added to the skip list in ci.yml WITH a reason, ` +
      `so the gap is declared instead of silently passing.`,
  );
  process.exit(1);
}
console.log('OK: every referenced host was either checked or explicitly declared.');
