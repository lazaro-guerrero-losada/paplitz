# 📄 Láminas Analógicas (PDF) y Escáner QR

El dibujo tradicional sobre papel sigue siendo la base del diseño. Paplitz incluye un flujo híbrido analógico-digital en `src/components/AnalogSheetsModal.tsx`.

---

## 1. Generación de Láminas PDF (`src/lib/pdfGenerator.ts`)

- **Tecnología**: Basado en `jspdf`.
- **Formato**: A4 vertical estándar (210 x 297 mm) en alta resolución vectorial.
- **Contenido de la Lámina**:
  1. Cabecera técnica con logo oficial Paplitz, lección, fecha y casillas de alumno.
  2. 12 casillas de dibujo (matriz 3×4) limpias con recuadros técnicos de 57 mm × 58 mm.
  3. **Recuadros Limpios sin Marcadores Invasivos**:
     - Las casillas no llevan cuadritos o dianas en las esquinas, manteniendo una estética 100% limpia de lámina técnica de dibujo arquitectónico.
     - Es el propio recuadro impreso (sus 4 aristas negras) el que se utiliza como referencia geométrica para auto-centrar y recortar cada ejercicio.
  4. Código QR compacto impreso en la cabecera con los metadatos de la hoja.
  5. 4 marcadores fiduciales concéntricos B&N de alta precisión en las esquinas perimetrales de la hoja completa (márgenes exteriores a 12 mm).

---

## 2. Codificación Compacta en QR (`src/lib/qrHelper.ts`)

Para no depender de un servidor externo para guardar retos, toda la información necesaria para reconstruir el cubo exacto se compacta dentro del propio código QR:
- Código de lección (p. ej. `1.1`).
- Semilla pseudo-aleatoria (`seed`).
- Modo de perspectiva (`guided`, `gentle`, etc.).
- Modo de ejes (`xyz`, `base_axes`, `none`).
- Foco de luz en retos de sombras.

---

## 3. Escáner y Motor de Homografía Proyectiva 1:1 (`src/lib/sheetScanner.ts`)

- **Soporte Universal de Formatos**:
  - **Archivos PDF**: Si el usuario sube un PDF escaneado (desde escáner de oficina o apps multifunción), el sistema utiliza **Mozilla PDF.js** (`pdfjs-dist`) para rasterizar la página 1 directamente en un canvas HTML5 en memoria con escala adaptativa normalizada (~2200 px máx).
  - **Imágenes directas**: Acepta archivos PNG, JPG, JPEG o WEBP procedentes de cámara de smartphone o escaneos fotográficos.
- **Flujo de Detección y Rectificación Geométrica**:
  1. **Lectura de Metadatos**: `jsQR` localiza el QR de la cabecera y recupera la semilla y lección.
  2. **Detección Fiducial Robusta por 4 Cuadrantes (`findQuadrantFiducial`)**:
     - Localiza las 4 dianas concéntricas exteriores de la página A4 dividiendo la imagen en 4 regiones independientes (TL, TR, BL, BR) con búsqueda multiescala y refinamiento sub-píxel a paso de 1 px.
     - Funciona tanto en escaneos planos con márgenes blancos variables como en fotos de smartphone sobre mesas con perspectiva inclinada.
  3. **Matriz de Homografía Proyectiva 3x3 (`getProjectiveHomography`)**:
     - Resuelve el sistema lineal de 8 ecuaciones de perspectiva óptica para mapear coordenadas milimétricas de la página A4 a píxeles, eliminando las distorsiones angulares y trapezoidales de la cámara del móvil.
  4. **Warping Proyectivo a Lienzo Canónico 570×580 px (`warpCellFromCornersToCanvas`)**:
     - Proyecta cada una de las 12 casillas (57 mm × 58 mm) a un lienzo de 570×580 píxeles.
  5. **Registro Facial 1:1 (`registerGivenGeometry`)**:
     - Realiza un barrido espacial multiescala (`dx`, `dy`, `scale`) para anclar la cara dada digital exactamente sobre el trazo impreso del papel con 0 píxeles de error.
  6. **Evaluación de Trazos con Criterio Estricto (`evaluateCellDrawing`)**:
     - Umbral calibrado de grafito (`paperB - 18`).
     - Desviación perpendicular media a lo largo de todo el recorrido del trazo.
     - Penalización por longitud incompleta si una arista se corta antes del 75% de su recorrido.
     - **Regla Estricta del 0% para Cubos Incompletos**: Si falta 1 arista, la nota queda topada entre 20% y 50% (*NO SUPERADO*). Si faltan 2 o más aristas, la nota es estrictamente **0%**.
     - **Umbral de Aprobado**: Mínimo **80%**.
- **100% Offline y Privado**: El procesado se realiza en el hilo del navegador; nada sale del dispositivo.

---

## 4. Vista Detallada de Correcciones en Gran Formato (Matriz 3×4) (`src/components/AnalogDetailedView.tsx`)

- **Objetivo**: Inspeccionar la hoja corregida en alta resolución sin compresión, con una matriz 3×4 de casillas a escala real (~400×400 px) con desplazamiento vertical fluido (`scroll`).
- **Diseño Estricto Blanco y Negro**:
  - Todo el entorno visual, iconos (Lucide), pestañas, selectores y controles siguen una estética minimalista monocromática estricta en blanco, gris y negro.
  - **Único elemento en color**: Las líneas y vértices de corrección geométrica ideal en color rojo técnico (`#DC2626`), garantizando el máximo contraste didáctico sin distracciones.
- **Calibración Óptica Exacta**:
  - El viewport SVG está calibrado a `viewBox="0 0 570 580"`, haciendo coincidir exactamente el recuadro físico de 57 mm × 58 mm rectificado por el escáner con el dibujo del reto en coordenadas canónicas acopladas al registro 1:1.
- **Herramientas**:
  - Control de opacidad de las líneas rojas (30% a 100%).
  - Conmutadores para Línea de Horizonte y Ejes Técnicos X, Y, Z.
  - Botón de **"Descargar PDF con Correcciones"** (`generateCorrectionReportPDF`): Exporta un PDF oficial A4 de 2 páginas con la matriz 3x4 corregida y el desglose pedagógico.
  - Enlace directo *"Practicar en pantalla"* para resolver ese mismo reto en el lienzo interactivo.

