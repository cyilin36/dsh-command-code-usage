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

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Declaration merge only: makes ctx.credentials visible.
import type {} from '@deepseek-ai/dsh-credentials'
import type { CredentialProvider } from '@deepseek-ai/dsh-credentials'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { DEFAULT_API_BASE, DEFAULT_TIMEOUT_MS, fetchCommandCodeUsage } from './usage.ts'
import type { CommandCodeHealth, CommandCodeUsage, CommandCodeUsageState } from './types.ts'

/**
 * Structural slice of the web server service. Kept structural rather than
 * imported so the plugin composes against the published `WebServer` without
 * pinning a package version, matching the sibling usage-monitor plugins.
 */
interface WebRouteHost {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

/** Web-server service key candidates, newest first. */
const WEB_SERVER_KEYS = ['webServer', 'httpServer'] as const

/** Route prefix every endpoint of this plugin lives under. */
const PLUGIN_ROUTE_BASE = '/plugins/dsh-command-code-usage'

/** Largest accepted key body, so a stray large POST cannot exhaust memory. */
const MAX_KEY_BODY_BYTES = 8 * 1024

export const name = 'command-code-usage'
export const inject: readonly string[] = []

/** Plugin configuration. */
export interface Config {
  /**
   * Credential reference resolved per refresh through `ctx.credentials`
   * (default `COMMAND_CODE_API_KEY`). Must match the reference the
   * `command-code` provider route names in the composition patch, so the
   * monitor and the chat route always read the same secret.
   */
  apiKeyEnv?: string
  /** Direct API key fallback when the credential reference is unconfigured. */
  apiKey?: string
  /** Command Code API origin (default `https://api.commandcode.ai`). */
  apiBase?: string
  /** Auto-refresh interval in millis (default `60000`). */
  refreshMs?: number
  /** Per-request timeout in millis (default `15000`). */
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  apiKeyEnv: z.string().default('COMMAND_CODE_API_KEY'),
  apiKey: z.string(),
  apiBase: z.string().default(DEFAULT_API_BASE),
  refreshMs: z.natural().min(10_000).default(60_000),
  timeoutMs: z.natural().min(1_000).default(DEFAULT_TIMEOUT_MS),
})

/** The credential reference this instance resolves, defaulted. */
function apiKeyRef(config: Config): string {
  return config.apiKeyEnv ?? 'COMMAND_CODE_API_KEY'
}

/**
 * Credential seam accessor.
 *
 * `credentials` is resolved through `ctx.get` rather than declared in
 * `inject` so a headless profile without the credentials plugin still loads
 * this one: it then reports `unconfigured` instead of failing activation.
 */
function credentialsOf(ctx: Context): CredentialProvider | undefined {
  return ctx.get('credentials') as CredentialProvider | undefined
}

/**
 * Resolve the API key for one refresh: direct config, then the credential
 * seam.
 * @param ctx - host context.
 * @param config - resolved plugin configuration.
 * @returns the key and its source layer, or `undefined` while unconfigured.
 */
async function resolveApiKey(
  ctx: Context,
  config: Config,
): Promise<{ value: string; source: string } | undefined> {
  if (config.apiKey !== undefined && config.apiKey !== '') {
    return { value: config.apiKey, source: 'config' }
  }
  const credentials = credentialsOf(ctx)
  if (credentials === undefined) return undefined
  const resolved = await credentials.resolve(credentialRef(apiKeyRef(config)))
  return resolved === undefined ? undefined : { value: resolved.value, source: resolved.source }
}

/** Read a request body up to {@link MAX_KEY_BODY_BYTES}; `undefined` when too large. */
async function readBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    total += buffer.byteLength
    if (total > MAX_KEY_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export function apply(ctx: Context, config: Config): void {
  const apiBase = config.apiBase ?? DEFAULT_API_BASE
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const ref = apiKeyRef(config)

  /** Last successful sample; kept across failed refreshes so the UI stays stable. */
  let lastGood: { usage: CommandCodeUsage; fetchedAt: number } | null = null
  /** Health of the most recent refresh attempt. */
  let health: CommandCodeHealth = {
    status: 'unconfigured',
    fetchedAt: 0,
    apiKeyEnv: ref,
    writable: true,
  }
  /** In-flight refresh, so concurrent triggers share one request. */
  let refreshing: Promise<CommandCodeUsageState> | null = null

  /** Assemble the state served to the web client from data + health. */
  const buildState = (): CommandCodeUsageState => ({
    ...(lastGood === null ? {} : { usage: lastGood.usage, usageFetchedAt: lastGood.fetchedAt }),
    health,
  })

  /**
   * Refresh credential facts into `health`, so the dock can name the exact
   * reference to store under and know whether storing would succeed.
   */
  const describeCredential = async (): Promise<{ configured: boolean; writable: boolean }> => {
    const credentials = credentialsOf(ctx)
    if (credentials === undefined) return { configured: false, writable: false }
    try {
      const info = await credentials.describe(credentialRef(ref))
      return { configured: info.configured, writable: info.writable }
    } catch (error) {
      ctx.logger.debug(`command-code-usage: credential describe failed: ${String(error)}`)
      return { configured: false, writable: false }
    }
  }

  /** Run one refresh and publish its sample; concurrent calls coalesce. */
  const refresh = (): Promise<CommandCodeUsageState> => {
    if (refreshing !== null) return refreshing
    refreshing = (async (): Promise<CommandCodeUsageState> => {
      const fetchedAt = Date.now()
      const credential = await describeCredential()
      const resolved = await resolveApiKey(ctx, config)
      if (resolved === undefined) {
        health = {
          status: 'unconfigured',
          fetchedAt,
          apiKeyEnv: ref,
          writable: credential.writable,
          error: credential.writable
            ? `未找到 Command Code API Key：请在下方填入，或打开 Web 设置 → 模型，选择「Command Code」并填写 API Key`
            : `未找到 Command Code API Key：凭据引用 ${ref} 被只读来源（进程环境变量）占用，请设置该环境变量后重启 dsh`,
        }
        return buildState()
      }
      try {
        const usage = await fetchCommandCodeUsage(resolved.value, timeoutMs, apiBase)
        lastGood = { usage, fetchedAt }
        health = { status: 'ok', fetchedAt, apiKeyEnv: ref, writable: credential.writable }
      } catch (error) {
        // Silent degradation: keep showing the last successful sample; only
        // the health record changes (debug-level log, no user-facing noise).
        health = {
          status: 'error',
          fetchedAt,
          apiKeyEnv: ref,
          writable: credential.writable,
          error: error instanceof Error ? error.message : String(error),
        }
        ctx.logger.debug(`command-code-usage: refresh failed: ${health.error ?? ''}`)
      }
      return buildState()
    })().finally(() => {
      refreshing = null
    })
    return refreshing
  }

  // Refresh immediately on mount and then on the configured interval.
  void refresh()
  const timer = globalThis.setInterval(() => {
    void refresh()
  }, config.refreshMs ?? 60_000)
  ctx.effect(() => () => {
    globalThis.clearInterval(timer)
  }, 'command-code-usage: refresh timer')

  /** Send one JSON payload with no-store caching. */
  const sendJson = (res: ServerResponse, payload: unknown, status = 200): void => {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(JSON.stringify(payload))
  }

  /**
   * Store or clear the API key through the credential seam. This runs on the
   * host precisely so the browser never has to know the storage format, and so
   * a refusal (a read-only source shadowing the reference) reaches the user as
   * the seam's own message.
   */
  const handleKey = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const credentials = credentialsOf(ctx)
    if (credentials === undefined) {
      sendJson(res, { ok: false, error: '当前 profile 未挂载 credentials 插件，无法保存 API Key' }, 503)
      return
    }
    try {
      if (req.method === 'DELETE') {
        await credentials.unset(credentialRef(ref))
      } else {
        const body = await readBody(req)
        if (body === undefined) {
          sendJson(res, { ok: false, error: '请求体过大' }, 413)
          return
        }
        let value: unknown
        try {
          value = (JSON.parse(body) as { value?: unknown }).value
        } catch {
          sendJson(res, { ok: false, error: '请求体不是合法 JSON' }, 400)
          return
        }
        if (typeof value !== 'string' || value.trim() === '') {
          sendJson(res, { ok: false, error: 'API Key 为空' }, 400)
          return
        }
        // Trailing whitespace is a common paste artefact and never part of a
        // key; an interior space is not a key either, so it is left to the API
        // to reject rather than silently rewritten here.
        await credentials.set(credentialRef(ref), value.trim())
      }
      const next = await refresh()
      sendJson(res, { ok: true, state: next })
    } catch (error) {
      // Never echo the submitted value back, even on failure.
      const message = error instanceof Error ? error.message : String(error)
      ctx.logger.warn(`command-code-usage: key write refused: ${message}`)
      sendJson(res, { ok: false, error: message }, 400)
    }
  }

  // The web server may bind after this plugin under concurrent activation;
  // register the routes lazily, now and on each service binding event.
  let webRegistered = false
  const registerWebSurface = (): void => {
    if (webRegistered) return
    const webServer = (ctx.get(WEB_SERVER_KEYS[0]) ?? ctx.get(WEB_SERVER_KEYS[1])) as WebRouteHost | undefined
    if (webServer === undefined) return
    webRegistered = true

    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PLUGIN_ROUTE_BASE}/state`,
      handler: (_req, res) => {
        sendJson(res, buildState())
      },
    }), 'command-code-usage: state route')

    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PLUGIN_ROUTE_BASE}/refresh`,
      handler: async (_req, res) => {
        try {
          sendJson(res, await refresh())
        } catch (error) {
          // Last-resort guard: refresh() itself never throws (failures land in
          // health), so this only fires on unexpected internal errors.
          ctx.logger.warn(`command-code-usage: refresh crashed: ${String(error)}`)
          sendJson(res, buildState(), 500)
        }
      },
    }), 'command-code-usage: refresh route')

    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: `${PLUGIN_ROUTE_BASE}/key`,
      handler: (req, res) => handleKey(req, res),
    }), 'command-code-usage: key route')
  }

  registerWebSurface()
  ctx.on('internal/service', (serviceName) => {
    if (WEB_SERVER_KEYS.includes(serviceName as (typeof WEB_SERVER_KEYS)[number])) {
      registerWebSurface()
    }
  })
}
