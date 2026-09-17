/**
 * Pure display projections and wire helpers for the Command Code usage dock.
 *
 * No React, no DOM: every function here is trivially unit-testable, mirroring
 * the host-side purity split. The dock renders the credit pool plus the two
 * rolling credit windows as rings with a live reset countdown; tones follow a
 * soft threshold so the panel stays calm until usage climbs.
 * @module dsh-command-code-usage/client/model
 */
/** Gap between the badge and the panel, in px. */
export const PANEL_GAP_PX = 12;
/** Window periods: 5h rolling and weekly are fixed; monthly is a 30-day cycle. */
export const WINDOW_PERIOD_MS = {
    fiveHour: 5 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    // The API reports only the next reset instant, so the exact billing cycle
    // cannot be derived; 30 days is the documented approximation, matching the
    // sibling OpenCode Go monitor.
    monthly: 30 * 24 * 60 * 60 * 1000,
};
const WINDOW_META = {
    fiveHour: { label: '5h 滚动', sublabel: '5h Rolling' },
    weekly: { label: '本周', sublabel: 'Weekly' },
    monthly: { label: '本月', sublabel: 'Monthly' },
};
/**
 * Clamp a dock position so the badge stays fully inside the viewport.
 * `size` is the badge box; oversized badges clamp to zero.
 */
export function clampDockPosition(pos, size, viewport) {
    return {
        x: Math.min(Math.max(0, pos.x), Math.max(0, viewport.w - size.w)),
        y: Math.min(Math.max(0, pos.y), Math.max(0, viewport.h - size.h)),
    };
}
/**
 * Decide where the panel sits relative to the badge: above by default,
 * flipping below when the top edge would clip, and right-aligned by default,
 * flipping to left-aligned (with a negative nudge when needed) when the badge
 * sits close enough to the left edge that a right-aligned panel would clip.
 */
export function computePanelLayout(pos, badgeSize, panelSize, viewport) {
    const below = pos.y < panelSize.h + PANEL_GAP_PX;
    const badgeRight = pos.x + badgeSize.w;
    const useLeft = badgeRight < panelSize.w;
    const leftOffset = useLeft ? Math.min(0, viewport.w - panelSize.w - pos.x) : 0;
    return { below, useLeft, leftOffset };
}
/**
 * Project a sample into ordered credit-window views.
 *
 * `fiveHour` and `weekly` come from the API's `windowLimits`. The `monthly` row
 * is the API's own window when one is reported, and otherwise reconstructed
 * from the credit pool — the same `remaining / (remaining + spent)` derivation
 * the pool headline uses, with the reset instant taken from the billing
 * period's end. A plan that reports neither a monthly window nor a spend total
 * gets no monthly row, because there would be no honest percentage to show.
 *
 * Windows are ordered 5h → 本周 → 本月 for display, matching the sibling
 * OpenCode Go monitor.
 * @param usage - the fetched sample, or `undefined` before the first success.
 * @returns the projected rows, in display order.
 */
export function usageWindows(usage) {
    if (usage === undefined)
        return [];
    const credits = usage.credits;
    const windows = credits?.windows ?? [];
    const views = [];
    for (const key of ['fiveHour', 'weekly', 'monthly']) {
        const window = windows.find((candidate) => candidate.window === key);
        if (window === undefined)
            continue;
        // A zero cap carries no information and no percentage to draw.
        if (window.cap <= 0)
            continue;
        views.push(buildWindow(key, window.used, window.cap, window.resetAt, false));
    }
    // Derive the monthly row only when the API did not report one, so a real
    // window is never shadowed by the approximation.
    if (credits !== undefined && !windows.some((w) => w.window === 'monthly')) {
        const pool = poolView(usage);
        if (pool !== undefined && pool.percentUsed !== null) {
            const spent = pool.spent ?? 0;
            const cap = pool.remaining + spent;
            if (cap > 0) {
                views.push(buildWindow('monthly', spent, cap, usage.subscription?.currentPeriodEnd ?? null, true));
            }
        }
    }
    return views;
}
/** Assemble one window view from its raw numbers. */
function buildWindow(key, used, cap, resetAt, derived) {
    return {
        key,
        label: WINDOW_META[key].label,
        sublabel: WINDOW_META[key].sublabel,
        used,
        cap,
        remaining: Math.max(0, cap - used),
        percent: cap <= 0 ? 0 : Math.min(100, Math.max(0, (used / cap) * 100)),
        resetAt,
        periodMs: WINDOW_PERIOD_MS[key],
        derived,
    };
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
export function poolView(usage) {
    const credits = usage?.credits;
    if (credits === undefined)
        return undefined;
    const spent = usage?.summary?.totalCost ?? null;
    const pool = credits.remaining + (spent ?? 0);
    return {
        remaining: credits.remaining,
        monthly: credits.monthly,
        purchased: credits.purchased,
        free: credits.free,
        spent,
        percentUsed: spent === null || pool <= 0 ? null : Math.min(100, (spent / pool) * 100),
    };
}
/**
 * Fraction of the window period still left before the reset, 0–1; the badge's
 * inner ring draws this as its remaining arc. Returns 0 once the reset instant
 * has passed or when the API omitted it.
 */
export function remainingRatio(resetAt, periodMs, now) {
    if (resetAt === null || !Number.isFinite(resetAt) || !Number.isFinite(periodMs) || periodMs <= 0)
        return 0;
    const remaining = resetAt - now;
    if (remaining <= 0)
        return 0;
    return Math.min(1, remaining / periodMs);
}
/** Tone for a used percentage (invalid numbers clamp to `ok`). */
export function percentTone(percent) {
    if (!Number.isFinite(percent))
        return 'ok';
    if (percent >= 85)
        return 'danger';
    if (percent >= 60)
        return 'warn';
    return 'ok';
}
/** Compact Chinese countdown until a reset instant. */
export function formatRemaining(resetAt, now) {
    if (resetAt === null || !Number.isFinite(resetAt))
        return '—';
    const diff = resetAt - now;
    if (diff <= 0)
        return '已重置';
    const totalMinutes = Math.floor(diff / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0)
        return `${days}天${hours}小时`;
    if (hours > 0)
        return `${hours}小时${minutes}分`;
    if (minutes > 0)
        return `${minutes}分${Math.max(0, Math.floor((diff % 60_000) / 1000))}秒`;
    return `${Math.max(0, Math.floor(diff / 1000))}秒`;
}
/** Minimal countdown for tight surfaces (the dock badge): `4d3h`, `3h25m`, `12m05s`, `9s`. */
export function formatRemainingCompact(resetAt, now) {
    if (resetAt === null || !Number.isFinite(resetAt))
        return '—';
    const diff = resetAt - now;
    if (diff <= 0)
        return '已重置';
    const totalMinutes = Math.floor(diff / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.max(0, Math.floor((diff % 60_000) / 1000));
    if (days > 0)
        return hours > 0 ? `${days}d${hours}h` : `${days}d`;
    if (hours > 0)
        return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
    if (minutes > 0)
        return `${minutes}m${String(seconds).padStart(2, '0')}s`;
    return `${seconds}s`;
}
/** Relative age of a timestamp, for the panel's "updated at" line. */
export function formatRelative(at, now) {
    if (at === undefined || !Number.isFinite(at) || at <= 0)
        return '—';
    const diff = now - at;
    if (diff < 5_000)
        return '刚刚';
    if (diff < 60_000)
        return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3_600_000)
        return `${Math.floor(diff / 60_000)}分钟前`;
    if (diff < 86_400_000)
        return `${Math.floor(diff / 3_600_000)}小时前`;
    return `${Math.floor(diff / 86_400_000)}天前`;
}
/** Money with two decimals, always signed with `$` (Command Code bills USD). */
export function formatCredits(value) {
    if (!Number.isFinite(value))
        return '$—';
    return `$${value.toFixed(2)}`;
}
/** Compact credit count for tight surfaces: `$12.5`, `$0.00`. */
export function formatCreditsCompact(value) {
    if (!Number.isFinite(value))
        return '$—';
    if (value >= 100)
        return `$${Math.round(value)}`;
    return `$${value.toFixed(1)}`;
}
/** Compact token count: `1.2B`, `3.4M`, `5.6k`. */
export function formatTokens(value) {
    if (!Number.isFinite(value))
        return '—';
    if (value >= 1_000_000_000)
        return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000)
        return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)
        return `${(value / 1_000).toFixed(1)}k`;
    return String(value);
}
/** Whether a sample carries anything worth rendering. */
export function stateHasUsage(state) {
    return state !== null && state.usage !== undefined;
}
/** Short health label for the panel header. */
export function healthLabel(state) {
    if (state === null)
        return '连接中…';
    if (state.health.status === 'ok')
        return '实时';
    if (stateHasUsage(state))
        return '数据过期';
    if (state.health.status === 'unconfigured')
        return '未配置';
    return '异常';
}
/** Human plan name from the API's plan id (`goat` → `GOAT`, `pro` → `Pro`). */
export function planLabel(planId) {
    if (planId === null || planId === undefined || planId === '')
        return null;
    const known = { go: 'Go', goat: 'GOAT', pro: 'Pro', max: 'Max' };
    return known[planId.toLowerCase()] ?? planId.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Base path of this plugin's host routes. */
export const PLUGIN_ROUTE_BASE = '/plugins/dsh-command-code-usage';
/** Read the current cached sample from the host. */
export async function fetchState() {
    const response = await fetch(`${PLUGIN_ROUTE_BASE}/state`, { headers: { accept: 'application/json' } });
    if (!response.ok)
        throw new Error(`state HTTP ${response.status}`);
    return (await response.json());
}
/** Ask the host for an immediate refresh and return the new sample. */
export async function refreshState() {
    const response = await fetch(`${PLUGIN_ROUTE_BASE}/refresh`, { method: 'POST' });
    if (!response.ok)
        throw new Error(`refresh HTTP ${response.status}`);
    return (await response.json());
}
/** Store an API key through the host; the value is never echoed back. */
export async function storeKey(value) {
    let response;
    try {
        response = await fetch(`${PLUGIN_ROUTE_BASE}/key`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ value }),
        });
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    return parseKeyOutcome(response);
}
/** Remove the stored API key. */
export async function clearKey() {
    let response;
    try {
        response = await fetch(`${PLUGIN_ROUTE_BASE}/key`, { method: 'DELETE' });
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    return parseKeyOutcome(response);
}
/** Shared response decoding for the key route. */
async function parseKeyOutcome(response) {
    let body;
    try {
        body = await response.json();
    }
    catch {
        return { ok: false, error: `服务返回了无法解析的响应（HTTP ${response.status}）` };
    }
    const record = body;
    if (record.ok === true && record.state !== undefined) {
        return { ok: true, state: record.state };
    }
    return {
        ok: false,
        error: typeof record.error === 'string' && record.error !== ''
            ? record.error
            : `保存失败（HTTP ${response.status}）`,
    };
}
