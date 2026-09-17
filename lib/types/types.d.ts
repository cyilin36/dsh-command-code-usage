/**
 * Command Code usage types — pure types only, zero imports.
 *
 * This file intentionally imports nothing: both the host program (the API
 * client in `usage.ts` and the emitter in `index.ts`) and the browser program
 * (the dock model in `client/`) must be able to load these types without
 * pulling in host-side `Context` augmentations.
 * @module dsh-command-code-usage/types
 */
/** One credit window reported by `GET /alpha/billing/credits`. */
export interface CommandCodeWindow {
    /**
     * `fiveHour` (the ~5h rolling window), `weekly`, or `monthly`.
     *
     * Command Code's `windowLimits` is observed to carry `fiveHour` and `weekly`
     * only. `monthly` is modelled because the plan is billed monthly and the API
     * may grow the window: when it does report one, the dock uses it verbatim.
     * When it does not, the dock derives a monthly row from the credit pool
     * instead of inventing a window.
     */
    window: 'fiveHour' | 'weekly' | 'monthly';
    /** Credits already consumed in this window. */
    used: number;
    /** Credits the window allows. */
    cap: number;
    /** Epoch millis when the window resets, or `null` when the API omitted it. */
    resetAt: number | null;
}
/**
 * Credit pool breakdown. Command Code meters a plan as a pool of credits with
 * three sources; `remaining` is their sum and is what the dock's headline
 * figure shows.
 */
export interface CommandCodeCredits {
    /** Credits granted by the current billing period. */
    monthly: number;
    /** Credits bought on top of the plan. */
    purchased: number;
    /** Promotional credits. */
    free: number;
    /** `monthly + purchased + free`. */
    remaining: number;
    /** The rolling credit windows, in API order (fiveHour before weekly). */
    windows: CommandCodeWindow[];
}
/** The account/plan facts from `/alpha/billing/subscriptions`. */
export interface CommandCodeSubscription {
    /** Plan identifier, e.g. `go`, `goat`, `pro`, `max`. */
    planId: string | null;
    /** Subscription status as the API spells it, e.g. `active`. */
    status: string | null;
    /** Epoch millis the current billing period started, when known. */
    currentPeriodStart: number | null;
    /** Epoch millis the current billing period ends, when known. */
    currentPeriodEnd: number | null;
}
/** Consumption totals from `/alpha/usage/summary`. */
export interface CommandCodeUsageSummary {
    /** Money spent in the queried period, in dollars. */
    totalCost: number;
    /** Number of requests in the queried period. */
    totalCount: number;
    /** Tokens consumed, when the API reports them. */
    totalTokens?: number;
}
/** Identity facts from `/alpha/whoami`. */
export interface CommandCodeAccount {
    /** Organization login, or the user's name when the key is not org-scoped. */
    login: string;
    /** Display name of the API key, when the API reports one. */
    keyName?: string;
}
/**
 * One complete, successfully fetched sample.
 *
 * Every section is optional because Command Code serves each endpoint
 * independently: a plan without a credits grant still reports usage, and a
 * transient failure on one endpoint must not discard the others. At least one
 * section is always present in a sample that parses at all.
 */
export interface CommandCodeUsage {
    /** Account identity, when `whoami` answered. */
    account?: CommandCodeAccount;
    /** Credit pool and rolling windows, when `billing/credits` answered. */
    credits?: CommandCodeCredits;
    /** Plan identity, when `billing/subscriptions` answered. */
    subscription?: CommandCodeSubscription;
    /** Consumption totals, when `usage/summary` answered. */
    summary?: CommandCodeUsageSummary;
    /**
     * Sections the API did not return, so the dock can name what is missing
     * instead of rendering an absent section as a real zero.
     */
    unavailable: CommandCodeSection[];
}
/** A usage section name, used to report partial availability. */
export type CommandCodeSection = 'account' | 'credits' | 'subscription' | 'usage';
/** Health of the most recent refresh attempt, independent of the data. */
export interface CommandCodeHealth {
    /** `ok` after a successful fetch; `error` after a failed one; `unconfigured` while no API key resolves. */
    status: 'ok' | 'error' | 'unconfigured';
    /** Epoch millis of the most recent attempt (0 before the first). */
    fetchedAt: number;
    /** User-facing failure reason, present when `status` is not `ok`. */
    error?: string;
    /**
     * The credential reference the plugin resolved, so the dock can tell the
     * user exactly which name to store a key under.
     */
    apiKeyEnv: string;
    /**
     * Whether the resolved key came from a writable store, letting the dock
     * offer the inline key field only when saving can actually succeed.
     */
    writable: boolean;
}
/**
 * The cached sample served to the web client.
 *
 * Data and health are decoupled on purpose: a failed refresh keeps the last
 * successful sample (`usage` / `usageFetchedAt`) so the dock stays stable —
 * it keeps showing the previous numbers and degrades silently instead of
 * blanking out. `usage` is absent only before the first successful fetch.
 */
export interface CommandCodeUsageState {
    /** Last successfully fetched sample; absent only before the first success. */
    usage?: CommandCodeUsage;
    /** Epoch millis of the sample in `usage` (absent together with it). */
    usageFetchedAt?: number;
    /** Health of the most recent refresh attempt. */
    health: CommandCodeHealth;
}
