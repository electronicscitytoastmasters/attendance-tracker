/**
 * config.js — App-wide configuration
 * =====================================
 * ADMIN_PIN: Change this to a PIN only the secretary knows.
 *
 * IMPORTANT: If your GitHub repository is public, consider making
 * this repository private so members can't read this file.
 * For a private repo, a plain PIN here is perfectly fine.
 *
 * To change the PIN: update ADMIN_PIN below, redeploy to GitHub Pages.
 */

export const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "1234";
