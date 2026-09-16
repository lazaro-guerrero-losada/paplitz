import { getSupabaseConfig, hashPin, validateCredentialsFormat } from './cloudSync';
import { PaplitzSaveData, validateSaveData } from './saveSystem';

export interface ClassData {
  code: string;
  name: string;
  teacherAlias: string;
  createdAt: string;
  memberCount?: number;
}

export interface StudentProgressData {
  alias: string;
  joinedAt: string;
  xp: number;
  streak: number;
  completedCount: number;
  totalCount: number;
  accuracyAverage: number;
  lastActive?: string;
}

export interface FriendData {
  alias: string;
  xp: number;
  streak: number;
  level: number;
  completedCount: number;
  accuracyAverage: number;
  lastActive?: string;
}

/**
 * Genera un código de clase alfanumérico legible de 6 caracteres (ej. CUB-842)
 */
function generateClassCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  let prefix = '';
  for (let i = 0; i < 3; i++) {
    prefix += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return `${prefix}-${suffix}`;
}

// ==========================================
// SECCIÓN PROFESOR (CREAR Y GESTIONAR AULAS)
// ==========================================

/**
 * Crea una nueva clase/aula como profesor
 */
export async function createClass(
  name: string,
  teacherAlias: string,
  teacherPin: string
): Promise<{ success: boolean; classData?: ClassData; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  const cleanName = name.trim();
  if (!cleanName || cleanName.length < 3 || cleanName.length > 50) {
    return { success: false, error: 'El nombre de la clase debe tener entre 3 y 50 caracteres.' };
  }

  const credValidation = validateCredentialsFormat(teacherAlias, teacherPin);
  if (!credValidation.valid) {
    return { success: false, error: credValidation.error };
  }

  try {
    const pinHash = await hashPin(teacherPin);
    const code = generateClassCode();
    const cleanTeacherAlias = teacherAlias.trim().toLowerCase();

    const res = await fetch(`${config.url}/rest/v1/classes`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        code,
        name: cleanName,
        teacher_alias: cleanTeacherAlias,
        teacher_pin_hash: pinHash,
        created_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[SocialSync] Error al crear clase:', res.status, errText);
      return { success: false, error: `Error al crear la clase (código ${res.status}).` };
    }

    const created = await res.json();
    const row = Array.isArray(created) ? created[0] : created;

    return {
      success: true,
      classData: {
        code: row.code,
        name: row.name,
        teacherAlias: row.teacher_alias,
        createdAt: row.created_at,
        memberCount: 0,
      },
    };
  } catch (err) {
    console.error('[SocialSync] Error de red:', err);
    return { success: false, error: 'Error de conexión con el servidor.' };
  }
}

/**
 * Obtiene todas las clases creadas por el profesor
 */
export async function getTeacherClasses(
  teacherAlias: string,
  teacherPin: string
): Promise<{ success: boolean; classes?: ClassData[]; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  try {
    const cleanTeacherAlias = teacherAlias.trim().toLowerCase();
    const pinHash = await hashPin(teacherPin);

    // Consultar clases con el alias del profesor y comprobar pin
    const url = `${config.url}/rest/v1/classes?teacher_alias=eq.${encodeURIComponent(cleanTeacherAlias)}&select=code,name,teacher_alias,teacher_pin_hash,created_at`;
    const res = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: 'No se pudieron consultar las clases.' };
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) return { success: true, classes: [] };

    // Filtrar por PIN hash
    const validRows = rows.filter((r) => r.teacher_pin_hash === pinHash);

    // Obtener recuento de alumnos por clase
    const classesWithCount: ClassData[] = await Promise.all(
      validRows.map(async (r) => {
        let count = 0;
        try {
          const membersRes = await fetch(
            `${config.url}/rest/v1/class_members?class_code=eq.${encodeURIComponent(r.code)}&select=student_alias`,
            {
              headers: {
                apikey: config.anonKey,
                Authorization: `Bearer ${config.anonKey}`,
              },
            }
          );
          if (membersRes.ok) {
            const m = await membersRes.json();
            count = Array.isArray(m) ? m.length : 0;
          }
        } catch {
          // Ignorar error de conteo
        }
        return {
          code: r.code,
          name: r.name,
          teacherAlias: r.teacher_alias,
          createdAt: r.created_at,
          memberCount: count,
        };
      })
    );

    return { success: true, classes: classesWithCount };
  } catch (err) {
    console.error('[SocialSync] Error al obtener clases del profesor:', err);
    return { success: false, error: 'Error de red al consultar clases.' };
  }
}

/**
 * Obtiene la lista de alumnos inscritos en una clase con sus métricas pedagógicas
 */
export async function getClassStudentsWithProgress(
  classCode: string,
  teacherPin: string
): Promise<{ success: boolean; students?: StudentProgressData[]; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  try {
    const cleanCode = classCode.trim().toUpperCase();
    const pinHash = await hashPin(teacherPin);

    // 1. Verificar que la clase existe y el PIN coincide
    const classRes = await fetch(
      `${config.url}/rest/v1/classes?code=eq.${encodeURIComponent(cleanCode)}&select=teacher_pin_hash`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );

    if (!classRes.ok) {
      return { success: false, error: 'Error al consultar la clase.' };
    }

    const classRows = await classRes.json();
    if (!Array.isArray(classRows) || classRows.length === 0) {
      return { success: false, error: 'La clase no existe.' };
    }

    if (classRows[0].teacher_pin_hash !== pinHash) {
      return { success: false, error: 'PIN de profesor incorrecto para esta clase.' };
    }

    // 2. Obtener miembros de la clase
    const membersRes = await fetch(
      `${config.url}/rest/v1/class_members?class_code=eq.${encodeURIComponent(cleanCode)}&select=student_alias,joined_at&order=joined_at.desc`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );

    if (!membersRes.ok) {
      return { success: false, error: 'Error al obtener alumnos de la clase.' };
    }

    const members: { student_alias: string; joined_at: string }[] = await membersRes.json();
    if (!Array.isArray(members) || members.length === 0) {
      return { success: true, students: [] };
    }

    // 3. Obtener el progreso de cada alumno desde user_saves
    const studentsWithStats: StudentProgressData[] = await Promise.all(
      members.map(async (m) => {
        try {
          const saveRes = await fetch(
            `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(m.student_alias)}&select=save_data,updated_at`,
            {
              headers: {
                apikey: config.anonKey,
                Authorization: `Bearer ${config.anonKey}`,
              },
            }
          );

          if (saveRes.ok) {
            const saves = await saveRes.json();
            if (Array.isArray(saves) && saves.length > 0) {
              const row = saves[0];
              const parsed = validateSaveData(row.save_data);
              if (parsed.valid && parsed.data) {
                const data: PaplitzSaveData = parsed.data;
                const completedCount = data.units.reduce(
                  (acc, u) => acc + u.nodes.filter((n) => n.status === 'completed').length,
                  0
                );
                const totalCount = data.units.reduce((acc, u) => acc + u.nodes.length, 0);
                const accuracyAverage =
                  data.scoresHistory && data.scoresHistory.length > 0
                    ? Math.round(data.scoresHistory.reduce((a, b) => a + b, 0) / data.scoresHistory.length)
                    : 0;

                return {
                  alias: m.student_alias,
                  joinedAt: m.joined_at,
                  xp: data.xp,
                  streak: data.streak,
                  completedCount,
                  totalCount,
                  accuracyAverage,
                  lastActive: row.updated_at,
                };
              }
            }
          }
        } catch {
          // Fallback en caso de error de lectura de guardado
        }

        return {
          alias: m.student_alias,
          joinedAt: m.joined_at,
          xp: 0,
          streak: 0,
          completedCount: 0,
          totalCount: 36,
          accuracyAverage: 0,
        };
      })
    );

    return { success: true, students: studentsWithStats };
  } catch (err) {
    console.error('[SocialSync] Error al consultar alumnos:', err);
    return { success: false, error: 'Error de red al consultar alumnos.' };
  }
}

// ==========================================
// SECCIÓN ALUMNO (UNIRSE Y VER CLASES)
// ==========================================

/**
 * Unirse a una clase usando un código (ej. CUB-842)
 */
export async function joinClass(
  classCode: string,
  studentAlias: string
): Promise<{ success: boolean; classData?: ClassData; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  const cleanCode = classCode.trim().toUpperCase();
  const cleanAlias = studentAlias.trim().toLowerCase();

  if (!cleanCode || cleanCode.length < 4) {
    return { success: false, error: 'Código de clase no válido.' };
  }
  if (!cleanAlias || cleanAlias.length < 3) {
    return { success: false, error: 'Introduce tu Alias de jugador para unirte a la clase.' };
  }

  try {
    // 1. Verificar si la clase existe
    const classRes = await fetch(
      `${config.url}/rest/v1/classes?code=eq.${encodeURIComponent(cleanCode)}&select=code,name,teacher_alias,created_at`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );

    if (!classRes.ok) {
      return { success: false, error: 'Error al verificar la clase.' };
    }

    const classRows = await classRes.json();
    if (!Array.isArray(classRows) || classRows.length === 0) {
      return { success: false, error: `No se encontró ninguna clase con el código "${cleanCode}".` };
    }

    const targetClass = classRows[0];

    // 2. Registrar al alumno en class_members (upsert para no duplicar)
    const joinRes = await fetch(`${config.url}/rest/v1/class_members`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        class_code: cleanCode,
        student_alias: cleanAlias,
        joined_at: new Date().toISOString(),
      }),
    });

    if (!joinRes.ok) {
      return { success: false, error: 'No se pudo registrar en la clase.' };
    }

    return {
      success: true,
      classData: {
        code: targetClass.code,
        name: targetClass.name,
        teacherAlias: targetClass.teacher_alias,
        createdAt: targetClass.created_at,
      },
    };
  } catch (err) {
    console.error('[SocialSync] Error al unirse a clase:', err);
    return { success: false, error: 'Error de red al unirse a la clase.' };
  }
}

/**
 * Obtiene las clases en las que un alumno está inscrito
 */
export async function getStudentClasses(
  studentAlias: string
): Promise<{ success: boolean; classes?: ClassData[]; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  try {
    const cleanAlias = studentAlias.trim().toLowerCase();
    const membersRes = await fetch(
      `${config.url}/rest/v1/class_members?student_alias=eq.${encodeURIComponent(cleanAlias)}&select=class_code,joined_at`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );

    if (!membersRes.ok) {
      return { success: false, error: 'Error al consultar tus clases.' };
    }

    const members: { class_code: string; joined_at: string }[] = await membersRes.json();
    if (!Array.isArray(members) || members.length === 0) {
      return { success: true, classes: [] };
    }

    // Obtener detalles de cada clase
    const classesList: ClassData[] = await Promise.all(
      members.map(async (m) => {
        try {
          const cRes = await fetch(
            `${config.url}/rest/v1/classes?code=eq.${encodeURIComponent(m.class_code)}&select=code,name,teacher_alias,created_at`,
            {
              headers: {
                apikey: config.anonKey,
                Authorization: `Bearer ${config.anonKey}`,
              },
            }
          );
          if (cRes.ok) {
            const rows = await cRes.json();
            if (Array.isArray(rows) && rows.length > 0) {
              const r = rows[0];
              return {
                code: r.code,
                name: r.name,
                teacherAlias: r.teacher_alias,
                createdAt: m.joined_at,
              };
            }
          }
        } catch {
          // Ignorar fallo puntual
        }
        return {
          code: m.class_code,
          name: 'Clase Paplitz',
          teacherAlias: 'Profesor',
          createdAt: m.joined_at,
        };
      })
    );

    return { success: true, classes: classesList };
  } catch (err) {
    console.error('[SocialSync] Error al consultar clases de alumno:', err);
    return { success: false, error: 'Error de red.' };
  }
}

/**
 * Salir de una clase
 */
export async function leaveClass(
  classCode: string,
  studentAlias: string
): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return { success: false, error: 'No configurado.' };

  try {
    const res = await fetch(
      `${config.url}/rest/v1/class_members?class_code=eq.${encodeURIComponent(classCode.toUpperCase())}&student_alias=eq.${encodeURIComponent(studentAlias.toLowerCase())}`,
      {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );
    return { success: res.ok };
  } catch {
    return { success: false, error: 'Error de red al salir de la clase.' };
  }
}

// ==========================================
// SECCIÓN AMIGOS (AGREGAR Y LISTAR)
// ==========================================

/**
 * Agrega un amigo por su Alias
 */
export async function addFriend(
  userAlias: string,
  friendAlias: string
): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  const cleanUser = userAlias.trim().toLowerCase();
  const cleanFriend = friendAlias.trim().toLowerCase();

  if (!cleanUser || !cleanFriend) {
    return { success: false, error: 'Debes introducir un alias de amigo.' };
  }
  if (cleanUser === cleanFriend) {
    return { success: false, error: 'No puedes agregarte a ti mismo como amigo.' };
  }

  try {
    // 1. Verificar si el amigo existe en user_saves
    const checkRes = await fetch(
      `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(cleanFriend)}&select=alias`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );

    if (!checkRes.ok) {
      return { success: false, error: 'Error al comprobar usuario.' };
    }

    const checkRows = await checkRes.json();
    if (!Array.isArray(checkRows) || checkRows.length === 0) {
      return {
        success: false,
        error: `No existe ningún usuario con el alias "${cleanFriend}" en la nube.`,
      };
    }

    // 2. Guardar en user_friends
    const addRes = await fetch(`${config.url}/rest/v1/user_friends`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_alias: cleanUser,
        friend_alias: cleanFriend,
        created_at: new Date().toISOString(),
      }),
    });

    if (!addRes.ok) {
      return { success: false, error: 'Error al agregar amigo.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[SocialSync] Error al agregar amigo:', err);
    return { success: false, error: 'Error de red.' };
  }
}

/**
 * Obtiene la lista de amigos con sus estadísticas
 */
export async function getFriendsWithStats(
  userAlias: string
): Promise<{ success: boolean; friends?: FriendData[]; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  try {
    const cleanUser = userAlias.trim().toLowerCase();
    const res = await fetch(
      `${config.url}/rest/v1/user_friends?user_alias=eq.${encodeURIComponent(cleanUser)}&select=friend_alias`,
      {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );

    if (!res.ok) {
      return { success: false, error: 'Error al obtener lista de amigos.' };
    }

    const rows: { friend_alias: string }[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: true, friends: [] };
    }

    // Consultar stats de cada amigo
    const friendsStats: FriendData[] = await Promise.all(
      rows.map(async (f) => {
        try {
          const saveRes = await fetch(
            `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(f.friend_alias)}&select=save_data,updated_at`,
            {
              headers: {
                apikey: config.anonKey,
                Authorization: `Bearer ${config.anonKey}`,
              },
            }
          );
          if (saveRes.ok) {
            const saves = await saveRes.json();
            if (Array.isArray(saves) && saves.length > 0) {
              const row = saves[0];
              const parsed = validateSaveData(row.save_data);
              if (parsed.valid && parsed.data) {
                const data = parsed.data;
                const completedCount = data.units.reduce(
                  (acc, u) => acc + u.nodes.filter((n) => n.status === 'completed').length,
                  0
                );
                const accuracyAverage =
                  data.scoresHistory && data.scoresHistory.length > 0
                    ? Math.round(data.scoresHistory.reduce((a, b) => a + b, 0) / data.scoresHistory.length)
                    : 0;

                // Nivel aproximado según XP
                const level = Math.floor(Math.sqrt(data.xp / 50)) + 1;

                return {
                  alias: f.friend_alias,
                  xp: data.xp,
                  streak: data.streak,
                  level,
                  completedCount,
                  accuracyAverage,
                  lastActive: row.updated_at,
                };
              }
            }
          }
        } catch {
          // Ignorar fallo puntual
        }

        return {
          alias: f.friend_alias,
          xp: 0,
          streak: 0,
          level: 1,
          completedCount: 0,
          accuracyAverage: 0,
        };
      })
    );

    return { success: true, friends: friendsStats };
  } catch (err) {
    console.error('[SocialSync] Error al consultar amigos:', err);
    return { success: false, error: 'Error de red.' };
  }
}

/**
 * Elimina a un amigo de la lista
 */
export async function removeFriend(
  userAlias: string,
  friendAlias: string
): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) return { success: false, error: 'No configurado.' };

  try {
    const res = await fetch(
      `${config.url}/rest/v1/user_friends?user_alias=eq.${encodeURIComponent(userAlias.toLowerCase())}&friend_alias=eq.${encodeURIComponent(friendAlias.toLowerCase())}`,
      {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }
    );
    return { success: res.ok };
  } catch {
    return { success: false, error: 'Error de red.' };
  }
}
