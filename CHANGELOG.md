# Changelog — Paplitz

All notable changes, new features, bug fixes, and UX improvements to the Paplitz perspective simulator are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.6] — 2026-10-14

### 🎯 Biomechanical Stroke Evaluation Calibration & Quality Engine Overhaul

Based on empirical session data (#1 to #31 on C1.1 V2), this release resolves multiple systemic inconsistencies, eliminates score inflation on crooked/wavy strokes ("fast banana" bug), synchronizes evaluator pass gates with App progression thresholds, and prevents the adaptive speed baseline runaway trap.

#### 🍌 Anti-Inflation & Straightness Dominance ("Fast Banana" Fix) (`strokeEvaluator.ts`)
- **Root Problem**: Previously, strokes with catastrophic straightness flaws (e.g. 36% in Exercise #25, 40% in Exercise #1, 18% in Exercise #15) received inflated marks (up to 86%) because start/end endpoint accuracy was double-counted (40% boundary + 25% parallelism), while straightness only accounted for 35% of geometry and merely 21% of Phase 3 overall score ($0.35 \times 0.60$).
- **Rebalanced Geometric Weighting**:
  - `straightnessScore`: Increased from 35% to **50%** (dominant quality pillar of a straight line).
  - `boundaryScore`: Rebalanced from 40% to **35%**, combining average endpoint error and worst-case endpoint penalty to prevent a 3px start from masking a 31px overshoot/undershoot.
  - `parallelismScore`: Reduced from 25% to **15%** (eliminates angular redundancy with start/end targets).
- **Non-Linear Quality Capping**:
  - If `straightnessScore < 40%`: Geometric score is hard-capped at **45%** (wavy/bowed strokes can never pass).
  - If `straightnessScore < 50%`: Hard-capped at **55%**.
  - If `straightnessScore < 60%`: Hard-capped at **65%**.
  - If `straightnessScore < 70%`: Hard-capped at **75%**.
  - If `straightnessScore < 80%`: Hard-capped at **84%**.

#### ⚡ Speed De-escalation & Biomechanical Ceiling (`strokeKinematics.ts`, `strokeEvaluator.ts`)
- **Balanced Speed Weight in Phase 3**: Replaced the additive $60/40$ split with an $80/20$ ratio (`geometricScore * 0.80 + speedScore * 0.20`). Drawing fast is now a secondary bonus rather than an engine that hands out 40 free points to crooked strokes. If geometry is failing ($<86\%$), speed cannot artificially push the score into passing territory.
- **Biomechanical Speed Cap (520 px/s Ceiling)**: Capped the Phase 3 target speed at $\le 520\text{ px/s}$ (`targetFastSpeed = Math.min(520, Math.max(340, userBaseline * 0.85))`). This eliminates the "moving goalposts trap" where a single 1000 px/s outlier stroke (Exercise #20) spiked the user baseline to 788 px/s and failed 8 consecutive controlled fast strokes (550–714 px/s).
- **Phase 2 Steady Rhythm Cap**: Capped Phase 2 minimum speed at $\le 380\text{ px/s}$ (`Math.min(380, Math.max(200, userBaseline * 0.55))`).
- **Baseline Speed Pollution Protection**: `recordStrokeSpeed` now requires acceptable geometry (`straightnessScore >= 60` and `boundaryScore >= 55`) to update the adaptive baseline, preventing wild or uncontrolled swipes from poisoning user metrics.

#### 🔄 Universal Evaluator & App Progression Synchronization (`strokeEvaluator.ts`)
- **Phase Threshold Alignment**: Exported and unified `getPhasePassingThreshold`:
  - **Fase 1 (Precisión)**: $\ge 80\%$
  - **Fase 2 (Fluidez)**: $\ge 85\%$
  - **Fase 3 (Velocidad)**: $\ge 90\%$
- **Eliminated False "Aprobado" Bug**: Previously, the evaluator hardcoded 75% as passing, marking strokes of 79%, 82%, 83%, 84% as `✅ Aprobado` / `Superado: SÍ` in the UI while `App.tsx` secretly reset the user's mastery streak to 0. The evaluator now strictly checks the active phase's target threshold across all evaluators (`evaluateSingleStrokeSubmission`, `evaluateMultiLineSubmission`, `evaluateMultiStrokeConnected`, `evaluateBoxTracing`, `evaluateHatchingExercise`, `evaluateCrossHatching`, `evaluateShadingGradation`).
- **Resolved "91% ❌ A mejorar" Contradiction**: If a strict gate fails (e.g. insufficient speed or straightness $<60\%$), the displayed overall score is automatically capped below the passing threshold (`targetThreshold - 3`), preventing the confusing juxtaposition of an "A" grade mark with a red failure badge.

#### 🎯 Calibrated Endpoint Error Tolerances (`strokeEvaluator.ts`)
- **Phase-Specific Endpoint Gates**:
  - **Fase 1**: Max allowed error: Start 30px, End 34px.
  - **Fase 2**: Max allowed error: Start 22px, End 24px.
  - **Fase 3**: Max allowed error: Start 24px, End 26px.
  - Fixes Exercise #14, where a stroke stopping 34px short was previously marked as "Aprobado".
- **Enhanced Debug Reports**: All generated reports in Markdown and text now display `Fase Activa: Fase X (Umbral Requerido: ≥Y% · Fase Superada: SÍ/NO)`, ensuring full diagnostic clarity for future audits.

---

## [0.2.5] — 2026-10-13

### ⏱️ Auto-Advance Countdown Stability & Re-render Decoupling

#### 🔄 Glitchless 1.0-Second Auto-Advance Countdown (`StrokePracticeCanvas.tsx`)
- **🛑 Fixed Mid-Countdown Timer Reset Glitch**:
  - Previously, the auto-advance countdown would occasionally glitch and reset midway (e.g. jumping back to 1.0s at 0.67s or 0.48s).
  - **Root Cause**: The auto-advance countdown effect tracked `handleNext` in its dependency array. Because `handleNext` called `onNext` (passed down from `App.tsx` as `handleSidebarNext`), asynchronous parent state updates in `App.tsx` (such as avatar mood resets at ~400ms–520ms, SenseiCubo animations, XP level progress updates, or mastery streaks) caused `App` to re-render, generating a new function reference for `handleSidebarNext`. This triggered effect teardown and restarted the 1.0-second timer from scratch.
  - **Mutable Action Refs (`handleNextRef`, `onDismissPhaseTransitionRef`)**: Decoupled timer execution from component render identity by storing action callbacks in mutable `useRef` containers synchronized on every render.
  - **Real Clock-Time Tracking (`Date.now()`)**: Replaced discrete interval decrement subtraction with true delta clock-time calculation (`endTime = Date.now() + 1000` with 50ms smooth tick intervals). The countdown is now completely immune to re-render cycles, frame drops, and parent state changes, transitioning smoothly and precisely from 1.0s to 0.0s without resetting.

---

## [0.2.4] — 2026-10-13

### ⏺️ Modo Récord Refinement: Active REC Toggle, Volatile Session Lifetime & Quick Commenting

#### ⏺️ Active REC Toggle Workflow (`App.tsx`, `StrokePracticeCanvas.tsx`, `DrawingCanvas.tsx`, `SessionRecordPanel.tsx`)
- **🔘 Explicit REC Toggle**: Added an active toggle REC button (`[ ⏺ REC ]` ➔ `[ 🔴 REC (N) ]`) across all main interfaces:
  - **Desktop Header**: Prominent toggle button with live count and pulsing red status indicator.
  - **Mobile Header**: Compact header badge allowing 1-tap activation and access on phones.
  - **Canvas Action Bars**: Available both before evaluating and after evaluating in both Calisthenics (`StrokePracticeCanvas`) and 3D Cubes (`DrawingCanvas`), in portrait and landscape orientations.
  - **Sidebar / Drawer Panel**: Dedicated toggle in `SessionRecordPanel` allowing instant pausing or resuming.
- **🔒 Active-Only Recording**: Exercises are only recorded to the session log while REC is toggled ON, preventing accidental accumulation. If the user draws while REC is off, the session remains completely unaffected.

#### 💨 Volatile In-Memory Session Lifetime (Zero Persistence on Reload) (`sessionRecorder.ts`, `App.tsx`)
- **🗑️ Auto-Wipe on Refresh**: Session records are kept strictly in React volatile memory. If the user refreshes (`F5`), reloads, or restarts the browser without exporting, the session is cleared automatically to `[]` and REC resets to inactive.
- **🧹 Legacy LocalStorage Purge**: Completely eliminated `localStorage` reads/writes for session records and pro-actively removes any leftover `paplitz_session_records` keys from previous versions.

#### 💬 Instant Quick Comment Modal (`QuickCommentModal.tsx`)
- **⚡ 1-Tap Per-Exercise Commenting**: Clicking the speech bubble button (`💬`) immediately opens a lightweight dedicated modal (`QuickCommentModal`) focused exclusively on note-taking:
  - Displays exercise code, seed, and score.
  - Pre-filled with existing comment (if any).
  - Quick-tag pills for instant insertion (`+Nota injusta`, `+Trazo tembloroso`, `+Fallo de velocidad`, `+Sentido invertido`, `+Dianas desalineadas`, `+Buena sensación`).
  - Automatically pauses auto-advance while editing.
- **✨ Retroactive REC Activation**: If the user completed an exercise while REC was off and clicks to add a comment, the modal offers a 1-tap option to activate REC and save that exercise along with the note.

#### 📋 Consolidated Session Export Modal (`App.tsx`, `SessionRecordPanel.tsx`)
- **🪟 Centered Session Overlay**: Clicking the active `[ 🔴 REC (N) ]` button anywhere opens a modal dialog over the canvas without losing the drawing context:
  - One-click `[ 📋 Exportar Sesión ]` copies the entire Markdown table, diagnostics, and per-exercise notes to the clipboard ready to paste into chat.
  - `[ 💾 Descargar JSON ]` exports raw JSON diagnostics.
  - In-line comment editing and deletion for any exercise in the session.

---

## [0.2.3] — 2026-10-13

### 🎯 Reto Diario (Daily Habit Set) Refinements & 📋 Modo Récord (Session Recorder)

#### 🎯 Reto Diario: 1 Line per Exercise Problem (`App.tsx`, `StrokePracticeCanvas.tsx`, `DailyChallengePanel.tsx`)
- **📏 1 Attempt = 1 Problem in Daily Set**: Fixed the daily challenge flow so that each individual stroke/line (or cube attempt) directly counts as 1 completed problem toward the total (e.g. 1/12). It no longer gets stuck or confuses the user by demanding full 3-phase curriculum progression (Phase 1, 2, 3 with 3 consecutive streaks) on a single problem.
- **🔄 Multi-Discipline Problem Advancement**: Updated `handleSidebarNext`, `handleNextCubeOrProblem`, and `handleStartDailyChallenge` to properly load and advance seeds for both calisthenics stroke lines (`setCalisthenicsSeed`) and 3D perspective cubes (`setChallenge`).
- **🏷️ Dedicated Daily Challenge Canvas HUD**: While a Daily Challenge session is active, the canvas HUD automatically displays `Reto Diario: Línea X/N` instead of standard progression mastery dots and phase selectors, providing clear feedback on daily set habit progress.
- **🏆 Automatic Habit Completion & Rewards**: Evaluating the final problem immediately finalizes the daily set, persists individual marks to history, awards +50 XP habit bonus, and opens the `DailySetCompletedModal`.

#### 📋 Modo Récord: Exercise Session Log & Bulk Reporting (`sessionRecorder.ts`, `SessionRecordPanel.tsx`, `App.tsx`, `StrokePracticeCanvas.tsx`, `DrawingCanvas.tsx`)
- **📝 Automated Session Recording**: All completed exercises across both calisthenics and 3D cubes are automatically logged in the session record (`paplitz_session_records`), capturing execution timestamps, level codes, scores, pass/fail status, and full diagnostic reports.
- **💬 Per-Exercise User Comments**:
  - In the **Modo Récord** panel, users can view all recorded exercises and click `[+ Añadir comentario]` or `[✎ Editar]` on any specific exercise without needing to generate or download reports individually.
  - On the canvas itself, an instant comment button (`💬`) in the toolbar allows adding a comment to the exercise just drawn, syncing directly with the session log.
- **📦 Consolidated Bulk Exports**:
  - **Copiar Reporte Completo (Markdown)**: Bundles the entire session into a clean Markdown report with a summary table, overall metrics, and detailed technical sections including each exercise's user notes.
  - **Descargar JSON Completo**: Downloads a single structured `.json` file containing all session exercise attempts, user comments, and raw diagnostics.
  - **Vaciar Registro**: Allows clearing the session history with confirmation.
- **🧭 Sidebar Mode Selector Navigation**: Expanded the sidebar header switcher to 3 modes: `[ El Camino ]`, `[ Reto Diario ]`, and `[ Modo Récord ]` (with a live counter badge indicating the number of recorded exercises).

---

## [0.2.2] — 2026-10-09

### 📱 Mobile Viewport UX: Snug Vertical Positioning & Landscape Redesign

#### ⬆️ Vertical Mobile Snug Canvas Positioning (`App.tsx`, `StrokePracticeCanvas.tsx`, `DrawingCanvas.tsx`)
- **🚫 Eliminated Awkward Vertical Dead Space**: Replaced `justify-center` vertical centering in portrait mobile with `justify-start pt-1 sm:pt-4`, placing the drawing canvas immediately below the top controls and level indicator (`[Panel] | 1.1`).
- **📐 Snug Padding & Anchor Harmony**: Removed excessive spacing and dead margins so that users see their drawing canvas right where their eyes and hands are, with natural 4px–6px gaps rather than a massive 200px gap.

#### 🔄 Horizontal Mobile Landscape Redesign (`App.tsx`, `StrokePracticeCanvas.tsx`, `DrawingCanvas.tsx`, `index.css`)
- **🔀 Side-by-Side Horizontal Architecture**: When rotated to landscape on mobile phones (`orientation: landscape` with `height <= 520px`), automatically switches the workspace layout to side-by-side (`flex-row`):
  - **Left**: Canvas maximized to the available screen height (`height: min(calc(100vh - 46px), 360px)`), with aspect ratio locked (750:500 for strokes, 600:540 for 3D cubes). Width scales cleanly to ~420px (more than double the previous squeezed 180px view!).
  - **Right**: Ergonomic side toolbar matching canvas height with clean ink card styling (`w-48 sm:w-52`). Contains `[Panel]` toggle button, level badge, stroke count, quick tool row (`[Undo]`, `[Trash]`, `[Eye Trazo]`, `[Eye Guía]`), auto-advance toggle, and primary action (`[ CORREGIR ]` or `[ SIGUIENTE ]`).
- **✨ Compact Header in Mobile Landscape**: Header automatically condenses to 40px (`h-10`) in mobile landscape, saving valuable vertical height and dedicating maximum screen real estate to the drawing canvas.
- **🚫 No Scroll & No Cropping**: Completely prevents vertical scrolling and eliminates button cutoff in mobile landscape.
- **🧭 Integrated Sidebar Trigger**: Removed the isolated floating desktop button on the far left in mobile landscape and integrated the `[Panel]` toggle directly inside the side toolbar header.

---

## [0.2.1] — 2026-10-09

### 🎮 Biomechanical Progression, Mobile Vertical UX & Tablet Minigame Overhaul

#### ⚡ Biomechanical Phase Calibration (80% → 85% → 90%)
- **📈 Progressive Phase Mastery Requirements (`App.tsx`, `strokeKinematics.ts`, `strokeEvaluator.ts`)**:
  - **Fase 1 (Precisión)**: Requires 3 consecutive masteries with score **≥80%** to advance to Phase 2.
  - **Fase 2 (Fluidez)**: Requires 3 consecutive masteries with score **≥85%** at continuous speed without hesitations to advance to Phase 3.
  - **Fase 3 (Velocidad)**: Requires 3 consecutive masteries with score **≥90%** in fast ballistic impulse to master the variant or complete the level.
  - **Balanced Speed Kinematics**: Adjusted speed baseline expectations (Phase 2 ≥ 220 px/s, Phase 3 ≥ 360 px/s or 95% baseline with stroke-scaled duration limits), ensuring strokes are noticeably fast and decisive without impossible speed spikes on touch screens.
- **✨ 1-Second Auto-Dismissing Phase Popup (`StrokePracticeCanvas.tsx`)**:
  - Replaced manual blocking dialogs with a high-visibility, centered ink banner ("¡Siguiente Fase!").
  - Displays for exactly 1.0s with an ink progress bar and automatically dismisses itself, seamlessly transitioning phases and loading the new exercise without requiring taps.

#### 📱 Mobile Vertical UX/UI Overhaul (`App.tsx`, `StrokePracticeCanvas.tsx`)
- **🧭 Dedicated Mobile Practice Top Bar**: Positioned cleanly above the drawing canvas on portrait devices (`< sm`), securely anchoring the `[Panel]` toggle button and displaying the active level badge without floating collisions.
- **📐 Ergonomic 2-Row Mobile Action Bar**:
  - Tool buttons (trazos count, undo, clear, auto-advance, layer toggles, report) neatly arranged in an upper utility row.
  - Primary actions ("CORREGIR" and "SIGUIENTE") expand to full-width, thumb-friendly touch targets on mobile vertical screens while maintaining sleek inline alignment on desktop.
- **⚡ Snappy 1.0s Auto-Advance**: Reduced the auto-advance waiting time to 1.0s (from 1.5s) with real-time countdown progress and label indicators.

#### 🕹️ Tablet Layout & Overlay Sidebar in Minigames (`StrokeRushMinigame.tsx`, `GhostLineMinigame.tsx`)
- **🔒 Non-Scrolling Viewport Architecture**: Enforced locked viewport bounds (`h-[calc(100vh-64px)] overflow-hidden`), completely preventing whole-page and canvas scrolling on iPads and Android tablets.
- **🎯 Centered Canvas Layout**: Canvas mathematically centered in the entire viewport with proportional constraints (`calc((100vh - 165px) * (600 / 540))`).
- **📂 Slide-Over Drawer Sidebars**: Sidebars converted into non-intrusive overlay drawers (matching the Practice panel) with backdrop blur, quick `[X]` close controls, and independent internal scrolling (`overflow-y-auto`).
- **💨 Auto-Hide on Gameplay**: The sidebar automatically collapses/hides when starting gameplay or touching the canvas, granting 100% focused tablet screen estate to drawing. Quick-action "Finalizar" buttons remain instantly accessible on the HUD.

---

#### 🖌️ Practice Canvas & Motor Training Workspace (`StrokePracticeCanvas.tsx`, `DrawingCanvas.tsx`)
- **📐 750x500 Landscape Aspect Ratio**: Perfectly locked aspect ratio (750x500) aligned with the tool palette to prevent letterboxing and distortion across devices.
- **🚫 Removed 75% Hard Threshold Blocking**: Replaced punitive barriers with progressive motor feedback, letting students continue practicing fluidly.
- **⏱️ Auto-Advance Calibration**:
  - Tuned auto-advance timer to snappy 1.5s–2.0s with active countdown indicator.
  - Interactive auto-advance toggle switch.
  - Intelligent pause behavior: timer automatically freezes when opening any modal, report, or stats popup.
- **🎯 Clean Solution Guide Overlay**: Renders the theoretical target path cleanly over the canvas without clearing or erasing user strokes.
- **🔍 Multi-Line Stroke Detection**: Added smart wait heuristics for multi-stroke calisthenics (e.g. radial rosettes, parallel tracks), preventing premature scoring before completion.
- **🎨 Minimalist Toolbar & Visual Polish**:
  - Compact icon-only toolbar buttons for Stats and Debug Reports (`AlertTriangle` icon).
  - 100% monochromatic ink phase transition popups, removing colorful emojis for an authentic graphite/ink design studio aesthetic.
  - Prominent on-canvas score badge, kinematic phase indicators, and live mastery progress indicators.

#### 📚 Documentation & Identity (`README.md`)
- Streamlined documentation with concise visual literacy overview.
- Sized brand logo to a crisp, centered 96px display.
- Added author LinkedIn profile link in the footer.

---

## [0.2.0] — 2026-10-05

### 🚀 Mega-Update: Motor Calisthenics Engine, Two-Module Learning Curriculum & Immersive Practice Canvas

#### 🌟 Added & Integrated
- **⚡ Full Vector & Procedural Motor Calisthenics Engine (`strokeProceduralGenerator.ts`, `strokeEvaluator.ts`, `strokeKinematics.ts`, `strokeTypes.ts`)**:
  - **237 Procedural Calisthenics Exercises**: Completely generated in real-time on high-DPI canvases without relying on static raster scans.
  - **5 Didactic Units (Module 1)**:
    - *Unit 1: Trazos Fundamentales Ortogonales* (52 challenges: D1–D4 horizontal, vertical, and bidirectional strokes).
    - *Unit 2: Diagonales Principales y Fugas de Perspectiva* (90 challenges: D5–D10 multi-angle vanishing lines).
    - *Unit 3: Multi-Líneas y Rosetas Radiales* (50 challenges: D11–D12 radial bursts, 360° spoke precision).
    - *Unit 4: Arcos y Ondas Biomecánicas* (20 challenges: C & S curvature control with inflection anchor points).
    - *Unit 5: Carriles de Ritmo y Espaciado Interlineal* (25 challenges: E1.1–E17.1 equidistant parallel frequency tracks).
  - **3 Biomechanical Kinematic Subphases**:
    - *Fase 1: Precisión* — Slow, guided motor accuracy connecting endpoints without geometric deviation.
    - *Fase 2: Fluidez* — Continuous forearm rhythm eliminating micro-hesitation and stop-and-go jerks.
    - *Fase 3: Velocidad* — Ballistic flick strokes, building sketching confidence and clean terminal lift-offs.
  - **Real-Time Kinematic & Geometric Evaluation**: Instant algorithmic scoring of path deviation, curvature fidelity, velocity consistency, and stroke angle accuracy.
- **🗺️ Two-Module Dual Learning Path & Grouped Calisthenics Progression (`curriculumData.ts`, `LearningPath.tsx`)**:
  - **Módulo 1: Líneas, Trazos & Calistenia** (Reestructurado en **18 niveles agrupados progresivos**, eliminando la saturación de 237 nodos separados en el camino).
  - **Módulo 2: Paralelepípedos & Cajas** (10 niveles progresivos de perspectiva isométrica y cónica).
  - **Sistema de Versiones Progresivas por Nivel (`variants`)**: Cada uno de los 18 niveles agrupa entre 7 y 20 versiones procedimentales (guía fija $\to$ longitud/posición variable $\to$ puntos ciegos sin guía $\to$ variación total $\to$ multi-trazos).
  - **Mecánica Dinámica de Avance de Versión**: Cada vez que el estudiante consigue un acierto de maestría ($\ge 90\%$), el ejercicio **cambia automáticamente a la siguiente versión** del nivel, evitando la monotonía de repetir el mismo ejercicio estático.
  - **Badge de Versiones en El Camino**: Cada nodo muestra una insignia destacada con el número exacto de versiones a superar (`X versiones`).
- **🎨 Redesigned Immersive Practice Workspace (`App.tsx`, `StrokePracticeCanvas.tsx`, `DrawingCanvas.tsx`)**:
  - **Left Collapsible Sidebar**: Organiza todos los controles en un panel lateral limpio con botón `<` / `>` para maximizar el lienzo a pantalla completa.
  - **Top Mode Switcher**: Conmutador directo de 2 botones entre `[ El Camino ]` y `[ Reto Diario ]`.
  - **Selector Interactivo de Versiones del Nivel en la Barra Lateral**:
    - Indicador numérico `Versión X de Y` con contador de versiones.
    - Fila horizontal de botones de versión `[1] [2] [3]...` para navegar y practicar cualquier variante del nivel.
    - Visualización del título y descripción pedagógica de la variante activa.
  - **Camino Controls in Sidebar**:
    - Selector directo de módulo (`[ 1. Trazos ]` vs `[ 2. Cajas ]`).
    - Desplegable de niveles desbloqueados.
    - Indicador de Racha de Maestría (3 cubos `✓ ✓ ✓`) con modal didáctico `(i)`.
    - Indicador de 3 Fases Cinemáticas (`[1]`, `[2]`, `[3]`) con modal didáctico `(i)`.
  - **Integrated Action Toolbar**: Botones de *Deshacer*, *Borrar*, *Siguiente* (que avanza a la siguiente versión), *Ver Trazo* y *Ver Solución*.
- **ℹ️ Didactic Info Modals (`PracticeInfoModals.tsx`)**:
  - **Mastery Streak Modal**: Explains the 3-in-a-row $\ge 90\%$ rule to students, emphasizing reproducibility and motor consistency over lucky single attempts.
  - **Kinematic Phases Modal**: Explains the 3 biomechanical phases (Precision $\rightarrow$ Flow $\rightarrow$ Speed) and how to train the shoulder/arm for expressive sketching.

#### 🧠 Architectural Rationale & Why This Was Built
1. **Cognitive Load Separation (Strokes vs 3D Volumes)**: Trying to learn 3D perspective construction while still struggling with basic line straightness or hand tremors leads to cognitive overload. Decomposing the curriculum into *Module 1 (Motor Calisthenics)* and *Module 2 (3D Volumes)* allows deliberate practice of neuromuscular coordination first, making 3D perspective intuitive and effortless later.
2. **Procedural Geometry vs Raster Scans**: Static scans from workbooks (Bloques 1 al 8) suffer from fixed pixel resolutions, image compression artifacts, and inability to generate infinite random variations. The new procedural vector engine renders infinitely crisp geometry on any screen resolution (4K, iPad, graphics tablets) and provides mathematically exact analytical evaluation.
3. **Ergonomic Tablet Usability**: Industrial designers and artists need the largest possible canvas. By collapsing the sidebar, the drawing area expands dynamically to full screen while keeping essential actions accessible at a glance.

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
