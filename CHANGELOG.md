# Changelog — Paplitz

All notable changes, new features, bug fixes, and UX improvements to the Paplitz perspective simulator are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — 2026-10-01

### Added
- **Dedicated Project Changelog (`CHANGELOG.md`)**: Comprehensive project tracking document detailing all architectural updates, UX redesigns, and bug fixes directly in the repository.

---

## [0.1.2] — 2026-09-30

### Added
- **🎯 Daily Challenge / Habit Set System**:
  - Mini-set workflow inspired by physical A4 perspective practice sheets (12-exercise default preset).
  - Customizable exercise counts: quick preset chips for **6**, **12 (Recommended)**, **18**, **24**, plus custom numeric input up to 30.
  - **Level Filtering**: Option to practice **Random** (across unlocked levels) or choose **Specific Levels** via multi-select checklist (strictly restricted to passed/unlocked levels).
  - **Live HUD & Progress Bar**: Real-time problem indicator (`🎯 RETO DIARIO: Ejercicio 3 de 12`) and progress tracking during drawing.
  - **A4-Style Completed Sets History**: Dedicated "Historial" tab displaying all completed sets with date, average mark, and the full breakdown of individual marks (`#1: 90%`, `#2: 85%`, etc.) matching physical sheet scans.
  - **Set Completion Celebration Modal**: Displays final average score, pass rate, individual 12-cell score grid, and awards a **+50 XP Habit Bonus**.
  - Local state persistence: active set progress is saved to `localStorage` (`paplitz_active_daily_set`) so accidental page refreshes never erase progress.
- **🔔 Lightweight Toast Notification System (`TinyToast.tsx`)**:
  - Replaced intrusive, full-screen blocking modals with compact ink-styled toast banners.
  - Non-blocking notifications for level progression (`🎯 Racha de Maestría: 2/3 (≥90%)`), level unlocks (`✨ ¡Nivel 1.2 Superado!`), and daily practice milestones (`🔥 ¡Racha Diaria: 3 días!`).
  - Auto-dismisses after 4.5 seconds or can be closed immediately.
- **👁️ Post-Validation Layer Visibility Toggles**:
  - Added dedicated toggle buttons once an exercise is evaluated: **"Mi dibujo"** (show/hide user strokes) and **"Solución"** (show/hide theoretical geometric cube).
  - Allows students to isolate their graphite strokes against clean paper or overlay theoretical lines for comparative analysis.
- **📝 Evaluator Debug Report Notes**:
  - Added an interactive note field in the cube diagnosis modal (`userNote`), embedded directly into exported JSON slugs and clipboard markdown reports.
- **🔥 Daily Streak Tracking System (`streakSystem.ts`)**:
  - Consecutive calendar day tracking with local timezone normalization.
  - Visual 7-day timeline modal accessible by clicking the flame icon in the top header.

### Changed & Re-architected
- **📐 Practice Workspace Layout (Balanced 3-Column Grid)**:
  - **Left Side**: Daily Challenge Panel positioned high up near the top (`order-2 lg:order-1`).
  - **Center**: Drawing Canvas mathematically centered with locked proportions.
  - **Right Side**: Sensei Cubo avatar positioned lower on its own side (`order-3 lg:order-3`).
  - **Mobile Vertical Layout**: Elements stack strictly with the challenge positioned **above** the cube (`Canvas` $\rightarrow$ `Daily Challenge` $\rightarrow$ `Sensei Cubo`), ensuring the challenge is always upper than the avatar.
  - Added `data-no-cubito="true"` obstacle collision detection so Cubito never overlaps the challenge panel while remaining freely draggable across the screen.
- **🏆 Strict Sequential Level Mastery (3 Consecutive Cubes ≥ 90%)**:
  - Unlocking a new level now requires completing **at least 3 cubes in a row with a score of 90% or higher** on the current active level.
  - Added live 3-box progress indicator beside the lesson selector: `Maestría: [✓] [✓] [ ] (2/3)`.
  - Scores below 90% reset the consecutive streak to 0/3.
  - **Inferior / Completed Level Isolation**: Practicing an already completed level (e.g. 1.1) only updates that level's personal best score and awards normal XP. It **strictly cannot unlock or jump subsequent levels**.
  - Automatic curriculum state sanitization on load to heal any skipped or out-of-order levels.
- **🛡️ Silent Daily Streak Updates**:
  - The fire streak modal no longer unexpectedly pops up during drawing exercises.
  - Daily streak increments silently in the header (`🔥 3`), and the detailed 7-day timeline only opens when clicking the header flame.
- **🧹 Toolbar Layout Bounds**:
  - Reorganized post-validation controls into two clean rows so the "Siguiente" button always remains strictly within the bounds of the drawing box.

### Fixed
- **🛡️ Accidental Zero-Score Guard**:
  - Blocked the "Comprobar" action when no valid strokes have been drawn (`countDetectedAristas(strokes) === 0`), preventing accidental 0% submissions from dropping user statistics.
- **📱 1-Finger Touch & Vertical Scroll on Mobile**:
  - Added `touchMode` toggle (`draw` vs `scroll`) and automatic scroll enablement post-validation so users on vertical mobile screens can scroll down to inspect results using a single finger.

---

## [0.1.1] — 2026-09-27

### Added
- **🐧 Linux Desktop Distribution Support**:
  - Added native build scripts and Electron configuration for Linux packages: `.AppImage`, `.deb`, and `tar.gz`.
- **📱 Android APK & Landscape Orientation Locking**:
  - Configured Capacitor orientation locking to force landscape mode during full-screen drawing sessions.
  - Built mobile Ink navigation drawer menu (`Menu`) for smaller touch screens.
- **☁️ Cloud Sync & Account Recovery**:
  - Supabase-backed cross-device cloud synchronization using alphanumeric sync keys.
  - Direct account recovery by key, inactive account purging (90-day TTL), and 250-account capacity protection.
  - Placement Test / Fast-Forward modal allowing experienced draughtsmen to validate prior knowledge up to level 4.4.

### Fixed
- **Avatar Viewport Stability**:
  - Resolved oversized white collision box and prevented Cubito from shifting positions upon drawing validation.
  - Stabilized `.practice-grid` layout to lock canvas width across device resizing.
