/**
 * Browser plugin for the Command Code usage dock.
 *
 * Registers into the shell's `shell.overlay` slot — the documented additive,
 * frame-wide floating seat — and falls back to a body portal when that seat is
 * absent (an older shell, or a composition without the layout plugin). Both
 * paths dispose through `ctx.effect`, so an unloaded or hot-reloaded plugin
 * leaves no dock and no listener behind.
 *
 * The dock polls this plugin's own host routes, so no Cordis service beyond
 * the slot registry is required.
 * @module dsh-command-code-usage/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/** Cordis services this plugin needs; `slots` is optional and probed with `ctx.get`. */
export declare const inject: readonly string[];
/**
 * Mount the floating dock. The whole surface is registered as one effect, so
 * plugin unload removes the dock and its stylesheet together.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
