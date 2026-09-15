# 📐 Motor de Geometría y Proyección en Perspectiva

El archivo `src/lib/geometry.ts` contiene el motor matemático que calcula los volúmenes 3D, las proyecciones cónicas, los puntos de fuga y la proyección de sombras sobre plano horizontal.

---

## 1. Sistema de Coordenadas 3D del Cubo

El cubo se define en el espacio tridimensional mediante **8 vértices** ($V_0$ a $V_7$) y **12 aristas**:

```text
         V7 +------------------+ V6
           /|                 /|
          / |                / |
      V4 +------------------+ V5
         |  |               |  |
         |  | V3            |  |
         |  +---------------|--+ V2
         | /                | /
         |/                 |/
      V0 +------------------+ V1
```

- **Familias de Aristas**:
  - **Altura (Z / verticales)**: $(V_0, V_4)$, $(V_1, V_5)$, $(V_2, V_6)$, $(V_3, V_7)$.
  - **Anchura (X / fuga izquierda)**: $(V_0, V_3)$, $(V_1, V_2)$, $(V_4, V_7)$, $(V_5, V_6)$.
  - **Profundidad (Y / fuga derecha)**: $(V_0, V_1)$, $(V_3, V_2)$, $(V_4, V_5)$, $(V_7, V_6)$.

---

## 2. Proyección en Perspectiva Cónica (Fugas)

A diferencia de la perspectiva caballera o isométrica ortogonal, Paplitz proyecta en **perspectiva cónica real**:
- Las líneas paralelas en el espacio 3D convergen hacia **Puntos de Fuga** ($VP_X$, $VP_Y$, $VP_Z$).
- Para proyectar un punto 3D $P(x, y, z)$ a la pantalla 2D $p(x', y')$:
  $$\text{depth} = z_{cam} + d_{focal}$$
  $$x' = x_0 + \frac{x \cdot d_{focal}}{\text{depth}} \cdot S_x$$
  $$y' = y_0 - \frac{y \cdot d_{focal}}{\text{depth}} \cdot S_y$$
- **Modos de Perspectiva**:
  1. `'guided'`: Fugas suaves muy alejadas, distorsión mínima, ideal para principiantes.
  2. `'gentle'`: Fuga natural moderada (equivalente a lente fotográfica de 50mm).
  3. `'normal'`: Perspectiva estándar de diseño industrial (35mm).
  4. `'dynamic'`: Fugas agresivas y pronunciadas (24mm, gran angular).

---

## 3. Modos de Ejes Guía (`AxesMode`)

El motor admite 3 configuraciones según el nivel de dificultad:
1. `'xyz'`: Se muestran los 3 ejes de coordenadas proyectados desde el vértice frontal:
   - **Eje Z**: vertical frontal.
   - **Ejes X e Y**: fugas hacia izquierda y derecha.
2. `'base_axes'`: Solo se muestran los ejes X e Y (el alumno debe deducir la verticalidad Z).
3. `'none'`: Sin ejes de apoyo (reto libre a mano alzada).

---

## 4. Retos de Sombras sobre Plano Horizontal (Nivel 8)

El nivel 8 introduce el cálculo de **sombras arrojadas por luz puntual**:
- **Foco de Luz ($L$)**: Punto en el espacio aéreo $(x_L, y_L, z_L)$.
- **Estación en Tierra ($L'$)**: Proyección ortogonal de la luz sobre el plano del suelo $Z = 0$, es decir, $(x_L, y_L, 0)$.
- **Intersección de Rayo de Sombra**:
  Para cada vértice superior $V_{top}$ y su correspondiente vértice de base $V_{base}$:
  1. Un rayo pasa desde la luz $L$ a través de $V_{top}$.
  2. Una traza en el suelo va desde la base de la luz $L'$ a través de $V_{base}$.
  3. El punto de sombra en el suelo $S$ es la intersección de ambas líneas:
     $$S = L' + \frac{z_L}{z_L - z_{top}} \cdot (V_{base} - L')$$
- **Malla Cuadrada de Suelo (`hasGroundGrid`)**:
  Dibuja una cuadrícula sutil en el suelo con líneas finas convergentes que orientan al usuario para visualizar el plano horizontal de contacto.
