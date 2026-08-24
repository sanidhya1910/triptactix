import { Newsreader } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

/**
 * Geist ships its font files inside the npm package, so it needs no build-time
 * network fetch. That sidesteps the Google Fonts + Turbopack problem this file
 * previously worked around by falling back to system fonts entirely.
 *
 * Newsreader is the editorial display face. It is used only for the hero H1 and
 * section H2s, never for UI chrome, controls, or app screens.
 */
export const displayFont = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});

export const sansFont = GeistSans;
export const monoFont = GeistMono;

/** Applied to <html> so the CSS variables resolve for the whole document. */
export const fontClassNames = [
  GeistSans.variable,
  GeistMono.variable,
  displayFont.variable,
].join(' ');
