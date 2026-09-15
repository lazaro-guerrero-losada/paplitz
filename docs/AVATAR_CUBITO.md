# 🤖 Sensei Cubo ("Cubito") — Compañero Avatar Interactivo

El archivo `src/components/avatar/SenseiCubo.tsx` implementa a **Cubito**, el personaje que acompaña, guía y evalúa al usuario.

---

## 1. Motor de Renderizado

- **Tecnología**: Integrado mediante la librería oficial de **Bible Strong Avatar**:
  - `@bible-strong/avatar-core` (resolución matemática de geometría, mallas y expresiones).
  - `@bible-strong/avatar-react` (componente React `<Avatar />`).
- **Definición del Personaje**: Almacenado en `src/lib/cubee.avatar.json`.
  - **Ojos**: 100% blancos (`#ffffff`).
  - **Cuerpo**: Oscuro mate (`#16171a`), estética técnica de manga/diseño industrial.
  - **Morfología**: Cubo con biselado suave de esquinas redondeadas (`roundness: 0.73`).

---

## 2. Máquina de Estados de Ánimo (`AvatarMood`)

Cubito responde reactivamente a lo que sucede en la aplicación:

| Estado / Prop | Animación Cubee | Disparador / Comportamiento |
| :--- | :--- | :--- |
| `idle` / por defecto | `idle` | Miradas curiosas naturales a los lados y parpadeos suaves. |
| `isDrawing = true` | `working` | Se activa en tiempo real mientras el usuario dibuja trazos en el lienzo (ojos concentrados). |
| Aprobado $\ge 75\%$ | `celebrate` | Ojos en estrella, saltito y celebración. |
| Suspenso $< 75\%$ | `sad` | Mirada abatida o espirales de desconcierto. |
| Racha / Combo | `happy` / `excited` | Celebración entusiasta ante cadenas de cubos aprobados. |
| Inactividad $> 20$s | `sleeping` | Cierra los ojos y duerme plácidamente. Se despierta al mover el ratón. |
| Hover del cursor | `angry` / `scared` | Alterna entre enfurruñado y temblor de miedo (`cubito-tremor`). |
| Arrastre activo | `playful` | Animación juguetona flotando en el aire. |
| Clic directo (*poke*) | `playful` | Guiño y reacción traviesa. |

---

## 3. Física de Arrastre (*Draggable*) y Límites de Colisión

Cubito se puede arrastrar libremente por el espacio con ratón o dedo táctil:
- **Movimiento a 60/120 FPS**: Se aplica directamente sobre `style.transform = translate3d(x, y, 0)` en el DOM sin re-renderizar React durante el movimiento.
- **Captura de Puntero (`setPointerCapture`)**: Garantiza que no se suelte el arrastre aunque el cursor se mueva bruscamente.
- **Distinción Arrastre vs Clic**: Si el puntero se desplaza menos de 4 píxeles, se computa como un *poke* (toque); si se desplaza más, se computa como arrastre.
- **Doble Clic de Reinicio**: Hacer doble clic sobre Cubito lo devuelve automáticamente a su posición de inicio con un rebote elástico.

### Algoritmo de Evasión de Obstáculos (`clampAndResolvePosition`)
Para evitar que Cubito interfiera con el dibujo o tape controles:
1. **Lienzo Prohibido**: La columna central (marcada con `data-canvas-zone="true"`) incluye el lienzo, el selector de lección y los botones de acción (*Deshacer*, *Borrar*, *Validar*). Cubito no puede penetrar este área; si el usuario intenta soltarlo dentro, el algoritmo calcula la distancia mínima de expulsión cardinal (izquierda, derecha, arriba, abajo) y lo proyecta contra el borde exterior.
2. **Cabecera Prohibida**: El límite superior se fija en `minY = headerRect.bottom + 12px`, protegiendo la barra de navegación, el selector de nivel y los puntos XP.
3. **Contención en Pantalla**: Clampeado estricto a los bordes de la ventana del navegador (`pad = 12px`).
