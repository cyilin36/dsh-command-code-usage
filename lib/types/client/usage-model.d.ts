/**
 * Pure display projections and wire helpers for the Command Code usage dock.
 *
 * No React, no DOM: every function here is trivially unit-testable, mirroring
 * the host-side purity split. The dock renders the credit pool plus the two
 * rolling credit windows as rings with a live reset countdown; tones follow a
 * soft threshold so the panel stays calm until usage climbs.
 * @module dsh-command-code-usage/client/model
 */
import type { CommandCodeUsage, CommandCodeUsageState } from '../types.ts';
/** The rolling credit windows Command Code meters, in display order. */
export type WindowKey = 'fiveHour' | 'weekly';
/** One credit window in display order. */
export interface WindowView {
    key: WindowKey;
    /** Short Chinese label for the panel row. */
    label: string;
    /** English label kept for recognizability. */
    sublabel: string;
    /** Credits already consumed in this window. */
    used: number;
    /** Credits the window allows. */
    cap: number;
    /** Credits still available. */
    remaining: number;
    /** Percent already used, 0–100. */
    percent: number;
    /** Epoch millis when the window resets, or `null` when the API omitted it. */
    resetAt: number | null;
    /** Full window period in millis (drives the remaining-time ring). */
    periodMs: number;
}
/** Tone thresholds for usage rings; `danger` ≥ 85%, `warn` ≥ 60%. */
export type UsageTone = 'ok' | 'warn' | 'danger';
/** Top-left viewport position of the dock badge. */
export interface DockPosition {
    x: number;
    y: number;
}
/** A measured badge or panel box. */
export interface BoxSize {
    w: number;
    h: number;
}
/** Panel placement relative to the dock wrapper (the badge box). */
export interface PanelLayout {
    /** Panel opens below the badge instead of above (top edge would clip). */
    below: boolean;
    /** Panel is left-aligned with the badge instead of right-aligned. */
    useLeft: boolean;
    /** Left offset relative to the badge in px when `useLeft`. */
    leftOffset: number;
}
/** Gap between the badge and the panel, in px. */
export declare const PANEL_GAP_PX = 12;
/** Window periods: the rolling window is a fixed 5h, weekly a fixed 7d. */
export declare const WINDOW_PERIOD_MS: Record<WindowKey, number>;
/**
 * Clamp a dock position so the badge stays fully inside the viewport.
 * `size` is the badge box; oversized badges clamp to zero.
 */
export declare function clampDockPosition(pos: DockPosition, size: BoxSize, viewport: {
    w: number;
    h: number;
}): DockPosition;
/**
 * Decide where the panel sits relative to the badge: above by default,
 * flipping below when the top edge would clip, and right-aligned by default,
 * flipping to left-aligned (with a negative nudge when needed) when the badge
 * sits close enough to the left edge that a right-aligned panel would clip.
 */
export declare function computePanelLayout(pos: DockPosition, badgeSize: BoxSize, panelSize: BoxSize, viewport: {
    w: number;
    h: number;
}): PanelLayout;
/** Project a sample's credit windows into ordered views (missing windows dropped). */
export declare function usageWindows(usage: CommandCodeUsage | undefined): WindowView[];
/** The credit pool headline, or `undefined` when the API reported no credits. */
export interface PoolView {
    /** Credits still available across all three sources. */
    remaining: number;
    /** Credits granted by the current billing period. */
    monthly: number;
    /** Credits bought on top of the plan. */
    purchased: number;
    /** Promotional credits. */
    free: number;
    /**
     * Money already spent this billing period, from the usage summary. `null`
     * when the summary was unavailable, so the pool percentage is withheld
     * rather than computed against a partial denominator.
     */
    spent: number | null;
    /** Percent of the pooled grant already used, or `null` when not derivable. */
    percentUsed: number | null;
}
/**
 * Project the credit pool headline.
 *
 * The denominator is the remaining grant plus what was spent this period.
 * Command Code's `remaining` is a live balance the API does not restate as a
 * grant, so the original pool is reconstructed from the two facts together;
 * when the summary is missing, no honest percentage exists and one is not
 * invented.
 */
export declare function poolView(usage: CommandCodeUsage | undefined): PoolView | undefined;
/**
 * Fraction of the window period still left before the reset, 0–1; the badge's
 * inner ring draws this as its remaining arc. Returns 0 once the reset instant
 * has passed or when the API omitted it.
 */
export declare function remainingRatio(resetAt: number | null, periodMs: number, now: number): number;
/** Tone for a used percentage (invalid numbers clamp to `ok`). */
export declare function percentTone(percent: number): UsageTone;
/** Compact Chinese countdown until a reset instant. */
export declare function formatRemaining(resetAt: number | null, now: number): string;
/** Minimal countdown for tight surfaces (the dock badge): `4d3h`, `3h25m`, `12m05s`, `9s`. */
export declare function formatRemainingCompact(resetAt: number | null, now: number): string;
/** Relative age of a timestamp, for the panel's "updated at" line. */
export declare function formatRelative(at: number | undefined, now: number): string;
/** Money with two decimals, always signed with `$` (Command Code bills USD). */
export declare function formatCredits(value: number): string;
/** Compact credit count for tight surfaces: `$12.5`, `$0.00`. */
export declare function formatCreditsCompact(value: number): string;
/** Compact token count: `1.2B`, `3.4M`, `5.6k`. */
export declare function formatTokens(value: number): string;
/** Whether a sample carries anything worth rendering. */
export declare function stateHasUsage(state: CommandCodeUsageState | null): state is CommandCodeUsageState & {
    usage: CommandCodeUsage;
};
/** Short health label for the panel header. */
export declare function healthLabel(state: CommandCodeUsageState | null): string;
/** Human plan name from the API's plan id (`goat` → `GOAT`, `pro` → `Pro`). */
export declare function planLabel(planId: string | null | undefined): string | null;
/** Base path of this plugin's host routes. */
export declare const PLUGIN_ROUTE_BASE = "/plugins/dsh-command-code-usage";
/** Read the current cached sample from the host. */
export declare function fetchState(): Promise<CommandCodeUsageState>;
/** Ask the host for an immediate refresh and return the new sample. */
export declare function refreshState(): Promise<CommandCodeUsageState>;
/** One key-write outcome: the host's new state, or the refusal to show. */
export type KeyWriteOutcome = {
    ok: true;
    state: CommandCodeUsageState;
} | {
    ok: false;
    error: string;
};
/** Store an API key through the host; the value is never echoed back. */
export declare function storeKey(value: string): Promise<KeyWriteOutcome>;
/** Remove the stored API key. */
export declare function clearKey(): Promise<KeyWriteOutcome>;
