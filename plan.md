# plan.md — VO2 Max Coach TypeScript Migration (safe, no feature loss)

## Objectives
- Keep all current functionality: workout timing/phases, BLE HR, IndexedDB summaries & HR samples, SISU connect/send, voice prompts, wake lock, HR target coloring/pulse timeout, PWA install/update banner, offline cache, data.json-driven plans, variant selection, modals/lists/downloads.
- Improve modularity: clear domain types, services with minimal public surface, UI modules instead of globals, fewer cross-file dependencies.
- Deliver TypeScript build without changing behavior.

## Constraints & Guardrails
- Preserve localStorage keys, IndexedDB schema (stores/workouts/hr_samples/sisu_settings), service worker cache key derivation from `APP_VERSION`, `data.json` shape, DOM IDs/classes, inline assets, and current UX flows (start/pause/resume, cancel, restart, completion, delete/download, install prompt).
- No backend changes; SISU endpoints stay REST (health, workout/ingest).
- Keep PWA behavior: skip waiting flow, update banner, install prompt, offline-first caching, version.js as single source of truth.
- Keep BLE request filters and heart icon animations/timeout logic.

## Inventory (baseline)
- Entry: `index.html` with inline handlers; scripts: version, wake-lock, workout-storage, zone-calculator, workout-summary, workout-data, workout-logic, profile, voice, sisu-sync, ui-controls, main, pwa-install; service worker `sw.js`; assets/icons/data.json.
- Globals relied upon across files (must be re-exposed): `APP_VERSION`, `initDB/storeHrSample/getHrSamples/storeWorkoutSummary/clearHrSamples/getAllWorkoutSummaries/deleteWorkoutSummary/storeSisuSettings/getSisuSettings/clearSisuSettings`, `generateWorkoutSummary/emitWorkoutSummary/generateUUID`, `calculateZoneMinutes/determinePrimaryZone/mapHrToZone`, `requestWakeLock/releaseWakeLock`, `connectSISU/disconnectSISU/updateSISUStatus/loadSisuSettings/sendWorkoutToSisu`, `announcePhaseIfChanged/resetVoiceState`, `getSelectedDay/setSelectedDay/connectHr/updateHeartPulse/updateHeartColor`, `switchTab`, modal helpers, install helpers, etc.

## Migration Steps
1) Tooling & structure
   - Add `package.json` with `typescript`, `tslib`, `esbuild` or `vite` not required yet; `npm scripts`: `build` (tsc), `check` (tsc --noEmit), `serve` (http-server or `npx serve` optional).
   - Add `tsconfig.json` targeting ES2019, DOM libs, module `es6`, outDir `dist`, rootDir `src`, `allowJs` false, `strict` true but start with `strict` false then tighten per file; `resolveJsonModule` true.
   - Move JS into `src/` as TS modules; emit to `dist/` keeping filenames stable for SW cache.

2) Define domain types & shared utilities
   - Types: Profile, WorkoutPhase, WorkoutPlanDay, WeeklyPlan, HrTargetSet, SessionIds, HrSample, ZoneMinutes, WorkoutSummary, SisuSettings, ConnectionState.
   - Utility modules: `dateTime` (todayName, ISO formatting), `duration`, `hrv placeholder`, `uuid`, `storageKeys`, `dom` helpers.

3) Services (logic, pure functions)
   - `planService`: load/transform `data.json`, variant selection, hrTargets/workoutMetadata state getters.
   - `workoutLogic`: timing/phase calc, pause/resume/start/restart, HR target text, BLE parse, ring math, wake-lock hooks injected.
   - `zoneService`: mapHrToZone/calculateZoneMinutes/determinePrimaryZone.
   - `summaryService`: build/validate summary, emit (calls storage) — preserve invariants and stale-session guard.
   - `storageService`: IndexedDB wrapper with same stores/API; keep key names and schemas.
   - `sisuService`: host cleaning, protocol detection, health check, ingest; keep guardrails.
   - `pwaInstall`: service-worker registration/update notification/install prompt.

4) UI modules
   - `ui/daySelector`, `ui/phaseDisplay`, `ui/heartDisplay`, `ui/workoutBlocks`, `ui/modals`, `ui/workoutList`, `ui/preferences`, `ui/installTab`, `ui/toast`.
   - Replace inline `onclick` with registered listeners in `main.ts`; expose required functions on `window` for HTML/service worker interactions.
   - Maintain DOM IDs/classes to avoid CSS/HTML changes.

5) Entry point & globals
   - `main.ts` wires: load profile, cleanup stale sessions, initialize plan, set interval update, hook modals, tabs, buttons, start/pause/resume, HR connect, SISU connect, install prompt, etc.
   - Re-export specific functions to `window` to preserve external calls (SW messages, install prompt buttons, BLE connect from Settings, etc.).

6) Service Worker & assets
   - Keep `sw.ts` (or JS) consuming `APP_VERSION` from built `version.js`; ensure cache list references built `dist` files; preserve network-first HTML, cache-first assets, skip-waiting message, cross-origin bypass.
   - Update `index.html` script tags to point to `dist` outputs while keeping load order; consider `type="module"` if supported, else bundle to plain IIFE per file.

7) Validation
   - `npm run build` (tsc) and adjust types until clean; ensure emitted JS matches current behavior (no functional changes).
   - Manual checklist: start/pause/resume; cancel/restart emits summary once; completion emits and sets summary_emitted; HR live pulse + timeout clears; warmup/interval labels and HR target text correct; wake lock resumes after visibility; SISU connect + send happy/failed paths; workout list swipe/delete/send; download JSON; install prompt & update banner; offline load via SW; data.json variant selection stable; stale session cleanup on load; version displayed.

8) Rollback/compat
   - Keep original assets untouched until build proven; can ship side-by-side `dist/` while HTML references updated last.

## Deliverables
- `plan.md` (this file), `package.json`, `tsconfig.json`, `src/*` TS modules, updated `index.html`, `sw.(ts/js)` and build artifacts in `dist/`.
