# ⚖️ Algoritmo de Evaluación de Trazos y Puntuación

El archivo `src/lib/validation.ts` se encarga de analizar los trazos a mano alzada dibujados por el usuario y contrastarlos contra la solución matemática exacta calculada por `geometry.ts`.

---

## 1. El Reto del Boceto Continuo (*Corner Splitting*)

Un error crítico habitual en evaluadores de dibujo es asumir que cada arista recta del cubo corresponde exactamente a un trazo independiente del usuario. 

En la práctica artística real:
- Los dibujantes suelen trazar esquinas conectadas sin levantar el lápiz (p. ej. una "L" o una "U" para cerrar dos aristas consecutivas).
- Si el evaluador no detecta esquinas, penalizaba injustamente con puntuaciones ridículas (~12%) porque trataba el trazo compuesto como una sola línea diagonal errónea.

### Solución: `splitStrokeAtCorners(stroke)`
El algoritmo inspecciona los vectores directores consecutivos a lo largo del trazo:
1. Calcula el ángulo de deflexión $\theta$ entre vectores tangentes adyacentes.
2. Si $\theta > 42^\circ$ con una distancia mínima entre muestras, se marca un **vértice de quiebre**.
3. El trazo original se divide limpiamente en múltiples trazos candidatos independientes.

```text
Trazo continuo del usuario:
  A ---------------------> B (quiebre de 90°)
                           |
                           |
                           v C
Se divide automáticamente en:
  Segmento 1: [A -> B]
  Segmento 2: [B -> C]
```

---

## 2. Normalización de Trazos

Antes de la comparación, cada trazo pasa por `normalizeStroke(points)`:
- Re-muestrea los puntos a intervalos equidistantes (interpolación lineal).
- Elimina micro-temblores causados por frecuencias de muestreo del digitalizador.
- Determina los extremos efectivos $P_{inicio}$ y $P_{fin}$ descartando ganchos finales involuntarios al levantar el lápiz.

---

## 3. Emparejamiento Bipartito con las Aristas Objetivo

Dado el conjunto de aristas diana que faltan en el cubo y el conjunto de segmentos normalizados:
1. Se calcula una matriz de afinidad $M(i, j)$ entre el segmento $i$ y la arista objetivo $j$:
   - **Similitud Angular (Dirección y Fuga)**: Producto escalar $|\vec{u}_{trazo} \cdot \vec{u}_{diana}|$.
   - **Proximidad de Extremos**: Distancia euclídea entre vértices teóricos y extremos reales.
   - **Ratio de Longitud**: $\min(L_{trazo}, L_{diana}) / \max(L_{trazo}, L_{diana})$.
   - **Solapamiento Proyectado**: Cobertura longitudinal sobre el eje de la arista.
2. Se realiza una asignación codiciosa ponderada (*Greedy Assignment*) para emparejar de forma óptima cada trazo a su arista correspondiente.

---

## 4. Cálculo de la Puntuación Global (0 - 100%)

La puntuación final se descompone en 3 factores clave:
1. **Completitud de Aristas ($45\%$)**: Porcentaje de aristas obligatorias que han sido cubiertas con éxito.
2. **Precisión Geométrica ($45\%$)**: Media de precisión angular, fugas y longitud de las aristas detectadas.
3. **Limpieza del Boceto ($10\%$)**: Penalización suave por aristas fantasma o trazos desordenados fuera de lugar.

### Regla Fundamental: Cubo Incompleto = 0%
- En dibujo en perspectiva y geometría analítica, un volumen no existe si faltan aristas estructurales.
- **Si falta aunque sea una sola arista por trazar** (por ejemplo, 3 de 5 o 4 de 5 aristas requeridas):
  - **Puntuación = 0%** (nunca puntuación parcial).
  - Estado: **No superado** (`passed: false`).
  - Feedback directo indicando el número exacto de aristas que faltan para completar la figura.
- **Solo cuando todas las aristas obligatorias han sido trazadas** se evalúa la calidad geométrica (fugas angulares, longitud, paralelismo y rectitud) para otorgar notas entre 0% y 100%.

### Umbrales de Aprobado (Criterio Estricto)
- **Aprobado (Pass)**: Puntuación $\ge 80\%$ y todas las aristas presentes sin defectos estructurales. Desbloquea XP, cuenta para combos en minijuegos y activa la animación de celebración en Cubito.
- **Suspenso (Fail)**: Puntuación $< 80\%$ o aristas incompletas (0%). Proporciona un mensaje de feedback pedagógico específico (`mainIssueMessage`) explicando exactamente el fallo (p. ej. *"Cubo incompleto: faltan 2 aristas"* o *"Desviación en aristas de fuga o trazo incompleto"*).

### Rangos de Calificación:
- **$\ge 92\%$**: *Sobresaliente.* Control milimétrico de la fuga y paralelismo exacto.
- **$80\% - 91\%$**: *Aprobado.* Trazo seguro, proporciones equilibradas y buena convergencia.
- **$70\% - 79\%$**: *No superado.* Desviación notable en aristas de fuga o aristas cortas.
- **$< 70\%$**: *Insuficiente.* Error estructural o distorsión geométrica grave.
