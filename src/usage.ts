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

import type {
  CommandCodeAccount,
  CommandCodeCredits,
  CommandCodeSection,
  CommandCodeSubscription,
  CommandCodeUsage,
  CommandCodeUsageSummary,
  CommandCodeWindow,
} from './types.ts'

/** Command Code API origin; every endpoint below hangs off it. */
export const DEFAULT_API_BASE = 'https://api.commandcode.ai'

/** Whole-request budget covering all four endpoint calls. */
export const DEFAULT_TIMEOUT_MS = 15_000

/** Narrow structural helpers over `unknown` JSON, kept local and total. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A finite non-negative number, or `undefined` for anything else. */
function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

/** A non-empty string, or `undefined`. */
function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Normalize a reset instant to epoch milliseconds.
 *
 * Command Code has been observed returning both ISO strings and epoch numbers,
 * in seconds or milliseconds, so the unit is inferred from magnitude: a value
 * at or above 1e12 is already milliseconds, below it is seconds.
 * @param value - the raw `resetAt` field.
 * @returns epoch millis, or `null` when absent or unparseable.
 */
export function normalizeResetAt(value: unknown): number | null {
  let timestamp: number | undefined
  if (typeof value === 'number' && Number.isFinite(value)) timestamp = value
  if (typeof value === 'string' && value.length > 0) {
    const trimmed = value.trim()
    timestamp = /^\d+$/.test(trimmed) ? Number(trimmed) : Date.parse(trimmed)
  }
  if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp < 0) return null
  return timestamp >= 1e12 ? Math.round(timestamp) : Math.round(timestamp * 1000)
}

/** Normalize a timestamp that may be an ISO string or an epoch number. */
function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value >= 1e12 ? Math.round(value) : Math.round(value * 1000)
  }
  if (typeof value === 'string' && value.length > 0) {
    const trimmed = value.trim()
    const parsed = /^\d+$/.test(trimmed) ? Number(trimmed) : Date.parse(trimmed)
    if (!Number.isFinite(parsed) || parsed < 0) return null
    return parsed >= 1e12 ? Math.round(parsed) : Math.round(parsed * 1000)
  }
  return null
}

/**
 * Read the credit windows out of a credits response.
 *
 * A window that reports `used: 0, cap: 0` is dropped rather than rendered as
 * a 0%-of-0 ring: Command Code omits windows a plan does not have, and an
 * empty window carries no information.
 *
 * `monthly` is read when present. It is not observed in the wild — the API's
 * `windowLimits` carries `fiveHour` and `weekly` — but reading it costs
 * nothing and means a plan that starts reporting a real monthly window gets it
 * shown verbatim instead of falling back to the derived row.
 * @param value - the raw `windowLimits` field.
 * @returns the usable windows, `fiveHour` → `weekly` → `monthly`.
 */
export function windowLimitsFromCredits(value: unknown): CommandCodeWindow[] {
  if (!isRecord(value)) return []
  const windows: CommandCodeWindow[] = []
  for (const window of ['fiveHour', 'weekly', 'monthly'] as const) {
    const entry = value[window]
    if (!isRecord(entry)) continue
    const used = numberValue(entry.used)
    const cap = numberValue(entry.cap)
    if (used === undefined || cap === undefined) continue
    if (used === 0 && cap === 0) continue
    windows.push({ window, used, cap, resetAt: normalizeResetAt(entry.resetAt) })
  }
  return windows
}

/** Parse the `/alpha/billing/credits` body; `null` when unusable. */
export function parseCredits(value: unknown): CommandCodeCredits | null {
  if (!isRecord(value) || !isRecord(value.credits)) return null
  const credits = value.credits
  const monthly = numberValue(credits.monthlyCredits)
  const purchased = numberValue(credits.purchasedCredits)
  const free = numberValue(credits.freeCredits)
  // All three absent means this is not a credits body, not a zero-credit plan.
  if (monthly === undefined && purchased === undefined && free === undefined) return null
  const monthlyCredits = monthly ?? 0
  const purchasedCredits = purchased ?? 0
  const freeCredits = free ?? 0
  return {
    monthly: monthlyCredits,
    purchased: purchasedCredits,
    free: freeCredits,
    remaining: monthlyCredits + purchasedCredits + freeCredits,
    windows: windowLimitsFromCredits(value.windowLimits),
  }
}

/** Parse the `/alpha/billing/subscriptions` body; `null` when unusable. */
export function parseSubscription(value: unknown): CommandCodeSubscription | null {
  if (!isRecord(value) || !isRecord(value.data)) return null
  const data = value.data
  const planId = stringValue(data.planId)
  const status = stringValue(data.status)
  const currentPeriodStart = normalizeTimestamp(data.currentPeriodStart)
  const currentPeriodEnd = normalizeTimestamp(data.currentPeriodEnd)
  if (planId === undefined && status === undefined
    && currentPeriodStart === null && currentPeriodEnd === null) return null
  return {
    planId: planId ?? null,
    status: status ?? null,
    currentPeriodStart,
    currentPeriodEnd,
  }
}

/** Parse the `/alpha/usage/summary` body; `null` when unusable. */
export function parseSummary(value: unknown): CommandCodeUsageSummary | null {
  if (!isRecord(value)) return null
  const totalCost = numberValue(value.totalCost)
  const totalCount = numberValue(value.totalCount)
  if (totalCost === undefined || totalCount === undefined) return null
  const totalTokens = numberValue(value.totalTokens) ?? numberValue(value.tokens)
  return {
    totalCost,
    totalCount,
    ...(totalTokens === undefined ? {} : { totalTokens }),
  }
}

/** Parse the `/alpha/whoami` body; `null` when unusable. */
export function parseWhoami(value: unknown): { account: CommandCodeAccount; orgId: string | null } | null {
  if (!isRecord(value)) return null
  const org = isRecord(value.org) ? value.org : undefined
  const user = isRecord(value.user) ? value.user : undefined
  const login = (org === undefined ? undefined : stringValue(org.login))
    ?? (user === undefined ? undefined : (stringValue(user.userName) ?? stringValue(user.name)))
  if (login === undefined) return null
  const orgId = org === undefined ? undefined : stringValue(org.id)
  const keyName = user === undefined ? undefined : (stringValue(user.keyName) ?? stringValue(user.displayName))
  return {
    account: { login, ...(keyName === undefined ? {} : { keyName }) },
    orgId: orgId ?? null,
  }
}

/**
 * Assemble a sample from the four raw endpoint bodies.
 *
 * Exported separately from the fetch so the parsing rules are unit-testable
 * against fixed fixtures with no network.
 * @param whoami - raw `/alpha/whoami` body.
 * @param credits - raw `/alpha/billing/credits` body, or `null` when it failed.
 * @param subscription - raw `/alpha/billing/subscriptions` body, or `null`.
 * @param summary - raw `/alpha/usage/summary` body, or `null`.
 * @returns the sample, or `undefined` when no section is usable.
 */
export function assembleUsage(
  whoami: unknown,
  credits: unknown,
  subscription: unknown,
  summary: unknown,
): CommandCodeUsage | undefined {
  const identity = parseWhoami(whoami)
  if (identity === null) return undefined

  const unavailable: CommandCodeSection[] = []
  const parsedCredits = parseCredits(credits)
  if (parsedCredits === null) unavailable.push('credits')
  const parsedSubscription = parseSubscription(subscription)
  if (parsedSubscription === null) unavailable.push('subscription')
  const parsedSummary = parseSummary(summary)
  if (parsedSummary === null) unavailable.push('usage')

  // The account is usable and at least one metered section arrived: this is a
  // real sample. A lone account with nothing else is not worth showing.
  if (parsedCredits === null && parsedSubscription === null && parsedSummary === null) {
    return undefined
  }
  return {
    account: identity.account,
    ...(parsedCredits === null ? {} : { credits: parsedCredits }),
    ...(parsedSubscription === null ? {} : { subscription: parsedSubscription }),
    ...(parsedSummary === null ? {} : { summary: parsedSummary }),
    unavailable,
  }
}

/** Build an absolute URL with only the defined query parameters. */
function buildUrl(base: string, path: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  const query = search.toString()
  return `${base}${path}${query === '' ? '' : `?${query}`}`
}

/** One endpoint read that either yields JSON or an `Error` to be swallowed. */
type EndpointResult = { ok: true; body: unknown } | { ok: false; error: Error }

/** Human-readable message for an unknown failure. */
function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') return '请求超时'
  if (error instanceof Error && error.name === 'AbortError') return '请求超时'
  if (error instanceof Error && error.message !== '') return error.message
  return String(error)
}

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
export async function fetchCommandCodeUsage(
  apiKey: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  apiBase: string = DEFAULT_API_BASE,
): Promise<CommandCodeUsage> {
  const base = apiBase.replace(/\/+$/, '')
  const signal = AbortSignal.timeout(timeoutMs)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'User-Agent': 'dsh-command-code-usage/1.0',
  }

  /** Read one endpoint, classifying every failure as a recoverable section miss. */
  const read = async (path: string, params: Record<string, string | undefined> = {}): Promise<EndpointResult> => {
    let response: Response
    try {
      response = await fetch(buildUrl(base, path, params), { method: 'GET', headers, signal })
    } catch (error) {
      // A timeout or transport failure can still be a partial-sample case for
      // the optional endpoints, so it is reported like any other miss.
      return { ok: false, error: new Error(errorMessage(error)) }
    }
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: new Error(
          response.status === 401
            ? 'API Key 无效或已过期（HTTP 401），请检查 Command Code API Key'
            : 'API Key 无权访问该接口（HTTP 403），请确认套餐已开通 Provider API',
        ),
      }
    }
    if (!response.ok) {
      return { ok: false, error: new Error(`Command Code 返回 HTTP ${response.status}`) }
    }
    try {
      return { ok: true, body: await response.json() }
    } catch {
      return { ok: false, error: new Error('Command Code 返回了无法解析的响应') }
    }
  }

  // `whoami` is the gate: without it there is no orgId and no account identity.
  const whoami = await read('/alpha/whoami')
  if (!whoami.ok) throw new Error(`无法读取 Command Code 账户信息：${whoami.error.message}`)
  const identity = parseWhoami(whoami.body)
  if (identity === null) {
    throw new Error('Command Code 返回了无法识别的账户信息（whoami）')
  }

  const orgId = identity.orgId ?? undefined
  // Credits and subscription are independent, so they share one round trip.
  const [credits, subscription] = await Promise.all([
    read('/alpha/billing/credits', { orgId }),
    read('/alpha/billing/subscriptions', { orgId }),
  ])
  // The summary is scoped to the current billing period when the subscription
  // answered, so it is read after it; `since` is optional and the API falls
  // back to its own default window when absent.
  const since = subscription.ok ? parseSubscription(subscription.body)?.currentPeriodStart : null
  const summary = await read('/alpha/usage/summary', {
    orgId,
    since: since === null || since === undefined ? undefined : String(since),
  })

  // A rejected key on any metered endpoint is fatal rather than a partial
  // sample: `whoami` accepting a key the rest refuse means the plan lacks
  // Provider API access, which the user must fix rather than see as "no data".
  for (const result of [credits, subscription, summary]) {
    if (!result.ok && /HTTP 401|HTTP 403/.test(result.error.message)) throw result.error
  }

  const usage = assembleUsage(
    whoami.body,
    credits.ok ? credits.body : null,
    subscription.ok ? subscription.body : null,
    summary.ok ? summary.body : null,
  )
  if (usage === undefined) {
    throw new Error('响应中没有可用的用量数据（credits / subscriptions / usage summary 均不可用）')
  }
  return usage
}
