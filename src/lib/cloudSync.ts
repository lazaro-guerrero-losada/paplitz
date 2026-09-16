import { PaplitzSaveData, validateSaveData } from './saveSystem';

/**
 * Límite preventivo de usuarios en la nube para no superar la cuota gratuita de Supabase
 */
export const MAX_CLOUD_USERS = 5000;

/**
 * Obtiene la configuración de Supabase desde las variables de entorno de Vite
 */
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http')),
  };
}

/**
 * Genera un hash criptográfico SHA-256 para el PIN utilizando la Web Crypto API nativa
 */
export async function hashPin(pin: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(`paplitz-salt-v1:${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera una clave de recuperación alfanumérica única y legible (ej. REC-7K9M-2P8W)
 */
export function generateRecoveryKey(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REC-${part1}-${part2}`;
}

/**
 * Genera el hash criptográfico para la clave de recuperación
 */
export async function hashRecoveryKey(key: string): Promise<string> {
  const cleanKey = key.trim().toUpperCase();
  const msgUint8 = new TextEncoder().encode(`paplitz-recovery-v1:${cleanKey}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}


/**
 * Valida el formato del alias y del PIN
 */
export function validateCredentialsFormat(alias: string, pin: string): { valid: boolean; error?: string } {
  const cleanAlias = alias.trim();
  if (cleanAlias.length < 3 || cleanAlias.length > 24) {
    return { valid: false, error: 'El nombre de usuario debe tener entre 3 y 24 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanAlias)) {
    return { valid: false, error: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.' };
  }

  const cleanPin = pin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { valid: false, error: 'El PIN debe ser un código de 4 a 6 números (ej. 1234).' };
  }

  return { valid: true };
}

/**
 * Comprueba el aforo de la base de datos y purga usuarios inactivos si se acerca al tope
 */
export async function checkCloudCapacityAndCleanup(
  config: { url: string; anonKey: string }
): Promise<{ allowed: boolean; currentUsers?: number; error?: string }> {
  try {
    // 1. Obtener conteo exacto de usuarios registrados mediante encabezado Prefer: count=exact
    const countRes = await fetch(`${config.url}/rest/v1/user_saves?select=alias&limit=1`, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Prefer: 'count=exact',
      },
    });

    if (!countRes.ok) {
      return { allowed: true };
    }

    const contentRange = countRes.headers.get('content-range');
    let totalCount = 0;
    if (contentRange && contentRange.includes('/')) {
      const parts = contentRange.split('/');
      totalCount = parseInt(parts[1], 10) || 0;
    }

    // 2. Si se aproxima al tope (> 90% del límite), intentar purgar inactivos de más de 60 días
    if (totalCount >= MAX_CLOUD_USERS * 0.9) {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      await fetch(`${config.url}/rest/v1/user_saves?last_active_at=lt.${encodeURIComponent(sixtyDaysAgo)}`, {
        method: 'DELETE',
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
        },
      }).catch(() => {});
    }

    // 3. Si aún se supera el aforo estricto
    if (totalCount >= MAX_CLOUD_USERS) {
      return {
        allowed: false,
        currentUsers: totalCount,
        error: `El servidor en la nube ha alcanzado su capacidad máxima (${MAX_CLOUD_USERS} usuarios). Para garantizar la estabilidad del servicio gratuito, utiliza el Guardado Local (.json) para seguir jugando sin límites.`,
      };
    }

    return { allowed: true, currentUsers: totalCount };
  } catch (err) {
    console.warn('[CloudSync] No se pudo verificar aforo:', err);
    return { allowed: true };
  }
}

/**
 * Guarda o actualiza el progreso del usuario en la base de datos Supabase
 */
export async function saveProgressToCloud(
  alias: string,
  pin: string,
  saveData: PaplitzSaveData
): Promise<{ success: boolean; recoveryKey?: string; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'La sincronización en la nube aún no está configurada en este servidor (falta VITE_SUPABASE_URL).',
    };
  }

  const validation = validateCredentialsFormat(alias, pin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const normalizedAlias = alias.trim().toLowerCase();
    const pinHash = await hashPin(pin);
    const nowIso = new Date().toISOString();

    // 1. Comprobar si ya existe el usuario para verificar el PIN o crear clave de recuperación
    const checkUrl = `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(normalizedAlias)}&select=alias,pin_hash,recovery_key_hash`;
    const checkRes = await fetch(checkUrl, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    let isNewUser = true;
    let existingRecoveryHash: string | null = null;
    let newGeneratedRecoveryKey: string | undefined = undefined;

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        isNewUser = false;
        const userRow = existing[0];
        if (userRow.pin_hash && userRow.pin_hash !== pinHash) {
          return {
            success: false,
            error: 'Este nombre de usuario ya está en uso y el PIN no coincide. Usa tu PIN correcto o recupera tu cuenta.',
          };
        }
        existingRecoveryHash = userRow.recovery_key_hash || null;
      }
    }

    // 2. Si es usuario nuevo, comprobar límite de aforo preventivo y generar clave de recuperación
    if (isNewUser) {
      const capacity = await checkCloudCapacityAndCleanup(config);
      if (!capacity.allowed) {
        return { success: false, error: capacity.error };
      }
      newGeneratedRecoveryKey = generateRecoveryKey();
    } else if (!existingRecoveryHash) {
      newGeneratedRecoveryKey = generateRecoveryKey();
    }

    const recoveryHashToSave = newGeneratedRecoveryKey
      ? await hashRecoveryKey(newGeneratedRecoveryKey)
      : existingRecoveryHash;

    // 3. Guardar o actualizar la partida (Upsert)
    const upsertUrl = `${config.url}/rest/v1/user_saves`;
    const payload: Record<string, unknown> = {
      alias: normalizedAlias,
      pin_hash: pinHash,
      save_data: saveData,
      updated_at: nowIso,
      last_active_at: nowIso,
    };
    if (recoveryHashToSave) {
      payload.recovery_key_hash = recoveryHashToSave;
    }

    const upsertRes = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('[CloudSync] Error HTTP en Supabase:', upsertRes.status, errText);
      return {
        success: false,
        error: `Error al guardar en la nube (código ${upsertRes.status}). Comprueba la conexión o permisos.`,
      };
    }

    // Recordar el último alias y clave en localStorage para comodidad
    localStorage.setItem('paplitz_cloud_alias', normalizedAlias);
    if (newGeneratedRecoveryKey) {
      localStorage.setItem(`paplitz_recovery_${normalizedAlias}`, newGeneratedRecoveryKey);
    }

    return {
      success: true,
      recoveryKey: newGeneratedRecoveryKey,
    };
  } catch (err) {
    console.error('[CloudSync] Error de red:', err);
    return {
      success: false,
      error: 'Error de conexión con el servidor. Comprueba tu conexión a internet.',
    };
  }
}

/**
 * Descarga y restaura el progreso del usuario desde la base de datos Supabase
 */
export async function loadProgressFromCloud(
  alias: string,
  pin: string
): Promise<{ success: boolean; data?: PaplitzSaveData; recoveryKey?: string; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      error: 'La sincronización en la nube aún no está configurada en este servidor (falta VITE_SUPABASE_URL).',
    };
  }

  const validation = validateCredentialsFormat(alias, pin);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const normalizedAlias = alias.trim().toLowerCase();
    const pinHash = await hashPin(pin);

    const queryUrl = `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(normalizedAlias)}&select=alias,pin_hash,save_data,recovery_key_hash`;
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Error al conectar con la nube (código ${res.status}).`,
      };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        success: false,
        error: `No se encontró ninguna partida guardada con el usuario "${normalizedAlias}".`,
      };
    }

    const row = rows[0];
    if (row.pin_hash && row.pin_hash !== pinHash) {
      return {
        success: false,
        error: 'El PIN introducido no es correcto para este usuario.',
      };
    }

    const validateResult = validateSaveData(row.save_data);
    if (!validateResult.valid || !validateResult.data) {
      return {
        success: false,
        error: validateResult.error || 'Los datos de la partida en la nube están corruptos.',
      };
    }

    // Actualizar timestamp de última actividad
    fetch(`${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(normalizedAlias)}`, {
      method: 'PATCH',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ last_active_at: new Date().toISOString() }),
    }).catch(() => {});

    localStorage.setItem('paplitz_cloud_alias', normalizedAlias);

    const cachedKey = localStorage.getItem(`paplitz_recovery_${normalizedAlias}`) || undefined;

    return {
      success: true,
      data: validateResult.data,
      recoveryKey: cachedKey,
    };
  } catch (err) {
    console.error('[CloudSync] Error al cargar de la nube:', err);
    return {
      success: false,
      error: 'Error de red al intentar descargar la partida.',
    };
  }
}

/**
 * Recupera el progreso en caso de PIN olvidado mediante la Clave de Recuperación de Emergencia
 */
export async function recoverProgressWithKey(
  alias: string,
  recoveryKey: string
): Promise<{ success: boolean; data?: PaplitzSaveData; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  const cleanAlias = alias.trim().toLowerCase();
  const cleanKey = recoveryKey.trim().toUpperCase();

  if (!cleanAlias || cleanAlias.length < 3) {
    return { success: false, error: 'Introduce un alias válido.' };
  }
  if (!cleanKey.startsWith('REC-') || cleanKey.length < 8) {
    return { success: false, error: 'El formato de la clave debe ser como REC-XXXX-XXXX.' };
  }

  try {
    const keyHash = await hashRecoveryKey(cleanKey);

    const queryUrl = `${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(cleanAlias)}&select=alias,recovery_key_hash,save_data`;
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!res.ok) {
      return { success: false, error: `Error en el servidor al consultar la cuenta (código ${res.status}).` };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: `No se encontró ninguna cuenta con el alias "${cleanAlias}".` };
    }

    const row = rows[0];
    if (!row.recovery_key_hash || row.recovery_key_hash !== keyHash) {
      return { success: false, error: 'La clave de recuperación no coincide con la registrada para este alias.' };
    }

    const validateResult = validateSaveData(row.save_data);
    if (!validateResult.valid || !validateResult.data) {
      return { success: false, error: 'Los datos de la partida recuperada están dañados.' };
    }

    // Actualizar actividad
    fetch(`${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(cleanAlias)}`, {
      method: 'PATCH',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ last_active_at: new Date().toISOString() }),
    }).catch(() => {});

    return {
      success: true,
      data: validateResult.data,
    };
  } catch (err) {
    console.error('[CloudSync] Error en recuperación por clave:', err);
    return { success: false, error: 'Error de red al intentar recuperar la cuenta.' };
  }
}

/**
 * Elimina una cuenta antigua en la nube (por PIN o por clave de recuperación) para no saturar el servidor
 */
export async function deleteCloudAccount(
  alias: string,
  pinOrKey: string
): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return { success: false, error: 'La nube de Supabase no está configurada.' };
  }

  const cleanAlias = alias.trim().toLowerCase();
  const cred = pinOrKey.trim();

  try {
    // 1. Comprobar credenciales
    const checkRes = await fetch(`${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(cleanAlias)}&select=alias,pin_hash,recovery_key_hash`, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!checkRes.ok) {
      return { success: false, error: 'Error al consultar la cuenta.' };
    }

    const rows = await checkRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: 'Cuenta no encontrada.' };
    }

    const row = rows[0];
    const isPin = /^\d{4,6}$/.test(cred);
    let matched = false;

    if (isPin) {
      const pinHash = await hashPin(cred);
      matched = row.pin_hash === pinHash;
    } else {
      const keyHash = await hashRecoveryKey(cred);
      matched = row.recovery_key_hash === keyHash;
    }

    if (!matched) {
      return { success: false, error: 'El PIN o clave de recuperación no coincide con la cuenta.' };
    }

    // 2. Eliminar de user_saves
    const delRes = await fetch(`${config.url}/rest/v1/user_saves?alias=eq.${encodeURIComponent(cleanAlias)}`, {
      method: 'DELETE',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!delRes.ok) {
      return { success: false, error: 'No se pudo eliminar la cuenta.' };
    }

    // 3. Eliminar de class_members si existía
    await fetch(`${config.url}/rest/v1/class_members?student_alias=eq.${encodeURIComponent(cleanAlias)}`, {
      method: 'DELETE',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    }).catch(() => {});

    // Limpiar caché local
    if (localStorage.getItem('paplitz_cloud_alias') === cleanAlias) {
      localStorage.removeItem('paplitz_cloud_alias');
    }
    localStorage.removeItem(`paplitz_recovery_${cleanAlias}`);

    return { success: true };
  } catch (err) {
    console.error('[CloudSync] Error al eliminar cuenta:', err);
    return { success: false, error: 'Error de red al intentar eliminar la cuenta.' };
  }
}
