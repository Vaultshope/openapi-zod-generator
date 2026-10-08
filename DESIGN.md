# 🎨 Design System & UX Documentation

The design language of the OpenAPI → Zod Generator. Everything a contributor (or future you) needs to understand *why* the UI looks and behaves the way it does.

---

## 1. Design principles

1. **The tool is the hero.** No marketing sections above the workspace — the editor starts immediately. A visitor can generate code within 5 seconds of landing.
2. **Dark-first.** Developers live in dark editors; dark is the default and the polished path. Light mode is a first-class sibling, not an afterthought.
3. **Content is chrome.** Panels are calm, low-contrast surfaces so generated *code* is the most saturated thing on screen. One brand gradient, used sparingly.
4. **Honest states.** Empty, loading, error and warning states are designed — the spec can fail, and the UI should tell you clearly when it does.

---

## 2. Brand

- **Mark:** a lightning bolt (`Zap`) on an indigo → violet gradient tile. Also the favicon (`src/app/icon.svg`).
- **Gradient:** `#6366f1` (indigo-500) → `#8b5cf6` (violet-500), 135°. Used for: logo tile, Generate button, empty-state icon tile, and the single gradient word ("Zod") in the title. **Never** for body text or large surfaces.
- **Voice:** technical and confident. UI copy names exact Zod APIs (`z.discriminatedUnion()`, `z.lazy()`).

---

## 3. Color tokens

HSL channels in `globals.css`, consumed via Tailwind (`hsl(var(--x))`). Palette base: **zinc** neutrals + **indigo/violet** brand.

| Token | Light | Dark (default) | Used for |
|-------|-------|----------------|----------|
| `--background` | `60 9% 98%` (stone-50) | `240 10% 4%` (zinc-950) | Page canvas |
| `--card` | `0 0% 100%` | `240 8% 7%` | Panels, toolbar, tiles |
| `--foreground` | `240 6% 10%` | `240 5% 96%` | Primary text |
| `--muted` | `240 5% 96%` | `240 4% 16%` | Tab strips, chrome bars |
| `--muted-foreground` | `240 4% 46%` | `240 5% 65%` | Secondary text, labels |
| `--primary` | `243 75% 59%` (indigo-600) | `234 89% 74%` (indigo-400) | Actions, icons, focus |
| `--border` | `240 6% 90%` | `240 4% 16%` | All borders |
| `--destructive` | `0 84% 60%` | `0 84% 70%` | Errors only |
| `--ring` | = primary | = primary | Focus rings |
| `--radius` | `0.625rem` | | Corners (lg/md/sm derive from it) |

**Contrast:** dark-mode `muted-foreground` (zinc-400 on zinc-950) and light-mode equivalent both clear WCAG AA for text at UI sizes.

**Ambient glow:** `body` carries a radial gradient — `hsl(var(--primary) / 0.06)` fading to transparent over the top 24rem. It anchors the workspace without competing with content.

---

## 4. Typography

- **Family:** Inter (`layout.tsx`, `display: swap`), system fallback.
- **Scale:** `text-lg` title · `text-sm` panel headings & controls · `text-xs` labels/badges · code always Monaco 13px.
- **Weight:** headings `font-bold`/`font-semibold`; chrome labels `font-medium` + `uppercase tracking-wider` (the "Outputs" label, language badges).

---

## 5. Theming

| Concern | Implementation |
|---------|----------------|
| Strategy | Class-based (`darkMode: 'class'`), `.dark` on `<html>` |
| Default | Dark |
| Persistence | `localStorage.theme` |
| No-flash | Inline `<script>` in `layout.tsx` runs before hydration; removes `.dark` only if stored value is `light` |
| Monaco sync | The toggle feeds `vs-dark`/`vs` to every editor instance |
| Native UI | `color-scheme` set per theme so scrollbars/inputs match |

The toggle shows the icon of the theme you'd **switch to** (sun in dark mode). `suppressHydrationWarning` on `<html>` covers the class mutation.

---

## 6. Component inventory

### Header
Sticky, `bg-background/80` + `backdrop-blur-md`. Contains (left→right): logo tile, title with gradient "Zod", tagline (hidden < `sm`), GitHub link, theme toggle. Icon buttons: `p-2 rounded-lg`, muted → hover accent, `focus-visible:ring-2`.

### How-it-works strip (the in-app guide)
Sits directly under the header, above the toolbar — the "manual" a first-time visitor reads in 10 seconds. Centered `max-w-3xl` headline (with the one gradient phrase "production-ready code"), then three numbered step cards (`sm:grid-cols-3`, stacked on mobile): **Paste → Generate → Copy**, each with a one-line description. Below, a centered row of six output chips (Zod, Types, RHF, TanStack, MSW, Faker) with primary-tinted icons — so "what does it produce" is answered without clicking anything. Copy is verb-first and specific; it names exact things, not marketing adjectives.

### Toolbar — output toggles
Each option is a **switch chip**: pill button with `role="switch"` + `aria-checked`, containing a mini track (h-4 w-7) with a sliding dot. On: `border-primary/40 bg-primary/10`; off: muted with `hover:border-primary/30`. The whole chip is the hit target (bigger than a native checkbox, obviously interactive).

### Generate button
The single gradient CTA (`from-indigo-500 to-violet-500`, matching shadow tint). Includes an embedded `Ctrl ↵` kbd hint (hidden < `sm`), `active:scale-[0.98]` press feedback, spinner while generating. **Shortcut is global** — `Ctrl/⌘ + Enter` anywhere triggers it.

### Workspace (split view)
`lg:grid-cols-2`, min-height 560px. Input panel heading carries a primary-tinted mini icon tile (`FileText`); output panel the same (`Code2`). The input panel doubles as a **drop zone** for `.yaml`/`.json` files (drag-over highlights with `ring-2 ring-ring`), with a **Share** button (copies a URL with the deflate+base64url spec in the hash — flips to a green ✓ for 2s) and an **Upload** icon button next to Generate. After generating, the output heading shows a **Download all** button (zip of every file), a **stats line** — `3 schemas · 3 operations · 12 ms` — in muted text, and error/warning count pills.

### Shareable URLs (state in the hash)
Opening `#spec=…` decodes and loads the spec, then auto-generates — no button needed. Encoding: `deflate` via `CompressionStream`, base64url, prefixed `z` (compressed) or `n` (raw fallback for ancient browsers). This keeps the app 100% static: the link *is* the payload, there is no server to send it to.

### Output tabs
One cohesive card: tab strip (`role="tablist"`, `role="tab"`, `aria-selected`) on a muted bar; active tab pops with `bg-background shadow-sm`. `CodeEditor` renders inside with `bordered={false}` — the card owns the chrome. Tabs only appear when their output exists; Zod + Types are always present.

### CodeEditor
Monaco in a bordered card; chrome bar with language badge + copy (✓ turns green 2s) + download. `focus-within:ring-2 ring-ring/30` shows which surface is active.

### Empty state
Dashed border (signals "fillable"), gradient-tinted bolt tile, one instruction line, and the keyboard hint. Never a blank panel.

### Feature cards
Three tiles (unions / formats / refs) with `hover:-translate-y-0.5 hover:border-primary/40` lift, icon tile tints deeper on hover. Enter with `animate-fade-in-up`.

### Footer
Privacy promise (client-side) left, repo link + stack right; collapses to centered column on mobile.

---

## 7. Interactions & motion

| Interaction | Feedback |
|-------------|----------|
| Generate (Ctrl+↵) | Button → spinner + "Generating…"; shortcut works from any focus |
| Copy | Icon flips to green ✓ for 2s |
| Hover (cards, chips, icon buttons) | Border/bg tint shifts, 150–200ms |
| Press (buttons) | `active:scale-[0.98]` |
| Focus | `focus-visible:ring-2 ring-ring` — keyboard only, never on click |
| Section reveal | Feature cards fade-in-up 400ms, once |

Motion stays under 250ms and never loops — this is a tool, not a demo.

---

## 8. Accessibility checklist

- ✅ Switch chips: `role="switch"` + `aria-checked` + real `<button>` hit targets
- ✅ Tabs: `role="tablist"` / `role="tab"` / `aria-selected`
- ✅ Icon-only buttons carry `aria-label` (theme toggle, GitHub, copy, download)
- ✅ Theme toggle announces destination state ("Switch to light theme")
- ✅ All interactive elements reachable and visible via keyboard (`focus-visible` rings)
- ✅ Errors use icon + text, never color alone
- ✅ `color-scheme` follows theme; native controls match
- ⚠️ Tab strip lacks full arrow-key roving focus (frozen-scope tradeoff; tabs are regular buttons, so Tab/Shift+Tab works)

---

## 9. Layout & responsive behavior

**Centering.** All chrome (header, main, footer) is constrained to `max-w-7xl` (80rem) and centered — on a 4K monitor the dashboard floats with breathing room instead of stretching edge-to-edge. Headline blocks inside it narrow further to `max-w-3xl`/`max-w-2xl` so text never sprawls.

**Breakpoints.**

| Viewport | Layout |
|----------|--------|
| `< 640px` (phone) | Single column. Guide steps stack; workspace panels stack vertically with `h-[60vh] min-h-[420px]` editors (comfortable thumb-scrolling room); tagline + kbd hints + "(YAML or JSON)" hidden; title shrinks to `text-base`; toolbar chips wrap; tabs scroll horizontally |
| `≥ 640px` (sm) | Steps go 3-across; panel subtitles return |
| `≥ 768px` (md) | Feature cards go 3-across; "Outputs" label appears |
| `≥ 1024px` (lg) | **The real dashboard:** side-by-side split at `h-[calc(100vh-340px)]`, kbd hint in toolbar, per-panel min-heights reset (`lg:min-h-0`) |
| `≥ 1280px` (xl+) | Just more centered whitespace — nothing stretches |

**Mobile-first choices worth noting:**
- Stacked panels get *fixed* comfortable heights rather than sharing a viewport calc — a `calc(100vh-340px)` split across two panels is unreadable on a phone.
- The Generate button keeps its label on phones (icon-only buttons lose meaning); only the decorative `Ctrl ↵` kbd hides.
- The sticky header keeps its backdrop blur on mobile, so the workspace scrolls under it cleanly.
- Everything remains usable without a keyboard: chips, buttons and tabs are ≥32px touch targets.

## 10. File map

| File | Role |
|------|------|
| `src/app/globals.css` | All design tokens + utilities (`.text-gradient`, body glow) |
| `tailwind.config.ts` | `darkMode: 'class'`, token→class mapping, `fade-in-up` keyframe |
| `src/app/layout.tsx` | Font, metadata/OG, `themeColor`, no-flash script |
| `src/app/page.tsx` | Layout + all presentational components (documented inline) |
| `src/components/Editor.tsx` | CodeEditor / OutputTabs |
| `src/app/icon.svg` | Favicon / logo source |
