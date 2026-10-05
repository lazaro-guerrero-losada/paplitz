# Changelog — Paplitz

All notable changes, new features, bug fixes, and UX improvements to the Paplitz perspective simulator are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
