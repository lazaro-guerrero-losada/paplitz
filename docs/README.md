# 📐 Paplitz (Web Dibujitos) — Documentación Central del Proyecto

Bienvenido a la carpeta de documentación de **Paplitz** (denominado en desarrollo como *Web dibujitos*).

Esta documentación ha sido preparada con el máximo nivel de detalle para que **cualquier agente o desarrollador que se incorpore en nuevos chats** disponga de toda la información técnica necesaria para:
1. **Comprender la arquitectura, lógica matemática y componentes de la aplicación.**
2. **Crear una versión móvil nativa para Android** (con soporte de Stylus / S-Pen).
3. **Compilar un ejecutable nativo para Windows (`.exe`)** autónomo y ligero.

---

## 🗺️ Índice de Documentos

| Documento | Audiencia / Propósito |
| :--- | :--- |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | **General**: Estructura de carpetas, árbol de componentes, ciclo de vida y gestión de estado. |
| **[GEOMETRY_AND_PERSPECTIVE.md](./GEOMETRY_AND_PERSPECTIVE.md)** | **Matemáticas / 3D**: Proyección cónica, ejes X, Y, Z, puntos de fuga, cubos y sombras horizontales. |
| **[STROKE_EVALUATION_AND_SCORING.md](./STROKE_EVALUATION_AND_SCORING.md)** | **Algoritmia**: Normalización de trazos, detección de esquinas (*corner splitting*) y puntuación. |
| **[AVATAR_CUBITO.md](./AVATAR_CUBITO.md)** | **Avatar / UX**: Motor Bible Strong, animaciones, arrastre táctil/ratón y colisiones. |
| **[MINIGAMES_AND_PROGRESSION.md](./MINIGAMES_AND_PROGRESSION.md)** | **Gameplay**: Modos arcade (*Fiebre*, *Blitz*, *Supervivencia*, *Sprint*), currículo y niveles XP. |
| **[ANALOG_WORKSHEETS_AND_QR.md](./ANALOG_WORKSHEETS_AND_QR.md)** | **Dibujo en papel**: Generador de PDFs A4, codificación QR y escáner por cámara/webcam. |
| **[PORTING_GUIDE_ANDROID.md](./PORTING_GUIDE_ANDROID.md)** | **AGENTE ANDROID**: Guía paso a paso para empaquetar con Capacitor, soporte S-Pen y permisos. |
| **[PORTING_GUIDE_WINDOWS_EXE.md](./PORTING_GUIDE_WINDOWS_EXE.md)** | **AGENTE WINDOWS .EXE**: Guía paso a paso para generar el `.exe` con Tauri v2 o Electron. |

---

## ⚡ Comandos Rápidos del Proyecto

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Iniciar servidor de desarrollo con Hot Reload (por defecto en http://localhost:5173/)
npm run dev

# 3. Compilar TypeScript y empaquetar con Vite para producción (genera carpeta /dist)
npm run build

# 4. Previsualizar el bundle de producción localmente
npm run preview
```

---

## 💡 ¿Qué es Paplitz?

Paplitz es un simulador interactivo de **bocetado industrial y perspectiva espacial**, inspirado en la metodología docente de **Koos Eissen** (*Sketching: The Basics*). 

A diferencia de un software de pintura genérico, Paplitz es una **herramienta de entrenamiento cognitivo**:
- Genera desafíos geométricos (cubos incompletos en 2 y 3 puntos de fuga).
- El usuario debe completar a mano alzada las aristas o sombras que faltan.
- El sistema evalúa con rigor geométrico la alineación a los puntos de fuga, longitud y cierre del volumen.
- El avatar 3D procedural ("Cubito") reacciona en vivo con expresiones animadas y acompaña al alumno.
