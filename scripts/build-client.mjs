#!/usr/bin/env node
/**
 * Browser client bundle for dsh-command-code-usage.
 *
 * Mirrors the DeepSeek Harness `clientBundle` protocol (see the shipped
 * `@xueayi/dsh-opencode-go-usage` for the canonical shape):
 *
 * - A CJS closure-factory artifact — `window.__ModuleLoader__.load({ id,
 *   factory: (require) => ... })` — registered under the package name, because
 *   the host looks the bundle up by that name. The id is read from
 *   package.json rather than restated so a rename cannot leave the client half
 *   registering a stale id, which would fail only in the browser.
 * - `react`, `react/jsx-runtime` and `react-dom/client` stay external: they
 *   resolve through the shell's frozen module table, so the dock shares the
 *   shell's React instance instead of inlining a second one.
 * - `@deepseek-ai/cordis` is external too; every import of it here is
 *   type-only and therefore erased, but keeping it external means an
 *   accidental value import fails loudly at runtime rather than silently
 *   inlining a duplicate runtime instance.
 * - Everything else (`@deepseek-ai/schemastery` is not reached from the client
 *   graph at all) is inlined. Types come from `../types.ts`, which compiles to
 *   a plain module with no runtime dependencies.
 *
 * The stylesheet needs no pipeline: `src/client/styles.ts` exports the CSS as
 * a string and injects it as a `<style>` tag at mount time.
 * @module dsh-command-code-usage/scripts/build-client
 */

import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

/** Module ids the shell's frozen table answers; must stay external. */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-slots',
]

const PLUGIN_ID = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).name

await build({
  entryPoints: ['lib/client/index.js'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: CLIENT_EXTERNALS,
  sourcemap: true,
  legalComments: 'none',
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  banner: {
    // esbuild has no separate `intro`, so the loader call and the CJS
    // bookkeeping the factory needs share one banner: the loader hands us
    // `require`, and the factory must return its module exports.
    js: [
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      'var module = { exports: {} }; var exports = module.exports;',
    ].join('\n'),
  },
  footer: {
    js: 'return module.exports; } });',
  },
})
