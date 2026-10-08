/** PostCSS config — REQUIRED for Tailwind to compile.
 *  Without this file, `@tailwind utilities` is never processed and
 *  the site ships without its utility classes (layout collapses).
 *  This was missing from the original scaffold — see decision log. */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
