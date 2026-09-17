# dsh-command-code-usage

**Command Code plan usage monitor** for DeepSeek Harness: a floating web dock
showing live remaining credits plus the 5h-rolling and weekly quota windows,
bundled with a ready-made **Command Code provider preset** so the API key can be
entered on the standard **Settings → Models** page.

## Why this plugin exists

DSH has **no** Command Code provider. How that was established:

- Searching all 240 DSH packages for `commandcode` / `command-code` /
  `Command Code` returns **zero hits**.
- DSH's multi-provider backend is `@earendil-works/pi-ai@0.85.1` (driven by
  `dsh-llm-pi-ai`). Its catalog ships 39 providers — including `opencode` and
  `opencode-go`, which is why the sibling plugin `dsh-opencode-go-usage` can read
  a key directly — but **no `commandcode`**.

So this plugin solves "where does the key come from" on two fronts:

1. **Provider preset** (`cordis.patch.yml`): injects `command-code` into the
   `dsh-llm-pi-ai` composition base layer. Command Code then appears on the web
   **Settings → Models** page with the standard API-key field — and it doubles as
   a selectable chat provider.
2. **Inline key entry in the dock** (fallback): you can enter the key right in
   the dock without ever opening the Models page.

Both write the **same** credential (under `refs` in `~/.dsh/.credentials.yaml`,
referenced as `COMMAND_CODE_API_KEY`), so one entry is enough and the two paths
are equivalent.

## Install

```sh
# From a local path into the web profile (the profile the Web GUI boots):
dsh plugin --profile web add /home/cyilin/dev/dsh-command-code-usage

# Then restart that profile (the Web UI is `dsh web`).
```

`dsh plugin` is a thin pnpm forwarder; it appends this package to the profile's
`dsh.profile.bundles`, and profile boot merges this package's
`cordis.patch.yml` into the composition tree.

## Configuring the API key

Any one of three routes:

**A. Inline in the dock (fastest)** — when unconfigured, expanding the dock shows
a key field. The key is stored in `~/.dsh/.credentials.yaml` and verified
immediately.

**B. Settings → Models** — open the "Command Code" card and fill in the API key.

**C. Environment variable / hand-written credentials file** — set
`COMMAND_CODE_API_KEY`, or write:

```yaml
version: 1
refs:
  COMMAND_CODE_API_KEY: user_xxxxxxxx
```

> Note: the **inherited process environment has the highest precedence and is
> read-only**. If you exported `COMMAND_CODE_API_KEY` before starting dsh, saves
> from both the dock and the Models page are refused (deliberate credential-seam
> design: a write that succeeds but stays shadowed would look like it worked).
> The dock names this case explicitly and tells you to use the environment
> variable instead of failing silently.

Create a key at <https://commandcode.ai/>.

## The usage dock

A frosted-glass floating badge in the bottom-right (mounted through the web
shell's `shell.overlay` slot, falling back to a body portal when that seat is
unavailable):

- **Badge (collapsed)**: two mini double rings show the 5h-rolling and weekly
  credits. The outer ring is the **remaining** share (a full ring when
  unused, shrinking as credits are spent; threshold-colored by spent share —
  green <60% / amber ≥60% / red ≥85%), the inner ring is remaining window time
  (brand blue, ticking down). A second-precision countdown for the 5h window
  (`↻3h25m`) and a health dot sit alongside.
- **Panel (click to expand)**: account name and plan tag; the credit-pool
  headline (remaining amount) with the three source balances (subscription /
  purchased / free); two window rows (double ring + `used / cap (percent)` +
  remaining + reset countdown); this period's spend, request and token totals.
  The footer carries the updated-at line, clear-key, and refresh. A
  **minimal-mode** switch sits in
  the header: it collapses the whole dock to the single 5h-rolling ring (the
  badge keeps only that ring, dropping the countdown and health dot; the panel
  keeps only the 5h row), and the preference persists.
- **Dragging**: grab the badge and drop it anywhere (a press only counts as a
  drag past 4px of travel, so a plain click still toggles). The position persists
  in localStorage and is re-clamped into the viewport on resize. The panel
  follows the badge, flipping below when there is no room above and
  left-aligning near the left edge.
- Unconfigured and error states render their guidance inline; **a failed fetch
  never blanks the badge**.

## Display stability

Data and health are decoupled: when a refresh fails (timeout, API error) the dock
**keeps showing the last successful sample**, turning only the health dot amber
and adding a subdued "showing previous data" note. Error/unconfigured states
appear only when nothing has ever been fetched successfully.

Command Code's four endpoints are individually optional: `whoami` must succeed
(it supplies the `orgId` the others are scoped by), but the remaining three stand
alone — a plan without a credit grant still reports usage, and one endpoint
failing does not discard the others. Missing sections are named at the bottom of
the panel rather than rendered as a real zero.

## Why there is no "monthly" quota row

The reference plugin `dsh-opencode-go-usage` has a monthly row; this one does
**not**. That is not an omission — the two upstreams model quota differently:

| | OpenCode Go | Command Code |
| --- | --- | --- |
| Windows | `/usage` returns rolling / weekly / **monthly**, each with a percent and a reset instant | `windowLimits` carries **only** `fiveHour` and `weekly` |
| "Monthly" | A real monthly window | **No monthly window exists** |
| `monthlyCredits` | — | The subscription source's remaining **balance** (money), not a window with a percent |

The decisive point: `credits.monthlyCredits` is only a *balance* — the API never
states how much the month granted in total. With no denominator there is no
percentage to compute.

**This plugin performs no monthly derivation.** An earlier revision reconstructed
a monthly percentage from `spent / (remaining + spent)`; that was removed. The
denominator was assembled rather than reported, so the resulting figure would
have read like an official quota while actually being an inference. Better to
omit a row than to show an authoritative-looking guess.

Everything the panel shows is therefore a fact the API stated:

- **The two windows that exist** (5h-rolling / weekly), with the API's own used,
  cap, and reset instant
- **Pool balances**: each of the three sources (subscription / purchased / free)
  and their sum
- **This period's spend**: `usage/summary.totalCost`, shown verbatim and used in
  no ratio

If you want a monthly view, the subscription balance is literally what is left of
the monthly grant — it simply does not carry a percentage.

## Configuration

The mount row in `cordis.patch.yml`:

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `apiKeyEnv` | string | `COMMAND_CODE_API_KEY` | Credential reference; must match the provider routes' `apiKeyEnv` |
| `apiKey` | string | — | Direct key (not recommended) |
| `apiBase` | string | `https://api.commandcode.ai` | Account API origin |
| `refreshMs` | number | `60000` | Auto-refresh interval (min 10000) |
| `timeoutMs` | number | `15000` | Per-request-batch timeout |

## The provider preset

The preset declares **two** routes, because Command Code selects protocol
**per model** (`claude-*` speaks Anthropic Messages, everything else OpenAI-
compatible) while DSH's `api` field is **route-level**:

| Route | Protocol | baseURL | Covers |
| --- | --- | --- | --- |
| `command-code` | `openai-completions` | `.../provider/v1` | 20 models: GPT / Gemini / DeepSeek / Grok / Kimi / Qwen / GLM / MiniMax |
| `command-code-claude` | `anthropic-messages` | `.../provider` | 5 Claude models |

Those base URLs come from how the SDKs actually join paths (verified in source):

- OpenAI-compatible: `baseURL` + `/chat/completions` → so it carries `/v1`,
  yielding `https://api.commandcode.ai/provider/v1/chat/completions`.
- Anthropic: pi-ai strips a trailing `/v1`, then `@anthropic-ai/sdk` appends
  `/v1/messages` → so it is written as `.../provider`, yielding the same
  `.../provider/v1/messages`.

**Both routes share one `apiKeyEnv`**, so the dock and the chat models read the
same key.

The preset injects the composition **base** layer; same-named fields you write
under `llm-pi-ai.providers` in `~/.dsh/settings.yaml` are **deep-merged over it
per field** (the settings service uses `mergeLayers`). The preset therefore works
out of the box and your edits win.

### A note on model capacity

`contextWindow` / `maxTokens` are **hand-entered approximations from each model's
public spec**, not authoritative values read from an endpoint (Command Code's
model listing does not disclose capacities). If a model's real window differs,
correct just that model under Settings → Models.

`reasoningEfforts` levels come from the catalog that
`pi-commandcode-provider@0.7.0` syncs out of `command-code@1.54.0`. The empty
`off:` value is the spelling DSH documents for "supported, send nothing when
off".

A few models (Kimi K2.7 Code, Qwen3.8 Plus, MiMo v2.5, Inkling) have **no
selectable levels** in that catalog and so declare no `reasoningEfforts` — DSH
exposes no level picker for a hand-declared model without the field, though they
may still reason server-side.

## Data sources

Four endpoints, matching the official `cmd` CLI's `/usage` command:

| Endpoint | Provides |
| --- | --- |
| `GET /alpha/whoami` | Account identity + `org.id` |
| `GET /alpha/billing/credits?orgId=` | Credit pool + 5h/weekly windows |
| `GET /alpha/billing/subscriptions?orgId=` | Plan id/status + billing period |
| `GET /alpha/usage/summary?orgId=&since=` | Cost / request count / tokens |

Authentication is just `Authorization: Bearer user_...`; these read-only
endpoints need no extra headers, workspace id, or session cookie. The response
shapes were checked against `pi-commandcode-provider@0.7.0`'s `src/quota.ts`, and
unknown fields are tolerated.

## Development

```sh
pnpm install
pnpm build     # tsc (host + client typecheck and emit) then esbuild (client bundle)
pnpm verify    # offline checks: pure-function rules + cordis.patch.yml schema validation
```

### Layout

| Path | Role |
| --- | --- |
| `src/index.ts` | Host: timer, cache, four HTTP routes |
| `src/usage.ts` | Command Code account API client (pure parsers, unit-testable) |
| `src/types.ts` | Pure types shared by host and browser (zero imports) |
| `src/client/usage-model.ts` | Pure display projections and wire helpers (no React/DOM) |
| `src/client/UsageDock.tsx` | The dock component |
| `src/client/styles.ts` | Stylesheet as a CSS string injected as `<style>`, themed via `--dsw-alias-*` |
| `src/client/index.tsx` | Browser entry (registers into `shell.overlay`, falls back to a body portal) |
| `scripts/build-client.mjs` | Produces the `__ModuleLoader__`-protocol artifact |
| `scripts/verify.mjs` | Offline verification |
| `cordis.patch.yml` | Composition patch: mounts this plugin + injects the provider preset |

### Client bundling

`lib/client.js` follows DSH's `clientBundle` protocol: a CJS closure factory
registered as `window.__ModuleLoader__.load({ id, factory })`, with `id` read
from package.json so a rename cannot leave the client half registering a stale
id. `react` / `react/jsx-runtime` / `react-dom/client` stay external and resolve
through the shell's frozen module table, so the dock shares the shell's React
instance.

The dock **deliberately avoids** `@deepseek-ai/dsh-client-ui-primitives`: that
package is not on disk in this deployment, surviving only as a shell-seeded
module whose export surface is a versioned host contract. The dock needs only
plain DOM elements plus its own stylesheet, so it takes on none of that risk.

## License

MIT
