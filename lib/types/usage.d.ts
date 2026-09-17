/**
 * Command Code usage API client.
 *
 * Command Code meters a plan against `https://api.commandcode.ai/alpha/*`,
 * authenticated with the regular API key (`Authorization: Bearer user_...`);
 * no extra header is required for these read-only endpoints, and no workspace
 * id or session cookie is needed. Four endpoints are joined, exactly as the
 * official `cmd` CLI's `/usage` command and the community providers do:
 *
 * - `GET /alpha/whoami`                        → account identity + `org.id`
 * - `GET /alpha/billing/credits?orgId=`        → credit pool + rolling windows
 * - `GET /alpha/billing/subscriptions?orgId=`  → plan id/status + period bounds
 * - `GET /alpha/usage/summary?orgId=&since=`   → cost/request/token totals
 *
 * `whoami` is required — it supplies the `orgId` the other three scope by, and
 * a key it rejects makes the whole sample unusable. The remaining three are
 * fetched concurrently and are individually optional: a plan without a credits
 * grant still reports usage, and one endpoint failing must not discard the
 * others. A body whose every section is unusable is rejected loudly so a
 * silently-broken monitor never masquerades as a healthy one.
 *
 * The payload shapes below were verified against `pi-commandcode-provider`
 * v0.7.0 (`src/quota.ts`), which reads the same alpha endpoints. Unknown
 * fields are tolerated because the API may grow.
 * @module dsh-command-code-usage/usage
 */
import type { CommandCodeAccount, CommandCodeCredits, CommandCodeSection, CommandCodeSubscription, CommandCodeUsage, CommandCodeUsageSummary, CommandCodeWindow } from './types.ts';
/** Command Code API origin; every endpoint below hangs off it. */
export declare const DEFAULT_API_BASE = "https://api.commandcode.ai";
/** Whole-request budget covering all four endpoint calls. */
export declare const DEFAULT_TIMEOUT_MS = 15000;
/**
 * Normalize a reset instant to epoch milliseconds.
 *
 * Command Code has been observed returning both ISO strings and epoch numbers,
 * in seconds or milliseconds, so the unit is inferred from magnitude: a value
 * at or above 1e12 is already milliseconds, below it is seconds.
 * @param value - the raw `resetAt` field.
 * @returns epoch millis, or `null` when absent or unparseable.
 */
export declare function normalizeResetAt(value: unknown): number | null;
/**
 * Read the credit windows out of a credits response.
 *
 * A window that reports `used: 0, cap: 0` is dropped rather than rendered as
 * a 0%-of-0 ring: Command Code omits windows a plan does not have, and an
 * empty window carries no information.
 * @param value - the raw `windowLimits` field.
 * @returns the usable windows, `fiveHour` before `weekly`.
 */
export declare function windowLimitsFromCredits(value: unknown): CommandCodeWindow[];
/** Parse the `/alpha/billing/credits` body; `null` when unusable. */
export declare function parseCredits(value: unknown): CommandCodeCredits | null;
/** Parse the `/alpha/billing/subscriptions` body; `null` when unusable. */
export declare function parseSubscription(value: unknown): CommandCodeSubscription | null;
/** Parse the `/alpha/usage/summary` body; `null` when unusable. */
export declare function parseSummary(value: unknown): CommandCodeUsageSummary | null;
/** Parse the `/alpha/whoami` body; `null` when unusable. */
export declare function parseWhoami(value: unknown): {
    account: CommandCodeAccount;
    orgId: string | null;
} | null;
/**
 * Assemble a sample from the four raw endpoint bodies.
 *
 * Exported separately from the fetch so the parsing rules are unit-testable
 * against fixed fixtures with no network.
 * @param whoami - raw `/alpha/whoami` body.
 * @param credits - raw `/alpha/billing/credits` body, or `null` when it failed.
 * @param subscription - raw `/alpha/billing/subscriptions` body, or `null`.
 * @param summary - raw `/alpha/usage/summary` body, or `null`.
 * @param reasons - why each failed section was missing, for the UI to surface.
 * @returns the sample, or `undefined` when no section is usable.
 */
export declare function assembleUsage(whoami: unknown, credits: unknown, subscription: unknown, summary: unknown, reasons?: Partial<Record<CommandCodeSection, string>>): CommandCodeUsage | undefined;
/**
 * Fetch and validate one usage sample from the Command Code alpha API.
 *
 * `whoami` is awaited first because it supplies the `orgId` the metered
 * endpoints are scoped by; the other three then run concurrently under one
 * overall deadline, so a slow endpoint cannot extend the budget past
 * `timeoutMs` for the batch.
 * @param apiKey - the Command Code API key (`user_...`).
 * @param timeoutMs - abort timeout for the whole request batch.
 * @param apiBase - API origin override (defaults to `https://api.commandcode.ai`).
 * @returns the parsed sample; throws a user-facing `Error` on any fatal failure.
 */
export declare function fetchCommandCodeUsage(apiKey: string, timeoutMs?: number, apiBase?: string): Promise<CommandCodeUsage>;
