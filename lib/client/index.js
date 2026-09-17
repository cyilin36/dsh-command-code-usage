/**
 * Browser plugin for the Command Code usage dock.
 *
 * Registers into the shell's `shell.overlay` slot — the documented additive,
 * frame-wide floating seat — and falls back to a body portal when that seat is
 * absent (an older shell, or a composition without the layout plugin). Both
 * paths dispose through `ctx.effect`, so an unloaded or hot-reloaded plugin
 * leaves no dock and no listener behind.
 *
 * The dock polls this plugin's own host routes, so no Cordis service beyond
 * the slot registry is required.
 * @module dsh-command-code-usage/client
 */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { UsageDock } from "./UsageDock.js";
import { injectDockStyles } from "./styles.js";
/** Cordis services this plugin needs; `slots` is optional and probed with `ctx.get`. */
export const inject = [];
/** The slot this dock prefers; see `dsh-client-ui-layout`'s SlotMap. */
const OVERLAY_SLOT = 'shell.overlay';
/** Inject the dock stylesheet; returns the tag this call owns, if any. */
function mountStyles() {
    return injectDockStyles();
}
/**
 * Mount the dock into the shell overlay when the slot registry is present.
 * @param ctx - client root context.
 * @returns a disposer removing the registration, or `undefined` when the seat
 *   is unavailable so the caller can fall back to a portal.
 */
function mountIntoOverlay(ctx) {
    const slots = ctx.get('slots');
    if (slots === undefined || typeof slots.inject !== 'function' || typeof slots.register !== 'function') {
        return undefined;
    }
    try {
        // `slots.inject` waits for the declaring plugin's activation, so
        // registration order relative to the layout plugin is not constrained.
        return slots.inject(OVERLAY_SLOT, () => {
            const dispose = slots.register({
                name: OVERLAY_SLOT,
                id: 'command-code-usage-dock',
                order: 40,
            }, () => createElement(UsageDock));
            // The registration's own disposer is what `inject` must yield.
            return dispose;
        });
    }
    catch (error) {
        ctx.logger.warn(`command-code-usage: overlay slot registration failed, using a body portal: ${String(error)}`);
        return undefined;
    }
}
/**
 * Fallback mount: a body portal. Used only when the overlay seat is
 * unavailable, so the dock is never silently missing.
 * @param ctx - client root context.
 * @returns the disposer unmounting the portal.
 */
function mountPortal(ctx) {
    const host = document.createElement('div');
    host.dataset.commandCodeUsageHost = '';
    document.body.appendChild(host);
    const root = createRoot(host);
    root.render(createElement(UsageDock));
    return () => {
        root.unmount();
        host.remove();
    };
}
/**
 * Mount the floating dock. The whole surface is registered as one effect, so
 * plugin unload removes the dock and its stylesheet together.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => {
        const overlayDispose = mountIntoOverlay(ctx);
        const disposeDock = overlayDispose ?? mountPortal(ctx);
        const styleTag = mountStyles();
        return () => {
            disposeDock();
            // Only the tag this activation created is removed; a tag left by another
            // (still-live) instance is that instance's to own.
            styleTag?.remove();
        };
    }, 'command-code-usage: dock');
}
