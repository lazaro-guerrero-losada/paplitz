/**
 * Sistema de cálculo y visualización de racha diaria (Daily Streak System)
 */

export interface DayStreakInfo {
  dateString: string;
  dayName: string; // 'LUN', 'MAR', 'MIÉ', etc.
  dayNameShort: string;
  dayNumber: number;
  isToday: boolean;
  isActive: boolean;
}

export interface StreakCheckResult {
  newStreak: number;
  isNewDay: boolean;
  activeDates: string[];
}

/**
 * Retorna la fecha local en formato 'YYYY-MM-DD'
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la lista de fechas activas desde localStorage
 */
export function getStoredActiveDates(): string[] {
  try {
    const raw = localStorage.getItem('paplitz_active_dates');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Comprueba y actualiza la racha diaria tras completar un reto con éxito
 */
export function recordDailyPractice(currentStreak: number): StreakCheckResult {
  const todayStr = getLocalDateString();
  const lastActiveDate = localStorage.getItem('paplitz_last_active_date');
  let activeDates = getStoredActiveDates();

  let newStreak = currentStreak;
  let isNewDay = false;

  if (lastActiveDate === todayStr) {
    // Ya se registró práctica hoy
    isNewDay = false;
    newStreak = Math.max(1, currentStreak);
  } else if (!lastActiveDate) {
    // Primera práctica registrada
    newStreak = Math.max(1, currentStreak);
    isNewDay = true;
  } else {
    // Calcular días naturales de diferencia entre hoy y la última fecha activa
    const dToday = new Date(todayStr + 'T00:00:00');
    const dLast = new Date(lastActiveDate + 'T00:00:00');
    const diffMs = dToday.getTime() - dLast.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Practicó ayer: ¡la racha aumenta en 1!
      newStreak = currentStreak + 1;
      isNewDay = true;
    } else if (diffDays > 1) {
      // Pasó más de un día sin practicar: reinicio de racha a 1
      newStreak = 1;
      isNewDay = true;
    } else {
      newStreak = Math.max(1, currentStreak);
    }
  }

  // Asegurar que las fechas de la racha actual estén presentes en activeDates
  if (!activeDates.includes(todayStr)) {
    activeDates.push(todayStr);
  }

  // Rellenar retroactivamente los días previos de la racha si faltan en el historial
  if (newStreak > 1) {
    const now = new Date(todayStr + 'T00:00:00');
    for (let i = 1; i < newStreak; i++) {
      const pastDate = new Date(now.getTime() - i * 86400000);
      const pastStr = getLocalDateString(pastDate);
      if (!activeDates.includes(pastStr)) {
        activeDates.push(pastStr);
      }
    }
  }

  activeDates.sort();
  // Conservar los últimos 60 días
  activeDates = activeDates.slice(-60);

  // Persistir en LocalStorage
  localStorage.setItem('paplitz_last_active_date', todayStr);
  localStorage.setItem('paplitz_streak', newStreak.toString());
  localStorage.setItem('paplitz_active_dates', JSON.stringify(activeDates));

  return {
    newStreak,
    isNewDay,
    activeDates,
  };
}

/**
 * Genera el desglose de los últimos 7 días terminando en hoy (o semana en curso)
 * para el visualizador gráfico de la racha
 */
export function getStreakWeekTimeline(activeDates: string[], streakDays: number): DayStreakInfo[] {
  const todayStr = getLocalDateString();
  const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  const dayNamesShort = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  // Ventana de 7 días: de 6 días atrás hasta hoy
  const timeline: DayStreakInfo[] = [];
  const today = new Date(todayStr + 'T00:00:00');

  // Si activeDates tiene menos entradas que streakDays, sintetizamos hacia atrás
  const allActiveSet = new Set(activeDates);
  for (let i = 0; i < streakDays; i++) {
    const d = new Date(today.getTime() - i * 86400000);
    allActiveSet.add(getLocalDateString(d));
  }

  for (let i = 6; i >= 0; i--) {
    const dateObj = new Date(today.getTime() - i * 86400000);
    const dateStr = getLocalDateString(dateObj);
    const dayOfWeek = dateObj.getDay();

    timeline.push({
      dateString: dateStr,
      dayName: dayNames[dayOfWeek],
      dayNameShort: dayNamesShort[dayOfWeek],
      dayNumber: dateObj.getDate(),
      isToday: dateStr === todayStr,
      isActive: allActiveSet.has(dateStr),
    });
  }

  return timeline;
}
