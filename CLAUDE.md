# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Angular 19 app based on the **Fuse** admin template (`fuse-angular` v21). Standalone-components, signals-friendly, Angular Material + Tailwind. No README/LICENSE present (both deleted in working tree).

## Commands

- `npm start` — dev server (`ng serve`).
- `npm run build` — production build to `dist/fuse`.
- `npm run watch` — dev build with watch.
- `npm test` — Karma + Jasmine. No `lint` script wired; project uses Prettier (`prettier-plugin-organize-imports`, `prettier-plugin-tailwindcss`).
- Single test: `ng test --include src/path/to/file.spec.ts` (most files generated with `skipTests: true`, so specs are sparse).
- Translations: `transloco.config.js` drives `@jsverse/transloco`; translation JSON loaded via `TranslocoHttpLoader`.

## Architecture

### Bootstrapping
- `src/main.ts` → `bootstrapApplication(AppComponent, appConfig)`.
- `src/app/app.config.ts` is the single provider root: HTTP, router (with in-memory scrolling), Material Luxon date adapter, Transloco, `provideAuth()`, `provideIcons()`, and `provideFuse({ mockApi, fuse })`.
- `provideFuse` (from `src/@fuse/fuse.provider.ts`) wires the Fuse framework: layout/scheme/theme, screen breakpoints, and the **MockApi** subsystem.

### Routing & layout
- `src/app/app.routes.ts` — all top-level routes funnel through `LayoutComponent` (`src/app/layout/`) with `data.layout` selecting an empty/horizontal/vertical layout under `src/app/layout/layouts/`.
- Lazy feature modules live under `src/app/modules/{admin,auth,landing}/...` and are loaded via `loadChildren: () => import(...routes)`.
- Auth gating: `AuthGuard` / `NoAuthGuard` in `src/app/core/auth/guards/`. Authed admin tree also runs `initialDataResolver` from `app.resolvers.ts` to prime navigation/user/notifications/etc.

### Auth
- `src/app/core/auth/auth.service.ts` keeps `accessToken` in `localStorage`. `auth.interceptor.ts` attaches bearer + handles 401. Backend endpoints are stubbed by `mock-api/common/auth`.

### MockApi (important)
- `src/app/mock-api/index.ts` (`MockApiService`) injects every mock-api class under `mock-api/{apps,common,dashboards,pages,ui}`. Each registers HTTP route handlers with the Fuse MockApi service at construction time.
- Real backends should replace these handlers; until then HTTP calls (including auth) are intercepted in-browser.

### Fuse framework (`src/@fuse/`)
- Self-contained framework folder: `components/`, `directives/`, `pipes/`, `services/` (config, media-watcher, navigation, splash-screen, mock-api), `animations/`, `validators/`, `styles/` (Tailwind + theme SCSS), `tailwind/`. Treat as vendor-ish — extend rather than rewrite. Theme list and active theme are configured in `appConfig`'s `provideFuse({ fuse: { themes, theme, scheme, layout } })`.

### Styles
- Tailwind 3 via `tailwind.config.js`; Fuse adds extra Tailwind plugins under `src/@fuse/tailwind/` and global SCSS in `src/@fuse/styles/` (`tailwind.scss`, `themes.scss`, `main.scss`). Global styles list in `angular.json` `architect.build.options.styles`.

### Path aliases
- `app/*` and `@fuse` resolve via `tsconfig.json` paths; prefer them over relative imports.

### Assets / deploy
- Static assets live in `public/`. `src/_redirects` is copied to root of `dist/` (Netlify-style SPA fallback).
- Production budgets: 5mb initial / 90kb per-component style (`angular.json`).
