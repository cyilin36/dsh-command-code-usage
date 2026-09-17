/**
 * Command Code usage dock — the whole browser surface.
 *
 * A floating dock: a compact glassy badge shows the two rolling credit windows
 * (5h / 周) as threshold-colored rings plus the 5h rolling window's live reset
 * countdown; clicking it toggles a glassy panel with the credit pool headline
 * (remaining of pool, sources, plan), the full window rows, an API-key field
 * when none is configured, a manual refresh button, and clear error states.
 * The dock is draggable — grab the badge with pointer events and drop it
 * anywhere; its position persists in localStorage, and the panel auto-flips
 * top/bottom and left/right so it stays inside the viewport.
 *
 * The dock is mounted through the shell's `shell.overlay` slot when available
 * and falls back to a body portal otherwise, and follows DSH design tokens
 * (`--dsw-alias-*`) so it blends with either theme. It deliberately depends on
 * no `dsh-client-ui-primitives` symbols: that package is a shell-seeded module
 * whose export surface is a versioned host contract, and this dock needs only
 * plain DOM elements plus its own stylesheet.
 * @module dsh-command-code-usage/client/dock
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import type { CommandCodeSection, CommandCodeUsageState } from '../types.ts'
import {
  clampDockPosition, clearKey, computePanelLayout, fetchState, formatCredits,
  formatCreditsCompact, formatRelative, formatRemaining, formatRemainingCompact,
  formatTokens, healthLabel, percentTone, planLabel, poolView, refreshState,
  remainingRatio, stateHasUsage, storeKey, usageWindows,
  type DockPosition, type PanelLayout, type WindowView,
} from './usage-model.ts'

/** Poll cadence: fast while the panel is open, calm while collapsed. */
const OPEN_POLL_MS = 10_000
const COLLAPSED_POLL_MS = 60_000

/** Pointer travel (px) beyond which a press counts as a drag, not a click. */
const DRAG_THRESHOLD_PX = 4

/** localStorage keys for persisted dock preferences. */
const STORAGE_POS_KEY = 'dsh-command-code-usage.position'
/** Persisted minimal-mode preference. */
const STORAGE_MINIMAL_KEY = 'dsh-command-code-usage.minimal'

/** Human label for each usage section, for partial-availability reporting. */
const SECTION_LABEL: Record<CommandCodeSection, string> = {
  account: '账户',
  credits: '额度',
  subscription: '订阅',
  usage: '用量汇总',
}

/** Active pointer-drag session on the badge. */
interface DragSession {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  sizeW: number
  sizeH: number
  moved: boolean
}

/** Whether the user asked the OS to cut non-essential motion. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Read a persisted dock position; tolerates corrupt or absent storage. */
function loadPosition(): DockPosition | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_POS_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as Partial<DockPosition>
    if (typeof parsed.x !== 'number' || !Number.isFinite(parsed.x)
      || typeof parsed.y !== 'number' || !Number.isFinite(parsed.y)) return null
    return { x: parsed.x, y: parsed.y }
  } catch {
    return null
  }
}

/** Read the persisted minimal-mode flag. */
function loadMinimal(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_MINIMAL_KEY) === '1'
  } catch {
    return false
  }
}

/** Clamp a dock position so the badge stays fully inside the viewport. */
function clampToViewport(pos: DockPosition, sizeW: number, sizeH: number): DockPosition {
  return clampDockPosition(pos, { w: sizeW, h: sizeH }, { w: window.innerWidth, h: window.innerHeight })
}

/** Root state: the dock itself. */
export function UsageDock(): ReactElement {
  const [open, setOpen] = useState(false)
  // Closing drives the exit animation: set first, the reverse tween plays, and
  // onAnimationEnd finally flips `open` to false.
  const [closing, setClosing] = useState(false)
  const [state, setState] = useState<CommandCodeUsageState | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  // Re-rendered once a second so badge and panel countdowns stay live.
  const [now, setNow] = useState(() => Date.now())
  // Dragged position; null keeps the CSS default bottom-right placement.
  const [pos, setPos] = useState<DockPosition | null>(loadPosition)
  // Measured badge / panel sizes, used for clamping and panel flipping.
  const [badgeSize, setBadgeSize] = useState<{ w: number; h: number } | null>(null)
  const [panelSize, setPanelSize] = useState<{ w: number; h: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  // Minimal mode: the dock collapses to a single 5h-rolling ring.
  const [minimal, setMinimal] = useState(loadMinimal)
  // Key-entry form state.
  const [draftKey, setDraftKey] = useState('')
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [keyOk, setKeyOk] = useState<string | null>(null)

  const badgeRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragSession | null>(null)
  // Set when a press ended as a drag, so the following click event (browsers
  // still fire it after pointer capture) is swallowed instead of toggling.
  const suppressClickRef = useRef(false)

  // Poll the host cache; interval follows the open state.
  useEffect(() => {
    let alive = true
    const tick = async (): Promise<void> => {
      try {
        const next = await fetchState()
        if (alive) setState(next)
      } catch {
        // Keep the last sample; transient failures must not blank the dock.
      }
    }
    void tick()
    const id = window.setInterval(() => { void tick() }, open ? OPEN_POLL_MS : COLLAPSED_POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [open])

  // Countdown ticker: always on (the badge shows the rolling countdown too).
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Persist the dragged position.
  useEffect(() => {
    if (pos === null) return
    try {
      window.localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(pos))
    } catch {
      // Storage unavailable (private mode): the position just does not persist.
    }
  }, [pos])

  // Persist the minimal-mode preference.
  useEffect(() => {
    try {
      if (minimal) window.localStorage.setItem(STORAGE_MINIMAL_KEY, '1')
      else window.localStorage.removeItem(STORAGE_MINIMAL_KEY)
    } catch {
      // Storage unavailable: the choice just does not persist.
    }
  }, [minimal])

  // Keep the badge inside the viewport when the window resizes.
  useEffect(() => {
    if (badgeSize === null) return
    const onResize = (): void => {
      setPos((prev) => (prev === null ? prev : clampToViewport(prev, badgeSize.w, badgeSize.h)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [badgeSize])

  // Measure the badge and re-clamp a persisted position that drifted outside.
  useLayoutEffect(() => {
    const badge = badgeRef.current
    if (badge === null) return
    const next = { w: badge.offsetWidth, h: badge.offsetHeight }
    setBadgeSize((prev) => (prev !== null && prev.w === next.w && prev.h === next.h ? prev : next))
    setPos((prev) => {
      if (prev === null) return prev
      const clamped = clampToViewport(prev, next.w, next.h)
      return clamped.x === prev.x && clamped.y === prev.y ? prev : clamped
    })
  }, [pos?.x, pos?.y])

  // Measure the panel once it is visible, so flipping can use its real size.
  useLayoutEffect(() => {
    if (!open || closing) return
    const panel = panelRef.current
    if (panel === null) return
    const next = { w: panel.offsetWidth, h: panel.offsetHeight }
    setPanelSize((prev) => (prev !== null && prev.w === next.w && prev.h === next.h ? prev : next))
  }, [open, closing, state])

  const openPanel = (): void => {
    setClosing(false)
    setOpen(true)
  }

  const requestClose = useCallback((): void => {
    // Under reduced motion, skip the exit tween and unmount right away so the
    // panel does not sit waiting for an onAnimationEnd that never fires.
    if (prefersReducedMotion()) {
      setClosing(false)
      setOpen(false)
      return
    }
    setClosing(true)
  }, [])

  const handlePanelAnimationEnd = (): void => {
    if (closing) {
      setClosing(false)
      setOpen(false)
    }
  }

  const handleRefresh = async (): Promise<void> => {
    if (refreshing) return
    setRefreshing(true)
    setKeyOk(null)
    try {
      setState(await refreshState())
      setNow(Date.now())
    } catch {
      // The next poll will surface host-side health; keep the current sample.
    } finally {
      setRefreshing(false)
    }
  }

  const handleSaveKey = async (): Promise<void> => {
    if (keyBusy) return
    const value = draftKey.trim()
    if (value === '') {
      setKeyError('请输入 API Key')
      return
    }
    setKeyBusy(true)
    setKeyError(null)
    setKeyOk(null)
    try {
      const outcome = await storeKey(value)
      if (outcome.ok) {
        setState(outcome.state)
        setDraftKey('')
        setKeyOk('已保存，正在验证…')
        setNow(Date.now())
        // Verify the stored key right away: a saved-but-rejected key must not
        // read as success, and the refresh's own health carries the verdict.
        setState(await refreshState())
      } else {
        setKeyError(outcome.error)
      }
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : String(error))
    } finally {
      setKeyBusy(false)
    }
  }

  const handleClearKey = async (): Promise<void> => {
    if (keyBusy) return
    setKeyBusy(true)
    setKeyError(null)
    setKeyOk(null)
    try {
      const outcome = await clearKey()
      if (outcome.ok) {
        setState(outcome.state)
        setKeyOk('已清除已保存的 API Key')
      } else {
        setKeyError(outcome.error)
      }
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : String(error))
    } finally {
      setKeyBusy(false)
    }
  }

  // --- Badge dragging -----------------------------------------------------

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const origin = pos ?? { x: rect.left, y: rect.top }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      sizeW: rect.width,
      sizeH: rect.height,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const session = dragRef.current
    if (session === null || session.pointerId !== event.pointerId) return
    const dx = event.clientX - session.startX
    const dy = event.clientY - session.startY
    if (!session.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    session.moved = true
    setDragging(true)
    setPos(clampToViewport(
      { x: session.originX + dx, y: session.originY + dy },
      session.sizeW,
      session.sizeH,
    ))
  }

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const session = dragRef.current
    if (session === null || session.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    // A real drag must not toggle the panel: the click that follows pointer
    // capture is suppressed once.
    if (session.moved) suppressClickRef.current = true
  }

  // Pointer capture can be cancelled by the browser (e.g. a touch gesture
  // being taken over); no click follows, so the next real click must not be
  // swallowed by a suppression flag left over from a moved session.
  const cancelDrag = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    const session = dragRef.current
    if (session === null || session.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  const handleBadgeClick = (): void => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (open) requestClose()
    else openPanel()
  }

  // --- Panel placement (follows the dragged badge, stays in the viewport) --

  const panelLayout: PanelLayout | null = useMemo(() => {
    if (pos === null || badgeSize === null || panelSize === null) return null
    return computePanelLayout(pos, badgeSize, panelSize, {
      w: window.innerWidth,
      h: window.innerHeight,
    })
  }, [pos, badgeSize, panelSize])

  // Close the panel on Escape, the expected affordance for a dialog.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, requestClose])

  const windows = usageWindows(stateHasUsage(state) ? state.usage : undefined)
  const rolling = windows.find((window) => window.key === 'fiveHour')
  // Minimal mode collapses the dock to the 5h-rolling ring alone.
  const visibleWindows = minimal
    ? (rolling === undefined ? [] : [rolling])
    : windows
  const pool = poolView(stateHasUsage(state) ? state.usage : undefined)
  const plan = planLabel(state?.usage?.subscription?.planId)
  const hasUsage = stateHasUsage(state)

  // State-dot semantics: connecting → ongoing, live → done, stale → warning,
  // error/unconfigured → error.
  const dotState = state === null ? 'ongoing'
    : state.health.status === 'ok' ? 'done'
    : hasUsage ? 'warning'
    : 'error'

  // Only offer the key form when saving could actually succeed; a read-only
  // source shadowing the reference must show the remedy instead.
  const canStoreKey = state === null || state.health.writable
  const showKeyForm = state !== null && state.health.status === 'unconfigured' && canStoreKey

  return (
    <div
      className="ccu-dock"
      data-positioned={pos !== null ? 'true' : 'false'}
      style={pos !== null ? { left: pos.x, top: pos.y } : undefined}
    >
      <button
        ref={badgeRef}
        type="button"
        className="ccu-badge"
        data-dragging={dragging ? 'true' : undefined}
        onClick={handleBadgeClick}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        title={minimal
          ? 'Command Code 用量：仅 5h 滚动（极简模式，拖拽可移动）'
          : 'Command Code 用量：5h 滚动 / 本周（拖拽可移动）'}
        aria-expanded={open}
        aria-label="Command Code 用量"
      >
        {minimal ? (
          rolling !== undefined ? (
            // Minimal mode: a single 5h-rolling ring, no countdown, no labels.
            <Ring window={rolling} now={now} size={34} />
          ) : (
            <span className="ccu-badge-text">Cmd Code —</span>
          )
        ) : windows.length > 0 ? (
          <>
            {windows.map((window) => <Ring key={window.key} window={window} now={now} size={34} />)}
            {rolling !== undefined && (
              <span className="ccu-badge-countdown" title="5h 滚动窗口重置倒计时">
                <span className="ccu-badge-countdown-icon" aria-hidden="true">↻</span>
                <span>{formatRemainingCompact(rolling.resetAt, now)}</span>
              </span>
            )}
          </>
        ) : pool !== undefined ? (
          // No window data at all: fall back to the pool balance alone. No
          // percentage accompanies it, because the API states no denominator.
          <span className="ccu-badge-text">{formatCreditsCompact(pool.remaining)}</span>
        ) : (
          <span className="ccu-badge-text">Cmd Code —</span>
        )}
        {/* Minimal mode keeps strictly the single ring: the health dot would be
            the only other element on the badge, so it stays hidden. */}
        {!minimal && <span className="ccu-dot" data-state={dotState} aria-hidden="true" />}
      </button>

      {open && (
        <section
          ref={panelRef}
          className="ccu-panel"
          data-closing={closing || undefined}
          data-below={panelLayout?.below ? 'true' : undefined}
          data-left={panelLayout?.useLeft ? 'true' : undefined}
          style={panelLayout?.useLeft ? { left: panelLayout.leftOffset } : undefined}
          role="dialog"
          aria-label="Command Code 用量"
          onAnimationEnd={handlePanelAnimationEnd}
        >
          <header className="ccu-head">
            <div className="ccu-title">
              <span className="ccu-logo" aria-hidden="true">◈</span>
              <span>Command Code</span>
              <span className="ccu-health" data-status={state?.health.status ?? 'pending'}>
                {healthLabel(state)}
              </span>
            </div>
            <div className="ccu-head-actions">
              <button
                type="button"
                role="switch"
                aria-checked={minimal}
                className="ccu-minimal"
                onClick={() => setMinimal((prev) => !prev)}
                title="极简模式：仅显示 5h 滚动环"
              >
                <span className="ccu-minimal-label">极简</span>
                <span className="ccu-minimal-track" aria-hidden="true">
                  <span className="ccu-minimal-thumb" />
                </span>
              </button>
              <button type="button" className="ccu-icon-btn" onClick={requestClose} aria-label="关闭">✕</button>
            </div>
          </header>

          {hasUsage ? (
            <>
              {(state.usage.account !== undefined || plan !== null) && (
                <div className="ccu-account">
                  {state.usage.account !== undefined && (
                    <span className="ccu-account-name">{state.usage.account.login}</span>
                  )}
                  {plan !== null && <span className="ccu-plan">{plan}</span>}
                  {state.usage.subscription?.status !== null
                    && state.usage.subscription?.status !== undefined && (
                    <span className="ccu-pool-of">{state.usage.subscription.status}</span>
                  )}
                </div>
              )}

              {/* The pool headline is the account-level balance: the three
                  source balances summed, plus this period's spend when the
                  summary answered. No "percent used" is shown — the API never
                  states the grant total, so any such figure would rest on a
                  denominator this monitor reconstructed rather than read. */}
              {pool !== undefined && (
                <div className="ccu-pool">
                  <div className="ccu-pool-top">
                    <span className="ccu-pool-remaining">{formatCredits(pool.remaining)}</span>
                    <span className="ccu-pool-pct">
                      {pool.spent === null
                        ? '剩余额度'
                        : `本期已花 ${formatCredits(pool.spent)}`}
                    </span>
                  </div>
                  <div className="ccu-sources">
                    <span>订阅余额 {formatCredits(pool.monthly)}</span>
                    {pool.purchased > 0 && <span>购买余额 {formatCredits(pool.purchased)}</span>}
                    {pool.free > 0 && <span>赠送余额 {formatCredits(pool.free)}</span>}
                  </div>
                </div>
              )}

              {visibleWindows.length > 0 ? (
                <div className="ccu-windows">
                  {visibleWindows.map((window) => <WindowRow key={window.key} window={window} now={now} />)}
                </div>
              ) : (
                <p className="ccu-note">该套餐未返回任何额度窗口。</p>
              )}

              {state.usage.summary !== undefined && (
                <div className="ccu-sources" style={{ marginTop: 8 }}>
                  <span>本期请求 {state.usage.summary.totalCount.toLocaleString('en-US')}</span>
                  {state.usage.summary.totalTokens !== undefined && (
                    <span>Token {formatTokens(state.usage.summary.totalTokens)}</span>
                  )}
                </div>
              )}

              {state.usage.unavailable.length > 0 && (
                <div className="ccu-hint">
                  <div>部分接口未返回（其余数据正常）：</div>
                  {state.usage.unavailable.map((section) => (
                    <div key={section} className="ccu-hint-item">
                      {SECTION_LABEL[section]}：
                      {state.usage?.unavailableReasons?.[section] ?? '未返回可解析的数据'}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="ccu-note" data-variant={state === null || state.health.status === 'unconfigured' ? 'info' : 'error'}>
              <p className="ccu-note-title">
                {state === null ? '正在连接用量服务…'
                  : state.health.status === 'unconfigured' ? '尚未配置 API Key'
                  : '用量获取失败'}
              </p>
              <p>{state === null
                ? '如果长时间停留在该状态，请确认 dsh 已加载 dsh-command-code-usage 插件。'
                : state.health.error}</p>
            </div>
          )}

          {showKeyForm && (
            <div className="ccu-keyform">
              <label className="ccu-keyform-label" htmlFor="ccu-key-input">
                填入 Command Code API Key
              </label>
              <div className="ccu-keyform-row">
                <input
                  id="ccu-key-input"
                  className="ccu-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="user_..."
                  value={draftKey}
                  disabled={keyBusy}
                  onChange={(event) => setDraftKey(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSaveKey()
                  }}
                />
                <button
                  type="button"
                  className="ccu-btn"
                  data-variant="primary"
                  disabled={keyBusy}
                  onClick={() => { void handleSaveKey() }}
                >
                  {keyBusy ? '保存中…' : '保存'}
                </button>
              </div>
              {keyError !== null && <p className="ccu-keyerror">{keyError}</p>}
              {keyOk !== null && <p className="ccu-keyok">{keyOk}</p>}
              {state !== null && state.health.status === 'unconfigured' && (
                <p className="ccu-hint">
                  Key 保存到凭据引用 <code>{state.health.apiKeyEnv}</code>
                  ；也可在 Web 设置 → 模型 中为「Command Code」填写，两者等价。
                  {' '}在 <a className="ccu-link" href="https://commandcode.ai/" target="_blank" rel="noopener noreferrer">commandcode.ai</a> 创建 Key。
                </p>
              )}
            </div>
          )}

          <footer className="ccu-foot">
            <span className="ccu-updated">
              {state === null ? '' : `更新于 ${formatRelative(state.usageFetchedAt ?? state.health.fetchedAt, now)}`}
              {hasUsage && state !== null && state.health.status !== 'ok' && ' · 显示上次数据'}
            </span>
            <span className="ccu-foot-actions">
              {state !== null && state.health.status !== 'unconfigured' && canStoreKey && (
                <button
                  type="button"
                  className="ccu-btn"
                  disabled={keyBusy}
                  onClick={() => { void handleClearKey() }}
                  title="清除保存在 ~/.dsh/.credentials.yaml 中的 Key"
                >
                  清除 Key
                </button>
              )}
              <button
                type="button"
                className="ccu-btn"
                disabled={refreshing}
                onClick={() => { void handleRefresh() }}
              >
                {refreshing ? '刷新中…' : '立即刷新'}
              </button>
            </span>
          </footer>
        </section>
      )}
    </div>
  )
}

/** One credit window row: ring + labels + countdown. */
function WindowRow({ window, now }: { window: WindowView; now: number }): ReactElement {
  const tone = percentTone(window.percent)
  return (
    <div className="ccu-row">
      <Ring window={window} now={now} size={46} />
      <div className="ccu-row-body">
        <div className="ccu-row-name">
          <span className="ccu-row-label">{window.label}</span>
          <span className="ccu-row-sub">{window.sublabel}</span>
        </div>
        <div className="ccu-row-meta">
          <span className="ccu-row-credits">
            <span className="ccu-row-dot" data-tone={tone} aria-hidden="true" />
            已用 {formatCredits(window.used)} / {formatCredits(window.cap)}（{Math.round(window.percent)}%）
          </span>
          <span className="ccu-row-remain">剩余 {formatCredits(window.remaining)}</span>
        </div>
        <div className="ccu-row-countdown" data-expired={window.resetAt !== null && window.resetAt <= now ? 'true' : undefined}>
          重置于 {formatRemaining(window.resetAt, now)}
        </div>
      </div>
    </div>
  )
}

/**
 * Double ring for one credit window.
 *
 * The outer ring shows the *remaining* credit share as an arc (full ring at 0%
 * used, shrinking as credits are spent) and is threshold-colored by spent
 * share: green <60% / orange ≥60% / red ≥85% — so a low remaining share reads
 * as red. The inner ring is the share of the window period still left before
 * its reset, drawn in the DS brand tone, hugging the outer ring with no visible
 * gap so the two read as one bicolored band. Rounded caps switch to butt at
 * both ends of the arc so neither an empty nor a full ring shows a phantom or
 * bumpy seam. The centered text shows the remaining percent.
 * @param window - the projected window view (percent, reset, periodMs).
 * @param now - current epoch ms (drives the inner remaining-time arc).
 * @param size - outer diameter in px (46 for the panel row, 34 for the badge).
 */
export function Ring({ window, now, size = 46 }: {
  window: WindowView
  now: number
  size?: number
}): ReactElement {
  const stroke = size >= 44 ? 4.5 : 3.5
  const timeStroke = size >= 44 ? 2.5 : 2
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const used = Math.min(100, Math.max(0, window.percent))
  const quotaLeft = 100 - used
  const dash = (circumference * quotaLeft) / 100
  const ringEmpty = quotaLeft <= 0
  const ringFull = quotaLeft >= 100

  // The inner ring hugs the outer ring tight (zero gap): its center radius sits
  // exactly at the outer ring's inner edge minus half the inner stroke.
  const timeRadius = radius - (stroke + timeStroke) / 2
  const timeCircumference = 2 * Math.PI * timeRadius
  const remaining = remainingRatio(window.resetAt, window.periodMs, now)
  const timeDash = timeCircumference * remaining
  const timeEmpty = remaining <= 0

  return (
    <svg
      className="ccu-ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${window.label} 剩余额度 ${Math.round(quotaLeft)}%，窗口剩余时间 ${Math.round(remaining * 100)}%`}
    >
      <circle
        className="ccu-ring-track"
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth={stroke} fill="none"
      />
      <circle
        className="ccu-ring-bar"
        data-tone={percentTone(used)}
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap={ringEmpty || ringFull ? 'butt' : 'round'}
      />
      <circle
        className="ccu-ring-time-track"
        cx={size / 2} cy={size / 2} r={timeRadius}
        strokeWidth={timeStroke} fill="none"
      />
      <circle
        className="ccu-ring-time-bar"
        cx={size / 2} cy={size / 2} r={timeRadius}
        strokeWidth={timeStroke} fill="none"
        strokeDasharray={`${timeDash} ${timeCircumference - timeDash}`}
        strokeDashoffset={timeCircumference / 4}
        strokeLinecap={timeEmpty ? 'butt' : 'round'}
      />
      <text
        className={size >= 44 ? 'ccu-ring-text' : 'ccu-ring-text-sm'}
        x="50%" y="50%"
        dominantBaseline="central"
        textAnchor="middle"
      >
        {Math.round(quotaLeft)}%
      </text>
    </svg>
  )
}
