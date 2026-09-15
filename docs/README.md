# 📐 Paplitz — Central Technical Documentation

Welcome to the **Paplitz** developer documentation.

This documentation provides complete architectural, mathematical, and algorithmic references for contributors, developers, and autonomous agents:
1. **Understand core architecture, analytical 3D geometry engine, and UI components.**
2. **Develop and compile the Android native application (with Stylus / S-Pen support).**
3. **Build and package the Windows desktop standalone executable (`.exe`).**

---

## 🗺️ Documentation Directory

| Document | Purpose & Scope |
| :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | **General**: Folder structure, component tree, state management, and lifecycle. |
| **[GEOMETRY_AND_PERSPECTIVE.md](./GEOMETRY_AND_PERSPECTIVE.md)** | **3D Math**: Conic perspective projection, vanishing points, 3D coordinate spaces, and horizon shadows. |
| **[STROKE_EVALUATION_AND_SCORING.md](./STROKE_EVALUATION_AND_SCORING.md)** | **Algorithms**: Stroke normalization, polyline corner splitting, and geometric tolerance scoring. |
| **[AVATAR_CUBITO.md](./AVATAR_CUBITO.md)** | **Avatar / UX**: Sensei Cubito 3D procedural avatar, procedural animations, physics, and expressions. |
| **[MINIGAMES_AND_PROGRESSION.md](./MINIGAMES_AND_PROGRESSION.md)** | **Gameplay**: Arcade modes (*Fever*, *Blitz*, *Survival*, *Sprint*), curriculum system, and XP progression. |
| **[ANALOG_WORKSHEETS_AND_QR.md](./ANALOG_WORKSHEETS_AND_QR.md)** | **Paper Drawing**: Vector A4 PDF generation, QR grid indexing, and camera/scanner validation engine. |
| **[PORTING_GUIDE_ANDROID.md](./PORTING_GUIDE_ANDROID.md)** | **Android Guide**: Step-by-step setup with Capacitor, S-Pen low-latency stylus support, and camera permissions. |
| **[PORTING_GUIDE_WINDOWS_EXE.md](./PORTING_GUIDE_WINDOWS_EXE.md)** | **Windows Guide**: Step-by-step packaging for standalone desktop executables (`.exe`) via Electron & Tauri. |

---

## ⚡ Quickstart Commands

```bash
# 1. Install dependencies
npm install

# 2. Start local development server with Hot Module Replacement (http://localhost:5173/)
npm run dev

# 3. Typecheck and build production bundle (outputs to /dist)
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 💡 What is Paplitz?

Paplitz is an interactive **industrial sketching and spatial perspective simulator**, inspired by the pedagogical methods of **Koos Eissen** (*Sketching: The Basics*).

Unlike generic drawing apps, Paplitz is a **cognitive spatial training platform**:
- Generates procedural geometric challenges (incomplete cubes in 2 and 3-point vanishing perspective).
- The user completes missing edges, planes, or projected cast shadows freehand.
- The system evaluates vanishing point convergence, stroke straightness, and volume closure with analytical geometric precision in milliseconds.
- A procedural 3D companion mascot ("Sensei Cubito") reacts dynamically to strokes, combos, and accuracy.
