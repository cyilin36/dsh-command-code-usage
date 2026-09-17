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
import type { ReactElement } from 'react';
import { type WindowView } from './usage-model.ts';
/** Root state: the dock itself. */
export declare function UsageDock(): ReactElement;
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
export declare function Ring({ window, now, size }: {
    window: WindowView;
    now: number;
    size?: number;
}): ReactElement;
