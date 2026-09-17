/**
 * Dock stylesheet, injected once as a `<style>` tag.
 *
 * A plain CSS string rather than a CSS module: the dock is the only styled
 * surface in this plugin, so a module pipeline would add a build dependency
 * for no isolation benefit — every class is namespaced with the `ccu-` prefix
 * instead. Colours follow the DSH `--dsw-alias-*` design tokens so the dock
 * blends with either theme, with literal fallbacks for the (unlikely) case the
 * shell does not define them.
 * @module dsh-command-code-usage/client/styles
 */
/** Marker attribute making the injection idempotent across HMR reloads. */
const STYLE_TAG_ID = 'dsh-command-code-usage/dock.css';
/** The complete dock stylesheet. */
export const DOCK_CSS = `
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
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.ccu-row-credits { color: var(--dsw-alias-label-secondary, #5b6068); }
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
/**
 * Inject {@link DOCK_CSS} into the document head, once.
 *
 * Idempotent by marker attribute so a hot reload cannot stack duplicate
 * stylesheets, and a no-op outside a browser (SSR/type-check).
 * @returns the style element this call owns, or `null` when one already
 *   existed (in which case its owner is responsible for removing it).
 */
export function injectDockStyles() {
    if (typeof document === 'undefined')
        return null;
    if (document.querySelector(`style[data-plugin-css="${STYLE_TAG_ID}"]`) !== null)
        return null;
    const tag = document.createElement('style');
    tag.dataset.plugin = 'dsh-command-code-usage';
    tag.dataset.pluginCss = STYLE_TAG_ID;
    tag.textContent = DOCK_CSS;
    document.head.appendChild(tag);
    return tag;
}
