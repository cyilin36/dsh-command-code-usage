window.__ModuleLoader__.load({ id: "dsh-command-code-usage", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");
var import_client = require("react-dom/client");

// lib/client/UsageDock.js
var import_jsx_runtime = require("react/jsx-runtime");
var import_react = require("react");

// lib/client/usage-model.js
var PANEL_GAP_PX = 12;
var WINDOW_PERIOD_MS = {
  fiveHour: 5 * 60 * 60 * 1e3,
  weekly: 7 * 24 * 60 * 60 * 1e3
};
var WINDOW_META = {
  fiveHour: { label: "5h \u6EDA\u52A8", sublabel: "5h Rolling" },
  weekly: { label: "\u672C\u5468", sublabel: "Weekly" }
};
function clampDockPosition(pos, size, viewport) {
  return {
    x: Math.min(Math.max(0, pos.x), Math.max(0, viewport.w - size.w)),
    y: Math.min(Math.max(0, pos.y), Math.max(0, viewport.h - size.h))
  };
}
function computePanelLayout(pos, badgeSize, panelSize, viewport) {
  const below = pos.y < panelSize.h + PANEL_GAP_PX;
  const badgeRight = pos.x + badgeSize.w;
  const useLeft = badgeRight < panelSize.w;
  const leftOffset = useLeft ? Math.min(0, viewport.w - panelSize.w - pos.x) : 0;
  return { below, useLeft, leftOffset };
}
function usageWindows(usage) {
  const windows = usage?.credits?.windows ?? [];
  const views = [];
  for (const key of ["fiveHour", "weekly"]) {
    const window2 = windows.find((candidate) => candidate.window === key);
    if (window2 === void 0)
      continue;
    if (window2.cap <= 0)
      continue;
    views.push(buildWindow(key, window2.used, window2.cap, window2.resetAt));
  }
  return views;
}
function buildWindow(key, used, cap, resetAt) {
  return {
    key,
    label: WINDOW_META[key].label,
    sublabel: WINDOW_META[key].sublabel,
    used,
    cap,
    remaining: Math.max(0, cap - used),
    percent: cap <= 0 ? 0 : Math.min(100, Math.max(0, used / cap * 100)),
    resetAt,
    periodMs: WINDOW_PERIOD_MS[key]
  };
}
function poolView(usage) {
  const credits = usage?.credits;
  if (credits === void 0)
    return void 0;
  return {
    remaining: credits.remaining,
    monthly: credits.monthly,
    purchased: credits.purchased,
    free: credits.free,
    spent: usage?.summary?.totalCost ?? null
  };
}
function remainingRatio(resetAt, periodMs, now) {
  if (resetAt === null || !Number.isFinite(resetAt) || !Number.isFinite(periodMs) || periodMs <= 0)
    return 0;
  const remaining = resetAt - now;
  if (remaining <= 0)
    return 0;
  return Math.min(1, remaining / periodMs);
}
function percentTone(percent) {
  if (!Number.isFinite(percent))
    return "ok";
  if (percent >= 85)
    return "danger";
  if (percent >= 60)
    return "warn";
  return "ok";
}
function formatRemaining(resetAt, now) {
  if (resetAt === null || !Number.isFinite(resetAt))
    return "\u2014";
  const diff = resetAt - now;
  if (diff <= 0)
    return "\u5DF2\u91CD\u7F6E";
  const totalMinutes = Math.floor(diff / 6e4);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes % 1440 / 60);
  const minutes = totalMinutes % 60;
  if (days > 0)
    return `${days}\u5929${hours}\u5C0F\u65F6`;
  if (hours > 0)
    return `${hours}\u5C0F\u65F6${minutes}\u5206`;
  if (minutes > 0)
    return `${minutes}\u5206${Math.max(0, Math.floor(diff % 6e4 / 1e3))}\u79D2`;
  return `${Math.max(0, Math.floor(diff / 1e3))}\u79D2`;
}
function formatRemainingCompact(resetAt, now) {
  if (resetAt === null || !Number.isFinite(resetAt))
    return "\u2014";
  const diff = resetAt - now;
  if (diff <= 0)
    return "\u5DF2\u91CD\u7F6E";
  const totalMinutes = Math.floor(diff / 6e4);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes % 1440 / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.max(0, Math.floor(diff % 6e4 / 1e3));
  if (days > 0)
    return hours > 0 ? `${days}d${hours}h` : `${days}d`;
  if (hours > 0)
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
  if (minutes > 0)
    return `${minutes}m${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
function formatRelative(at, now) {
  if (at === void 0 || !Number.isFinite(at) || at <= 0)
    return "\u2014";
  const diff = now - at;
  if (diff < 5e3)
    return "\u521A\u521A";
  if (diff < 6e4)
    return `${Math.floor(diff / 1e3)}\u79D2\u524D`;
  if (diff < 36e5)
    return `${Math.floor(diff / 6e4)}\u5206\u949F\u524D`;
  if (diff < 864e5)
    return `${Math.floor(diff / 36e5)}\u5C0F\u65F6\u524D`;
  return `${Math.floor(diff / 864e5)}\u5929\u524D`;
}
function formatCredits(value) {
  if (!Number.isFinite(value))
    return "$\u2014";
  return `$${value.toFixed(2)}`;
}
function formatCreditsCompact(value) {
  if (!Number.isFinite(value))
    return "$\u2014";
  if (value >= 100)
    return `$${Math.round(value)}`;
  return `$${value.toFixed(1)}`;
}
function formatTokens(value) {
  if (!Number.isFinite(value))
    return "\u2014";
  if (value >= 1e9)
    return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6)
    return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3)
    return `${(value / 1e3).toFixed(1)}k`;
  return String(value);
}
function stateHasUsage(state) {
  return state !== null && state.usage !== void 0;
}
function healthLabel(state) {
  if (state === null)
    return "\u8FDE\u63A5\u4E2D\u2026";
  if (state.health.status === "ok")
    return "\u5B9E\u65F6";
  if (stateHasUsage(state))
    return "\u6570\u636E\u8FC7\u671F";
  if (state.health.status === "unconfigured")
    return "\u672A\u914D\u7F6E";
  return "\u5F02\u5E38";
}
function planLabel(planId) {
  if (planId === null || planId === void 0 || planId === "")
    return null;
  const known = { go: "Go", goat: "GOAT", pro: "Pro", max: "Max" };
  return known[planId.toLowerCase()] ?? planId.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
var PLUGIN_ROUTE_BASE = "/plugins/dsh-command-code-usage";
async function fetchState() {
  const response = await fetch(`${PLUGIN_ROUTE_BASE}/state`, { headers: { accept: "application/json" } });
  if (!response.ok)
    throw new Error(`state HTTP ${response.status}`);
  return await response.json();
}
async function refreshState() {
  const response = await fetch(`${PLUGIN_ROUTE_BASE}/refresh`, { method: "POST" });
  if (!response.ok)
    throw new Error(`refresh HTTP ${response.status}`);
  return await response.json();
}
async function storeKey(value) {
  let response;
  try {
    response = await fetch(`${PLUGIN_ROUTE_BASE}/key`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value })
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  return parseKeyOutcome(response);
}
async function clearKey() {
  let response;
  try {
    response = await fetch(`${PLUGIN_ROUTE_BASE}/key`, { method: "DELETE" });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  return parseKeyOutcome(response);
}
async function parseKeyOutcome(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: `\u670D\u52A1\u8FD4\u56DE\u4E86\u65E0\u6CD5\u89E3\u6790\u7684\u54CD\u5E94\uFF08HTTP ${response.status}\uFF09` };
  }
  const record = body;
  if (record.ok === true && record.state !== void 0) {
    return { ok: true, state: record.state };
  }
  return {
    ok: false,
    error: typeof record.error === "string" && record.error !== "" ? record.error : `\u4FDD\u5B58\u5931\u8D25\uFF08HTTP ${response.status}\uFF09`
  };
}

// lib/client/UsageDock.js
var OPEN_POLL_MS = 1e4;
var COLLAPSED_POLL_MS = 6e4;
var DRAG_THRESHOLD_PX = 4;
var STORAGE_POS_KEY = "dsh-command-code-usage.position";
var STORAGE_MINIMAL_KEY = "dsh-command-code-usage.minimal";
var SECTION_LABEL = {
  account: "\u8D26\u6237",
  credits: "\u989D\u5EA6",
  subscription: "\u8BA2\u9605",
  usage: "\u7528\u91CF\u6C47\u603B"
};
function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function loadPosition() {
  if (typeof window === "undefined")
    return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_POS_KEY);
    if (raw === null)
      return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.x !== "number" || !Number.isFinite(parsed.x) || typeof parsed.y !== "number" || !Number.isFinite(parsed.y))
      return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}
function loadMinimal() {
  if (typeof window === "undefined")
    return false;
  try {
    return window.localStorage.getItem(STORAGE_MINIMAL_KEY) === "1";
  } catch {
    return false;
  }
}
function clampToViewport(pos, sizeW, sizeH) {
  return clampDockPosition(pos, { w: sizeW, h: sizeH }, { w: window.innerWidth, h: window.innerHeight });
}
function UsageDock() {
  const [open, setOpen] = (0, import_react.useState)(false);
  const [closing, setClosing] = (0, import_react.useState)(false);
  const [state, setState] = (0, import_react.useState)(null);
  const [refreshing, setRefreshing] = (0, import_react.useState)(false);
  const [now, setNow] = (0, import_react.useState)(() => Date.now());
  const [pos, setPos] = (0, import_react.useState)(loadPosition);
  const [badgeSize, setBadgeSize] = (0, import_react.useState)(null);
  const [panelSize, setPanelSize] = (0, import_react.useState)(null);
  const [dragging, setDragging] = (0, import_react.useState)(false);
  const [minimal, setMinimal] = (0, import_react.useState)(loadMinimal);
  const [draftKey, setDraftKey] = (0, import_react.useState)("");
  const [keyBusy, setKeyBusy] = (0, import_react.useState)(false);
  const [keyError, setKeyError] = (0, import_react.useState)(null);
  const [keyOk, setKeyOk] = (0, import_react.useState)(null);
  const badgeRef = (0, import_react.useRef)(null);
  const panelRef = (0, import_react.useRef)(null);
  const dragRef = (0, import_react.useRef)(null);
  const suppressClickRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await fetchState();
        if (alive)
          setState(next);
      } catch {
      }
    };
    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, open ? OPEN_POLL_MS : COLLAPSED_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [open]);
  (0, import_react.useEffect)(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1e3);
    return () => window.clearInterval(id);
  }, []);
  (0, import_react.useEffect)(() => {
    if (pos === null)
      return;
    try {
      window.localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(pos));
    } catch {
    }
  }, [pos]);
  (0, import_react.useEffect)(() => {
    try {
      if (minimal)
        window.localStorage.setItem(STORAGE_MINIMAL_KEY, "1");
      else
        window.localStorage.removeItem(STORAGE_MINIMAL_KEY);
    } catch {
    }
  }, [minimal]);
  (0, import_react.useEffect)(() => {
    if (badgeSize === null)
      return;
    const onResize = () => {
      setPos((prev) => prev === null ? prev : clampToViewport(prev, badgeSize.w, badgeSize.h));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [badgeSize]);
  (0, import_react.useLayoutEffect)(() => {
    const badge = badgeRef.current;
    if (badge === null)
      return;
    const next = { w: badge.offsetWidth, h: badge.offsetHeight };
    setBadgeSize((prev) => prev !== null && prev.w === next.w && prev.h === next.h ? prev : next);
    setPos((prev) => {
      if (prev === null)
        return prev;
      const clamped = clampToViewport(prev, next.w, next.h);
      return clamped.x === prev.x && clamped.y === prev.y ? prev : clamped;
    });
  }, [pos?.x, pos?.y]);
  (0, import_react.useLayoutEffect)(() => {
    if (!open || closing)
      return;
    const panel = panelRef.current;
    if (panel === null)
      return;
    const next = { w: panel.offsetWidth, h: panel.offsetHeight };
    setPanelSize((prev) => prev !== null && prev.w === next.w && prev.h === next.h ? prev : next);
  }, [open, closing, state]);
  const openPanel = () => {
    setClosing(false);
    setOpen(true);
  };
  const requestClose = (0, import_react.useCallback)(() => {
    if (prefersReducedMotion()) {
      setClosing(false);
      setOpen(false);
      return;
    }
    setClosing(true);
  }, []);
  const handlePanelAnimationEnd = () => {
    if (closing) {
      setClosing(false);
      setOpen(false);
    }
  };
  const handleRefresh = async () => {
    if (refreshing)
      return;
    setRefreshing(true);
    setKeyOk(null);
    try {
      setState(await refreshState());
      setNow(Date.now());
    } catch {
    } finally {
      setRefreshing(false);
    }
  };
  const handleSaveKey = async () => {
    if (keyBusy)
      return;
    const value = draftKey.trim();
    if (value === "") {
      setKeyError("\u8BF7\u8F93\u5165 API Key");
      return;
    }
    setKeyBusy(true);
    setKeyError(null);
    setKeyOk(null);
    try {
      const outcome = await storeKey(value);
      if (outcome.ok) {
        setState(outcome.state);
        setDraftKey("");
        setKeyOk("\u5DF2\u4FDD\u5B58\uFF0C\u6B63\u5728\u9A8C\u8BC1\u2026");
        setNow(Date.now());
        setState(await refreshState());
      } else {
        setKeyError(outcome.error);
      }
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : String(error));
    } finally {
      setKeyBusy(false);
    }
  };
  const handleClearKey = async () => {
    if (keyBusy)
      return;
    setKeyBusy(true);
    setKeyError(null);
    setKeyOk(null);
    try {
      const outcome = await clearKey();
      if (outcome.ok) {
        setState(outcome.state);
        setKeyOk("\u5DF2\u6E05\u9664\u5DF2\u4FDD\u5B58\u7684 API Key");
      } else {
        setKeyError(outcome.error);
      }
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : String(error));
    } finally {
      setKeyBusy(false);
    }
  };
  const beginDrag = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0)
      return;
    const rect = event.currentTarget.getBoundingClientRect();
    const origin = pos ?? { x: rect.left, y: rect.top };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      sizeW: rect.width,
      sizeH: rect.height,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    const session = dragRef.current;
    if (session === null || session.pointerId !== event.pointerId)
      return;
    const dx = event.clientX - session.startX;
    const dy = event.clientY - session.startY;
    if (!session.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX)
      return;
    session.moved = true;
    setDragging(true);
    setPos(clampToViewport({ x: session.originX + dx, y: session.originY + dy }, session.sizeW, session.sizeH));
  };
  const finishDrag = (event) => {
    const session = dragRef.current;
    if (session === null || session.pointerId !== event.pointerId)
      return;
    dragRef.current = null;
    setDragging(false);
    if (session.moved)
      suppressClickRef.current = true;
  };
  const cancelDrag = (event) => {
    const session = dragRef.current;
    if (session === null || session.pointerId !== event.pointerId)
      return;
    dragRef.current = null;
    setDragging(false);
  };
  const handleBadgeClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (open)
      requestClose();
    else
      openPanel();
  };
  const panelLayout = (0, import_react.useMemo)(() => {
    if (pos === null || badgeSize === null || panelSize === null)
      return null;
    return computePanelLayout(pos, badgeSize, panelSize, {
      w: window.innerWidth,
      h: window.innerHeight
    });
  }, [pos, badgeSize, panelSize]);
  (0, import_react.useEffect)(() => {
    if (!open)
      return;
    const onKeyDown = (event) => {
      if (event.key === "Escape")
        requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, requestClose]);
  const windows = usageWindows(stateHasUsage(state) ? state.usage : void 0);
  const rolling = windows.find((window2) => window2.key === "fiveHour");
  const visibleWindows = minimal ? rolling === void 0 ? [] : [rolling] : windows;
  const pool = poolView(stateHasUsage(state) ? state.usage : void 0);
  const plan = planLabel(state?.usage?.subscription?.planId);
  const hasUsage = stateHasUsage(state);
  const dotState = state === null ? "ongoing" : state.health.status === "ok" ? "done" : hasUsage ? "warning" : "error";
  const canStoreKey = state === null || state.health.writable;
  const showKeyForm = state !== null && state.health.status === "unconfigured" && canStoreKey;
  return (0, import_jsx_runtime.jsxs)("div", { className: "ccu-dock", "data-positioned": pos !== null ? "true" : "false", style: pos !== null ? { left: pos.x, top: pos.y } : void 0, children: [(0, import_jsx_runtime.jsxs)("button", { ref: badgeRef, type: "button", className: "ccu-badge", "data-dragging": dragging ? "true" : void 0, onClick: handleBadgeClick, onPointerDown: beginDrag, onPointerMove: moveDrag, onPointerUp: finishDrag, onPointerCancel: cancelDrag, title: minimal ? "Command Code \u7528\u91CF\uFF1A\u4EC5 5h \u6EDA\u52A8\uFF08\u6781\u7B80\u6A21\u5F0F\uFF0C\u62D6\u62FD\u53EF\u79FB\u52A8\uFF09" : "Command Code \u7528\u91CF\uFF1A5h \u6EDA\u52A8 / \u672C\u5468\uFF08\u62D6\u62FD\u53EF\u79FB\u52A8\uFF09", "aria-expanded": open, "aria-label": "Command Code \u7528\u91CF", children: [minimal ? rolling !== void 0 ? (
    // Minimal mode: a single 5h-rolling ring, no countdown, no labels.
    (0, import_jsx_runtime.jsx)(Ring, { window: rolling, now, size: 34 })
  ) : (0, import_jsx_runtime.jsx)("span", { className: "ccu-badge-text", children: "Cmd Code \u2014" }) : windows.length > 0 ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [windows.map((window2) => (0, import_jsx_runtime.jsx)(Ring, { window: window2, now, size: 34 }, window2.key)), rolling !== void 0 && (0, import_jsx_runtime.jsxs)("span", { className: "ccu-badge-countdown", title: "5h \u6EDA\u52A8\u7A97\u53E3\u91CD\u7F6E\u5012\u8BA1\u65F6", children: [(0, import_jsx_runtime.jsx)("span", { className: "ccu-badge-countdown-icon", "aria-hidden": "true", children: "\u21BB" }), (0, import_jsx_runtime.jsx)("span", { children: formatRemainingCompact(rolling.resetAt, now) })] })] }) : pool !== void 0 ? (
    // No window data at all: fall back to the pool balance alone. No
    // percentage accompanies it, because the API states no denominator.
    (0, import_jsx_runtime.jsx)("span", { className: "ccu-badge-text", children: formatCreditsCompact(pool.remaining) })
  ) : (0, import_jsx_runtime.jsx)("span", { className: "ccu-badge-text", children: "Cmd Code \u2014" }), !minimal && (0, import_jsx_runtime.jsx)("span", { className: "ccu-dot", "data-state": dotState, "aria-hidden": "true" })] }), open && (0, import_jsx_runtime.jsxs)("section", { ref: panelRef, className: "ccu-panel", "data-closing": closing || void 0, "data-below": panelLayout?.below ? "true" : void 0, "data-left": panelLayout?.useLeft ? "true" : void 0, style: panelLayout?.useLeft ? { left: panelLayout.leftOffset } : void 0, role: "dialog", "aria-label": "Command Code \u7528\u91CF", onAnimationEnd: handlePanelAnimationEnd, children: [(0, import_jsx_runtime.jsxs)("header", { className: "ccu-head", children: [(0, import_jsx_runtime.jsxs)("div", { className: "ccu-title", children: [(0, import_jsx_runtime.jsx)("span", { className: "ccu-logo", "aria-hidden": "true", children: "\u25C8" }), (0, import_jsx_runtime.jsx)("span", { children: "Command Code" }), (0, import_jsx_runtime.jsx)("span", { className: "ccu-health", "data-status": state?.health.status ?? "pending", children: healthLabel(state) })] }), (0, import_jsx_runtime.jsxs)("div", { className: "ccu-head-actions", children: [(0, import_jsx_runtime.jsxs)("button", { type: "button", role: "switch", "aria-checked": minimal, className: "ccu-minimal", onClick: () => setMinimal((prev) => !prev), title: "\u6781\u7B80\u6A21\u5F0F\uFF1A\u4EC5\u663E\u793A 5h \u6EDA\u52A8\u73AF", children: [(0, import_jsx_runtime.jsx)("span", { className: "ccu-minimal-label", children: "\u6781\u7B80" }), (0, import_jsx_runtime.jsx)("span", { className: "ccu-minimal-track", "aria-hidden": "true", children: (0, import_jsx_runtime.jsx)("span", { className: "ccu-minimal-thumb" }) })] }), (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ccu-icon-btn", onClick: requestClose, "aria-label": "\u5173\u95ED", children: "\u2715" })] })] }), hasUsage ? (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(state.usage.account !== void 0 || plan !== null) && (0, import_jsx_runtime.jsxs)("div", { className: "ccu-account", children: [state.usage.account !== void 0 && (0, import_jsx_runtime.jsx)("span", { className: "ccu-account-name", children: state.usage.account.login }), plan !== null && (0, import_jsx_runtime.jsx)("span", { className: "ccu-plan", children: plan }), state.usage.subscription?.status !== null && state.usage.subscription?.status !== void 0 && (0, import_jsx_runtime.jsx)("span", { className: "ccu-pool-of", children: state.usage.subscription.status })] }), pool !== void 0 && (0, import_jsx_runtime.jsxs)("div", { className: "ccu-pool", children: [(0, import_jsx_runtime.jsxs)("div", { className: "ccu-pool-top", children: [(0, import_jsx_runtime.jsx)("span", { className: "ccu-pool-remaining", children: formatCredits(pool.remaining) }), (0, import_jsx_runtime.jsx)("span", { className: "ccu-pool-pct", children: pool.spent === null ? "\u5269\u4F59\u989D\u5EA6" : `\u672C\u671F\u5DF2\u82B1 ${formatCredits(pool.spent)}` })] }), (0, import_jsx_runtime.jsxs)("div", { className: "ccu-sources", children: [(0, import_jsx_runtime.jsxs)("span", { children: ["\u8BA2\u9605\u4F59\u989D ", formatCredits(pool.monthly)] }), pool.purchased > 0 && (0, import_jsx_runtime.jsxs)("span", { children: ["\u8D2D\u4E70\u4F59\u989D ", formatCredits(pool.purchased)] }), pool.free > 0 && (0, import_jsx_runtime.jsxs)("span", { children: ["\u8D60\u9001\u4F59\u989D ", formatCredits(pool.free)] })] })] }), visibleWindows.length > 0 ? (0, import_jsx_runtime.jsx)("div", { className: "ccu-windows", children: visibleWindows.map((window2) => (0, import_jsx_runtime.jsx)(WindowRow, { window: window2, now }, window2.key)) }) : (0, import_jsx_runtime.jsx)("p", { className: "ccu-note", children: "\u8BE5\u5957\u9910\u672A\u8FD4\u56DE\u4EFB\u4F55\u989D\u5EA6\u7A97\u53E3\u3002" }), state.usage.summary !== void 0 && (0, import_jsx_runtime.jsxs)("div", { className: "ccu-sources", style: { marginTop: 8 }, children: [(0, import_jsx_runtime.jsxs)("span", { children: ["\u672C\u671F\u8BF7\u6C42 ", state.usage.summary.totalCount.toLocaleString("en-US")] }), state.usage.summary.totalTokens !== void 0 && (0, import_jsx_runtime.jsxs)("span", { children: ["Token ", formatTokens(state.usage.summary.totalTokens)] })] }), state.usage.unavailable.length > 0 && (0, import_jsx_runtime.jsxs)("div", { className: "ccu-hint", children: [(0, import_jsx_runtime.jsx)("div", { children: "\u90E8\u5206\u63A5\u53E3\u672A\u8FD4\u56DE\uFF08\u5176\u4F59\u6570\u636E\u6B63\u5E38\uFF09\uFF1A" }), state.usage.unavailable.map((section) => (0, import_jsx_runtime.jsxs)("div", { className: "ccu-hint-item", children: [SECTION_LABEL[section], "\uFF1A", state.usage?.unavailableReasons?.[section] ?? "\u672A\u8FD4\u56DE\u53EF\u89E3\u6790\u7684\u6570\u636E"] }, section))] })] }) : (0, import_jsx_runtime.jsxs)("div", { className: "ccu-note", "data-variant": state === null || state.health.status === "unconfigured" ? "info" : "error", children: [(0, import_jsx_runtime.jsx)("p", { className: "ccu-note-title", children: state === null ? "\u6B63\u5728\u8FDE\u63A5\u7528\u91CF\u670D\u52A1\u2026" : state.health.status === "unconfigured" ? "\u5C1A\u672A\u914D\u7F6E API Key" : "\u7528\u91CF\u83B7\u53D6\u5931\u8D25" }), (0, import_jsx_runtime.jsx)("p", { children: state === null ? "\u5982\u679C\u957F\u65F6\u95F4\u505C\u7559\u5728\u8BE5\u72B6\u6001\uFF0C\u8BF7\u786E\u8BA4 dsh \u5DF2\u52A0\u8F7D dsh-command-code-usage \u63D2\u4EF6\u3002" : state.health.error })] }), showKeyForm && (0, import_jsx_runtime.jsxs)("div", { className: "ccu-keyform", children: [(0, import_jsx_runtime.jsx)("label", { className: "ccu-keyform-label", htmlFor: "ccu-key-input", children: "\u586B\u5165 Command Code API Key" }), (0, import_jsx_runtime.jsxs)("div", { className: "ccu-keyform-row", children: [(0, import_jsx_runtime.jsx)("input", { id: "ccu-key-input", className: "ccu-input", type: "password", autoComplete: "off", spellCheck: false, placeholder: "user_...", value: draftKey, disabled: keyBusy, onChange: (event) => setDraftKey(event.target.value), onKeyDown: (event) => {
    if (event.key === "Enter")
      void handleSaveKey();
  } }), (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ccu-btn", "data-variant": "primary", disabled: keyBusy, onClick: () => {
    void handleSaveKey();
  }, children: keyBusy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58" })] }), keyError !== null && (0, import_jsx_runtime.jsx)("p", { className: "ccu-keyerror", children: keyError }), keyOk !== null && (0, import_jsx_runtime.jsx)("p", { className: "ccu-keyok", children: keyOk }), state !== null && state.health.status === "unconfigured" && (0, import_jsx_runtime.jsxs)("p", { className: "ccu-hint", children: ["Key \u4FDD\u5B58\u5230\u51ED\u636E\u5F15\u7528 ", (0, import_jsx_runtime.jsx)("code", { children: state.health.apiKeyEnv }), "\uFF1B\u4E5F\u53EF\u5728 Web \u8BBE\u7F6E \u2192 \u6A21\u578B \u4E2D\u4E3A\u300CCommand Code\u300D\u586B\u5199\uFF0C\u4E24\u8005\u7B49\u4EF7\u3002", " ", "\u5728 ", (0, import_jsx_runtime.jsx)("a", { className: "ccu-link", href: "https://commandcode.ai/", target: "_blank", rel: "noopener noreferrer", children: "commandcode.ai" }), " \u521B\u5EFA Key\u3002"] })] }), (0, import_jsx_runtime.jsxs)("footer", { className: "ccu-foot", children: [(0, import_jsx_runtime.jsxs)("span", { className: "ccu-updated", children: [state === null ? "" : `\u66F4\u65B0\u4E8E ${formatRelative(state.usageFetchedAt ?? state.health.fetchedAt, now)}`, hasUsage && state !== null && state.health.status !== "ok" && " \xB7 \u663E\u793A\u4E0A\u6B21\u6570\u636E"] }), (0, import_jsx_runtime.jsxs)("span", { className: "ccu-foot-actions", children: [state !== null && state.health.status !== "unconfigured" && canStoreKey && (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ccu-btn", disabled: keyBusy, onClick: () => {
    void handleClearKey();
  }, title: "\u6E05\u9664\u4FDD\u5B58\u5728 ~/.dsh/.credentials.yaml \u4E2D\u7684 Key", children: "\u6E05\u9664 Key" }), (0, import_jsx_runtime.jsx)("button", { type: "button", className: "ccu-btn", disabled: refreshing, onClick: () => {
    void handleRefresh();
  }, children: refreshing ? "\u5237\u65B0\u4E2D\u2026" : "\u7ACB\u5373\u5237\u65B0" })] })] })] })] });
}
function WindowRow({ window: window2, now }) {
  const tone = percentTone(window2.percent);
  return (0, import_jsx_runtime.jsxs)("div", { className: "ccu-row", children: [(0, import_jsx_runtime.jsx)(Ring, { window: window2, now, size: 46 }), (0, import_jsx_runtime.jsxs)("div", { className: "ccu-row-body", children: [(0, import_jsx_runtime.jsxs)("div", { className: "ccu-row-name", children: [(0, import_jsx_runtime.jsx)("span", { className: "ccu-row-label", children: window2.label }), (0, import_jsx_runtime.jsx)("span", { className: "ccu-row-sub", children: window2.sublabel })] }), (0, import_jsx_runtime.jsxs)("div", { className: "ccu-row-meta", children: [(0, import_jsx_runtime.jsxs)("span", { className: "ccu-row-credits", children: [(0, import_jsx_runtime.jsx)("span", { className: "ccu-row-dot", "data-tone": tone, "aria-hidden": "true" }), "\u5DF2\u7528 ", formatCredits(window2.used), " / ", formatCredits(window2.cap), "\uFF08", Math.round(window2.percent), "%\uFF09"] }), (0, import_jsx_runtime.jsxs)("span", { className: "ccu-row-remain", children: ["\u5269\u4F59 ", formatCredits(window2.remaining)] })] }), (0, import_jsx_runtime.jsxs)("div", { className: "ccu-row-countdown", "data-expired": window2.resetAt !== null && window2.resetAt <= now ? "true" : void 0, children: ["\u91CD\u7F6E\u4E8E ", formatRemaining(window2.resetAt, now)] })] })] });
}
function Ring({ window: window2, now, size = 46 }) {
  const stroke = size >= 44 ? 4.5 : 3.5;
  const timeStroke = size >= 44 ? 2.5 : 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const used = Math.min(100, Math.max(0, window2.percent));
  const quotaLeft = 100 - used;
  const dash = circumference * quotaLeft / 100;
  const ringEmpty = quotaLeft <= 0;
  const ringFull = quotaLeft >= 100;
  const timeRadius = radius - (stroke + timeStroke) / 2;
  const timeCircumference = 2 * Math.PI * timeRadius;
  const remaining = remainingRatio(window2.resetAt, window2.periodMs, now);
  const timeDash = timeCircumference * remaining;
  const timeEmpty = remaining <= 0;
  return (0, import_jsx_runtime.jsxs)("svg", { className: "ccu-ring", width: size, height: size, viewBox: `0 0 ${size} ${size}`, role: "img", "aria-label": `${window2.label} \u5269\u4F59\u989D\u5EA6 ${Math.round(quotaLeft)}%\uFF0C\u7A97\u53E3\u5269\u4F59\u65F6\u95F4 ${Math.round(remaining * 100)}%`, children: [(0, import_jsx_runtime.jsx)("circle", { className: "ccu-ring-track", cx: size / 2, cy: size / 2, r: radius, strokeWidth: stroke, fill: "none" }), (0, import_jsx_runtime.jsx)("circle", { className: "ccu-ring-bar", "data-tone": percentTone(used), cx: size / 2, cy: size / 2, r: radius, strokeWidth: stroke, fill: "none", strokeDasharray: `${dash} ${circumference - dash}`, strokeDashoffset: circumference / 4, strokeLinecap: ringEmpty || ringFull ? "butt" : "round" }), (0, import_jsx_runtime.jsx)("circle", { className: "ccu-ring-time-track", cx: size / 2, cy: size / 2, r: timeRadius, strokeWidth: timeStroke, fill: "none" }), (0, import_jsx_runtime.jsx)("circle", { className: "ccu-ring-time-bar", cx: size / 2, cy: size / 2, r: timeRadius, strokeWidth: timeStroke, fill: "none", strokeDasharray: `${timeDash} ${timeCircumference - timeDash}`, strokeDashoffset: timeCircumference / 4, strokeLinecap: timeEmpty ? "butt" : "round" }), (0, import_jsx_runtime.jsxs)("text", { className: size >= 44 ? "ccu-ring-text" : "ccu-ring-text-sm", x: "50%", y: "50%", dominantBaseline: "central", textAnchor: "middle", children: [Math.round(quotaLeft), "%"] })] });
}

// lib/client/styles.js
var STYLE_TAG_ID = "dsh-command-code-usage/dock.css";
var DOCK_CSS = `
.ccu-dock {
  position: fixed;
  z-index: 60;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.45;
  color: var(--dsw-alias-label-primary, #1f2329);
  pointer-events: none;
}
.ccu-dock[data-positioned='false'] { right: 18px; bottom: 18px; }
.ccu-dock > * { pointer-events: auto; }

/* ---- Badge ------------------------------------------------------------- */
.ccu-badge {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-float, rgba(255, 255, 255, 0.86));
  backdrop-filter: blur(14px) saturate(1.5);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.14);
  cursor: grab;
  user-select: none;
  touch-action: none;
  font: inherit;
  color: inherit;
  transition: box-shadow 0.16s ease, transform 0.16s ease;
}
.ccu-badge:hover { box-shadow: 0 6px 22px rgba(0, 0, 0, 0.2); }
.ccu-badge[data-dragging='true'] { cursor: grabbing; transform: scale(1.03); }
.ccu-badge-text {
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.01em;
  color: var(--dsw-alias-label-secondary, #5b6068);
  white-space: nowrap;
}
.ccu-badge-countdown {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-state-business-primary, #2f6bff);
  white-space: nowrap;
}
.ccu-badge-countdown-icon { font-size: 11px; line-height: 1; }

/* ---- Health dot -------------------------------------------------------- */
.ccu-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #9aa0a8);
}
.ccu-dot[data-state='done'] { background: var(--dsw-alias-state-success-primary, #16a34a); }
.ccu-dot[data-state='ongoing'] {
  background: var(--dsw-alias-state-business-primary, #2f6bff);
  animation: ccu-pulse 1.4s ease-in-out infinite;
}
.ccu-dot[data-state='warning'] { background: var(--dsw-alias-state-warn-primary, #d97706); }
.ccu-dot[data-state='error'] { background: var(--dsw-alias-state-error-primary, #dc2626); }
@keyframes ccu-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

/* ---- Rings ------------------------------------------------------------- */
.ccu-ring { flex: none; display: block; }
.ccu-ring-track { stroke: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)); }
.ccu-ring-bar { stroke: var(--dsw-alias-state-success-primary, #16a34a); transition: stroke-dasharray 0.5s ease; }
.ccu-ring-bar[data-tone='warn'] { stroke: var(--dsw-alias-state-warn-primary, #d97706); }
.ccu-ring-bar[data-tone='danger'] { stroke: var(--dsw-alias-state-error-primary, #dc2626); }
.ccu-ring-time-track { stroke: var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.06)); }
.ccu-ring-time-bar {
  stroke: var(--dsw-alias-state-business-primary, #2f6bff);
  transition: stroke-dasharray 1s linear;
}
.ccu-ring-text {
  font-size: 12px;
  font-weight: 600;
  fill: var(--dsw-alias-label-primary, #1f2329);
  font-variant-numeric: tabular-nums;
}
.ccu-ring-text-sm { font-size: 9.5px; font-weight: 700; fill: var(--dsw-alias-label-primary, #1f2329); }

/* ---- Panel ------------------------------------------------------------- */
.ccu-panel {
  position: absolute;
  bottom: calc(100% + 12px);
  right: 0;
  width: 336px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  border-radius: 14px;
  background: var(--dsw-alias-bg-module-float, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(18px) saturate(1.6);
  -webkit-backdrop-filter: blur(18px) saturate(1.6);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
  animation: ccu-pop-in 0.16s ease-out;
}
.ccu-panel[data-below='true'] { bottom: auto; top: calc(100% + 12px); }
.ccu-panel[data-left='true'] { right: auto; left: 0; }
.ccu-panel[data-closing='true'] { animation: ccu-pop-out 0.13s ease-in forwards; }
@keyframes ccu-pop-in {
  from { opacity: 0; transform: translateY(6px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
@keyframes ccu-pop-out {
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(6px) scale(0.97); }
}
@media (prefers-reduced-motion: reduce) {
  .ccu-panel, .ccu-panel[data-closing='true'] { animation: none; }
  .ccu-ring-bar, .ccu-ring-time-bar { transition: none; }
  .ccu-dot[data-state='ongoing'] { animation: none; }
}

.ccu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.ccu-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12.5px; }
.ccu-logo { color: var(--dsw-alias-brand-primary, #4d6bfe); font-size: 13px; }
.ccu-health {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary, #5b6068);
  background: var(--dsw-alias-bg-module-platform, rgba(0, 0, 0, 0.05));
}
.ccu-health[data-status='ok'] { color: var(--dsw-alias-state-success-primary, #16a34a); }
.ccu-health[data-status='error'] { color: var(--dsw-alias-state-error-primary, #dc2626); }
.ccu-health[data-status='unconfigured'] { color: var(--dsw-alias-state-warn-primary, #d97706); }
.ccu-head-actions { display: flex; align-items: center; gap: 6px; }
.ccu-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6068);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.ccu-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)); }

/* ---- Minimal-mode switch ----------------------------------------------- */
.ccu-minimal {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 6px 2px 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6068);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.ccu-minimal:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)); }
.ccu-minimal-label { white-space: nowrap; }
.ccu-minimal-track {
  position: relative;
  display: inline-block;
  width: 22px;
  height: 12px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.16));
  transition: background-color 0.16s ease;
}
.ccu-minimal[aria-checked='true'] .ccu-minimal-track {
  background: var(--dsw-alias-brand-primary, #4d6bfe);
}
.ccu-minimal-thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 0.16s ease;
}
.ccu-minimal[aria-checked='true'] .ccu-minimal-thumb { transform: translateX(10px); }
@media (prefers-reduced-motion: reduce) {
  .ccu-minimal-track, .ccu-minimal-thumb { transition: none; }
}

/* ---- Account / pool ---------------------------------------------------- */
.ccu-account {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding-bottom: 9px;
  margin-bottom: 9px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.07));
}
.ccu-account-name { font-weight: 600; font-size: 12px; word-break: break-all; }
.ccu-plan {
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-brand-primary, #4d6bfe);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 12%, transparent);
}
.ccu-pool { margin-bottom: 10px; }
.ccu-pool-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}
.ccu-pool-remaining { font-size: 19px; font-weight: 650; font-variant-numeric: tabular-nums; }
.ccu-pool-of { font-size: 11px; color: var(--dsw-alias-label-tertiary, #9aa0a8); }
.ccu-pool-pct { font-size: 11px; color: var(--dsw-alias-label-secondary, #5b6068); font-variant-numeric: tabular-nums; }
.ccu-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.07));
  overflow: hidden;
}
.ccu-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-primary, #16a34a);
  transition: width 0.5s ease, background-color 0.3s ease;
}
.ccu-bar-fill[data-tone='warn'] { background: var(--dsw-alias-state-warn-primary, #d97706); }
.ccu-bar-fill[data-tone='danger'] { background: var(--dsw-alias-state-error-primary, #dc2626); }
.ccu-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 6px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #9aa0a8);
  font-variant-numeric: tabular-nums;
}

/* ---- Window rows ------------------------------------------------------- */
.ccu-windows { display: flex; flex-direction: column; gap: 9px; }
.ccu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.07));
  border-radius: 10px;
  background: var(--dsw-alias-bg-module-platform, rgba(0, 0, 0, 0.02));
}
.ccu-row-body { flex: 1; min-width: 0; }
.ccu-row-name { display: flex; align-items: baseline; gap: 6px; }
.ccu-row-label { font-weight: 600; font-size: 12px; }
.ccu-row-sub { font-size: 9.5px; color: var(--dsw-alias-label-tertiary, #9aa0a8); letter-spacing: 0.02em; }
.ccu-row-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0 8px;
  margin-top: 2px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ccu-row-credits { color: var(--dsw-alias-label-secondary, #5b6068); }
.ccu-row-remain { color: var(--dsw-alias-label-tertiary, #9aa0a8); white-space: nowrap; }
.ccu-row-countdown { color: var(--dsw-alias-state-business-primary, #2f6bff); font-size: 10.5px; }
.ccu-row-countdown[data-expired='true'] { color: var(--dsw-alias-label-tertiary, #9aa0a8); }
.ccu-row-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  vertical-align: 1px;
  background: var(--dsw-alias-state-success-primary, #16a34a);
}
.ccu-row-dot[data-tone='warn'] { background: var(--dsw-alias-state-warn-primary, #d97706); }
.ccu-row-dot[data-tone='danger'] { background: var(--dsw-alias-state-error-primary, #dc2626); }

/* ---- Notes / errors ---------------------------------------------------- */
.ccu-note {
  padding: 9px 10px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary, #5b6068);
  background: var(--dsw-alias-bg-module-platform, rgba(0, 0, 0, 0.04));
}
.ccu-note[data-variant='error'] {
  color: var(--dsw-alias-state-error-primary, #dc2626);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #dc2626) 9%, transparent);
}
.ccu-note[data-variant='info'] {
  color: var(--dsw-alias-state-business-primary, #2f6bff);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #2f6bff) 9%, transparent);
}
.ccu-note-title { font-weight: 600; margin-bottom: 3px; }
.ccu-note + .ccu-note, .ccu-note + .ccu-keyform, .ccu-windows + .ccu-note { margin-top: 9px; }
.ccu-hint { margin-top: 6px; color: var(--dsw-alias-label-tertiary, #9aa0a8); font-size: 10.5px; }
.ccu-hint-item {
  margin-top: 2px;
  padding-left: 7px;
  border-left: 2px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  word-break: break-word;
}

/* ---- Key entry --------------------------------------------------------- */
.ccu-keyform {
  margin-top: 9px;
  padding: 9px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12));
  border-radius: 9px;
}
.ccu-keyform-label {
  display: block;
  margin-bottom: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary, #5b6068);
}
.ccu-keyform-row { display: flex; gap: 6px; }
.ccu-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.14));
  border-radius: 7px;
  background: var(--dsw-alias-bg-module-float, #fff);
  color: var(--dsw-alias-label-primary, #1f2329);
  font: inherit;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.ccu-input:focus {
  outline: none;
  border-color: var(--dsw-alias-brand-primary, #4d6bfe);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 22%, transparent);
}
.ccu-btn {
  padding: 5px 10px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.14));
  border-radius: 7px;
  background: var(--dsw-alias-bg-module-float, #fff);
  color: var(--dsw-alias-label-primary, #1f2329);
  font: inherit;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.ccu-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)); }
.ccu-btn:disabled { opacity: 0.55; cursor: default; }
.ccu-btn[data-variant='primary'] {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary, #4d6bfe);
  color: #fff;
}
.ccu-btn[data-variant='primary']:hover:not(:disabled) {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 86%, #000);
}
.ccu-keyerror { margin-top: 6px; font-size: 10.5px; color: var(--dsw-alias-state-error-primary, #dc2626); }
.ccu-keyok { margin-top: 6px; font-size: 10.5px; color: var(--dsw-alias-state-success-primary, #16a34a); }

/* ---- Footer ------------------------------------------------------------ */
.ccu-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.07));
}
.ccu-updated { font-size: 10px; color: var(--dsw-alias-label-tertiary, #9aa0a8); }
.ccu-foot-actions { display: flex; align-items: center; gap: 6px; }
.ccu-link {
  font-size: 10.5px;
  color: var(--dsw-alias-state-business-primary, #2f6bff);
  text-decoration: none;
  white-space: nowrap;
}
.ccu-link:hover { text-decoration: underline; }
`;
function injectDockStyles() {
  if (typeof document === "undefined")
    return null;
  if (document.querySelector(`style[data-plugin-css="${STYLE_TAG_ID}"]`) !== null)
    return null;
  const tag = document.createElement("style");
  tag.dataset.plugin = "dsh-command-code-usage";
  tag.dataset.pluginCss = STYLE_TAG_ID;
  tag.textContent = DOCK_CSS;
  document.head.appendChild(tag);
  return tag;
}

// lib/client/index.js
var inject = [];
var OVERLAY_SLOT = "shell.overlay";
function mountStyles() {
  return injectDockStyles();
}
function mountIntoOverlay(ctx) {
  const slots = ctx.get("slots");
  if (slots === void 0 || typeof slots.inject !== "function" || typeof slots.register !== "function") {
    return void 0;
  }
  try {
    return slots.inject(OVERLAY_SLOT, () => {
      const dispose = slots.register({
        name: OVERLAY_SLOT,
        id: "command-code-usage-dock",
        order: 40
      }, () => (0, import_react2.createElement)(UsageDock));
      return dispose;
    });
  } catch (error) {
    ctx.logger.warn(`command-code-usage: overlay slot registration failed, using a body portal: ${String(error)}`);
    return void 0;
  }
}
function mountPortal(ctx) {
  const host = document.createElement("div");
  host.dataset.commandCodeUsageHost = "";
  document.body.appendChild(host);
  const root = (0, import_client.createRoot)(host);
  root.render((0, import_react2.createElement)(UsageDock));
  return () => {
    root.unmount();
    host.remove();
  };
}
function apply(ctx) {
  ctx.effect(() => {
    const overlayDispose = mountIntoOverlay(ctx);
    const disposeDock = overlayDispose ?? mountPortal(ctx);
    const styleTag = mountStyles();
    return () => {
      disposeDock();
      styleTag?.remove();
    };
  }, "command-code-usage: dock");
}
return module.exports; } });
//# sourceMappingURL=client.js.map
