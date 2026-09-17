/**
 * Command Code usage monitor for DeepSeek Harness.
 *
 * A host-plane plugin that periodically queries the Command Code account API
 * and serves the cached sample to the browser client through four web routes:
 *
 * - `GET    /plugins/dsh-command-code-usage/state`  — current cached sample
 * - `POST   /plugins/dsh-command-code-usage/refresh`— force an immediate refresh
 * - `POST   /plugins/dsh-command-code-usage/key`    — store an API key
 * - `DELETE /plugins/dsh-command-code-usage/key`    — remove the stored key
 *
 * DSH ships no Command Code provider preset, so this plugin solves the
 * credential problem on two fronts. Declaratively, its bundle patch mounts a
 * `command-code` route into `dsh-llm-pi-ai`'s composition base layer, which is
 * what makes the provider appear on the web **Settings → Models** page with the
 * standard API-key field. Procedurally, the key routes above let the dock
 * itself accept a key, so the monitor works even when the user never opens the
 * Models page.
 *
 * Either way the key lands in the same place — the provider-managed writable
 * credential store, under the reference named by `apiKeyEnv` — and is resolved
 * afresh on every refresh through `ctx.credentials`. A changed credential
 * therefore reaches the next refresh without a restart, and no secret ever
 * appears in configuration or in a response body.
 *
 * The browser dock polls `state` and renders the credit pool and rolling
 * windows as a floating, theme-aware panel.
 *
 * @module dsh-command-code-usage
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "command-code-usage";
export declare const inject: readonly string[];
/** Plugin configuration. */
export interface Config {
    /**
     * Credential reference resolved per refresh through `ctx.credentials`
     * (default `COMMAND_CODE_API_KEY`). Must match the reference the
     * `command-code` provider route names in the composition patch, so the
     * monitor and the chat route always read the same secret.
     */
    apiKeyEnv?: string;
    /** Direct API key fallback when the credential reference is unconfigured. */
    apiKey?: string;
    /** Command Code API origin (default `https://api.commandcode.ai`). */
    apiBase?: string;
    /** Auto-refresh interval in millis (default `60000`). */
    refreshMs?: number;
    /** Per-request timeout in millis (default `15000`). */
    timeoutMs?: number;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
