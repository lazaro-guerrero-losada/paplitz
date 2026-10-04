# 📐 Paplitz — Contexto Integral del Proyecto, Arquitectura y Estado de Progreso

> **Documento Maestro de Contexto para Continuidad y Desarrollo Multi-PC**  
> **Fecha de Actualización:** Octubre 2026  
> **Repositorio:** `lazaro-guerrero-losada/paplitz-drawing-lab` (Rama principal: `main`)  
> **Licencia:** MIT (Open-Source)

---

## 📑 Índice de Contenidos

1. [Resumen Ejecutivo & Visión del Proyecto](#1-resumen-ejecutivo--visión-del-proyecto)
2. [Guía Rápida para Abrir y Trabajar en Otro PC (Quickstart)](#2-guía-rápida-para-abrir-y-trabajar-en-otro-pc-quickstart)
3. [Estructura del Proyecto y Mapa de Archivos](#3-estructura-del-proyecto-y-mapa-de-archivos)
4. [Catálogo Completo de Ejercicios (270 Retos)](#4-catálogo-completo-de-ejercicios-270-retos)
   - [4.1 Calistenia Dinámica de Trazo Único (212 Retos)](#41-calistenia-dinámica-de-trazo-único-212-retos)
   - [4.2 Espaciado y Carriles de Ritmo (E1.1 a E8.1)](#42-espaciado-y-carriles-de-ritmo-e11-a-e81)
   - [4.3 Las 42 Páginas del Cuaderno Técnico (Bloques 1 al 8)](#43-las-42-páginas-del-cuaderno-técnico-bloques-1-al-8)
5. [Motor de Generación Procedural y Geometría](#5-motor-de-generación-procedural-y-geometría)
6. [Motor de Evaluación Analítica y Cinemática Biomecánica](#6-motor-de-evaluación-analítica-y-cinemática-biomecánica)
   - [6.1 Métricas Geométricas](#61-métricas-geométricas)
   - [6.2 Fases Cinemáticas (Precisión, Fluidez, Velocidad)](#62-fases-cinemáticas-precisión-fluidez-velocidad)
   - [6.3 Detección de Dirección Invertida (0%)](#63-detección-de-dirección-invertida-0)
   - [6.4 Algoritmo de Evaluación de Espaciado & Carriles](#64-algoritmo-de-evaluación-de-espaciado--carriles)
7. [Interfaz de Usuario (UI/UX) y Experiencia en Tablet / PC](#7-interfaz-de-usuario-uiux-y-experiencia-en-tablet--pc)
8. [Sistema de Depuración, Telemetría y Exportación](#8-sistema-de-depuración-telemetría-y-exportación)
9. [Registro de Hitos y Mejoras Recientes](#9-registro-de-hitos-y-mejoras-recientes)
10. [Próximos Pasos y Roadmap Sugerido](#10-próximos-pasos-y-roadmap-sugerido)

---

## 1. Resumen Ejecutivo & Visión del Proyecto

**Paplitz** es un ecosistema pedagógico digital de código abierto para el entrenamiento acelerado de la memoria muscular y el control espacial del trazo en dibujo técnico, perspectiva y diseño industrial.

### Pilares Fundamentales:
1. **Cálculo 100% Client-Side:** Todo el análisis geométrico y cinemático corre en tiempo real en el navegador o app nativa en menos de 2 milisegundos, sin costes de servidores de IA ni problemas de latencia o privacidad.
2. **Estética Paplitz (Tinta & Papel Técnico):** Lienzo blanco puro (`#FFFFFF`), trazos de tinta negra (`#000000`), trama milimétrica sutil y líneas discontinuas limpias.
3. **Didáctica Basada en Fases:** Los ejercicios avanzan de forma natural:
   - **Fase 1 (Precisión):** Control motor y puntería milimétrica a ritmo libre.
   - **Fase 2 (Fluidez):** Ritmo continuo sin titubeos ni micro-frenazos.
   - **Fase 3 (Velocidad):** Disparo balístico suelto superando la media adaptativa del usuario.
4. **Multiplataforma:** Optimizado para pantallas táctiles con stylus activo (Apple Pencil, S-Pen, Wacom, Huion con sensibilidad a la presión), tablets y ratón en ordenadores de sobremesa.

---

## 2. Guía Rápida para Abrir y Trabajar en Otro PC (Quickstart)

Si descargas o clonas este repositorio en un nuevo ordenador (Windows, Mac o Linux), sigue estos pasos exactos:

### Requisitos Previos:
- **Git:** [git-scm.com](https://git-scm.com/)
- **Node.js:** Versión 18 o superior (recomendado Node.js 20 LTS o 22): [nodejs.org](https://nodejs.org/)

### Paso a Paso en Terminal:

```bash
# 1. Clonar el repositorio
git clone https://github.com/lazaro-guerrero-losada/paplitz-drawing-lab.git
cd paplitz-drawing-lab

# 2. Instalar dependencias
npm install

# 3. Lanzar servidor de desarrollo local
npm run dev
# Se abrirá en http://localhost:5173/

# 4. Validar compilación TypeScript y empaquetado de producción
npm run build

# 5. Previsualizar la build de producción
npm run preview
```

### Comandos de Utilidad Disponibles en `package.json`:
- `npm run dev`: Inicia el servidor Vite en modo desarrollo con Hot Module Replacement (HMR).
- `npm run build`: Ejecuta `tsc -b` (comprobación estricta de tipos TypeScript) y compila los assets optimizados en la carpeta `dist/`.
- `npm run preview`: Sirve localmente la carpeta `dist/` para verificar el comportamiento de producción.
- `npm run electron:dev`: Arranca la versión de escritorio con Electron.
- `npm run cap:sync`: Sincroniza los assets web con el proyecto nativo de Android (Capacitor).

---

## 3. Estructura del Proyecto y Mapa de Archivos

```
Web dibujitos/ (paplitz-drawing-lab)
│
├── .github/                      # Workflows de CI/CD (si aplica)
├── android/                      # Proyecto nativo Android (Capacitor)
├── dist/                         # Artefactos compilados de producción (generados por Vite)
├── docs/                         # Documentación técnica, pedagógica y láminas extraídas
│   ├── ARCHITECTURE.md           # Arquitectura global y modelos
│   ├── STROKE_EVALUATION_AND_SCORING.md # Fórmulas y ponderaciones de evaluación
│   ├── ANALOG_WORKSHEETS_AND_QR.md      # Sistema de fichas impresas A4 con QR
│   ├── GEOMETRY_AND_PERSPECTIVE.md      # Matrices de perspectiva y fuga
│   ├── AVATAR_CUBITO.md                 # Especificación de la mascota reactiva
│   └── GUIA_IMPLEMENTACION_TRAZOS_PAPLITZ.md # Referencia de las 42 páginas del cuaderno
│
├── public/                       # Assets estáticos (SVGs, logos, audio, láminas)
│   ├── paplitz-logo.svg
│   ├── cubito/
│   └── extracted_pages/          # Imágenes de referencia de las 42 páginas
│
├── src/                          # Código fuente de la aplicación
│   ├── App.tsx                   # Enrutador principal, barra de navegación y vistas
│   ├── main.tsx                  # Punto de entrada de React 19
│   ├── index.css                 # Estilos globales y utilidades Tailwind v4
│   │
│   ├── components/               # Componentes de interfaz de usuario
│   │   ├── StrokeLabView.tsx     # ⭐ VISTA PRINCIPAL DEL LABORATORIO DE TRAZOS Y CALISTENIA
│   │   │                         #    - Lienzo 600x540 adaptable sin scroll
│   │   │                         #    - Drawer lateral de catálogo de 264 retos
│   │   │                         #    - Selectores de fase didáctica (1, 2, 3)
│   │   │                         #    - Controles de visualización (Mi Trazo / Solución)
│   │   │                         #    - Modal de información de reto y fase
│   │   │                         #    - Modal de reporte de depuración (JSON / Portapapeles)
│   │   │
│   │   ├── DrawingCanvas.tsx     # Lienzo de dibujo libre y perspectiva volumétrica
│   │   ├── LearningPath.tsx      # Árbol de progreso curricular (The Path)
│   │   ├── MinigamesView.tsx     # Minijuegos arcade (fuga rápida, ángulos, paralelas)
│   │   ├── ProfileView.tsx       # Perfil del usuario, rachas, estadísticas e historial
│   │   ├── AnalogDetailedView.tsx# Vista detallada de láminas imprimibles con QR
│   │   ├── AnalogSheetsModal.tsx # Catálogo de láminas físicas
│   │   ├── LevelGuideModal.tsx   # Modal de guía teórica de perspectiva
│   │   ├── GuidebookModal.tsx    # Guía rápida para principiantes
│   │   └── PlacementModal.tsx    # Prueba de nivel inicial
│   │
│   └── lib/                      # Núcleo analítico, generadores y tipos
│       ├── strokeTypes.ts        # ⭐ Definiciones TypeScript completas:
│       │                         #    - LabExerciseDef, ProceduralStrokeChallenge
│       │                         #    - ALL_SINGLE_STROKE_EXERCISES (227 niveles)
│       │                         #    - ALL_42_EXERCISES (42 páginas del cuaderno)
│       │                         #    - ALL_LAB_EXERCISES (269 ejercicios totales)
│       │                         #    - SpacingTrackConfig, SpacingTrackParams
│       │                         #    - StrokeEvaluation, KeyPoint, TargetLineDef
│       │
│       ├── strokeProceduralGenerator.ts # ⭐ Generador procedural determinista con semilla:
│       │                         #    - SeededRNG (Generador congruencial lineal)
│       │                         #    - generateSingleStrokeChallenge (Líneas y curvas)
│       │                         #    - generateMultiLineChallenge (2 o 3 líneas dispersas)
│       │                         #    - generateRadialRosetteChallenge (Rosetas D11 y D12)
│       │                         #    - generateSpacingTrackChallenge (Carriles E1.1 a E7.2)
│       │                         #    - Generadores para las 42 páginas del cuaderno
│       │
│       ├── strokeEvaluator.ts    # ⭐ Evaluador analítico instantáneo y biomecánico:
│       │                         #    - evaluateSingleStrokeSubmission
│       │                         #    - evaluateMultiLineSubmission
│       │                         #    - evaluateSpacingTrackSubmission (Espaciado & Carriles)
│       │                         #    - Detección de trazo en dirección invertida (0%)
│       │                         #    - buildStrokeDebugReport (Reporte técnico completo)
│       │
│       ├── strokeKinematics.ts   # ⭐ Análisis de derivadas físicas (velocidad, aceleración,
│       │                         #    fluidez, micro-paradas, baseline adaptativo y fases)
│       │
│       ├── geometry.ts           # Utilidades matemáticas 2D y 3D (puntos, vectores, proyecciones)
│       ├── debugReport.ts        # Funciones de exportación JSON y portapapeles
│       ├── curriculumData.ts     # Lecciones del árbol de perspectiva
│       ├── levelSystem.ts        # Sistema de experiencia (XP) y niveles
│       ├── saveSystem.ts         # Persistencia en localStorage
│       ├── cloudSync.ts          # Sincronización opcional con Supabase
│       ├── pdfGenerator.ts       # Generación de PDFs para imprimir láminas
│       ├── sheetScanner.ts       # Escaneo de láminas físicas con cámara/QR
│       ├── avatarTypes.ts        # Estados anímicos de Cubito (Mascota)
│       └── cubee.avatar.json     # Modelo procedural de la mascota
│
├── package.json                  # Dependencias y scripts
├── tsconfig.json                 # Configuración del compilador TypeScript
├── vite.config.ts                # Configuración de empaquetado Vite
└── capacitor.config.ts           # Configuración de Capacitor para Android
```

---

## 4. Catálogo Completo de Ejercicios (270 Retos)

El catálogo unificado en `src/lib/strokeTypes.ts` combina **228 Calistenias Dinámicas** (212 de trazo único, curvas y rosetas + 16 de espaciado y carriles) y las **42 Páginas del Cuaderno Técnico**, sumando un total de **270 ejercicios** agrupados por bloques temáticos.

### 4.1 Calistenia Dinámica de Trazo Único y Rosetas (212 Retos)

Entrenamiento biomecánico repetitivo con evaluación inmediata al levantar el lápiz:

| Código | Bloque / Dirección | Orientación y Ángulo | Características y Variaciones |
| :--- | :--- | :--- | :--- |
| **D1** | ↗ Abajo-Arriba / Izq-Der | $35^\circ$ a $75^\circ$ | 19 subejercicios: Fijo, Longitud, Rotación, Posición, Sin Guía (Puntos), Multi-líneas (2 y 3). |
| **D2** | ↙ Arriba-Abajo / Der-Izq | $215^\circ$ a $255^\circ$ | 19 subejercicios con todas las variaciones sobre la diagonal descendente inversa. |
| **D3** | ↘ Arriba-Abajo / Izq-Der | $305^\circ$ a $345^\circ$ | 19 subejercicios: Diagonal descendente natural. |
| **D4** | ↖ Abajo-Arriba / Der-Izq | $125^\circ$ a $165^\circ$ | 19 subejercicios: Diagonal ascendente inversa. |
| **D5** | → Horizontal / Izq-Der | Estricto $0^\circ$ | 13 subejercicios: Estrictamente horizontal (sin variaciones de rotación), longitud, posición, puntos clave y multi-línea. |
| **D6** | ← Horizontal / Der-Izq | Estricto $0^\circ$ | 13 subejercicios: Estrictamente horizontal de derecha a izquierda. |
| **D7** | ↑ Vertical / Abajo-Arriba | Estricto $90^\circ$ | 13 subejercicios: Estrictamente vertical ascendente. |
| **D8** | ↓ Vertical / Arriba-Abajo | Estricto $90^\circ$ | 13 subejercicios: Estrictamente vertical descendente. |
| **D9** | ↗ Fuga Suave ~18° / Izq-Der | $15^\circ$ a $20^\circ$ | 19 subejercicios: Entrena líneas de fuga en cajas en perspectiva. |
| **D10** | ↖ Fuga Suave ~18° / Der-Izq | $15^\circ$ a $20^\circ$ | 19 subejercicios: Fuga suave inversa para la otra cara del cubo. |
| **D11** | ☼ Roseta Dentro-Fuera | $360^\circ$ Radial | 19 subejercicios: Conexión desde el centro hacia 8 y 12 dianas perimetrales. |
| **D12** | ❂ Roseta Fuera-Dentro | $360^\circ$ Radial | 19 subejercicios: Conexión desde el perímetro convergiendo al centro común. |
| **CC** | Trazos Curvos: Arcos en C | Parabólico | 10 subejercicios (CC.01 a CC.10): Curvatura sutil, media y pronunciada, cuerda variable y reto ciego a 3 puntos (①, ② vértice, ③ fin). |
| **CS** | Trazos Curvos: Ondas en S | Sinusoidal | 10 subejercicios (CS.11 a CS.20): Ondas en S con amplitud y longitud variable, reto ciego a 5 puntos (① inicio, ② cresta, ③ inflexión, ④ valle, ⑤ fin). |

---

### 4.2 Espaciado y Carriles de Ritmo (E1.1 a E8.1)

Inspirado en el Ejercicio 1.1 del cuaderno de dibujo (*"Making Strokes Consistent / Spacing"*). Se ubican en el bloque **`⚡ Calistenia: Espaciado & Carriles (Ritmo)`**:

```
[ MUESTRA (x) ]         [ CARRILES DE DIBUJO AL PASO x ]
+-------------+         ============================================= (Riel y=0)
| | | | | | | |   --->    |   |   |   |   |   |   |   |   |   |   |   
+-------------+         ============================================= (Riel y=h)
 (Siempre visible)       (El usuario traza hacia la derecha al paso x)
```

1. **E1.1 — Carril Único · Espaciado Base ($x$):**
   - 1 franja de altura $y = 130$px.
   - Muestra a la izquierda con paso $x = 16$px.
   - Rieles horizontales en $y = 0$ y $y = 130$. Trazos verticales.
2. **E1.2 — Carril Único · Espaciado Fino ($x/2$):**
   - 1 franja de altura $y = 130$px con el doble de densidad ($x/2 = 8$px).
3. **E2.1 — Doble Carril · Espaciado Base ($x$):**
   - 2 franjas horizontales de altura $\approx y/2$ ($60$px cada una), separadas por un margen blanco intermedio de $24$px.
   - Espaciado $x = 16$px.
4. **E2.2 — Doble Carril · Espaciado Fino ($x/2$):**
   - 2 franjas de altura $60$px con micro-espaciado fino $x/2 = 8$px.
5. **E3.1 — Cuádruple Carril · Espaciado Base ($x$):**
   - 4 franjas horizontales de altura $\approx y/4$ ($30$px cada una), separadas por márgenes blancos de $16$px.
   - Espaciado $x = 16$px. Trazos cortos y de alta cadencia.
6. **E3.2 — Cuádruple Carril · Espaciado Fino ($x/2$):**
   - 4 franjas de altura $30$px con espaciado fino $x/2 = 8$px.
7. **E4.1 — Carril Diagonal ↗ D1 (Abajo-Arriba / Izq-Der · 75°):**
   - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
   - Diagonales a $75^\circ$ respecto a la horizontal ($\Delta X \approx 35$px).
   - Trazo ascendente de abajo hacia arriba proyectando hacia la derecha (↗).
8. **E4.2 — Carril Diagonal ↙ D2 (Arriba-Abajo / Der-Izq · 75°):**
   - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
   - Diagonales a $75^\circ$ respecto a la horizontal.
   - Trazo descendente inverso de arriba hacia abajo proyectando hacia la izquierda (↙).
9. **E4.3 — Carril Diagonal ↘ D3 (Arriba-Abajo / Izq-Der · 75°):**
   - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
   - Diagonales espejo a $75^\circ$ respecto a la horizontal.
   - Trazo descendente de arriba hacia abajo proyectando hacia la derecha (↘).
10. **E4.4 — Carril Diagonal ↖ D4 (Abajo-Arriba / Der-Izq · 75°):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Diagonales espejo a $75^\circ$ respecto a la horizontal.
    - Trazo ascendente inverso de abajo hacia arriba proyectando hacia la izquierda (↖).
11. **E5.1 — Carril Quiebre Triangular ◄ (Bloques & Pausas · x/2):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Trazos verticales con quiebre triangular hacia la izquierda (◄) en el tercio inferior (vértice a $2/3$ de la altura, deflexión $16$px).
    - Distribución en bloques discretos de ancho $\approx y$ ($128$px) separados por una zona vacía de pausa ($48$px).
    - Cada bloque incluye líneas guía de referencia pre-dibujadas de **INICIO** y **FIN** con el quiebre triangular, delimitando el espacio que el usuario debe rellenar ($15$ líneas interiores por bloque).
12. **E5.2 — Carril Quiebre Triangular ► (Espejo Bloques & Pausas · x/2):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Quiebre triangular en espejo hacia la derecha (►) en el tercio inferior.
    - Misma estructura de bloques delimitados con líneas sólidas de **INICIO** y **FIN**, y zona intermedia de pausa.
13. **E6.1 — Carril Quiebre en Chevron ◄ (Bloques & Pausas · x/2):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Patrón geométrico en chevron (`<`) con vértice apuntando hacia la izquierda (◄) en el centro exacto de la franja ($y_{\text{apex}} \approx y_{\text{top}} + 0.49 \cdot h$, deflexión horizontal de $26$px).
    - Los dos extremos (superior e inferior) caen en la misma vertical ($|X_{\text{start}} - X_{\text{end}}| \approx 0$), formando un ángulo obtuso de $\approx 130^\circ$.
    - Longitud de arco total $\approx 140$px ($2 \times \sqrt{65^2 + 26^2}$).
    - **Sin versión en espejo:** Diseñado estrictamente en orientación hacia la izquierda según las especificaciones didácticas del método.
    - Distribución en 2 bloques discretos de ancho $\approx y$ ($128$px, $15$ líneas interiores por bloque) separados por un espacio de pausa de $48$px.
    - Bloque 1 delimitado por líneas sólidas de **INICIO** ($X=188$) y **FIN** ($X=316$).
    - Bloque 2 delimitado por líneas sólidas de **INICIO** ($X=364$) y **FIN** ($X=492$).
    - Bloque de muestra con flecha sólida indicadora de sentido descendente en la rama inferior y punto de inicio (●) en el riel superior.
14. **E7.1 — Carril Vértices en V ∨ (Bloques & Pausas · x/2):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Patrón geométrico de vértices concéntricos en V (`∨`) anidados hacia el centro común de cada bloque.
    - **Trazo continuo sin levantar el lápiz:** Se desciende por el ala izquierda (↘), se realiza un frenado y pivote nítido en el vértice inferior (ápice en el eje vertical central), y se asciende por el ala derecha (↗) hasta el riel superior.
    - **V exterior pre-dibujada como guía sólida de INICIO:** En cada bloque, la V más exterior está pre-dibujada ($hw = 64$px, base de $128$px de ancho y altura $130$px con el vértice apoyando en el riel inferior).
    - **Relleno concéntrico hacia el núcleo:** El usuario traza las V interiores reduciendo el semi-ancho a paso fino $x/2 = 8$px ($7$ V interiores por bloque: $hw \in [56, 48, 40, 32, 24, 16, 8]$px, con el ápice subiendo progresivamente $\approx 16.25$px por trazo).
    - Distribución en 2 bloques independientes (Bloque 1 con centro en $X=252$ y Bloque 2 con centro en $X=428$) separados por un espacio de pausa de descanso de mano de $48$px.
    - Muestra permanente con 6 V concéntricas y flecha indicadora en el ala derecha con punto de inicio (●) en el ala izquierda.
15. **E7.2 — Carril Vértices en V Invertida ∧ (Bloques & Pausas · x/2):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Patrón geométrico de vértices concéntricos en V invertida / pico / tienda (`∧`) anidados hacia el centro común de cada bloque (Fila 4 del Ejercicio 1.4 del cuaderno técnico).
    - **Trazo continuo sin levantar el lápiz:** Se asciende desde el riel inferior por el ala izquierda (↗), se realiza un frenado y pivote nítido en el vértice superior (ápice en el eje vertical central), y se desciende por el ala derecha (↘) hasta el riel inferior.
    - **V invertida exterior pre-dibujada como guía sólida de INICIO:** En cada bloque, la V invertida más exterior está pre-dibujada ($hw = 64$px, base de $128$px de ancho apoyando en el riel inferior y altura $130$px con el vértice tocando el riel superior).
    - **Relleno concéntrico hacia el núcleo:** El usuario traza las V invertidas interiores reduciendo el semi-ancho a paso fino $x/2 = 8$px ($7$ V invertidas interiores por bloque: $hw \in [56, 48, 40, 32, 24, 16, 8]$px, con el ápice descendiendo progresivamente $\approx 16.25$px por trazo).
    - Distribución en 2 bloques independientes (Bloque 1 con centro en $X=252$ y Bloque 2 con centro en $X=428$) separados por un espacio de pausa de descanso de mano de $48$px.
16. **E8.1 — Carril Zigzag en Onda ◄►◄ (Bloques & Pausas · x/2):**
    - 1 franja de altura $y = 130$px, espaciado fino $x/2 = 8$px.
    - Patrón geométrico de líneas paralelas continuas con triple quiebre alternado en onda (`◄►◄`) (Fila 6 del Ejercicio 1.4 del cuaderno técnico: *Pen Control — Angles & Zigzags*).
    - **Trazo continuo con 3 quiebres alternados:** Se inicia en el riel superior $(X, y_{\text{top}})$, se desciende hacia la izquierda hasta el Vértice 1 a $1/4$ de altura ($X - 16$px, $y_{\text{top}} + 32.5$px), se desciende hacia la derecha hasta el Vértice 2 en el centro ($X$, $y_{\text{top}} + 65$px), se desciende hacia la izquierda hasta el Vértice 3 a $3/4$ de altura ($X - 16$px, $y_{\text{top}} + 97.5$px), y se desciende hacia la derecha retornando a la vertical nominal en el riel inferior $(X, y_{\text{bottom}})$.
    - **Líneas pre-dibujadas de INICIO y FIN:** Cada bloque cuenta con líneas sólidas completas con la geometría en onda pre-dibujadas en su inicio ($X_{\text{start}}$) y su final ($X_{\text{end}}$).
    - **2 bloques independientes con pausa central:** Bloque 1 ($X \in [188, 316]$) y Bloque 2 ($X \in [364, 492]$), cada uno de ancho $y = 128$px, separados por un espacio de pausa de $48$px con etiqueta `(PAUSA)`.
    - **Relleno paralelo uniforme:** El alumno dibuja 15 trazos paralelos por bloque al paso fino $x/2 = 8$px de izquierda a derecha sin levantar el lápiz durante cada trazo.
    - Muestra permanente a la izquierda (`MUESTRA ZIGZAG ◄►◄ (x/2 = 8px)`) con flecha direccional en el extremo final y dot de inicio (●) en el riel superior.

**Reglas de diseño de estos ejercicios:**
- **Muestra permanente:** El bloque izquierdo con la referencia nunca se oculta, permitiendo al usuario calibrar su ojo en todo momento. Muestra la dirección y ángulo exactos (`MUESTRA ↗ (~75°)`, `MUESTRA CHEVRON ◄`, `MUESTRA VÉRTICES EN V ∨`, `MUESTRA VÉRTICES EN ∧`, `MUESTRA ZIGZAG ◄►◄`).
- **Flechas indicadoras de dirección:** En los niveles diagonales (E4.1 a E4.4) y con quiebre/vértice (E5, E6, E7 y E8), una de las líneas del bloque de muestra cuenta con un icono de flecha sólida al final del trazo y un punto de origen (●) al inicio, indicando visualmente de manera inequívoca el sentido y dirección del movimiento biomecánico.
- **Lienzo limpio sin textos superfluos:** Se han eliminado los textos de ayuda flotantes redundantes dentro del lienzo para preservar la pureza visual y permitir que las líneas pre-dibujadas de inicio guíen intuitivamente la ejecución.
- **Longitud adaptable:** El carril se extiende a lo ancho de la pantalla; no hay un número rígido obligatorio de líneas (se evalúan todas las líneas trazadas, requiriendo un mínimo de 3 por franja en continuos y 10 en bloques).
- **Verificación rigurosa de sentido y pendiente:** Trazar en dirección contraria otorga $0\%$ de calificación con advertencia visual inmediata. La inclinación de la pendiente se valida contra el cuadrante angular exacto.
- **Soporte de Fases 1, 2 y 3:** Se evalúa precisión de espaciado, fluidez de ritmo y velocidad de ejecución.

---

### 4.3 Las 42 Páginas del Cuaderno Técnico (Bloques 1 al 8)

Cada página cuenta con su lámina didáctica de referencia y un generador procedural para practicar sobre el lienzo digital:

- **Bloque 1: Consistencia & Calistenia (Págs. 1 a 8):** Líneas paralelas, espaciado, contornos, rectas en 8 cuadrantes, quiebros/zigzags, curvas en C y S, rosetas radiales, escape de pluma (*flicks*) y espinas ortogonales.
- **Bloque 2: Trazos Fundamentales & Trama (Págs. 9 a 13):** Los 7 estilos de tinta (Hatching, Cross-hatch, Uneven, Curved, Scribble, Stipple, Flowing) y variaciones de densidad.
- **Bloque 3: Contornos Cruzados 3D (Págs. 14 a 17):** Secciones envolventes sobre formas orgánicas (*blobs*), láminas alabeadas y tubos curvados con eje rector.
- **Bloque 4: Valor Plano & Gradación (Págs. 18 a 21):** Franjas tonales homogéneas, mapas topográficos y gradientes direccionales en formas complejas.
- **Bloque 5: Planos, Facetas & Isometría (Págs. 22 a 24):** Deconstrucción low-poly de curvas, quiebro de planos y red isométrica (*rhombille tiling* a $0^\circ, 60^\circ, 120^\circ$).
- **Bloque 6: Sombreado de Poliedros (Págs. 25 a 32):** Cálculo de caras bajo luz solar según la Ley de Lambert a 3 y 6 valores tonales, skylines de prismas y bodegones poliédricos dominantes.
- **Bloque 7: Superficies Curvas, Cilindro, Esfera (Págs. 33 a 37):** Cinta curva, cilindros en perspectiva con sombra núcleo y trama esférica según meridianos y paralelos.
- **Bloque 8: Composiciones & Síntesis (Págs. 38 a 42):** Bodegones geométricos avanzados, albedo y tono local, y ensamblaje de piezas compuestas (*compound forms*).

---

## 5. Motor de Generación Procedural y Geometría

Ubicado en `src/lib/strokeProceduralGenerator.ts`.

### Generador Pseudoaleatorio Determinado por Semilla (`SeededRNG`)
Implementa un generador congruencial lineal (LCG) puro sin dependencias externas:
$$X_{n+1} = (a \cdot X_n + c) \pmod m$$
donde $a = 1103515245$, $c = 12345$, $m = 2^{31}$.
- Permite reproducir exactamente el mismo reto pasando la misma semilla (`challengeSeed`).
- El botón de dados genera una nueva semilla aleatoria entre `10000` y `99999`.

---

## 6. Motor de Evaluación Analítica y Cinemática Biomecánica

Ubicado en `src/lib/strokeEvaluator.ts` y `src/lib/strokeKinematics.ts`.

### 6.1 Métricas Geométricas
Para cada trazo se calculan las siguientes propiedades discretas:
1. **Puntería en Dianas (Boundary Score):**
   Distancia euclídea del punto inicial al objetivo ① y del punto final al objetivo ②:
   $$E_{\text{start}} = \sqrt{(x_{\text{inicio}} - x_①)^2 + (y_{\text{inicio}} - y_①)^2}$$
2. **Rectitud (Straightness Score):**
   Mide la desviación de sagita perpendicular respecto al segmento ideal $A \to B$.
3. **Paralelismo y Orientación Angular (Parallelism Score):**
   Compara el ángulo del vector del usuario respecto al ángulo ideal del reto, penalizando desviaciones angulares.
4. **Densidad Óptica y Cobertura Tonal:**
   Calculada mediante muestreo de píxeles entintados dentro de polígonos convexos.

---

### 6.2 Fases Cinemáticas (Precisión, Fluidez, Velocidad)

El motor biomecánico registra el tiempo de cada punto `(x, y, time)` mediante la API de Pointer Events:
- **Velocidad Media y Pico:** Longitud de arco dividida entre la duración en segundos ($px/s$).
- **Índice de Fluidez ($0-100\%$):** Coeficiente de variación de la aceleración. Penaliza vacilaciones y micro-detenciones (velocidad $< 70$ px/s con duración $> 25$ ms).
- **Línea Base Adaptativa (`UserSpeedProfile`):** Almacena en `localStorage` la velocidad media del usuario por cada dirección anatómica para comparar su rendimiento contra su propio historial.

#### Criterios de Aprobación por Fase:
- **Fase 1 (Precisión):** La nota geométrica debe ser $\ge 75\%$. El usuario puede trazar a la velocidad que desee.
- **Fase 2 (Fluidez):** Requiere nota geométrica $\ge 75\%$ e índice de fluidez $\ge 70\%$ (trazo seguro sin temblor).
- **Fase 3 (Velocidad):** Requiere nota geométrica $\ge 75\%$ y velocidad balística superior al umbral rápido de su perfil.

---

### 6.3 Detección de Dirección Invertida (0%)

Si el usuario empieza a dibujar en el punto de llegada ② y termina en el punto de inicio ①:
1. El motor calcula las distancias cruzadas:
   $$E_{\text{normal}} = \text{dist}(P_{\text{inicio}}, ①) + \text{dist}(P_{\text{fin}}, ②)$$
   $$E_{\text{invertida}} = \text{dist}(P_{\text{inicio}}, ②) + \text{dist}(P_{\text{fin}}, ①)$$
2. Si $E_{\text{invertida}} + 15 < E_{\text{normal}}$, se activa la bandera `isReversed = true`.
3. **Resultado:**
   - Calificación instantánea de **$0\%$**.
   - Mensaje de aviso explícito: *"⚠️ Dirección Invertida: Has trazado en sentido contrario (de ② hacia ①)"*.
   - Banner informativo en el lienzo que se descarta automáticamente al iniciar el siguiente intento.

---

### 6.4 Algoritmo de Evaluación de Espaciado & Carriles

#### Para carriles continuos rectos y diagonales (`E1.1` a `E4.4`):
1. Se filtran los trazos situados en el carril de dibujo ($X \ge X_{\text{inicio}} - 15$).
2. Se asigna cada trazo a su franja correspondiente según su centroide vertical $Y$.
3. Para cada franja con $\ge 2$ líneas:
   - Se ordenan de izquierda a derecha por $X$.
   - Se calculan las distancias consecutivas $\Delta x_i = x_{i+1} - x_i$.
   - Se obtiene la media $\mu_{\Delta x}$ y la desviación estándar $\sigma_{\Delta x}$.
   - **Nota de espaciado:** $0.45 \times \text{FidelidadAlPasoObjetivo} + 0.55 \times \text{RegularidadInterna}$.
   - **Nota de carriles:** Penaliza si los trazos no llegan o rebasan los rieles superior e inferior con tolerancia de $\pm 6$px.
   - **Rectitud y angularidad:** Se evalúa la proximidad al ángulo objetivo ($90^\circ$ vertical o $75^\circ$ diagonal con validación de cuadrante slash/backslash).

#### Para carriles con quiebre (Triangular E5.1/E5.2, Chevron E6.1 y Zigzag en Onda E8.1):
1. **Fidelidad del Quiebre (`evaluateKinkFidelity` y `evaluateZigzagWaveFidelity`):**
   - **Quiebre triangular (`triangle_left`, `triangle_right`):** Vértice a $2/3$ de la altura ($y_{\text{apex}} \approx y_{\text{top}} + 0.67 \cdot h$), deflexión de $16$px con retorno a la vertical.
   - **Quiebre en chevron (`chevron_left`):** Vértice en el centro exacto ($y_{\text{apex}} \approx y_{\text{top}} + 0.49 \cdot h$), deflexión pronunciada de $26$px hacia la izquierda y alineación vertical estricta entre el punto inicial y final ($|X_{\text{start}} - X_{\text{end}}| \le 8$px).
   - **Zigzag en onda (`zigzag_wave`, E8.1):** Evaluación de 3 quiebres alternados con segmentación en 3 zonas verticales. Detección y validación de deflexión hacia la izquierda en Vértice 1 ($y \approx 0.25h$) y Vértice 3 ($y \approx 0.75h$) con objetivo de $16$px, hendidura de retorno a la vertical en Vértice 2 ($y \approx 0.50h$), y alineación vertical estricta entre el punto inicial y final en rieles superior e inferior ($|X_{\text{start}} - X_{\text{end}}| \le 8$px).
   - **Detección de líneas rectas sin quiebre:** Si el usuario traza líneas verticales rectas ordinarias sin realizar el ángulo solicitado, la nota geométrica se limita drásticamente ($\le 30\%$) con mensaje diagnóstico claro (*"¡Falta el Quiebre Triangular!"*, *"¡Falta el Quiebre en Chevron!"* o *"¡Falta el Zigzag en Onda!"*).
   - **Detección de quiebre en sentido opuesto:** Se valida el signo del quiebre (◄ vs ►) para asegurar la dirección correcta.
2. **Partición Robusta por Bloques y Control de Pausas:**
   - La clasificación y medición de espaciado se calcula con respecto al promedio geométrico real de los puntos de las líneas pre-dibujadas (`startAvgX` y `endAvgX`). Esto garantiza que trazos con formas complejas (como chevrons con deflexión de $26$px) se midan con total exactitud respecto a la línea de **INICIO** y de **FIN**.
   - Los trazos se particionan en Bloque 1 y Bloque 2, exigiendo completar ambos.
   - Se penalizan trazos indebidos en la zona central de pausa (`(PAUSA)`), educando al usuario para levantar la mano y relajar el pulso entre bloques.

#### Para carriles de Vértices en V y V Invertida (E7.1 y E7.2):
1. **Fidelidad de V Concéntrica (`evaluateVConcentricFidelity` y `evaluateVInvertedFidelity`):**
   - **V Concéntrica en V (∨, E7.1):** Vértice en riel inferior ($y_{\text{bottom}}$), dos extremos en riel superior ($y_{\text{top}}$), sentido continuo ↘ vértice ↗.
   - **V Invertida en Pico (∧, E7.2):** Vértice en riel superior ($y_{\text{top}}$), dos extremos en riel inferior ($y_{\text{bottom}}$), sentido continuo ↗ vértice ↘ (Fila 4 del Ejercicio 1.4 del cuaderno).
   - **Alineación con el eje central:** El vértice debe situarse sobre el eje vertical central del bloque ($X_c = 252$ para Bloque 1, $X_c = 428$ para Bloque 2) con tolerancia de hasta $14$px.
   - **Simetría bilateral:** Se compara la distancia del ala izquierda y del ala derecha respecto al eje central ($|(X_c - x_{\text{left}}) - (x_{\text{right}} - X_c)| \le 12$px).
   - **Anclaje en rieles guía:** Apoyo riguroso de las dos patas en los rieles correspondientes ($y_{\text{top}}$ en E7.1, $y_{\text{bottom}}$ en E7.2).
2. **Medición del Espaciado Interlineal Radial/Concéntrico:**
   - Los trazos se ordenan de exterior a interior por su semi-ancho $hw$.
   - Se mide la distancia $\Delta x$ desde la figura exterior pre-dibujada ($hw=64$px) hacia la primera interior, y entre cada par consecutivo hacia el núcleo (objetivo: $x/2 = 8$px).
   - Se penaliza la falta de ángulos/vértices (si se trazan líneas rectas) limitando la nota a $\le 30\%$ con advertencia visual diagnóstica.

---

## 7. Interfaz de Usuario (UI/UX) y Experiencia en Tablet / PC

Ubicada en `src/components/StrokeLabView.tsx`.

### Principales Mejoras de Ergonomía Aplicadas:
1. **Layout Compacto Sin Scroll:**
   - La barra lateral izquierda y el lienzo caben simultáneamente en la pantalla en tablets y portátiles sin requerir scroll vertical.
   - El lienzo mantiene su relación de aspecto técnica `600 / 540` con un margen inferior de respiración para que no quede pegado al borde.
2. **Drawer Lateral Deslizante:**
   - El catálogo completo de los 270 ejercicios se despliega mediante un panel lateral accesible con el botón de menú `☰`, con buscador y filtro por bloques.
3. **Calificación Destacada y Telemetría:**
   - El porcentaje de nota se muestra en tamaño grande (`text-3xl / text-4xl`) con badge de estado (`Superado ✓`, `Ajustar`, `Dirección ⚠️`).
   - Muestra la duración en segundos y la velocidad en $px/s$.
4. **Controles de Revisión Post-Evaluación:**
   - **Botón `Mi Trazo`:** Permite ocultar o mostrar las líneas dibujadas por el usuario.
   - **Botón `Solución`:** Permite activar o desactivar la solución ideal discontinua. Cuando está desactivado, el lienzo queda completamente limpio de líneas grises o fantasmas.
   - Ambos botones solo están habilitados una vez que se ha corregido el ejercicio.
5. **Botones de Información (`i`):**
   - Icono `i` junto a **Reto Activo**: Abre un modal con la información técnica, instrucciones y la lámina del libro correspondiente.
   - Icono `i` junto a **Fase Cinemática**: Explica qué mide cada fase y cómo superar el reto cinemático.

---

## 8. Sistema de Depuración, Telemetría y Exportación

Junto al botón de reintentar (`R`), existe un botón de depuración (`⚠️`) que abre un modal con el reporte completo:
- Permite escribir comentarios de prueba.
- **Copiar al Portapapeles:** Copia un reporte estructurado en texto claro con todas las coordenadas, errores en píxeles, derivadas de velocidad y notas desglosadas.
- **Descargar JSON:** Genera un archivo `.json` con el dump completo de la sesión, útil para auditoría y desarrollo.

---

## 9. Registro de Hitos y Mejoras Recientes

A continuación se resumen los avances implementados en la última fase de trabajo:

1. **Compactación Total de la Interfaz:**
   - Eliminación de elementos redundantes para garantizar que la pantalla no requiera scroll en tablets o portátiles.
2. **Reorganización de Modales Informativos:**
   - Botones `i` minimalistas para Fases Cinemáticas y Reto Activo; eliminación del botón duplicado de guía técnica.
3. **Ampliación de Direcciones de Trazo:**
   - Creación de D5 (Horizontal →), D6 (Horizontal ←), D7 (Vertical ↑), D8 (Vertical ↓) exclusivamente rectos sin variaciones de giro.
   - Creación de D9 (Fuga suave ascendente ↗) y D10 (Fuga suave ascendente ↖) a $15^\circ-20^\circ$.
4. **Rosetas Radiales (D11 y D12):**
   - D11: Roseta de dentro hacia afuera (8 y 12 radios).
   - D12: Roseta de fuera hacia adentro (8 y 12 radios).
   - Superposición de solución adaptada con confluencia central.
5. **Control de Dirección Invertida (0% Score):**
   - Detección precisa de trazos dibujados al revés con pop-up en el lienzo y penalización inmediata.
6. **Familia de Carriles y Espaciado (E1.1 a E3.2):**
   - 6 nuevos niveles de ritmo interlineal con muestra permanente en la izquierda y rieles horizontales.
   - Soporte de longitud adaptable a la pantalla.
   - Fases 1, 2 y 3 habilitadas para ritmo motor.
7. **Carriles Diagonales de 75° (E4.1 a E4.4):**
   - 4 niveles de diagonales inclinadas a $75^\circ$ en paso fino $x/2 = 8$px en los 4 cuadrantes biomecánicos (↗ D1, ↙ D2, ↘ D3, ↖ D4).
   - Validación rigurosa de dirección, pendiente geométrica y cuadrante (slash vs backslash).
8. **Carriles con Quiebre Triangular y Bloques Delimitados (E5.1 y E5.2):**
   - Reproducción fiel del ejercicio del manual con quiebre en rodilla hacia la izquierda (◄) y espejo hacia la derecha (►) a $2/3$ de la altura.
   - Bloques discretos de ancho $\approx y$ ($128$px) delimitados por líneas sólidas de **INICIO** y **FIN** pre-dibujadas.
   - Zona de pausa central para descansar la mano sin tocar el lienzo.
   - Motor analítico específico (`evaluateKinkFidelity`) que penaliza líneas rectas y verifica la altura, dirección y deflexión del vértice.
9. **Carril Quiebre en Chevron ◄ (E6.1) y Limpieza Visual:**
   - Creación del nivel E6.1 (`Carril Quiebre en Chevron ◄`) con patrón en `<` a media altura ($y_{\text{apex}} \approx y_{\text{top}} + 0.49 \cdot h$, deflexión de $26$px, longitud $140$px).
   - Sin versión en espejo (diseñado exclusivamente orientado a la izquierda).
   - Eliminación de textos flotantes redundantes en el lienzo para mantener la estética pura de dibujo técnico y calistenia.
   - Líneas de muestra con icono de flecha direccional y dot de inicio en diagonales y quiebres.
10. **Carril Vértices en V Concéntricos ∨ (E7.1):**
    - Creación del nivel E7.1 (`Carril Vértices en V ∨`) con patrón de V anidadas hacia el centro común de cada bloque.
    - La V exterior de cada bloque ($128$px de ancho) está pre-dibujada como guía sólida de **INICIO**.
    - El alumno rellena hacia el interior a paso fino $x/2 = 8$px en un único trazo continuo (ala izquierda ↘, vértice en el eje central, ala derecha ↗).
    - 2 bloques independientes separados por una pausa de descanso central de $48$px.
    - Motor evaluador específico `evaluateVConcentricFidelity` con control de alineación del vértice, simetría bilateral, apoyo en riel superior y detección de dirección.
11. **Carril Vértices en V Invertida ∧ (E7.2):**
    - Creación del nivel E7.2 (`Carril Vértices en V Invertida ∧`, Fila 4 del Ejercicio 1.4 del cuaderno técnico) con patrón de picos/tiendas anidados hacia el centro de cada bloque.
    - La V invertida exterior ($128$px de ancho) está pre-dibujada como guía sólida de **INICIO**.
    - El alumno rellena hacia el interior a paso fino $x/2 = 8$px en un único trazo continuo (ala izquierda ↗ desde el riel inferior, vértice superior en el eje central, ala derecha ↘ hasta el riel inferior).
    - 2 bloques independientes separados por una pausa de descanso central de $48$px.
    - Motor evaluador específico `evaluateVInvertedFidelity` con validación de vértice superior en $y_{\text{top}}$, simetría de alas y anclaje en riel inferior.
12. **Carril Zigzag en Onda ◄►◄ (E8.1):**
    - Creación del nivel E8.1 (`Carril Zigzag en Onda ◄►◄`, Fila 6 del Ejercicio 1.4 del cuaderno técnico) con patrón de líneas paralelas continuas en zigzag con 3 quiebres alternados a $y/4$, $y/2$ y $3y/4$.
    - Líneas sólidas pre-dibujadas completas de **INICIO** y **FIN** para cada bloque.
    - 2 bloques independientes de ancho $y$ separados por una pausa de descanso de mano de $48$px con 15 líneas interiores por bloque a paso $x/2 = 8$px.
    - Motor evaluador específico `evaluateZigzagWaveFidelity` con validación de deflexión de picos (◄), retorno de hendidura central, contención en rieles y verticalidad de extremos.
    - Catálogo ampliado a 270 retos totales (228 dinámicos + 42 páginas de cuaderno).

---

## 10. Próximos Pasos y Roadmap Sugerido

Si retomas el proyecto en otro ordenador o deseas continuar ampliándolo, aquí tienes las tareas prioritarias:

1. **Nuevos Modos de Ritmo y Densidad:**
   - Ampliar la familia de carriles con tramas inclinadas (hatching a $45^\circ$) manteniendo el espaciado $x$ y $x/2$.
2. **Integración con Modo Carrera / Gamificación:**
   - Vincular los resultados del Laboratorio de Calistenia con la progresión global de niveles y recompensas del perfil (`ProfileView.tsx`).
3. **Pruebas de Usabilidad con Stylus en Dispositivos Reales:**
   - Probar en iPad (Safari/Chrome) y tablet Android (Samsung Tab S con S-Pen) para verificar la curva de presión y respuesta háptica.
4. **Empaquetado de Nueva Release:**
   - Generar el nuevo `.apk` para Android y `.exe` para Windows incorporando todo el catálogo de 270 ejercicios.

---

*Documento redactado y preservado para el repositorio de Paplitz. Todo el código correspondiente se encuentra versionado y sincronizado en la rama `main` de GitHub.*
