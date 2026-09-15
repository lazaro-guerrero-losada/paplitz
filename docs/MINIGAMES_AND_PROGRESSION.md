# 🕹️ Minijuegos Arcade y Sistema de Progresión

El archivo `src/components/MinigamesView.tsx` implementa los modos arcade pensados para practicar velocidad y automatización espacial.

---

## 1. Los 4 Modos Arcade

### 1. Fiebre de Tiempo (*Time Fever*)
- **Mecánica**: Comienzas con **40 segundos** en el reloj.
- **Acierto**: Cada cubo aprobado suma **+5 segundos** al temporizador.
- **Penalizaciones**:
  - *Deshacer último trazo*: penaliza **-2 segundos**.
  - *Saltar cubo*: penaliza **-4 segundos**.
  - *Borrar todo*: **DESHABILITADO** (en Fiebre debes pensar rápido y ser preciso).
- **Cubo Estrella Especial**: Con una probabilidad del $20\%$, aparece un "Cubo Estrella". Aprobarlo otorga un bonus masivo de **+20 segundos**.
- **Objetivo**: Encadenar la mayor racha de combos posible antes de que el reloj llegue a 0.

### 2. Blitz 60s (*Speed Challenge*)
- **Mecánica**: Una prueba pura de velocidad con reloj cerrado de **60 segundos**.
- **Objetivo**: Aprobar el máximo número de cubos en un minuto sin penalizaciones de tiempo.

### 3. Supervivencia (*One Strike Out*)
- **Mecánica**: Dispones de **20 segundos** por cubo.
- El reloj se resetea a 20s en cada acierto.
- Si fallas un intento o se acaba el tiempo: **Muerte Súbita (Game Over inmediato)**.

### 4. Sprint 5 Cubos (*Time Attack*)
- **Mecánica**: El cronómetro corre hacia arriba desde 0.0s.
- **Objetivo**: Completar **5 cubos aprobados consecutivamente** en el menor tiempo humano posible.
- Guarda récords locales por lección.

---

## 2. Sistema de Niveles y Puntos XP (`src/lib/levelSystem.ts`)

- **Ganancia de XP**:
  - Lección regular aprobada: $+25$ XP.
  - Examen de unidad superado: $+100$ XP.
  - Partida de minijuegos: XP proporcional a cubos completados.
- **Rangos de Dibujante**:
  - **Novato** (0 - 250 XP): Aprende los ejes base y fugas suaves.
  - **Aprendiz** (250 - 750 XP): Domina proporciones y cierres de caras.
  - **Delineante** (750 - 1,500 XP): Fugas dinámicas y 3 puntos de fuga.
  - **Bocetador Industrial** (1,500 - 3,000 XP): Sombras arrojadas y retos ciegos sin ejes.
  - **Maestro del Espacio** (3,000+ XP): Velocidad absoluta y precisión milimétrica.
