#!/usr/bin/env node
/**
 * Post-process a raw `mmdc`-generated SVG for the KO OS pipeline diagram so it
 * consumes design tokens (src/styles/tokens.css) instead of the hardcoded
 * colour literals mermaid-cli bakes into its inline <style> block and <defs>.
 *
 * Raw mmdc output (dark theme, "neo" node look) hardcodes every colour as a
 * literal (#ccc, lightgrey, hsl(...), rgba(...), #FFFFFF, ...). This script
 * retargets each one to the token with the matching semantic role:
 *   - text/labels                          -> var(--text)
 *   - node fill / border                   -> var(--surface) / var(--border)
 *   - edges, arrowheads, markers           -> var(--muted)
 *   - edge-label bg, cluster fill, tooltip -> var(--surface)
 *   - "neo" look gradient stroke + shadow  -> currentColor, with
 *     `color: var(--border)` declared on the root #my-svg rule so
 *     currentColor resolves to the border token
 * It also:
 *   - removes the invalid duplicate `role` attribute mmdc emits
 *     (`role="graphics-document document"`) and replaces it with a single
 *     `role="img" aria-labelledby="my-svg-title"`
 *   - inserts an accessible `<title>` as the first child of <svg>
 *   - adds one deliberate accent highlight on the Zod-validation node/edge
 *     (permitted by the accent-reservation rule as a "diagram highlight")
 *
 * Usage:
 *   node scripts/theme-diagram.mjs [path-to-svg]
 * Defaults to src/diagrams/ko-os.svg. Run via `npm run diagrams`, which first
 * regenerates that file with `mmdc` and then pipes it through this script.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] ?? 'src/diagrams/ko-os.svg';

const DIAGRAM_TITLE =
  'KO OS provider-agnostic LLM pipeline: provider config selects a model, ' +
  'extracted prompts feed a provider-agnostic client across four providers, ' +
  'and Zod schema validation gates the typed result before it reaches the application.';

// Each pair is matched as an exact, atomic substring of one mmdc-emitted CSS
// rule (not a blanket colour-literal regex), so a rule that happens to share
// a colour with another rule can still map to a different token role.
const STYLE_REPLACEMENTS = [
  [
    '#my-svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:#ccc;}',
    '#my-svg{font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:16px;fill:var(--text);color:var(--border);}',
  ],
  ['.error-icon{fill:#a44141;}', '.error-icon{fill:var(--muted);}'],
  ['.error-text{fill:#ddd;stroke:#ddd;}', '.error-text{fill:var(--text);stroke:var(--text);}'],
  ['.marker{fill:lightgrey;stroke:lightgrey;}', '.marker{fill:var(--muted);stroke:var(--muted);}'],
  ['.marker.cross{stroke:lightgrey;}', '.marker.cross{stroke:var(--muted);}'],
  [
    '.label{font-family:"trebuchet ms",verdana,arial,sans-serif;color:#ccc;}',
    '.label{font-family:"trebuchet ms",verdana,arial,sans-serif;color:var(--text);}',
  ],
  ['.cluster-label text{fill:#F9FFFE;}', '.cluster-label text{fill:var(--text);}'],
  ['.cluster-label span{color:#F9FFFE;}', '.cluster-label span{color:var(--text);}'],
  [
    '.label text,#my-svg span{fill:#ccc;color:#ccc;}',
    '.label text,#my-svg span{fill:var(--text);color:var(--text);}',
  ],
  [
    '.node rect,#my-svg .node circle,#my-svg .node ellipse,#my-svg .node polygon,#my-svg .node path{fill:#1f2020;stroke:#ccc;stroke-width:1px;}',
    '.node rect,#my-svg .node circle,#my-svg .node ellipse,#my-svg .node polygon,#my-svg .node path{fill:var(--surface);stroke:var(--border);stroke-width:1px;}',
  ],
  [
    '.node .katex path{fill:#000;stroke:#000;stroke-width:1px;}',
    '.node .katex path{fill:var(--base);stroke:var(--base);stroke-width:1px;}',
  ],
  [
    '.root .anchor path{fill:lightgrey!important;stroke-width:0;stroke:lightgrey;}',
    '.root .anchor path{fill:var(--muted)!important;stroke-width:0;stroke:var(--muted);}',
  ],
  ['.arrowheadPath{fill:lightgrey;}', '.arrowheadPath{fill:var(--muted);}'],
  ['.edgePaths .path{stroke:lightgrey;stroke-width:1px;}', '.edgePaths .path{stroke:var(--muted);stroke-width:1px;}'],
  ['.flowchart-link{stroke:lightgrey;fill:none;}', '.flowchart-link{stroke:var(--muted);fill:none;}'],
  [
    '.edgeLabel{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}',
    '.edgeLabel{background-color:var(--surface);text-align:center;}',
  ],
  ['.edgeLabel p{background-color:hsl(0, 0%, 34.4117647059%);}', '.edgeLabel p{background-color:var(--surface);}'],
  [
    '.edgeLabel rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}',
    '.edgeLabel rect{opacity:0.5;background-color:var(--surface);fill:var(--surface);}',
  ],
  [
    '.labelBkg{background-color:rgba(87.75, 87.75, 87.75, 0.5);}',
    '.labelBkg{background-color:color-mix(in srgb, var(--surface) 50%, transparent);}',
  ],
  [
    '.cluster rect{fill:hsl(180, 1.5873015873%, 28.3529411765%);stroke:rgba(255, 255, 255, 0.25);stroke-width:1px;}',
    '.cluster rect{fill:var(--surface);stroke:var(--border);stroke-width:1px;}',
  ],
  ['.cluster text{fill:#F9FFFE;}', '.cluster text{fill:var(--text);}'],
  ['.cluster span{color:#F9FFFE;}', '.cluster span{color:var(--text);}'],
  [
    '.node .collapsed-indicator{fill:rgba(255, 255, 255, 0.25);stroke:none;opacity:0.6;}',
    '.node .collapsed-indicator{fill:var(--border);stroke:none;opacity:0.6;}',
  ],
  [
    '.node .collapsed-separator{stroke:rgba(255, 255, 255, 0.25);stroke-width:0.75px;}',
    '.node .collapsed-separator{stroke:var(--border);stroke-width:0.75px;}',
  ],
  [
    'div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:12px;background:hsl(20, 1.5873015873%, 12.3529411765%);border:1px solid rgba(255, 255, 255, 0.25);border-radius:2px;pointer-events:none;z-index:100;}',
    'div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:"trebuchet ms",verdana,arial,sans-serif;font-size:12px;background:var(--surface);border:1px solid var(--border);border-radius:2px;pointer-events:none;z-index:100;}',
  ],
  ['.flowchartTitleText{text-anchor:middle;font-size:18px;fill:#ccc;}', '.flowchartTitleText{text-anchor:middle;font-size:18px;fill:var(--text);}'],
  [
    '.icon-shape,#my-svg .image-shape{background-color:hsl(0, 0%, 34.4117647059%);text-align:center;}',
    '.icon-shape,#my-svg .image-shape{background-color:var(--surface);text-align:center;}',
  ],
  [
    '.icon-shape p,#my-svg .image-shape p{background-color:hsl(0, 0%, 34.4117647059%);padding:2px;}',
    '.icon-shape p,#my-svg .image-shape p{background-color:var(--surface);padding:2px;}',
  ],
  [
    '.icon-shape .label rect,#my-svg .image-shape .label rect{opacity:0.5;background-color:hsl(0, 0%, 34.4117647059%);fill:hsl(0, 0%, 34.4117647059%);}',
    '.icon-shape .label rect,#my-svg .image-shape .label rect{opacity:0.5;background-color:var(--surface);fill:var(--surface);}',
  ],
  ['.node .neo-node{stroke:#ccc;}', '.node .neo-node{stroke:var(--border);}'],
  [
    '[data-look="neo"].node rect,#my-svg [data-look="neo"].cluster rect,#my-svg [data-look="neo"].node polygon{stroke:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}',
    '[data-look="neo"].node rect,#my-svg [data-look="neo"].cluster rect,#my-svg [data-look="neo"].node polygon{stroke:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px var(--border));}',
  ],
  [
    '[data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}',
    '[data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px var(--border));}',
  ],
  ['[data-look="neo"].node .neo-line path{stroke:#ccc;filter:none;}', '[data-look="neo"].node .neo-line path{stroke:var(--border);filter:none;}'],
  [
    '[data-look="neo"].node circle{stroke:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}',
    '[data-look="neo"].node circle{stroke:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px var(--border));}',
  ],
  ['[data-look="neo"].node circle .state-start{fill:#000000;}', '[data-look="neo"].node circle .state-start{fill:var(--base);}'],
  [
    '[data-look="neo"].icon-shape .icon{fill:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}',
    '[data-look="neo"].icon-shape .icon{fill:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px var(--border));}',
  ],
  [
    '[data-look="neo"].icon-shape .icon-neo path{stroke:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}',
    '[data-look="neo"].icon-shape .icon-neo path{stroke:url(#my-svg-gradient);filter:drop-shadow( 1px 2px 2px var(--border));}',
  ],
];

// One deliberate accent highlight, appended right before the closing
// </style>: the accent-reservation rule explicitly permits "diagram
// highlights", and this marks the Zod schema-validation gate the KO OS case
// study's copy is about.
const ACCENT_HIGHLIGHT =
  '#my-svg-flowchart-SV-15 rect.basic{fill:color-mix(in srgb, var(--accent) 14%, var(--surface));stroke:var(--accent);stroke-width:1.5px;}' +
  '#my-svg [data-id="L_SV_APP_0"]{stroke:var(--accent);}' +
  '#my-svg [data-id="L_SV_APP_0"] + .flowchart-link, #my-svg [data-id="L_SV_APP_0"]{fill:none;}';

function assertReplace(svg, find, replace, label) {
  if (!svg.includes(find)) {
    throw new Error(
      `theme-diagram: expected to find ${label} in the mmdc output but did not. ` +
        'mmdc likely changed its emitted markup — update scripts/theme-diagram.mjs to match.',
    );
  }
  return svg.replace(find, replace);
}

function theme(svg) {
  for (const [find, replace] of STYLE_REPLACEMENTS) {
    svg = assertReplace(svg, find, replace, `style rule "${find.slice(0, 40)}..."`);
  }

  // Two <feDropShadow> defs use a literal white flood colour.
  svg = svg.split('flood-color="#FFFFFF"').join('flood-color="currentColor"');

  // The "neo" look gradient stops are literal colours; make them follow
  // currentColor (resolved to var(--border) via the root #my-svg rule above).
  svg = assertReplace(
    svg,
    '<stop offset="0%" stop-color="#cccccc" stop-opacity="1"/>',
    '<stop offset="0%" stop-color="currentColor" stop-opacity="1"/>',
    'gradient start stop',
  );
  svg = assertReplace(
    svg,
    '<stop offset="100%" stop-color="hsl(180, 0%, 18.3529411765%)" stop-opacity="1"/>',
    '<stop offset="100%" stop-color="currentColor" stop-opacity="1"/>',
    'gradient end stop',
  );

  // mmdc emits an invalid duplicate role; give the SVG a single valid role
  // plus an accessible title.
  if (svg.includes(' role="graphics-document document"')) {
    svg = svg.replace(' role="graphics-document document"', ' role="img" aria-labelledby="my-svg-title"');
  }

  if (!svg.includes('<title id="my-svg-title">')) {
    svg = svg.replace(/(<svg[^>]*>)/, `$1<title id="my-svg-title">${DIAGRAM_TITLE}</title>`);
  }

  // Append the accent highlight once, right before the closing </style>.
  if (!svg.includes(ACCENT_HIGHLIGHT)) {
    svg = assertReplace(svg, '</style>', `${ACCENT_HIGHLIGHT}</style>`, 'style block close');
  }

  return svg;
}

function main() {
  const svg = readFileSync(target, 'utf8');
  const themed = theme(svg);
  writeFileSync(target, themed);
  console.log(`theme-diagram: tokenised ${target}`);
}

// Only run when invoked directly (`node scripts/theme-diagram.mjs`), not when imported.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
