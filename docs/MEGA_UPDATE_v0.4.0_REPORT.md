# 🚀 Dossier Técnico: Mega Actualización v0.4.0 (Paplitz Oficial)

**Fecha:** 6 de noviembre de 2026  
**Versión:** `v0.4.0`  
**Repositorio Oficial:** `/home/lazaro/Escritorio/Paplitz`  
**Copia de Seguridad Remota:** Rama `backup-before-mega-update` | Tag `backup-v0.2.9`  
**Estado de Compilación:** ✅ Compilación limpia con Vite & TypeScript (`tsc -b && vite build` — 0 errores).

---

## 1. Resumen Ejecutivo y Alcance

Esta actualización incorpora las innovaciones y mejoras desarrolladas en el repositorio de pruebas (`paplitz-drawing-lab`) a la rama principal del repositorio oficial de **Paplitz**, respetando de forma estricta los requerimientos y límites marcados por el usuario:

1. **Inclusión de `Lab 3D`:** Integración del laboratorio de perspectiva con proyección a 3 puntos de fuga, deformación espacial y visualización interactiva de primitivas volumétricas.
2. **Exclusión de `Focal 3D`:** Por instrucción expresa del usuario, el nodo y vistas de 1 punto focal (`focal3d`) **no se han añadido** dado que aún se encuentran en fase de prototipo no pulido.
3. **Lienzo Espacial Integrado (*Full-Bleed Arena*):** Rediseño total del área de práctica y dibujo para ocupar el 100% del viewport, con controles flotantes HUD estilo neobrutalista en tinta negra pura.
4. **Minijuegos Integrados en el Lienzo Central:** Los modos arcade (*Blitz*, *Fiebre*, *Supervivencia*, *Sprint*) se ejecutan de manera nativa dentro del lienzo espacial mediante `CubeMinigamePractice.tsx` y paneles flotantes de combo/temporizador.
5. **Coherencia Estética Monocromática:** Siguiendo la orden explícita del usuario (*"no pongas de color azul la pestaña de lab3d"*), la pestaña y componentes de Lab 3D están maquetados en la paleta oficial de Paplitz: blanco, negro y neutros con bordes sólidos gruesos (`border-2 border-black`).
6. **Mantenimiento de Calibraciones Previas:** Se conservan las tolerancias de llegada al Punto ②, penalizaciones por omisión de diana, límites biomecánicos de velocidad y bloqueo de guías en niveles de calistenia definidos en versiones anteriores.

---

## 2. Copia de Seguridad y Trazabilidad Git

Antes de aplicar cualquier cambio destructivo o masivo sobre el repositorio de Paplitz:
- Se creó la rama de respaldo local: `backup-before-mega-update`.
- Se creó el tag anotado: `backup-v0.2.9`.
- Se subió la copia de seguridad a GitHub mediante:
  ```bash
  git push origin backup-before-mega-update
  git push origin backup-v0.2.9
  ```
Esto garantiza la recuperación inmediata e íntegra del estado previo ante cualquier eventualidad.

---

## 3. Arquitectura del Motor `Lab 3D` (`src/lib/perspective3d/`)

El módulo `Lab 3D` es un subsistema geométrico autónomo que no añade dependencias pesadas a `node_modules` (utiliza canvas 2D nativo y cálculo vectorial puro).

### Estructura de Ficheros
```text
src/lib/perspective3d/
├── types.ts           # Definiciones de primitivas, aristas, caras, cámaras y proyecciones
├── math3d.ts          # Álgebra lineal 3D, rotaciones Euler/Cuaterniones, matriz de proyección cónica
├── primitives.ts      # Generadores de mallas paramétricas (cubo, cilindro, cono, pirámide, etc.)
├── reconstruct3d.ts   # Reconstrucción espacial a partir de trazos 2D del usuario
├── evaluator3d.ts     # Evaluación geométrica de fugas hacia los 3 puntos de fuga
└── debugReport3d.ts   # Generación de reportes de telemetría y diagnósticos de convergencia
```

### Componentes de Interfaz (`src/components/Lab3D/`)
- **`Lab3DView.tsx`**: Vista principal que alberga el lienzo 3D interactivo a 3 puntos de fuga, controles de cámara (focal, rotación, altura de horizonte, distorsión angular) y selector de modos.
- **`PrimitiveSelectorPanel.tsx`**: Selector flotante para elegir el volumen a practicar (cubos, cuñas, prismas, cilindros, escalones, etc.).
- **`Perspective3DPreviewCard.tsx`**: Mini-previsualización en tiempo real del modelo tridimensional con alambre de aristas visibles y ocultas.

---

## 4. Lienzo Espacial Full-Bleed y Minijuegos Unificados

El espacio central de trabajo de Paplitz ha sido transformado en un lienzo inmersivo de pantalla completa:

### 1. Interfaz HUD Flotante Neobrutalista
- **Badge de Nivel y Fase:** Fijo en la parte superior izquierda, mostrando nivel actual (ej. `C1.1 V6`), subnivel, fase de andamiaje (Fase 1: Guía Completa, Fase 2: Andamiaje Reducido, Fase 3: Velocidad y Sin Guía).
- **Badge Cuadrado Compacto de Puntuación ($1:1$):** El indicador de puntuación es ahora un recuadro compacto con borde de tinta negra que muestra la nota en porcentaje y el estado sin solapar la zona de trazado.
- **Barra de Herramientas Inferior Flotante:** Deshacer, Borrar, Ver Solución (con estado cíclico), Nuevo Reto y botón REC para grabación de sesiones.

### 2. Minijuegos en el Lienzo Central (`CubeMinigamePractice.tsx`)
- En lugar de ejecutar los minijuegos en una vista aislada o reducida, ahora se instancian directamente en el lienzo espacial.
- El componente `MinigameSidebarPanel.tsx` gestiona el contador de combos, barra de tiempo regresivo, multiplicador de racha y reglas del modo activo.
- Soporta *Ghost Line* y *Stroke Rush* con zonas seguras de trazado para evitar activar botones de la interfaz accidentalmente con el lápiz óptico o dedo.

---

## 5. Calibración de Evaluación y Calistenia

### 1. Polígonos Concéntricos Procedurales
- Se introducen polígonos concéntricos (triángulos, cuadrados, pentágonos, hexágonos, octógonos) dentro del catálogo de trazos en `strokeTypes.ts` y generadores en `strokeProceduralGenerator.ts`.
- **Badges de Puntos Clave con Offset Normal:** Las etiquetas numéricas ① y ② se posicionan mediante vectores perpendiculares normales al trazo para evitar que el número tape el punto de contacto.

### 2. Tolerancias y Calibraciones Preservadas
- **Puerta de Llegada al Punto ②:** Tolerancias estrictas calibradas ($14\text{px}$ para segmentos cortos, $15\text{px}$ para medios, $19\text{px}$ para largos).
- **Límite Biomecánico de Velocidad:** Umbral de control en $620\text{ px/s}$ para evitar que garabatos o latigazos descontrolados obtengan puntuaciones elevadas de forma tramposa.
- **Bloqueo de Guías en Calistenia:** Los niveles de calistenia que por diseño no tienen guía (`points_only`) bloquean la alternancia manual para garantizar la validez pedagógica de los ejercicios.
- **Silenciado de Mensajes Intrusivos:** Se eliminó el mensaje emergente de fallo al no tocar la diana ("Diana no alcanzada"), respetando la retroalimentación limpia y discreta pedida por el usuario.

---

## 6. Sistema de Grabación de Sesión (`SessionRecorder`)

- **Límite Ampliado a 500 Ejercicios:** `MAX_SESSION_RECORDS` ampliado de 200 a 500 ejercicios para permitir sesiones de práctica intensivas.
- **Modal de Aviso de Límite:** `SessionRecordLimitModal.tsx` alerta al usuario cuando la sesión se aproxima a los 500 registros para evitar pérdida de datos o degradación de memoria.
- **Soporte Multitipo:** Registro unificado de ejercicios de trazo libre, cubos 3D y perspectiva Lab 3D (`type: '3d'`).
- **Notas y Comentarios Personalizados:** Capacidad de insertar comentarios específicos en cualquier ejercicio antes de generar el reporte Markdown consolidado.

---

## 7. Inventario de Ficheros Modificados y Creados

| Fichero | Estado | Descripción |
| :--- | :--- | :--- |
| `src/lib/perspective3d/*` (6 ficheros) | Nuevo | Motor matemático y analítico de perspectiva a 3 puntos de fuga. |
| `src/components/Lab3D/*` (3 ficheros) | Nuevo | Vistas, selectores y preview de Lab 3D en estética monocromática. |
| `src/components/CubeMinigamePractice.tsx` | Nuevo | Contenedor del lienzo espacial para minijuegos arcade. |
| `src/components/MinigameSidebarPanel.tsx` | Nuevo | HUD lateral flotante con estadísticas en vivo de minijuegos. |
| `src/components/SessionRecordLimitModal.tsx` | Nuevo | Modal de advertencia para límite de 500 ejercicios en REC. |
| `src/components/StrokeLabView.tsx` | Nuevo | Laboratorio procedimental de calistenia y exploración de trazos. |
| `src/App.tsx` | Modificado | Navegación con pestaña `lab3d`, exclusión de `focal3d`, layout inmersivo. |
| `src/components/DrawingCanvas.tsx` | Modificado | Lienzo full-bleed, toolbar flotante, dock de paneles. |
| `src/components/StrokePracticeCanvas.tsx` | Modificado | HUD integrado, andamiaje adaptativo, insignias compactas. |
| `src/components/MinigamesView.tsx` | Modificado | Enrutamiento de modos arcade hacia el lienzo de práctica. |
| `src/lib/strokeEvaluator.ts` | Modificado | Evaluación de polígonos concéntricos y calibración cinemática. |
| `src/lib/strokeProceduralGenerator.ts` | Modificado | Generación de polígonos y badges con offset normal. |
| `src/lib/geometry.ts` | Modificado | Volúmenes prismáticos (torre, losa, escalón) y proyecciones. |
| `package.json` | Modificado | Bump de versión a `0.4.0`. |
| `CHANGELOG.md` | Modificado | Documentación detallada de cambios de la versión 0.4.0. |

---

## 8. Verificación y Calidad

- **Compilación TypeScript & Vite:** `npm run build` ejecutado satisfactoriamente sin advertencias de tipos ni errores de sintaxis.
- **Aislamiento de Entornos:** Todos los cambios se circunscriben estrictamente a `/home/lazaro/Escritorio/Paplitz`. No se modificó ningún archivo fuera del repositorio oficial.
